import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../models/userModel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/user/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await userModel.findOne({ googleId: profile.id });

        if (!user) {
          // Check if user with same email exists
          const existingUser = await userModel.findOne({ email: profile.emails[0].value });
          
          if (existingUser) {
            // Link Google account to existing user
            existingUser.googleId = profile.id;
            existingUser.provider = "google";
            existingUser.googleAccessToken = accessToken;
            existingUser.googleRefreshToken = refreshToken;
            if (!existingUser.image || existingUser.image.startsWith('data:image')) {
              existingUser.image = profile.photos[0].value;
            }
            await existingUser.save();
            return done(null, existingUser);
          }

          // Create new user
          user = await userModel.create({
            googleId: profile.id,
            provider: "google",
            name: profile.displayName,
            email: profile.emails[0].value,
            image: profile.photos[0].value,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            password: undefined, // No password for Google users
          });
        } else {
          // Update tokens if user exists
          user.googleAccessToken = accessToken;
          user.googleRefreshToken = refreshToken;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ Google OAuth Error:", err);
        done(err, null);
      }
    }
  )
);

export default passport;
