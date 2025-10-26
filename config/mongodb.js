import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const connectDB = async () => {

    mongoose.connection.on('connected', () => console.log("Database Connected"))
   await mongoose.connect("mongodb://127.0.0.1:27017/prescripto");

}

export default connectDB;

// Do not use '@' symbol in your databse user's password else it will show an error.