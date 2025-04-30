const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const logger = require('../logger');
const { Readable } = require('stream');
const db = require('../../db');

exports.importUsers = async (req, res) => {
    try {
        const requesterId = req.user.id;

        const isKadiv = await userRepository.isUserKadiv(requesterId);
        if (!isKadiv) {
            logger.warn(`User ${requesterId} attempted to import users but is not a KADIV`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs can import users'
            });
        }

        if (!req.file) {
            logger.warn(`Import attempt without file by user ${requesterId}`);
            return res.status(400).json({
                success: false,
                message: 'CSV file is required'
            });
        }

        const allowedMimes = ['text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/plain'];
        if (!allowedMimes.includes(req.file.mimetype)) {
            logger.warn(`Import with invalid file type (${req.file.mimetype}) by user ${requesterId}`);
            return res.status(400).json({
                success: false,
                message: 'File must be a CSV'
            });
        }

        if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
            return res.status(400).json({
                success: false,
                message: 'CSV file size exceeds 5MB limit'
            });
        }

        logger.info(`Processing CSV import. Size: ${req.file.size} bytes, filename: ${req.file.originalname}`);

        try {
            // Parse CSV
            const records = await parseCSV(req.file.buffer);

            if (records.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is empty'
                });
            }

            logger.info(`CSV parsed. Found ${records.length} records to import.`);

            // Proses import user batch
            const results = await batchImportUsers(records, requesterId);

            return res.status(200).json({
                success: true,
                message: 'CSV import completed',
                results
            });

        } catch (csvError) {
            logger.error(`CSV parsing error: ${csvError.message}`);
            return res.status(400).json({
                success: false,
                message: 'Error parsing CSV file',
                details: process.env.NODE_ENV === 'development' ? csvError.message : undefined
            });
        }
    } catch (err) {
        logger.error(`CSV import error: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const results = [];

        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);

        readableStream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => {
                logger.error(`CSV parsing error: ${error.message}`);
                reject(error);
            });
    });
};

const validateRecord = (record) => {
    const { email, niu, nama_lengkap, divisi } = record;
    const errors = [];

    if (!email) errors.push('Email is required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format');
    }

    if (!niu) errors.push('NIU is required');
    if (!nama_lengkap) errors.push('Full name is required');
    if (!divisi) errors.push('Division is required');

    return errors.length ? errors : null;
};

const batchImportUsers = async (records, requesterId) => {
    try {
        // Initialize batch processing results
        const results = {
            success: 0,
            failed: 0,
            successRecords: [],
            errors: []
        };

        const batchSize = 50;
        const batches = [];

        for (let i = 0; i < records.length; i += batchSize) {
            batches.push(records.slice(i, i + batchSize));
        }

        logger.info(`Divided ${records.length} records into ${batches.length} batches`);

        // Process each batch
        for (const batch of batches) {
            // Create promises for each record in the batch
            const batchPromises = batch.map(async (record) => {
                try {
                    const { email, niu, nama_lengkap, divisi } = record;

                    // Validate
                    const validationErrors = validateRecord(record);
                    if (validationErrors) {
                        throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
                    }

                    // Start transaction
                    const result = await db.$transaction(async (tx) => {
                        // Check if email already exists
                        const existingUser = await tx.user.findUnique({
                            where: { email }
                        });

                        if (existingUser) {
                            throw new Error(`Email already registered: ${email}`);
                        }

                        // Check if NIU already exists
                        const existingNiu = await tx.user.findFirst({
                            where: { niu }
                        });

                        if (existingNiu) {
                            throw new Error(`NIU already registered: ${niu}`);
                        }

                        // Find division
                        const division = await tx.division.findFirst({
                            where: {
                                name: {
                                    equals: divisi,
                                    mode: 'insensitive'
                                }
                            }
                        });

                        if (!division) {
                            throw new Error(`Division not found: ${divisi}`);
                        }

                        // Create user with hashed password
                        const password = await bcrypt.hash(niu, 10);

                        const user = await tx.user.create({
                            data: {
                                email,
                                niu,
                                namaLengkap: nama_lengkap,
                                password,
                                userDivisions: {
                                    create: {
                                        divisionId: division.id,
                                        role: 'STAFF'
                                    }
                                }
                            }
                        });

                        return {
                            id: user.id,
                            email: user.email,
                            niu: user.niu,
                            namaLengkap: user.namaLengkap,
                            divisi: division.name
                        };
                    });

                    return result;
                } catch (error) {
                    return { error, record };
                }
            });

            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);

            // Process results
            for (const result of batchResults) {
                if (result.error) {
                    results.failed++;
                    results.errors.push({
                        row: JSON.stringify(result.record),
                        error: result.error.message
                    });
                } else {
                    results.success++;
                    results.successRecords.push(result);
                }
            }
        }

        return results;
    } catch (error) {
        logger.error(`Batch import error: ${error.message}`);
        throw error;
    }
};