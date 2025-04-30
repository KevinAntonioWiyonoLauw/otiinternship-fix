const userRepository = require('../repositories/userRepository');
const divisionRepository = require('../repositories/divisionRepository');
const logger = require('../logger');
const { isUUID } = require('validator');

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isUUID(id, 4)) { 
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }
        
        const user = await userRepository.findUserById(id);
        
        if (!user) {
            logger.warn(`User not found with ID: ${id}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                niu: user.niu,
                namaLengkap: user.namaLengkap,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        logger.error(`Error finding user by ID: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.getAllDivisions = async (req, res) => {
    try {
        const divisions = await divisionRepository.getAllDivisions();
        
        return res.status(200).json({
            success: true,
            divisions: divisions.map(div => ({
                id: div.id,
                division_id: div.id, // Add division_id field that matches id for backwards compatibility
                name: div.name,
                type: div.type,
                description: div.description,
                createdAt: div.created_at
            }))
        });
    } catch (error) {
        logger.error(`Error getting all divisions: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getDivisionById = async (req, res) => {
    try {
        const { id } = req.params;

        const divisionId = parseInt(id);
        
        if (isNaN(divisionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid division ID'
            });
        }
        
        const division = await divisionRepository.getDivisionById(divisionId);
        
        if (!division) {
            return res.status(404).json({
                success: false,
                message: 'Division not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            division
        });
    } catch (error) {
        logger.error(`Error getting division by ID: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getUserDivisions = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user.id;

        if (!isUUID(id, 4)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const user = await userRepository.findUserById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const divisions = await userRepository.getUserDivisions(id);
        
        logger.info(`User divisions retrieved for user ${id} by user ${requesterId}`);
        
        return res.status(200).json({
            success: true,
            divisions: divisions.map(div => ({
                id: div.divisionId,
                name: div.divisionName,
                role: div.role
            }))
        });
    } catch (error) {
        logger.error(`Error getting user divisions: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.createDivision = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const { name, type, description } = req.body;
        
        // Validasi input
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                message: 'Division name and type are required'
            });
        }
        
        if (type !== 'TECHNICAL' && type !== 'MANAGERIAL') {
            return res.status(400).json({
                success: false,
                message: 'Division type must be either TECHNICAL or MANAGERIAL'
            });
        }
        
        // Cek apakah pengguna adalah KADIV
        const isKadiv = await userRepository.isUserKadiv(requesterId);
        
        if (!isKadiv) {
            logger.warn(`User ${requesterId} attempted to create division but is not a KADIV`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs can create divisions'
            });
        }
        
        // Cek apakah nama divisi sudah ada
        const existingDivision = await divisionRepository.findDivisionByName(name);
        
        if (existingDivision) {
            return res.status(400).json({
                success: false,
                message: 'Division name already exists'
            });
        }
        
        // Buat divisi baru
        const division = await divisionRepository.createDivision(name, type, description);
        
        logger.info(`Division created: ${division.id} by KADIV: ${requesterId}`);
        
        return res.status(201).json({
            success: true,
            message: 'Division created successfully',
            division: {
                id: division.id,
                division_id: division.id, // Add division_id field that matches id for backwards compatibility
                name: division.name,
                type: division.type,
                description: division.description,
                createdAt: division.created_at
            }
        });
    } catch (error) {
        logger.error(`Error creating division: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.updateDivision = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user.id;
        const { name, type, description } = req.body;
        
        // Validasi input
        const divisionId = parseInt(id);
        
        if (isNaN(divisionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid division ID'
            });
        }
        
        // Cek apakah pengguna adalah KADIV
        const isKadiv = await userRepository.isUserKadiv(requesterId);
        const hdDivision = await divisionRepository.getUserDivision(requesterId, 16);
        const isHdKadiv = hdDivision && hdDivision.role === 'KADIV';
        
        if (!isKadiv && !isHdKadiv) {
            logger.warn(`User ${requesterId} attempted to update division but is not authorized`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs or HD KADIV can update divisions'
            });
        }
        
        // Cek apakah divisi ada
        const existingDivision = await divisionRepository.getDivisionById(divisionId);
        
        if (!existingDivision) {
            return res.status(404).json({
                success: false,
                message: 'Division not found'
            });
        }
        
        // Update divisi
        const division = await divisionRepository.updateDivision(divisionId, {
            name,
            type,
            description
        });
        
        logger.info(`Division updated: ${division.id} by KADIV: ${requesterId}`);
        
        return res.status(200).json({
            success: true,
            message: 'Division updated successfully',
            division: {
                id: division.id,
                division_id: division.id, // Add division_id field that matches id for backwards compatibility
                name: division.name,
                type: division.type,
                description: division.description
            }
        });
    } catch (error) {
        logger.error(`Error updating division: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.deleteDivision = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user.id;
        
        // Validasi input
        const divisionId = parseInt(id);
        
        if (isNaN(divisionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid division ID'
            });
        }
        
        // Cek apakah pengguna adalah KADIV
        const isKadiv = await userRepository.isUserKadiv(requesterId);
        
        if (!isKadiv) {
            logger.warn(`User ${requesterId} attempted to delete division but is not a KADIV`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs can delete divisions'
            });
        }
        
        // Cek apakah divisi ada
        const existingDivision = await divisionRepository.getDivisionById(divisionId);
        
        if (!existingDivision) {
            return res.status(404).json({
                success: false,
                message: 'Division not found'
            });
        }
        
        // Hapus divisi
        await divisionRepository.deleteDivision(divisionId);
        
        logger.info(`Division deleted: ${divisionId} by KADIV: ${requesterId}`);
        
        return res.status(200).json({
            success: true,
            message: 'Division deleted successfully'
        });
    } catch (error) {
        logger.error(`Error deleting division: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getUsersByDivision = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validasi input
        const divisionId = parseInt(id);
        
        if (isNaN(divisionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid division ID'
            });
        }
        
        // Cek apakah divisi ada
        const existingDivision = await divisionRepository.getDivisionById(divisionId);
        
        if (!existingDivision) {
            return res.status(404).json({
                success: false,
                message: 'Division not found'
            });
        }
        
        // Ambil users dalam divisi
        const users = await divisionRepository.getUsersByDivision(divisionId);
        
        return res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        logger.error(`Error getting users by division: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.addUserToDivision = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user.id;
        const { userId, role = 'STAFF' } = req.body;
        
        // Validasi input
        const divisionId = parseInt(id);
        
        if (isNaN(divisionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid division ID'
            });
        }
        
        if (!userId || !isUUID(userId, 4)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user ID is required'
            });
        }
        
        if (role !== 'KADIV' && role !== 'STAFF') {
            return res.status(400).json({
                success: false,
                message: 'Role must be either KADIV or STAFF'
            });
        }
        
        // Cek apakah pengguna adalah KADIV dari divisi ini
        const userDivision = await divisionRepository.getUserDivision(requesterId, divisionId);
        const hdDivision = await divisionRepository.getUserDivision(requesterId, 16);
        const isHdKadiv = hdDivision && hdDivision.role === 'KADIV';
        
        if ((!userDivision || userDivision.role !== 'KADIV') && !isHdKadiv) {
            logger.warn(`User ${requesterId} attempted to add user to division ${divisionId} but is not a KADIV of this division`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIV of this division and KADIV HD can add users'
            });
        }
        
        // Cek apakah divisi ada
        const existingDivision = await divisionRepository.getDivisionById(divisionId);
        
        if (!existingDivision) {
            return res.status(404).json({
                success: false,
                message: 'Division not found'
            });
        }
        
        // Cek apakah user ada
        const existingUser = await userRepository.findUserById(userId);
        
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Cek apakah user sudah ada di divisi
        const existingUserDivision = await divisionRepository.getUserDivision(userId, divisionId);
        
        if (existingUserDivision) {
            return res.status(400).json({
                success: false,
                message: 'User is already in this division'
            });
        }
        
        // Tambahkan user ke divisi
        await userRepository.createUserDivision(userId, divisionId, role);
        
        logger.info(`User ${userId} added to division ${divisionId} by KADIV: ${requesterId}`);
        
        return res.status(201).json({
            success: true,
            message: 'User added to division successfully',
            userDivision: {
                userId,
                divisionId,
                role
            }
        });
    } catch (error) {
        logger.error(`Error adding user to division: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const requesterId = req.user.id;
        const { role } = req.body;
        
        // Validasi input
        const divisionId = parseInt(id);
        
        if (isNaN(divisionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid division ID'
            });
        }
        
        if (!userId || !isUUID(userId, 4)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user ID is required'
            });
        }
        
        if (!role || (role !== 'KADIV' && role !== 'STAFF')) {
            return res.status(400).json({
                success: false,
                message: 'Role must be specified as either KADIV or STAFF'
            });
        }
        
        // Cek apakah pengguna adalah KADIV dari divisi ini
        const userDivision = await divisionRepository.getUserDivision(requesterId, divisionId);
        const hdDivision = await divisionRepository.getUserDivision(requesterId, 16);
        const isHdKadiv = hdDivision && hdDivision.role === 'KADIV';
        
        if ((!userDivision || userDivision.role !== 'KADIV') && !isHdKadiv) {
            logger.warn(`User ${requesterId} attempted to update role in division ${divisionId} but is not authorized`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs of this division or HD division can update roles'
            });
        }
        
        // Cek apakah user ada di divisi
        const targetUserDivision = await divisionRepository.getUserDivision(userId, divisionId);
        
        if (!targetUserDivision) {
            return res.status(404).json({
                success: false,
                message: 'User is not in this division'
            });
        }
        
        // Mencegah KADIV mengganti perannya sendiri
        if (userId === requesterId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }
        
        // Update role
        const updatedUserDivision = await divisionRepository.updateUserRole(userId, divisionId, role);
        
        if (!updatedUserDivision) {
            throw new Error('Failed to update user role');
        }
        
        logger.info(`User ${userId} role updated to ${role} in division ${divisionId} by KADIV: ${requesterId}`);
        
        // Get the updated user division data
        const finalUserDivision = await divisionRepository.getUserDivision(userId, divisionId);
        
        return res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            userDivision: finalUserDivision || {
                userId,
                divisionId,
                role
            }
        });
    } catch (error) {
        logger.error(`Error updating user role: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.removeUserFromDivision = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const requesterId = req.user.id;
        
        // Validasi input
        const divisionId = parseInt(id);
        
        if (isNaN(divisionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid division ID'
            });
        }
        
        if (!userId || !isUUID(userId, 4)) {
            return res.status(400).json({
                success: false,
                message: 'Valid user ID is required'
            });
        }
        
        // Cek apakah pengguna adalah KADIV dari divisi ini
        const userDivision = await divisionRepository.getUserDivision(requesterId, divisionId);
        const hdDivision = await divisionRepository.getUserDivision(requesterId, 16);
        const isHdKadiv = hdDivision && hdDivision.role === 'KADIV';
        
        if ((!userDivision || userDivision.role !== 'KADIV') && !isHdKadiv) {
            logger.warn(`User ${requesterId} attempted to remove user from division ${divisionId} but is not authorized`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs of this division or HD division can remove users'
            });
        }
        
        // Cek apakah user ada di divisi
        const targetUserDivision = await divisionRepository.getUserDivision(userId, divisionId);
        
        if (!targetUserDivision) {
            return res.status(404).json({
                success: false,
                message: 'User is not in this division'
            });
        }
        
        // Mencegah KADIV menghapus dirinya sendiri
        if (userId === requesterId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot remove yourself from the division'
            });
        }
        
        // Hapus user dari divisi
        await divisionRepository.removeUserFromDivision(userId, divisionId);
        
        logger.info(`User ${userId} removed from division ${divisionId} by KADIV: ${requesterId}`);
        
        return res.status(200).json({
            success: true,
            message: 'User removed from division successfully'
        });
    } catch (error) {
        logger.error(`Error removing user from division: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};