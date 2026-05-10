const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/user");
const { logActivity } = require("../middleware/activityLogger");

// @route   POST /api/users/block
// @desc    Block a user
// @access  Private
router.post("/block", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res
        .status(400)
        .json({ success: false, msg: "You cannot block yourself" });
    }

    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const currentUser = await User.findById(currentUserId);

    if (!currentUser.blockedUsers) {
      currentUser.blockedUsers = [];
    }

    if (!currentUser.blockedUsers.includes(userId)) {
      currentUser.blockedUsers.push(userId);
      await currentUser.save();
    }

    await logActivity(
      req,
      currentUserId,
      "block_user",
      "user",
      { blockedUserId: userId, blockedUserName: userToBlock.name },
      "success",
    );

    res.json({ success: true, message: "User blocked successfully" });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/users/unblock
// @desc    Unblock a user
// @access  Private
router.post("/unblock", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);

    if (currentUser.blockedUsers) {
      currentUser.blockedUsers = currentUser.blockedUsers.filter(
        (id) => id.toString() !== userId,
      );
      await currentUser.save();
    }

    await logActivity(
      req,
      currentUserId,
      "unblock_user",
      "user",
      { unblockedUserId: userId },
      "success",
    );

    res.json({ success: true, message: "User unblocked successfully" });
  } catch (err) {
    console.error("Error unblocking user:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/users/blocked
// @desc    Get list of blocked users
// @access  Private
router.get("/blocked", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).populate(
      "blockedUsers",
      "name email profilePicture",
    );

    res.json({ success: true, blockedUsers: currentUser.blockedUsers || [] });
  } catch (err) {
    console.error("Error fetching blocked users:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/users/profile/:id
// @desc    Get user profile by ID
// @access  Public
router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires -blockedUsers",
    );

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Test route
router.get("/test", (req, res) => {
  res.json({ success: true, message: "User routes are working!" });
});

module.exports = router;
