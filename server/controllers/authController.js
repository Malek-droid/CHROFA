"use strict";

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

// JWT token expiry times
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Helper to generate access token (short-lived)
 */
const signAccessToken = (userId, role) => {
  return jwt.sign({ userId, role, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

/**
 * Helper to generate refresh token (long-lived)
 */
const signRefreshToken = (userId) => {
  return jwt.sign({ userId, type: "refresh" }, process.env.JWT_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  });
};

/**
 * Helper to generate random token string for refresh token storage
 */
const generateRandomToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

/**
 * Helper to send access token cookie
 */
const sendAccessTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  };
  res.cookie("accessToken", token, cookieOptions);
};

/**
 * Helper to send refresh token cookie
 */
const sendRefreshTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000, // 7 days
  };
  res.cookie("refreshToken", token, cookieOptions);
};

/**
 * Helper to clear auth cookies
 */
const clearAuthCookies = (res) => {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);
  res.cookie("accessToken", "", {
    ...clearOptions,
    expires: new Date(0),
  });
  res.cookie("refreshToken", "", {
    ...clearOptions,
    expires: new Date(0),
  });
};

/**
 * Store refresh token in database
 */
const storeRefreshToken = async (userId, token, userAgent, ipAddress) => {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    token,
    userId,
    expiresAt,
    userAgent,
    ipAddress,
  });
};

/**
 * Delete refresh token from database
 */
const deleteRefreshToken = async (token) => {
  await RefreshToken.deleteOne({ token });
};

/**
 * Delete all refresh tokens for a user (for logout all devices)
 */
const deleteAllUserRefreshTokens = async (userId) => {
  await RefreshToken.deleteMany({ userId });
};

exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.generateRandomToken = generateRandomToken;
exports.sendAccessTokenCookie = sendAccessTokenCookie;
exports.sendRefreshTokenCookie = sendRefreshTokenCookie;
exports.clearAuthCookies = clearAuthCookies;
exports.storeRefreshToken = storeRefreshToken;
exports.deleteRefreshToken = deleteRefreshToken;
exports.deleteAllUserRefreshTokens = deleteAllUserRefreshTokens;

/**
 * POST /api/auth/register
 * Register a new user as business owner
 */
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    const err = new Error("Please provide name, email, and password.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    return next(err);
  }

  if (password.length < 8) {
    const err = new Error("Password must be at least 8 characters.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    return next(err);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const err = new Error("A record with that email already exists.");
    err.statusCode = 409;
    err.code = "DUPLICATE_KEY";
    return next(err);
  }

  // Create user - businessId defaults to null, role defaults to 'owner'
  const user = await User.create({
    name,
    email,
    password,
  });

  // Generate tokens
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  // Store the refresh token JWT itself in the database so logout can invalidate it
  await storeRefreshToken(
    user._id,
    refreshToken,
    req.get("user-agent"),
    req.ip
  );

  // Send cookies
  sendAccessTokenCookie(res, accessToken);
  sendRefreshTokenCookie(res, refreshToken);

  console.log(`[AUTH] User registered: ${email} from ${req.ip}`);

  res.status(201).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    },
  });
};

/**
 * POST /api/auth/login
 * Log in an existing user
 */
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const err = new Error("Please provide email and password.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    return next(err);
  }

  // User password is 'select: false' in schema, so explicitly select it
  const user = await User.findOne({ email }).select("+password");
  if (!user || user.authProvider !== "local") {
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    return next(err);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    return next(err);
  }

  // Generate tokens
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  // Store the refresh token JWT itself in the database so logout can invalidate it
  await storeRefreshToken(
    user._id,
    refreshToken,
    req.get("user-agent"),
    req.ip
  );

  // Send cookies
  sendAccessTokenCookie(res, accessToken);
  sendRefreshTokenCookie(res, refreshToken);

  console.log(`[AUTH] User logged in: ${email} from ${req.ip}`);

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    },
  });
};

/**
 * POST /api/auth/logout
 * Log out and clear session cookies
 */
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const accessToken = req.cookies.accessToken;

    if (refreshToken) {
      // Delete refresh token from database
      await deleteRefreshToken(refreshToken);
    }

    // Set lastLogoutAt on user document so any existing access token is invalidated
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true });
        if (decoded && decoded.userId) {
          await User.findByIdAndUpdate(decoded.userId, { lastLogoutAt: new Date() });
        }
      } catch (e) {
        // Silently ignore decode error
      }
    }

    // Clear cookies
    clearAuthCookies(res);

    console.log(`[AUTH] User logged out from ${req.ip}`);

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user details
 */
exports.me = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      businessId: req.user.businessId,
    },
  });
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      const err = new Error("No refresh token provided.");
      err.statusCode = 401;
      err.code = "UNAUTHORIZED";
      return next(err);
    }

    // Verify refresh token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      const error = new Error("Invalid or expired refresh token.");
      error.statusCode = 401;
      error.code = "UNAUTHORIZED";
      return next(error);
    }

    // Check if it's actually a refresh token
    if (decoded.type !== "refresh") {
      const err = new Error("Invalid token type.");
      err.statusCode = 401;
      err.code = "UNAUTHORIZED";
      return next(err);
    }

    // Verify the token exists in the database (invalidated on logout)
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      clearAuthCookies(res);
      const err = new Error("Refresh token has been revoked. Please sign in again.");
      err.statusCode = 401;
      err.code = "UNAUTHORIZED";
      return next(err);
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      const err = new Error("User no longer exists.");
      err.statusCode = 401;
      err.code = "UNAUTHORIZED";
      return next(err);
    }

    // Generate new access token
    const newAccessToken = signAccessToken(user._id, user.role);

    // Send new access token cookie
    sendAccessTokenCookie(res, newAccessToken);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });
  } catch (err) {
    next(err);
  }
};
