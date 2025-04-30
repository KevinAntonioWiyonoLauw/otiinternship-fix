const bcrypt = require('bcryptjs');
const jwt = require('../utils/jwt');
const userRepository = require('../repositories/userRepository');
const logger = require('../logger');
const axios = require('axios');
const crypto = require('crypto');

exports.register = async (req, res) => {
    try {
        const requesterId = req.user.id;

        const { email, niu, nama_lengkap, division_id, role = 'STAFF' } = req.body;

        const isKadiv = await userRepository.isUserKadiv(requesterId);
        if (!isKadiv) {
            logger.warn(`User ${requesterId} attempted to register a new user but is not a KADIV`);
            return res.status(403).json({
                success: false,
                message: 'Only KADIVs can register new users'
            });
        }

        const existingUser = await userRepository.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const existingNiu = await userRepository.findUserByNiu(niu);
        if (existingNiu) {
            return res.status(400).json({
                success: false,
                message: 'NIU already registered'
            });
        }

        const password = await bcrypt.hash(niu, 10);

        const user = await userRepository.createUser({
            email,
            niu,
            namaLengkap: nama_lengkap,
            password
        });

        if (division_id) {
            await userRepository.createUserDivision(user.id, division_id, role);
        }

        logger.info(`User registered: ${email} with NIU: ${niu} by KADIV: ${requesterId}`);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                niu: user.niu,
                namaLengkap: user.namaLengkap
            }
        });
    } catch (err) {
        logger.error(`Registration error: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            logger.warn(`Failed login attempt for non-existent user: ${email}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            logger.warn(`Failed login attempt for user: ${email}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.generateAccessToken({ id: user.id });

        const refreshTokenValue = jwt.generateRefreshToken({ id: user.id });

        await userRepository.createRefreshToken(user.id, refreshTokenValue);

        logger.info(`User logged in: ${email}`);

        return res.status(200).json({
            success: true,
            token,
            refreshToken: refreshTokenValue,
            user: {
                id: user.id,
                email: user.email,
                niu: user.niu,
                namaLengkap: user.namaLengkap
            }
        });
    } catch (err) {
        logger.error(`Login error: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const userId = req.user.id;

        const user = await userRepository.findUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            logger.warn(`Failed password change attempt for user: ${user.email} - Invalid current password`);
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await userRepository.updateUserPassword(userId, hashedPassword);

        logger.info(`Password changed for user: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (err) {
        logger.error(`Change password error: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await userRepository.findUserByEmail(email);

        if (!user) {
            logger.info(`Reset password attempted for non-existent email: ${email}`);
            return res.status(200).json({
                success: true,
                message: 'If your email is registered, you will receive reset instructions shortly'
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 jam

        await userRepository.saveResetToken(user.id, resetToken, tokenExpiry);

        try {
            const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://email-service-api:8002';

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetPasswordUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

            await axios.post(`${emailServiceUrl}/api/email/send`, {
                to: user.email,
                subject: 'OTI - Reset Password',
                text: `Silakan reset password Anda dengan mengklik link berikut: ${resetPasswordUrl}`,
                html: `<p>Silakan reset password Anda dengan mengklik link berikut:</p>
                      <p><a href="${resetPasswordUrl}">Reset Password</a></p>
                      <p>Link ini akan kedaluwarsa dalam 24 jam.</p>`,
                user_id: user.id,
                reset_url: resetPasswordUrl
            });

            logger.info(`Reset password email sent to: ${email} with URL: ${resetPasswordUrl}`);
        } catch (emailError) {
            logger.error(`Failed to send reset password email: ${emailError.message}`);

            if (process.env.NODE_ENV === 'development') {
                console.error('Email service error details:', emailError);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'If your email is registered, you will receive reset instructions shortly'
        });
    } catch (error) {
        logger.error(`Reset password error: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.completeResetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await userRepository.findUserByResetToken(token);

        if (!user) {
            logger.warn(`Invalid or expired reset token used: ${token.substring(0, 16)}...`);
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        if (user.resetTokenExpiredAt < new Date()) {
            logger.warn(`Expired reset token used for user: ${user.email}`);
            return res.status(400).json({
                success: false,
                message: 'Reset token has expired'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await userRepository.resetPassword(user.id, hashedPassword);

        logger.info(`Password reset completed for user: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully'
        });
    } catch (err) {
        logger.error(`Complete reset password error: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = req.user.id;

        const refreshToken = req.body.refreshToken;

        if (refreshToken) {
            await userRepository.revokeRefreshToken(refreshToken);
            logger.info(`Specific refresh token revoked for user: ${userId}`);
        } else {
            await userRepository.revokeAllRefreshTokens(userId);
            logger.info(`All refresh tokens revoked for user: ${userId}`);
        }

        logger.info(`User logged out: ${userId}`);
        return res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (err) {
        logger.error(`Logout error: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.serviceLogin = async (req, res) => {
    try {
        const { service_key } = req.body;

        if (!service_key) {
            return res.status(400).json({
                success: false,
                message: 'Service key is required'
            });
        }

        const validServiceKeys = {
            'meeting-service-secret-key': 'meeting-service',
            'training-service-secret-key': 'training-service',
            'email-service-secret-key': 'email-service',
            'presence-service-secret-key': 'presence-service',
            'progress-service-secret-key': 'progress-service',
            'aspirasi-service-secret-key': 'aspirasi-service'
        };

        const serviceName = validServiceKeys[service_key];

        if (!serviceName) {
            logger.warn(`Invalid service key attempted: ${service_key}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid service key'
            });
        }

        const token = jwt.generateAccessToken({
            service: serviceName,
            isService: true
        });

        logger.info(`Service authenticated: ${serviceName}`);

        return res.status(200).json({
            success: true,
            token,
            service: serviceName
        });
    } catch (error) {
        logger.error(`Service authentication error: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.me = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await userRepository.findUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's divisions and roles
        const userDivisions = await userRepository.getUserDivisions(userId);

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                niu: user.niu,
                namaLengkap: user.namaLengkap,
                roles: userDivisions.map(ud => ({
                    role: ud.role,
                    division: ud.division
                }))
            }
        });
    } catch (err) {
        logger.error(`Get user info error: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        // Log the request body for debugging
        logger.info('Refresh token request body:', {
            body: req.body,
            headers: req.headers,
            rawBody: req.rawBody
        });

        const { refreshToken } = req.body;

        if (!refreshToken) {
            logger.warn('Refresh token request missing token');
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify the refresh token
        const decoded = jwt.verifyRefreshToken(refreshToken);
        if (!decoded) {
            logger.warn('Invalid refresh token used');
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check if the refresh token exists and is not revoked
        const isValidToken = await userRepository.isValidRefreshToken(refreshToken);
        if (!isValidToken) {
            logger.warn(`Invalid or revoked refresh token used for user: ${decoded.id}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        // Get user data to ensure user still exists
        const user = await userRepository.findUserById(decoded.id);
        if (!user) {
            logger.warn(`User not found for refresh token: ${decoded.id}`);
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate new access token and refresh token
        const newAccessToken = jwt.generateAccessToken({ id: decoded.id });
        const newRefreshToken = jwt.generateRefreshToken({ id: decoded.id });

        // Create new refresh token in database
        await userRepository.createRefreshToken(decoded.id, newRefreshToken);

        // Revoke the old refresh token
        await userRepository.revokeRefreshToken(refreshToken);

        logger.info(`Token refreshed for user: ${decoded.id}`);

        return res.status(200).json({
            success: true,
            token: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
                id: user.id,
                email: user.email,
                niu: user.niu,
                namaLengkap: user.namaLengkap
            }
        });
    } catch (err) {
        logger.error(`Token refresh error: ${err.message}`, {
            error: err,
            stack: err.stack
        });
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};