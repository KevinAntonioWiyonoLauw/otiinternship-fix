const db = require('../../db');
const logger = require('../logger');

// Function to create a new user
const createUser = async (userData) => {
    const { email, niu, namaLengkap, password } = userData;

    try {
        return await db.user.create({
            data: {
                email,
                niu,
                namaLengkap,
                password,
            },
        });
    } catch (error) {
        logger.error(`Error creating user: ${error.message}`);
        throw error;
    }
};

// Function to find a user by email
const findUserByEmail = async (email) => {
    try {
        return await db.user.findUnique({
            where: { email },

            include: {
                userDivisions: {
                    include: {
                        division: true
                    }
                }
            }
        });
    } catch (error) {
        logger.error(`Error finding user by email: ${error.message}`);
        throw error;
    }
};

// Function to find a user by NIU
const findUserByNiu = async (niu) => {
    try {
        return await db.user.findUnique({
            where: { niu },
        });
    } catch (error) {
        logger.error(`Error finding user by NIU: ${error.message}`);
        throw error;
    }
};

// Function to find user by ID
const findUserById = async (userId) => {
    try {
        return await db.user.findUnique({
            where: { id: userId },
        });
    } catch (error) {
        logger.error(`Error finding user by ID: ${error.message}`);
        throw error;
    }
};

// Function to update a user's password
const updateUserPassword = async (userId, newPassword) => {
    try {
        return await db.user.update({
            where: { id: userId },
            data: {
                password: newPassword,
                updatedAt: new Date()
            },
        });
    } catch (error) {
        logger.error(`Error updating user password: ${error.message}`);
        throw error;
    }
};

// Function to save reset token to a user
const saveResetToken = async (userId, resetToken, resetTokenExpiredAt) => {
    try {
        return await db.user.update({
            where: { id: userId },
            data: {
                resetToken,
                resetTokenExpiredAt,
                updatedAt: new Date()
            },
        });
    } catch (error) {
        logger.error(`Error saving reset token: ${error.message}`);
        throw error;
    }
};

// Function to find user by reset token
const findUserByResetToken = async (token) => {
    try {
        return await db.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiredAt: {
                    gt: new Date()
                }
            },
        });
    } catch (error) {
        logger.error(`Error finding user by reset token: ${error.message}`);
        throw error;
    }
};

// Function to reset password and clear token
const resetPassword = async (userId, newPassword) => {
    try {
        return await db.user.update({
            where: { id: userId },
            data: {
                password: newPassword,
                resetToken: null,
                resetTokenExpiredAt: null,
                updatedAt: new Date()
            },
        });
    } catch (error) {
        logger.error(`Error resetting password: ${error.message}`);
        throw error;
    }
};

// Function to create refresh token
const createRefreshToken = async (userId, tokenValue) => {
    try {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now

        return await db.refreshToken.create({
            data: {
                userId,
                refreshTokenValue: tokenValue,
                expiredAt: expiryDate,
                revoked: false
            },
        });
    } catch (error) {
        logger.error(`Error creating refresh token: ${error.message}`);
        throw error;
    }
};

// Function to revoke a refresh token
const revokeRefreshToken = async (tokenValue) => {
    try {
        // Find the token first
        const token = await db.refreshToken.findFirst({
            where: { refreshTokenValue: tokenValue }
        });

        if (!token) {
            logger.warn(`Refresh token not found for revocation: ${tokenValue.substring(0, 16)}...`);
            return null;
        }

        // Update the token
        return await db.refreshToken.update({
            where: { id: token.id },
            data: { revoked: true }
        });
    } catch (error) {
        logger.error(`Error revoking refresh token: ${error.message}`);
        throw error;
    }
};

// Function to revoke all refresh tokens for a user
const revokeAllRefreshTokens = async (userId) => {
    try {
        return await db.refreshToken.updateMany({
            where: {
                userId,
                revoked: false
            },
            data: { revoked: true }
        });
    } catch (error) {
        logger.error(`Error revoking all refresh tokens: ${error.message}`);
        throw error;
    }
};

// Function to check if a user is a KADIV
const isUserKadiv = async (userId) => {
    try {
        const userDivision = await db.userDivision.findFirst({
            where: {
                userId: userId,
                role: 'KADIV'
            }
        });

        return !!userDivision;
    } catch (error) {
        logger.error(`Error checking if user is KADIV: ${error.message}`);
        throw error;
    }
};

