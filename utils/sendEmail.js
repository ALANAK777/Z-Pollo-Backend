import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email config not set, skipping send');
    return;
  }

  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };
    await transporter.sendMail(mailOptions);
    console.log('Email sent to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Specific notification functions
export const notifyDoctorOfBooking = async (doctorEmail, patientName, slotDate, slotTime, description) => {
  const subject = 'New Appointment Booked';
  const text = `A new appointment has been booked by ${patientName} on ${slotDate} at ${slotTime}. Description: ${description || 'None'}.`;
  await sendEmail(doctorEmail, subject, text);
};

export const notifyDoctorOfPatientCancel = async (doctorEmail, patientName, slotDate, slotTime) => {
  const subject = 'Appointment Cancelled by Patient';
  const text = `The appointment on ${slotDate} at ${slotTime} has been cancelled by the patient ${patientName}.`;
  await sendEmail(doctorEmail, subject, text);
};

export const notifyPatientOfConfirmation = async (patientEmail, doctorName, slotDate, slotTime) => {
  const subject = 'Appointment Confirmed';
  const text = `Your appointment with Dr. ${doctorName} on ${slotDate} at ${slotTime} has been confirmed/completed.`;
  await sendEmail(patientEmail, subject, text);
};

export const notifyPatientOfDoctorCancel = async (patientEmail, doctorName, slotDate, slotTime) => {
  const subject = 'Appointment Cancelled by Doctor';
  const text = `Your appointment with Dr. ${doctorName} on ${slotDate} at ${slotTime} has been cancelled by the doctor.`;
  await sendEmail(patientEmail, subject, text);
};

export default sendEmail;
