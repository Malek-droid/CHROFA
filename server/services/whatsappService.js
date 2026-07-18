'use strict';

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Store active WhatsApp sessions per business
const activeSessions = new Map();

/**
 * Initialize WhatsApp session for a business.
 * Returns the socket instance and QR code if needed.
 */
async function initializeWhatsAppSession(businessId, businessName) {
  try {
    const authPath = path.join(__dirname, '../whatsapp-sessions', businessId.toString());
    
    // Ensure auth directory exists
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const logger = pino({ level: 'silent' });
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger,
    });

    // Store session reference
    activeSessions.set(businessId.toString(), socket);

    // Handle connection updates
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // QR code available for linking
        console.log(`[WhatsAppService] QR code available for business ${businessName} (${businessId})`);
        // In production, this would be sent via WebSocket to the frontend
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        console.log(`[WhatsAppService] Connection closed for business ${businessName} (${businessId})`);
        
        if (shouldReconnect) {
          console.log(`[WhatsAppService] Attempting to reconnect for business ${businessName}...`);
          // Reconnection logic would go here
        } else {
          console.log(`[WhatsAppService] Session logged out for business ${businessName}. Cleaning up...`);
          activeSessions.delete(businessId.toString());
          // Clean up auth files
          if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
          }
        }
      } else if (connection === 'open') {
        console.log(`[WhatsAppService] Connection opened for business ${businessName} (${businessId})`);
        // Update business record with connected status and phone number
        const Business = require('../models/Business');
        const user = socket.user;
        await Business.findByIdAndUpdate(businessId, {
          'whatsappSession.connected': true,
          'whatsappSession.phoneNumber': user.id.split(':')[0],
        });
      }
    });

    // Save credentials on update
    socket.ev.on('creds.update', saveCreds);

    return socket;
  } catch (error) {
    console.error(`[WhatsAppService] Failed to initialize WhatsApp session for business ${businessId}:`, error);
    throw error;
  }
}

/**
 * Get QR code for a business's WhatsApp session.
 */
function getQRCode(businessId) {
  const socket = activeSessions.get(businessId.toString());
  if (!socket) {
    throw new Error('No active WhatsApp session for this business');
  }
  
  // QR code would be emitted via connection.update event
  // This is a simplified version - in production, use WebSocket or polling
  return null;
}

/**
 * Send WhatsApp message to a phone number.
 */
async function sendWhatsAppMessage(businessId, phoneNumber, message) {
  try {
    const socket = activeSessions.get(businessId.toString());
    if (!socket) {
      throw new Error('WhatsApp session not active for this business');
    }

    // Format phone number (remove non-digits, add country code if needed)
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const jid = `${formattedNumber}@s.whatsapp.net`;

    await socket.sendMessage(jid, { text: message });
    console.log(`[WhatsAppService] Message sent to ${phoneNumber} from business ${businessId}`);
    
    return true;
  } catch (error) {
    console.error(`[WhatsAppService] Failed to send WhatsApp message:`, error);
    throw error;
  }
}

/**
 * Disconnect WhatsApp session for a business.
 */
async function disconnectWhatsAppSession(businessId) {
  try {
    const socket = activeSessions.get(businessId.toString());
    if (socket) {
      await socket.logout();
      activeSessions.delete(businessId.toString());
      
      // Update business record
      const Business = require('../models/Business');
      await Business.findByIdAndUpdate(businessId, {
        'whatsappSession.connected': false,
        'whatsappSession.phoneNumber': null,
      });
      
      console.log(`[WhatsAppService] Disconnected WhatsApp session for business ${businessId}`);
    }
  } catch (error) {
    console.error(`[WhatsAppService] Failed to disconnect WhatsApp session:`, error);
    throw error;
  }
}

/**
 * Check if WhatsApp session is active for a business.
 */
function isSessionActive(businessId) {
  return activeSessions.has(businessId.toString());
}

module.exports = {
  initializeWhatsAppSession,
  getQRCode,
  sendWhatsAppMessage,
  disconnectWhatsAppSession,
  isSessionActive,
};
