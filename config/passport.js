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
          user = await userModel.create({
            googleId: profile.id,
            provider: "google",
            name: profile.displayName,
            email: profile.emails[0].value,
            image: profile.photos[0].value,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
          });
        } else {
          // Update tokens if user exists
          user.googleAccessToken = accessToken;
          user.googleRefreshToken = refreshToken;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error(err);
        done(err, null);
      }
    }
  )
);

export default passport;
