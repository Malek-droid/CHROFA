'use strict';

const express = require('express');
const router = express.Router();
const {
  initializeWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
} = require('../controllers/whatsappController');

// POST /api/whatsapp/initialize - Initialize WhatsApp session
router.post('/initialize', initializeWhatsApp);

// POST /api/whatsapp/disconnect - Disconnect WhatsApp session
router.post('/disconnect', disconnectWhatsApp);

// GET /api/whatsapp/status - Get WhatsApp connection status
router.get('/status', getWhatsAppStatus);

module.exports = router;
