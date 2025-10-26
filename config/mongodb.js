import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log("✅ Database Connected"));
        mongoose.connection.on('error', (err) => console.error("❌ Database Error:", err));
        
        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            console.error("❌ MONGO_URI environment variable is not set!");
            throw new Error("MONGO_URI is required");
        }
        
        console.log("🔵 Connecting to MongoDB...");
        console.log("MongoDB URI (masked):", mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
        
        await mongoose.connect(mongoUri);
        console.log("✅ MongoDB connection successful");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        throw error;
    }
}

export default connectDB;

// Do not use '@' symbol in your databse user's password else it will show an error.