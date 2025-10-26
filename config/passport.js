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
        console.log("✅ Google OAuth callback received");
        console.log("📧 Email:", profile.emails[0].value);
        console.log("👤 Google ID:", profile.id);
        
        let user = await userModel.findOne({ googleId: profile.id });

        if (!user) {
          console.log("🔍 No user found with Google ID, checking email...");
          // Check if user with same email exists
          const existingUser = await userModel.findOne({ email: profile.emails[0].value });
          
          if (existingUser) {
            console.log("📎 Linking Google account to existing user");
            // Link Google account to existing user
            existingUser.googleId = profile.id;
            existingUser.provider = "google";
            existingUser.googleAccessToken = accessToken;
            existingUser.googleRefreshToken = refreshToken;
            if (!existingUser.image || existingUser.image.startsWith('data:image')) {
              existingUser.image = profile.photos[0].value;
            }
            await existingUser.save();
            console.log("✅ Successfully linked Google account");
            return done(null, existingUser);
          }

          console.log("➕ Creating new user");
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
          console.log("✅ New user created successfully");
        } else {
          console.log("🔄 Updating existing Google user tokens");
          // Update tokens if user exists
          user.googleAccessToken = accessToken;
          user.googleRefreshToken = refreshToken;
          await user.save();
          console.log("✅ Tokens updated successfully");
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ Google OAuth Error:", err);
        console.error("Error details:", err.message);
        console.error("Error stack:", err.stack);
        done(err, null);
      }
    }
  )
);

export default passport;
