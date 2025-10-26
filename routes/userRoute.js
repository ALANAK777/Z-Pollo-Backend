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
  passport.authenticate("google", { scope: ["profile", "email"] })
);

userRouter.get(
  "/auth/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err) {
        console.error("❌ Passport authenticate error:", err);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=GoogleAuthError`);
      }
      if (!user) {
        console.error("❌ No user returned from Google OAuth");
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=NoUserFound`);
      }
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
