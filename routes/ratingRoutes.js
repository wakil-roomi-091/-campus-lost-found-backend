const express = require("express");
const router = express.Router();
const Rating = require("../models/Rating");
const Item = require("../models/item");
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");

// @route   POST /api/ratings
// @desc    Submit a rating for a user
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { toUserId, itemId, rating, review } = req.body;
    const fromUserId = req.user.id;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, msg: "Rating must be between 1 and 5" });
    }

    // Check if rating already exists for this transaction
    const existingRating = await Rating.findOne({
      fromUserId,
      toUserId,
      itemId,
    });
    if (existingRating) {
      return res
        .status(400)
        .json({
          success: false,
          msg: "You have already rated this transaction",
        });
    }

    // Check if user is trying to rate themselves
    if (fromUserId === toUserId) {
      return res
        .status(400)
        .json({ success: false, msg: "You cannot rate yourself" });
    }

    // Check if item exists and is completed
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, msg: "Item not found" });
    }

    // Create rating
    const ratingDoc = new Rating({
      fromUserId,
      toUserId,
      itemId,
      rating,
      review: review || "",
      transactionCompleted: true,
    });

    await ratingDoc.save();

    // Update item transaction status
    item.transactionCompleted = true;
    item.completedWithUserId = toUserId;
    await item.save();

    // Update user's average rating
    const userRatings = await Rating.find({ toUserId, isDeleted: false });
    const avgRating =
      userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

    await User.findByIdAndUpdate(toUserId, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: userRatings.length,
    });

    res.json({
      success: true,
      msg: "Rating submitted successfully",
      rating: ratingDoc,
    });
  } catch (err) {
    console.error("Submit rating error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/ratings/user/:userId
// @desc    Get all ratings for a user
// @access  Public
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const ratings = await Rating.find({ toUserId: userId, isDeleted: false })
      .populate("fromUserId", "name profilePicture")
      .populate("itemId", "itemName type")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments({
      toUserId: userId,
      isDeleted: false,
    });

    res.json({
      success: true,
      ratings,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get ratings error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/ratings/item/:itemId
// @desc    Get rating for a specific item
// @access  Public
router.get("/item/:itemId", async (req, res) => {
  try {
    const rating = await Rating.findOne({ itemId: req.params.itemId })
      .populate("fromUserId", "name profilePicture")
      .populate("toUserId", "name profilePicture");

    res.json({ success: true, rating });
  } catch (err) {
    console.error("Get item rating error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   DELETE /api/ratings/:id
// @desc    Delete/Report a rating (admin only)
// @access  Private/Admin
router.delete("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, msg: "Admin access required" });
    }

    const rating = await Rating.findById(req.params.id);
    if (!rating) {
      return res.status(404).json({ success: false, msg: "Rating not found" });
    }

    rating.isDeleted = true;
    await rating.save();

    res.json({ success: true, msg: "Rating removed successfully" });
  } catch (err) {
    console.error("Delete rating error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