// Function to create a user-division relationship
const createUserDivision = async (userId, divisionId, role) => {
    try {
        return await db.userDivision.create({
            data: {
                userId: userId,
                divisionId: divisionId,
                role: role
            }
        });
    } catch (error) {
        logger.error(`Error creating user division: ${error.message}`);
        throw error;
    }
};

// Function to find a division by name
const findDivisionByName = async (divisionName) => {
    try {
        return await db.division.findFirst({
            where: {
                name: {
                    equals: divisionName,
                    mode: 'insensitive' // Case-insensitive search
                }
            }
        });
    } catch (error) {
        logger.error(`Error finding division by name: ${error.message}`);
        throw error;
    }
};

const findMultipleUsersByIds = async (userIds) => {
    try {
        return await db.user.findMany({
            where: {
                id: {
                    in: userIds
                }
            },
            select: {
                id: true,
                email: true,
                niu: true,
                namaLengkap: true,
                createdAt: true
            }
        });
    } catch (error) {
        logger.error(`Error finding multiple users: ${error.message}`);
        throw error;
    }
};

// Function to get user's divisions
const getUserDivisions = async (userId) => {
    try {
        return await db.userDivision.findMany({
            where: { userId },
            include: {
                division: true
            }
        });
    } catch (error) {
        logger.error(`Error getting user divisions: ${error.message}`);
        throw error;
    }
};

// User repository function
const updateUser = async (userId, userData) => {
    try {
        // Sanitize input
        const sanitizedData = {};

        if (userData.namaLengkap) {
            sanitizedData.namaLengkap = userData.namaLengkap.trim();
        }

        if (userData.email) {
            // Check if email already exists for another user
            const existingUser = await db.user.findFirst({
                where: {
                    email: userData.email,
                    NOT: {
                        id: userId
                    }
                }
            });

            if (existingUser) {
                throw new Error('Email already registered by another user');
            }

            sanitizedData.email = userData.email.toLowerCase().trim();
        }

        if (userData.niu) {
            // Check if NIU already exists for another user
            const existingNiu = await db.user.findFirst({
                where: {
                    niu: userData.niu,
                    NOT: {
                        id: userId
                    }
                }
            });

            if (existingNiu) {
                throw new Error('NIU already registered by another user');
            }

            sanitizedData.niu = userData.niu.trim();
        }

        // Update user
        return await db.user.update({
            where: { id: userId },
            data: sanitizedData,
            select: {
                id: true,
                email: true,
                niu: true,
                namaLengkap: true,
                createdAt: true,
                updatedAt: true
            }
        });
    } catch (error) {
        logger.error(`Error updating user: ${error.message}`);
        throw error;
    }
};

// User repository function
const deleteUser = async (userId) => {
    try {
        // Using Prisma transaction to ensure data consistency
        return await db.$transaction(async (tx) => {
            // First, delete all user divisions (should cascade, but just to be safe)
            await tx.userDivision.deleteMany({
                where: { userId }
            });

            // Delete refresh tokens
            await tx.refreshToken.deleteMany({
                where: { userId }
            });

            // Finally, delete the user
            return await tx.user.delete({
                where: { id: userId }
            });
        });
    } catch (error) {
        logger.error(`Error deleting user: ${error.message}`);
        throw error;
    }
};

// Function to check if a refresh token is valid
const isValidRefreshToken = async (tokenValue) => {
    try {
        if (!tokenValue) {
            logger.warn('No refresh token provided for validation');
            return false;
        }

        const token = await db.refreshToken.findFirst({
            where: {
                refreshTokenValue: tokenValue,
                revoked: false,
                expiredAt: {
                    gt: new Date()
                }
            }
        });

        if (!token) {
            logger.warn(`Invalid or expired refresh token: ${tokenValue}`);
            return false;
        }

        return true;
    } catch (error) {
        logger.error(`Error checking refresh token validity: ${error.message}`);
        return false;
    }
};

// Get all users (only basic info)
const getAllUsers = async () => {
    try {
        return await db.user.findMany({
            select: {
                id: true,
                email: true,
                niu: true,
                namaLengkap: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    } catch (error) {
        logger.error(`Error getting all users: ${error.message}`);
        throw error;
    }
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserByNiu,
    findUserById,
    updateUserPassword,
    saveResetToken,
    findUserByResetToken,
    resetPassword,
    createRefreshToken,
    revokeRefreshToken,
    findMultipleUsersByIds,
    revokeAllRefreshTokens,
    isUserKadiv,
    createUserDivision,
    findDivisionByName,
    updateUser,
    deleteUser,
    getUserDivisions,
    isValidRefreshToken,
    getAllUsers
};