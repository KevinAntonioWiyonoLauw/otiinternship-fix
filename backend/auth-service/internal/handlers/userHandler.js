const userRepository = require('../repositories/userRepository');
const logger = require('../logger');
const { isUUID } = require('validator');


exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isUUID(id, 4)) { // Validate UUID v4
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

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Ekstrak data dari request body
        const { namaLengkap, email, niu } = req.body;

        if (!isUUID(id, 4)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        // Tambahkan validasi untuk memastikan user ada sebelum mencoba update
        const existingUser = await userRepository.findUserById(id);
        if (!existingUser) {
            logger.warn(`Update attempted for non-existent user ID: ${id}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user
        const updatedUser = await userRepository.updateUser(id, {
            namaLengkap,
            email,
            niu
        });

        logger.info(`User ${id} updated successfully`);

        return res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        logger.error(`Error updating user: ${error.message}`);

        if (error.message.includes('already registered')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user.id;

        const isKadiv = await userRepository.isUserKadiv(requesterId);

        if (!isKadiv) {
            logger.warn(`User ${requesterId} attempted to delete user ${id} without KADIV role`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs can delete users'
            });
        }

        if (requesterId === id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        const user = await userRepository.findUserById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userDivisions = await userRepository.getUserDivisions(id);
        const isUserKadiv = userDivisions.some(division => division.role === 'KADIV');

        if (isUserKadiv) {
            logger.warn(`Attempted to delete user ${id} who is a KADIV in some divisions`);
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a user who is a KADIV. Please reassign or remove the KADIV role first.'
            });
        }

        // Delete user
        await userRepository.deleteUser(id);

        logger.info(`User ${id} deleted by KADIV ${requesterId}`);

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error(`Error deleting user: ${error.message}`);
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

        // Validasi UUID format
        if (!isUUID(id, 4)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        // Check if user exists
        const user = await userRepository.findUserById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const divisions = await userRepository.getUserDivisions(id);

        return res.status(200).json({
            success: true,
            divisions: divisions.map(div => ({
                id: div.division.id,
                name: div.division.name,
                type: div.division.type,
                description: div.division.description,
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

exports.getAllUsers = async (req, res) => {
    try {
        const requesterId = req.user.id;

        // Check if requester is KADIV
        const isKadiv = await userRepository.isUserKadiv(requesterId);
        if (!isKadiv) {
            logger.warn(`User ${requesterId} attempted to get all users but is not a KADIV`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs can access this endpoint'
            });
        }

        const users = await userRepository.getAllUsers();

        return res.status(200).json({
            success: true,
            users: users.map(user => ({
                id: user.id,
                email: user.email,
                niu: user.niu,
                namaLengkap: user.namaLengkap,
                createdAt: user.createdAt
            }))
        });
    } catch (error) {
        logger.error(`Error getting all users: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};