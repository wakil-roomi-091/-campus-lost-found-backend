const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const {
  generateOTP,
  storeOTP,
  verifyOTP,
  resendOTP,
} = require("../utils/otpService");
const { sendOTPEmail } = require("../config/emailServiceBrevo");
const { validateEmail } = require("../utils/emailValidation");

// Store OTP in memory (in production, use database)
const otpStore = new Map();

// @route   POST /api/otp/send
// @desc    Send OTP for email verification
// @access  Public
router.post("/send", async (req, res) => {
  try {
    const { email, name } = req.body;

    console.log(`📝 OTP Request for: ${email}`);

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res
        .status(400)
        .json({ success: false, msg: emailValidation.message });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, msg: "User already exists with this email" });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log(`🔐 Generated OTP for ${email}: ${otp}`);

    // Store OTP
    storeOTP(email, otp);

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp, name);

    if (emailSent) {
      res.json({
        success: true,
        msg: "Verification code sent to your email. Please check your inbox.",
      });
    } else {
      // Still return success but with warning (OTP is in console for testing)
      res.json({
        success: true,
        msg: "Verification code generated. Check your console for the code (email sending failed).",
      });
    }
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/otp/verify
// @desc    Verify OTP and complete registration
// @access  Public
router.post("/verify", async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;

    console.log(`🔐 Verifying OTP for ${email}`);

    // Verify OTP
    const verification = verifyOTP(email, otp);
    if (!verification.valid) {
      return res
        .status(400)
        .json({ success: false, msg: verification.message });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, msg: "User already exists" });
    }

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 6 characters",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      isEmailVerified: true,
    });

    await user.save();

    console.log(`✅ User registered and verified: ${email}`);

    res.json({
      success: true,
      msg: "Registration successful! Please login.",
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/otp/resend
// @desc    Resend OTP
// @access  Public
router.post("/resend", async (req, res) => {
  try {
    const { email, name } = req.body;

    // Generate new OTP
    const newOTP = resendOTP(email);
    console.log(`🔄 Resending OTP for ${email}: ${newOTP}`);

    // Send new OTP
    const emailSent = await sendOTPEmail(email, newOTP, name);

    res.json({
      success: true,
      msg: "New verification code sent to your email.",
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
