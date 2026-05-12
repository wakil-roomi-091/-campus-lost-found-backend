const nodemailer = require("nodemailer");

// Configure email transporter (using Gmail as example)
// For production, use your own email service
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your app password
  },
});

const sendResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `https://campus-lost-found-frontend-xeac.vercel.app/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"Campus Lost & Found" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Campus Lost & Found</h2>
                <h3>Password Reset Request</h3>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>This link will expire in <strong>1 hour</strong>.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">&copy; 2024 Campus Lost & Found. All rights reserved.</p>
            </div>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("❌ Email send error:", err);
    return false;
  }
};

module.exports = { sendResetEmail };
