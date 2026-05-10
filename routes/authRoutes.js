const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { validateEmail, isAcademicEmail } = require("../utils/emailValidation");
const { logActivity } = require("../middleware/activityLogger");

console.log("✅ authRoutes.js loaded! Routes: /register, /login, /profile/:id");

// @route   POST /api/users/register
// @desc    Register a new user with email validation
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("📝 Register attempt:", { name, email });

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res
        .status(400)
        .json({ success: false, msg: emailValidation.message });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, msg: "User already exists" });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        msg: "Please enter a valid name (at least 2 characters)",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 6 characters",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();
    console.log("✅ User created successfully:", user._id);

    // Log activity
    await logActivity(
      req,
      user._id,
      "register",
      "auth",
      { email: user.email },
      "success",
    );

    res.json({
      success: true,
      msg: "User registered successfully. Please login.",
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ success: false, msg: "User already exists" });
    }
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/users/login
// @desc    Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Login attempt:", email);

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res
        .status(400)
        .json({ success: false, msg: emailValidation.message });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid credentials" });
    }

    // FIXED: Using process.env.JWT_SECRET instead of hardcoded "secretkey"
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Log activity
    await logActivity(
      req,
      user._id,
      "login",
      "auth",
      { email: user.email },
      "success",
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        profilePicture: user.profilePicture || "",
        coverPhoto: user.coverPhoto || "",
        bio: user.bio || "",
        location: user.location || "",
        phone: user.phone || "",
        socialLinks: user.socialLinks || {},
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/users/profile/:id
// @desc    Get user by ID (public profile)
router.get("/profile/:id", async (req, res) => {
  try {
    console.log("👤 Fetching user profile for ID:", req.params.id);

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      console.log("❌ User not found with ID:", req.params.id);
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    console.log("✅ User found:", user.name);
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
