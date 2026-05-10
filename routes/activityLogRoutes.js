const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLog");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

// @route   GET /api/activity-logs
// @desc    Get all activity logs (admin only)
// @access  Private/Admin
router.get("/", auth, admin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      actionType,
      userId,
      startDate,
      endDate,
    } = req.query;

    let filter = {};
    if (action) filter.action = action;
    if (actionType) filter.actionType = actionType;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "name email");

    const total = await ActivityLog.countDocuments(filter);

    res.json({
      success: true,
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get activity logs error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/activity-logs/stats
// @desc    Get activity statistics
// @access  Private/Admin
router.get("/stats", auth, admin, async (req, res) => {
  try {
    const totalLogs = await ActivityLog.countDocuments();
    const uniqueUsers = await ActivityLog.distinct("userId");
    const actionCounts = await ActivityLog.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const last7Days = await ActivityLog.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalLogs,
        uniqueUsers: uniqueUsers.length,
        actionCounts,
        last7Days,
      },
    });
  } catch (err) {
    console.error("Get activity stats error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   DELETE /api/activity-logs
// @desc    Clear old activity logs (admin only)
// @access  Private/Admin
router.delete("/", auth, admin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await ActivityLog.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    res.json({
      success: true,
      msg: `Deleted ${result.deletedCount} logs older than ${days} days`,
    });
  } catch (err) {
    console.error("Clear logs error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
