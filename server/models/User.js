'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      // Basic format validation — more thorough validation belongs in a
      // controller/service layer, but this prevents obviously malformed values.
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },

    password: {
      type: String,
      // required is false here because OAuth users (authProvider: 'google') will
      // not have a password field at all. Controller-layer validation must enforce
      // that local-auth users always provide a password.
      required: false,
      // Never return password in query results by default.
      select: false,
      minlength: [8, 'Password must be at least 8 characters.'],
    },

    role: {
      type: String,
      enum: {
        values: ['owner'],
        message: 'Role must be one of: owner.',
      },
      default: 'owner',
      required: true,
    },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: false,
      default: null,
    },

    phone: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },

    authProvider: {
      type: String,
      enum: {
        values: ['local', 'google'],
        message: 'authProvider must be one of: local, google.',
      },
      default: 'local',
      required: true,
    },

    googleId: {
      type: String,
      required: false,
      default: null,
      // Sparse index: documents where googleId is null are excluded from the
      // index entirely. This means multiple local-auth users (all with
      // googleId: null) do NOT violate a unique constraint because null
      // values are not indexed. Only non-null googleId values are checked for
      // uniqueness, which is exactly the behaviour we need.
      index: { unique: true, sparse: true },
    },

    resetPasswordToken: {
      type: String,
      required: false,
      default: null,
      select: false, // Never return by default
    },

    resetPasswordExpires: {
      type: Date,
      required: false,
      default: null,
      select: false, // Never return by default
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save hook: password hashing ─────────────────────────────────────────
// Only re-hash if password field was modified (covers both creation and updates).
// This means changing an unrelated field (e.g. name) does NOT trigger a
// pointless rehash.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Instance method: compare a plaintext candidate password against the stored hash.
 * Controllers call this — they never touch bcrypt directly.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
