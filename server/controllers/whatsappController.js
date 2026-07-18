'use strict';

const Business = require('../models/Business');
const { initializeWhatsAppSession, disconnectWhatsAppSession, isSessionActive } = require('../services/whatsappService');

/**
 * Initialize WhatsApp session for a business and get QR code.
 */
exports.initializeWhatsApp = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId) {
      const err = new Error('Business setup required.');
      err.statusCode = 400;
      err.code = 'BUSINESS_SETUP_REQUIRED';
      return next(err);
    }

    const business = await Business.findById(businessId);
    if (!business) {
      const err = new Error('Business not found.');
      err.statusCode = 404;
      err.code = 'BUSINESS_NOT_FOUND';
      return next(err);
    }

    // Check if session is already active
    if (isSessionActive(businessId.toString())) {
      return res.status(200).json({
        success: true,
        message: 'WhatsApp session already active',
        connected: true,
        phoneNumber: business.whatsappSession?.phoneNumber,
      });
    }

    // Initialize new session
    const socket = await initializeWhatsAppSession(businessId, business.name);

    // In production, we would set up WebSocket to send QR code to frontend
    // For now, return a message that QR code is available
    res.status(200).json({
      success: true,
      message: 'WhatsApp session initialized. QR code will be available via WebSocket.',
      connected: false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disconnect WhatsApp session for a business.
 */
exports.disconnectWhatsApp = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId) {
      const err = new Error('Business setup required.');
      err.statusCode = 400;
      err.code = 'BUSINESS_SETUP_REQUIRED';
      return next(err);
    }

    await disconnectWhatsAppSession(businessId);

    res.status(200).json({
      success: true,
      message: 'WhatsApp session disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get WhatsApp connection status for a business.
 */
exports.getWhatsAppStatus = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId) {
      const err = new Error('Business setup required.');
      err.statusCode = 400;
      err.code = 'BUSINESS_SETUP_REQUIRED';
      return next(err);
    }

    const business = await Business.findById(businessId);
    if (!business) {
      const err = new Error('Business not found.');
      err.statusCode = 404;
      err.code = 'BUSINESS_NOT_FOUND';
      return next(err);
    }

    const isActive = isSessionActive(businessId.toString());

    res.status(200).json({
      success: true,
      status: {
        connected: business.whatsappSession?.connected || false,
        phoneNumber: business.whatsappSession?.phoneNumber || null,
        sessionActive: isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};
