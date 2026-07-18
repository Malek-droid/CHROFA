'use strict';

const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');

/**
 * POST /api/auth/forgot-password
 * Initiates password reset by sending a reset token to the user's email
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    
    // Always return success to prevent email enumeration attacks
    // Even if user doesn't exist, we don't reveal that
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Store reset token on user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:8080'}/reset-password?token=${resetToken}`;

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@cadence.app',
      to: user.email,
      subject: 'Password Reset - Cadence',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Cadence account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`[AUTH] Password reset requested for: ${email} from ${req.ip}`);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Resets password using the reset token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      const err = new Error('Token and password are required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    if (password.length < 8) {
      const err = new Error('Password must be at least 8 characters.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      const err = new Error('Invalid or expired reset token.');
      err.statusCode = 400;
      err.code = 'INVALID_TOKEN';
      return next(err);
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`[AUTH] Password reset completed for: ${user.email} from ${req.ip}`);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (err) {
    next(err);
  }
};
