'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
          return done(new Error('No email address returned from Google profile.'), null);
        }

        const googleId = profile.id;
        let user = await User.findOne({ email });

        if (!user) {
          // If no User exists with that email: create a new User
          user = await User.create({
            name: profile.displayName || 'Google User',
            email: email,
            authProvider: 'google',
            googleId: googleId,
            role: 'owner',
            businessId: null,
          });
        } else {
          // If a User exists with that email
          if (user.authProvider === 'local' && !user.googleId) {
            // A password-protected local account already owns this email.
            // Silently attaching googleId here would let anyone who controls
            // that Google inbox bypass the original account's password.
            // Reject the OAuth attempt and redirect the user to log in with
            // their existing password instead.
            return done(null, false, { message: 'account_exists_local' });
          } else if (user.googleId && user.googleId !== googleId) {
            // Edge case: if a User exists but the incoming Google googleId differs from the stored one
            console.warn(
              `[passport] WARNING: User with email ${email} has a conflicting googleId. Stored: ${user.googleId}, incoming: ${googleId}. Proceeding with login.`
            );
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
