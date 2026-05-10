const nodemailer = require("nodemailer");

// Use your Brevo SMTP credentials
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "a82dc3001@smtp-brevo.com", // Your Brevo SMTP login (NOT your email)
    pass: process.env.BREVO_SMTP_KEY, // Use your SMTP key, not API key
  },
});

const sendOTPEmail = async (email, otp, userName) => {
  try {
    console.log(`📧 Sending OTP to ${email} via Brevo SMTP...`);

    const mailOptions = {
      from: '"Campus Lost & Found" <wakila971@gmail.com>',
      to: email,
      subject: "Email Verification - Campus Lost & Found",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Campus Lost & Found</h1>
                    </div>
                    <div style="padding: 30px; background: white;">
                        <h2>Email Verification</h2>
                        <p>Hello <strong>${userName}</strong>,</p>
                        <p>Your verification code is: <strong style="font-size: 24px;">${otp}</strong></p>
                        <p>This code expires in 5 minutes.</p>
                    </div>
                </div>
            `,
      text: `Your verification code is: ${otp}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error("❌ Email error:", err.message);
    return false;
  }
};

module.exports = { sendOTPEmail };
