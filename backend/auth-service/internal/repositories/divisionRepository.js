const db = require('../../db');
const logger = require('../logger');

// Get all divisions
const getAllDivisions = async () => {
    try {
        return await db.division.findMany({
            orderBy: {
                name: 'asc'
            }
        });
    } catch (error) {
        logger.error(`Error getting all divisions: ${error.message}`);
        throw error;
    }
};

// Get division by ID
const getDivisionById = async (divisionId) => {
    try {
        return await db.division.findUnique({
            where: { id: divisionId }
        });
    } catch (error) {
        logger.error(`Error getting division by ID: ${error.message}`);
        throw error;
    }
};

// Find division by name
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

// Create new division - dengan validasi dan optimasi Prisma
const createDivision = async (name, type, description) => {
    try {
        // Validasi type untuk memastikan nilai yang valid
        if (type !== 'TECHNICAL' && type !== 'MANAGERIAL') {
            throw new Error('Division type must be TECHNICAL or MANAGERIAL');
        }
       
        return await db.division.create({
            data: {
                name,
                type: type, 
                description
            }
        });
    } catch (error) {
        logger.error(`Error creating division: ${error.message}`);
        throw error;
    }
};

// Update division 
const updateDivision = async (divisionId, updateData) => {
    try {
        const { type } = updateData;
        
        // Validasi type jika disediakan
        if (type && type !== 'TECHNICAL' && type !== 'MANAGERIAL') {
            throw new Error('Division type must be TECHNICAL or MANAGERIAL');
        }
        
        return await db.division.update({
            where: { id: divisionId },
            data: updateData
        });
    } catch (error) {
        logger.error(`Error updating division: ${error.message}`);
        throw error;
    }
};

// Delete division
const deleteDivision = async (divisionId) => {
    try {
        return await db.division.delete({
            where: { id: divisionId }
        });
    } catch (error) {
        logger.error(`Error deleting division: ${error.message}`);
        throw error;
    }
};

// Get users in a division
const getUsersByDivision = async (divisionId) => {
    try {
        const userDivisions = await db.userDivision.findMany({
            where: { divisionId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        niu: true,
                        namaLengkap: true,
                        createdAt: true
                    }
                }
            }
        });
        
        return userDivisions.map(ud => ({
            user_id: ud.user.id, 
            id: ud.user.id,      
            email: ud.user.email,
            niu: ud.user.niu,
            namaLengkap: ud.user.namaLengkap,
            role: ud.role
        }));
    } catch (error) {
        logger.error(`Error getting users by division: ${error.message}`);
        throw error;
    }
};

// Get user division relationship
const getUserDivision = async (userId, divisionId) => {
    try {
        return await db.userDivision.findUnique({
            where: {
                userId_divisionId: {
                    userId,
                    divisionId
                }
            }
        });
    } catch (error) {
        logger.error(`Error getting user division: ${error.message}`);
        throw error;
    }
};

// Remove user from division
const removeUserFromDivision = async (userId, divisionId) => {
    try {
        return await db.userDivision.delete({
            where: {
                userId_divisionId: {
                    userId,
                    divisionId
                }
            }
        });
    } catch (error) {
        logger.error(`Error removing user from division: ${error.message}`);
        throw error;
    }
};

// Update user role in division
const updateUserRole = async (userId, divisionId, role) => {
    try {
        // First verify the current user division exists
        const existingUserDivision = await db.userDivision.findUnique({
            where: {
                userId_divisionId: {
                    userId: userId,
                    divisionId: divisionId
                }
            }
        });

        if (!existingUserDivision) {
            throw new Error('User division not found');
        }

        // Update the role
        const updatedUserDivision = await db.userDivision.update({
            where: {
                userId_divisionId: {
                    userId: userId,
                    divisionId: divisionId
                }
            },
            data: {
                role: role
            },
            include: {
                user: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        email: true,
                        niu: true
                    }
                },
                division: {
                    select: {
                        id: true,
                        name: true,
                        type: true
                    }
                }
            }
        });

        if (!updatedUserDivision) {
            throw new Error('Failed to update user role');
        }

        // Return the updated user division with the new role
        return {
            ...updatedUserDivision,
            role: role, // Ensure we return the new role
            user: {
                ...updatedUserDivision.user,
                role: role // Also update the role in the user object
            }
        };
    } catch (error) {
        logger.error(`Error updating user role: ${error.message}`);
        throw error;
    }
};

module.exports = {
    getAllDivisions,
    getDivisionById,
    findDivisionByName,
    createDivision,
    updateDivision,
    deleteDivision,
    getUsersByDivision,
    getUserDivision,
    removeUserFromDivision,
    updateUserRole
};