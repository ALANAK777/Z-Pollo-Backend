import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import notificationModel from "../models/notificationModel.js";
import { v2 as cloudinary } from "cloudinary";
import Stripe from "stripe";
import Razorpay from "razorpay";
import { notifyDoctorOfBooking, notifyDoctorOfPatientCancel } from "../utils/sendEmail.js";
import { createCalendarEvent, deleteCalendarEvent } from "../utils/googleCalendar.js";

// ------------------ Payment Gateway Initialize ------------------ //
let stripeInstance = null;
let razorpayInstance = null;

if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "dummy_stripe_key") {
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
}

if (
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  process.env.RAZORPAY_KEY_ID !== "dummy_key"
) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ------------------ User APIs ------------------ //

// Register
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please enter a valid email" });
    }

    if (password.length < 8) {
      return res.json({ success: false, message: "Please enter a strong password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = { name, email, password: hashedPassword };
    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Get Profile
const getProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    const userData = await userModel.findById(userId).select("-password");

    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { userId, name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      await userModel.findByIdAndUpdate(userId, { image: imageUpload.secure_url });
    }

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Book Appointment
const bookAppointment = async (req, res) => {
  try {
    const { userId, docId, slotDate, slotTime, description } = req.body;
    const docData = await doctorModel.findById(docId).select("-password");

    if (!docData.available) {
      return res.json({ success: false, message: "Doctor Not Available" });
    }

    let slots_booked = docData.slots_booked;
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot Not Available" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [slotTime];
    }

    const userData = await userModel.findById(userId).select("-password");
    delete docData.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
      description: description || ''
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    // Validate and parse date
    const [day, month, year] = slotDate.split('_');
    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const startDateTimeObj = new Date(`${dateStr}T${slotTime}`);
    if (isNaN(startDateTimeObj.getTime())) {
      return res.json({ success: false, message: "Invalid time slot" });
    }
    const startDateTime = startDateTimeObj.toISOString();
    const endDateTime = new Date(startDateTimeObj.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour appointment

    const eventId = await createCalendarEvent(userId, {
      summary: `Appointment with Dr. ${docData.name}`,
      description: `Medical appointment. ${description || ''}`,
      startDateTime,
      endDateTime,
    });

    if (eventId) {
      await appointmentModel.findByIdAndUpdate(newAppointment._id, { calendarEventId: eventId });
    }

    // Notify doctor of new booking
    await notifyDoctorOfBooking(docData.email, userData.name, slotDate, slotTime, description);

    // Create notification for doctor
    await notificationModel.create({
      userId: docId,
      message: `New appointment booked by ${userData.name} on ${slotDate} at ${slotTime}.`,
      type: 'booking'
    });

    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Cancel Appointment
const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (appointmentData.userId !== userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);

    let slots_booked = doctorData.slots_booked;
    slots_booked[slotDate] = slots_booked[slotDate].filter((e) => e !== slotTime);

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    // Delete Google Calendar event if it exists
    if (appointmentData.calendarEventId) {
      await deleteCalendarEvent(userId, appointmentData.calendarEventId);
    }

    // Notify doctor of patient cancellation
    await notifyDoctorOfPatientCancel(appointmentData.docData.email, appointmentData.userData.name, appointmentData.slotDate, appointmentData.slotTime);

    // Create notification for doctor
    await notificationModel.create({
      userId: docId,
      message: `Appointment cancelled by ${appointmentData.userData.name} on ${appointmentData.slotDate} at ${appointmentData.slotTime}.`,
      type: 'cancellation'
    });

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// List Appointments
const listAppointment = async (req, res) => {
  try {
    const { userId } = req.body;
    const appointments = await appointmentModel.find({ userId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Payment with Razorpay
const paymentRazorpay = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData || appointmentData.cancelled) {
      return res.json({ success: false, message: "Appointment Cancelled or not found" });
    }

    if (!razorpayInstance) {
      // Local dev fake response
      return res.json({
        success: true,
        message: "Payment skipped in local dev mode",
        order: {
          id: "order_dummy_123",
          amount: appointmentData.amount * 100,
          currency: process.env.CURRENCY || "INR",
        },
      });
    }

    const options = {
      amount: appointmentData.amount * 100,
      currency: process.env.CURRENCY || "INR",
      receipt: appointmentId,
    };

    const order = await razorpayInstance.orders.create(options);

    res.json({ success: true, order });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Verify Razorpay
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;

    if (!razorpayInstance) {
      // In local dev just mark as paid
      await appointmentModel.findByIdAndUpdate(req.body.appointmentId, { payment: true });
      return res.json({ success: true, message: "Payment Successful (Local Dev)" });
    }

    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

    if (orderInfo.status === "paid") {
      await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true });
      res.json({ success: true, message: "Payment Successful" });
    } else {
      res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Payment with Stripe
const paymentStripe = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { origin } = req.headers;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData || appointmentData.cancelled) {
      return res.json({ success: false, message: "Appointment Cancelled or not found" });
    }

    if (!stripeInstance) {
      return res.json({
        success: true,
        message: "Stripe payment skipped in local dev",
        session_url: `${origin}/verify?success=true&appointmentId=${appointmentId}`,
      });
    }

    const currency = (process.env.CURRENCY || "INR").toLowerCase();

    const line_items = [
      {
        price_data: {
          currency,
          product_data: { name: "Appointment Fees" },
          unit_amount: appointmentData.amount * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
      cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
      line_items,
      mode: "payment",
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Verify Stripe
const verifyStripe = async (req, res) => {
  try {
    const { appointmentId, success } = req.body;

    if (success === "true") {
      await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true });
      return res.json({ success: true, message: "Payment Successful" });
    }

    res.json({ success: false, message: "Payment Failed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Get User Notifications
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.body;
    const notifications = await notificationModel.find({ userId }).sort({ date: -1 });
    res.json({ success: true, notifications });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ------------------ Google OAuth ------------------ //
const googleLoginSuccess = async (req, res) => {
  try {
    if (!req.user) {
      console.error("❌ No user in req.user after Google OAuth");
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=AuthenticationFailed`);
    }

    const user = req.user; // Passport already sets req.user to the DB user

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth-success?token=${token}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("❌ Google Login Success Error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=GoogleLoginFailed`);
  }
};


export {
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
  googleLoginSuccess,   
};

