const express = require("express");
const router = express.Router();
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");
const { logActivity } = require("../middleware/activityLogger");

// @route   PUT /api/profile/update
// @desc    Update user profile (name, bio, location, phone, socialLinks)
// @access  Private
router.put("/update", auth, async (req, res) => {
  try {
    const { name, bio, location, phone, socialLinks } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (phone !== undefined) updateData.phone = phone;
    if (socialLinks) updateData.socialLinks = socialLinks;

    console.log("Updating user profile with data:", updateData);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true },
    ).select("-password");

    console.log("Updated user:", user);

    // Log activity
    await logActivity(
      req,
      req.user.id,
      "update_profile",
      "profile",
      {
        updatedFields: Object.keys(updateData),
      },
      "success",
    );

    res.json({ success: true, user });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/profile/picture
// @desc    Update profile picture URL
// @access  Private
router.post("/picture", auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res
        .status(400)
        .json({ success: false, msg: "No image URL provided" });
    }

    console.log("Updating profile picture:", imageUrl);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: imageUrl },
      { new: true },
    ).select("-password");

    res.json({
      success: true,
      profilePicture: imageUrl,
      user,
    });
  } catch (err) {
    console.error("Profile picture update error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/profile/cover
// @desc    Update cover photo URL
// @access  Private
router.post("/cover", auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res
        .status(400)
        .json({ success: false, msg: "No image URL provided" });
    }

    console.log("Updating cover photo:", imageUrl);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { coverPhoto: imageUrl },
      { new: true },
    ).select("-password");

    res.json({
      success: true,
      coverPhoto: imageUrl,
      user,
    });
  } catch (err) {
    console.error("Cover photo update error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ========== NEW: BLOCK/UNBLOCK FUNCTIONALITY ==========

// @route   POST /api/profile/block
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

    // Log activity
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

// @route   POST /api/profile/unblock
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

    // Log activity
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

// @route   GET /api/profile/blocked
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

module.exports = router;
