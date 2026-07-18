'use strict';

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index - auto-delete expired tokens
    },
    userAgent: {
      type: String,
      required: false,
      default: null,
    },
    ipAddress: {
      type: String,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index for automatic cleanup of expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
