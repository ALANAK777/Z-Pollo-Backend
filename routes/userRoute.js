import express from 'express';
import {
  loginUser,
  registerUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentRazorpay,
  verifyRazorpay,
  paymentStripe,
  verifyStripe,
  getNotifications,
  googleLoginSuccess, // 👈 controller that handles JWT + redirect
} from '../controllers/userController.js';

import upload from '../middleware/multer.js';
import authUser from '../middleware/authUser.js';
import passport from '../config/passport.js';

const userRouter = express.Router();

// 🟡 Google OAuth Routes
userRouter.get(
  "/auth/google",
  (req, res, next) => {
    console.log("🔵 Step 1: Initiating Google OAuth");
    console.log("Backend URL:", process.env.BACKEND_URL);
    console.log("Frontend URL:", process.env.FRONTEND_URL);
    console.log("Client ID:", process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing");
    console.log("Client Secret:", process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing");
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

userRouter.get(
  "/auth/google/callback",
  (req, res, next) => {
    console.log("🔵 Step 2: Google OAuth callback received");
    console.log("Query params:", req.query);
    console.log("Callback URL configured:", `${process.env.BACKEND_URL}/api/user/auth/google/callback`);
    
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err) {
        console.error("❌ Step 3: Passport authenticate error:", err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=GoogleAuthError&msg=${encodeURIComponent(err.message)}`);
      }
      if (!user) {
        console.error("❌ Step 3: No user returned from Google OAuth");
        console.error("Info:", info);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=NoUserFound`);
      }
      console.log("✅ Step 3: User authenticated successfully");
      console.log("User ID:", user._id);
      console.log("User email:", user.email);
      req.user = user;
      next();
    })(req, res, next);
  },
  googleLoginSuccess
);

// 🔐 Normal Auth Routes
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

userRouter.get("/get-profile", authUser, getProfile);
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile);
userRouter.post("/book-appointment", authUser, bookAppointment);
userRouter.get("/appointments", authUser, listAppointment);
userRouter.post("/cancel-appointment", authUser, cancelAppointment);
userRouter.post("/payment-razorpay", authUser, paymentRazorpay);
userRouter.post("/verifyRazorpay", authUser, verifyRazorpay);
userRouter.post("/payment-stripe", authUser, paymentStripe);
userRouter.post("/verifyStripe", authUser, verifyStripe);

userRouter.post("/get-notifications", authUser, getNotifications);

export default userRouter;
