import mongoose from "mongoose";
import dotenv from "dotenv";
import doctorModel from "../models/doctorModel.js";

dotenv.config();

async function clearDoctorEmails() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/prescripto");

    // Delete all doctors
    const result = await doctorModel.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} doctors from the database.`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing doctor emails:", error);
    process.exit(1);
  }
}

clearDoctorEmails();
