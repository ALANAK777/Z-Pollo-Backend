import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['booking', 'cancellation', 'confirmation', 'doctor_cancel'], required: true },
  isRead: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

const notificationModel = mongoose.model("Notification", notificationSchema);

export default notificationModel;
