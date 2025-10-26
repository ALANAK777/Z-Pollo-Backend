import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import doctorModel from "../models/doctorModel.js";

dotenv.config();

const doctors = [
  {
    name: "Dr. Kesavan King",
    email: "kesavanking070@gmail.com",
    password: "password123",
    speciality: "Neurologist",
    degree: "MD",
    experience: "13 years",
    about: "Neurologist specializing in nervous system disorders and patient recovery.",
    fees: 200,
    address: { street: "12 Brain Care Rd", city: "Madurai", state: "Tamil Nadu", zip: "625002" }
  },
  {
    name: "Dr. Baranidharan",
    email: "baranidharan2910@gmail.com",
    password: "password123",
    speciality: "General Physician",
    degree: "MBBS",
    experience: "9 years",
    about: "Experienced physician focusing on preventive and primary healthcare.",
    fees: 110,
    address: { street: "45 Health St", city: "Erode", state: "Tamil Nadu", zip: "638001" }
  },
  {
    name: "Dr. Palani Kathirvel",
    email: "palanikathirvel05@gmail.com",
    password: "password123",
    speciality: "Dermatologist",
    degree: "MD",
    experience: "8 years",
    about: "Dermatologist specializing in skincare, acne, and cosmetic treatments.",
    fees: 140,
    address: { street: "88 Glow Ave", city: "Coimbatore", state: "Tamil Nadu", zip: "641001" }
  },
  {
    name: "Dr. Aathi Vishnu",
    email: "aathivishnu2006@gmail.com",
    password: "password123",
    speciality: "Pediatrician",
    degree: "MD",
    experience: "10 years",
    about: "Dedicated pediatrician focused on child wellness and preventive care.",
    fees: 130,
    address: { street: "21 Kids Care Rd", city: "Tirunelveli", state: "Tamil Nadu", zip: "627001" }
  },
  {
    name: "Dr. Aathi Vishnu",
    email: "aathivishnu15@gmail.com",
    password: "password123",
    speciality: "Gastroenterologist",
    degree: "MD",
    experience: "9 years",
    about: "Specialist in digestive system disorders and advanced endoscopic care.",
    fees: 180,
    address: { street: "33 Digestive Blvd", city: "Salem", state: "Tamil Nadu", zip: "636001" }
  },
  {
    name: "Dr. Raguram",
    email: "raguram4023@gmail.com",
    password: "password123",
    speciality: "Dermatologist",
    degree: "MD",
    experience: "7 years",
    about: "Dermatologist with expertise in skin rejuvenation and allergy care.",
    fees: 120,
    address: { street: "89 Skin Care Rd", city: "Thanjavur", state: "Tamil Nadu", zip: "613001" }
  },
  {
    name: "Dr. Lordson Jabez",
    email: "lordsonj21@gmail.com",
    password: "password123",
    speciality: "Neurologist",
    degree: "MD",
    experience: "14 years",
    about: "Neurologist focusing on brain and spine disorders with patient-first approach.",
    fees: 210,
    address: { street: "10 Mind Health Ave", city: "Vellore", state: "Tamil Nadu", zip: "632001" }
  },
  {
    name: "Dr. M Ganesh Ram",
    email: "mganeshram2005@gmail.com",
    password: "password123",
    speciality: "General Physician",
    degree: "MBBS",
    experience: "8 years",
    about: "General physician passionate about patient wellness and preventive care.",
    fees: 100,
    address: { street: "77 Care Ln", city: "Namakkal", state: "Tamil Nadu", zip: "637001" }
  },
  {
    name: "Dr. Ganesh Bavana",
    email: "ganeshbavana26@gmail.com",
    password: "password123",
    speciality: "Pediatrician",
    degree: "MD",
    experience: "12 years",
    about: "Caring pediatrician providing holistic care for children of all ages.",
    fees: 135,
    address: { street: "18 Smile Rd", city: "Dindigul", state: "Tamil Nadu", zip: "624001" }
  },
  {
    name: "Dr. Suresh Reddy",
    email: "gsureshreddy2005@gmail.com",
    password: "password123",
    speciality: "Gastroenterologist",
    degree: "MD",
    experience: "10 years",
    about: "Gastroenterologist with expertise in liver and intestinal disorders.",
    fees: 175,
    address: { street: "34 Wellness Blvd", city: "Trichy", state: "Tamil Nadu", zip: "620001" }
  },
  {
    name: "Dr. K N Kanthasamy",
    email: "knkanthasamythef@gmail.com",
    password: "password123",
    speciality: "Gynecologist",
    degree: "MD",
    experience: "9 years",
    about: "Experienced gynecologist focusing on reproductive health and fertility.",
    fees: 160,
    address: { street: "99 Care St", city: "Karur", state: "Tamil Nadu", zip: "639001" }
  }
];

async function addDoctors() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await doctorModel.deleteMany({});
    console.log("🗑️ Old doctors cleared.");

    for (const doc of doctors) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(doc.password, salt);
      const doctorData = {
        ...doc,
        password: hashedPassword,
        image: "/assets/default-doctor.png",
        available: true,
        slots_booked: {},
        date: Date.now(),
      };
      const newDoctor = new doctorModel(doctorData);
      await newDoctor.save();
      console.log(`✅ Added doctor: ${doc.name}`);
    }

    console.log("🎉 All 12 randomized doctors added successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding doctors:", error);
    process.exit(1);
  }
}

addDoctors();
