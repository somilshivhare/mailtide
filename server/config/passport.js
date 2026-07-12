import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback',
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      if (!email) {
        return done(new Error('No email associated with this Google account'), null);
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Look for existing user by email
      let user = await User.findOne({ email: normalizedEmail });

      if (user) {
        let updated = false;

        // Link Google ID if not already linked
        if (!user.googleId) {
          user.googleId = profile.id;
          updated = true;
        }

        // Set provider to 'google' if it is local but Google ID was missing, or keep provider local?
        // Usually, keeping provider local or updating it is fine, but we must link it. Let's make sure
        // we set provider as 'google' if it is not 'google' and we are linking. Actually, we can update it or keep it.
        // Let's update provider to 'google' if it is not already set, or leave it. Setting it to 'google' is fine.
        
        // Update avatar if they don't have one
        if (!user.avatar || !user.avatar.url) {
          const photoUrl = profile.photos && profile.photos[0] && profile.photos[0].value;
          if (photoUrl) {
            user.avatar = { url: photoUrl, publicId: '' };
            updated = true;
          }
        }

        // Verify email
        if (!user.emailVerified) {
          user.emailVerified = true;
          updated = true;
        }

        if (updated) {
          await user.save();
        }

        return done(null, user);
      } else {
        // First-time signup via Google
        const photoUrl = profile.photos && profile.photos[0] && profile.photos[0].value;
        const displayName = profile.displayName || profile.name?.givenName || 'Google User';

        user = await User.create({
          name: displayName,
          email: normalizedEmail,
          googleId: profile.id,
          provider: 'google',
          avatar: photoUrl ? { url: photoUrl, publicId: '' } : { url: '', publicId: '' },
          emailVerified: true
        });

        return done(null, user);
      }
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
