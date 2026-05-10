const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user");
const {
  generateOTP,
  storeOTP,
  verifyOTP,
  resendOTP,
} = require("../utils/otpService");
const { sendOTPEmail } = require("../config/emailService");

// @route   POST /api/password/forgot
// @desc    Send OTP for password reset
// @access  Public
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, msg: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, msg: "No account found with this email" });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log(`🔐 Password reset OTP for ${email}: ${otp}`);

    // Store OTP with email
    storeOTP(email, otp);

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp, user.name);

    if (emailSent) {
      res.json({
        success: true,
        msg: "Password reset OTP sent to your email. Please check your inbox.",
      });
    } else {
      console.log(`\n🔐 PASSWORD RESET OTP: ${otp}\n`);
      res.json({
        success: true,
        msg: "OTP generated. Check your console for the code (email sending failed).",
      });
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/password/verify-otp
// @desc    Verify OTP and proceed to reset password
// @access  Public
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, msg: "Email and OTP are required" });
    }

    // Verify OTP
    const verification = verifyOTP(email, otp);
    if (!verification.valid) {
      return res
        .status(400)
        .json({ success: false, msg: verification.message });
    }

    // Generate a temporary reset token (valid for 15 minutes)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    res.json({
      success: true,
      msg: "OTP verified. You can now reset your password.",
      resetToken: resetToken,
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/password/reset
// @desc    Reset password with token
// @access  Public
router.post("/reset", async (req, res) => {
  try {
    const { resetToken, password, confirmPassword } = req.body;

    if (!resetToken || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, msg: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, msg: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          msg: "Password must be at least 6 characters",
        });
    }

    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "Invalid or expired reset token. Please request a new OTP.",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = "";
    user.resetPasswordExpires = null;
    await user.save();

    console.log(`✅ Password reset successfully for: ${user.email}`);

    res.json({
      success: true,
      msg: "Password has been reset successfully! Please login with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
