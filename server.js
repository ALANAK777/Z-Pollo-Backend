import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import adminRouter from "./routes/adminRoute.js";
import passport from "./config/passport.js";

// ============================
//  App Configuration
// ============================
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to DB & Cloudinary
connectDB();
connectCloudinary();

// ============================
//  Middlewares
// ============================

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://z-pollo-frontend.vercel.app",
  "https://z-pollo-admin.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ Blocked by CORS: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/public", express.static("public"));
app.use(passport.initialize());

// ============================
//  Routes
// ============================
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);

// Health check route
app.get("/", (req, res) => {
  res.send("✅ Prescripto API is running...");
});

// ============================
//  Start Server
// ============================
app.listen(PORT, () => {
  console.log(`🚀 Backend is running on port ${PORT}`);
  console.log(`✅ API available at http://localhost:${PORT}`);
});
