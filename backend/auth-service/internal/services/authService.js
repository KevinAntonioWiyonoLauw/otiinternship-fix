const bcrypt = require('bcryptjs');
const jwt = require('../utils/jwt');
const userRepository = require('../repositories/userRepository');
const logger = require('../logger/index');

// Function to register a new user
const registerUser = async (userData) => {
    try {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = {
            email: userData.email,
            niu: userData.niu,
            nama_lengkap: userData.nama_lengkap,
            password: hashedPassword,
            created_at: new Date(),
        };

        const user = await userRepository.createUser(newUser);
        // Assign user to a division (assuming division_id is passed in userData)
        await userRepository.assignUserToDivision(user.user_id, userData.division_id);

        logger.info(`User registered: ${user.email}`);
        return user;
    } catch (error) {
        logger.error(`Error registering user: ${error.message}`);
        throw error;
    }
};

// Function to login a user
const loginUser = async (email, password) => {
    try {
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        const token = jwt.generateToken(user.user_id);
        const refreshToken = await userRepository.createRefreshToken(user.user_id);

        logger.info(`User logged in: ${user.email}`);
        return { token, refreshToken };
    } catch (error) {
        logger.error(`Error logging in user: ${error.message}`);
        throw error;
    }
};

const getUserEmail = async (userId, token) => {
    try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';
        const response = await axios.get(`${authServiceUrl}/api/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.user.email;
    } catch (error) {
        logger.error(`Failed to get user email: ${error.message}`);
        return null;
    }
};

// Function to change user password
const changePassword = async (userId, oldPassword, newPassword) => {
    try {
        const user = await userRepository.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw new Error('Invalid old password');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await userRepository.updateUserPassword(userId, hashedNewPassword);

        logger.info(`Password changed for user: ${user.email}`);
    } catch (error) {
        logger.error(`Error changing password: ${error.message}`);
        throw error;
    }
};

// Function to reset user password
const resetPassword = async (email) => {
    try {
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        const resetToken = jwt.generateResetToken(user.user_id);
        await userRepository.updateResetToken(user.user_id, resetToken);

        logger.info(`Reset password token generated for user: ${user.email}`);
    } catch (error) {
        logger.error(`Error resetting password: ${error.message}`);
        throw error;
    }
};

module.exports = {
    registerUser,
    loginUser,
    changePassword,
    resetPassword,
    getUserEmail,
};