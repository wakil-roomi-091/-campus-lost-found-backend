const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/user");
const Report = require("../models/Report");

// ========== USER REPORT ROUTES ==========

// Report a user
router.post("/user", auth, async (req, res) => {
  try {
    const { reportedUserId, reason } = req.body;
    const reporterId = req.user.id;

    if (reportedUserId === reporterId) {
      return res
        .status(400)
        .json({ success: false, msg: "You cannot report yourself" });
    }

    const userToReport = await User.findById(reportedUserId);
    if (!userToReport) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const existingReport = await Report.findOne({
      reporterId,
      reportedUserId,
      type: "user",
      status: "pending",
    });

    if (existingReport) {
      return res
        .status(400)
        .json({ success: false, msg: "You have already reported this user" });
    }

    const report = new Report({
      reporterId,
      reportedUserId,
      reason: reason || "Inappropriate behavior",
      type: "user",
    });

    await report.save();

    res.json({
      success: true,
      message: "User reported successfully. Our team will review it.",
    });
  } catch (err) {
    console.error("Error reporting user:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Report a message
router.post("/message", auth, async (req, res) => {
  try {
    const { messageId, messageContent, reportedUserId } = req.body;
    const reporterId = req.user.id;

    const existingReport = await Report.findOne({
      reporterId,
      messageId,
      type: "message",
    });

    if (existingReport) {
      return res
        .status(400)
        .json({
          success: false,
          msg: "You have already reported this message",
        });
    }

    const report = new Report({
      reporterId,
      reportedUserId,
      messageId,
      messageContent: messageContent || "",
      reason: "Inappropriate message",
      type: "message",
    });

    await report.save();

    res.json({
      success: true,
      message: "Message reported successfully. Our team will review it.",
    });
  } catch (err) {
    console.error("Error reporting message:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ========== ADMIN ROUTES ==========

// Get all reports (Admin only)
router.get("/admin/all", auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, msg: "Admin access required" });
    }

    const reports = await Report.find()
      .populate("reporterId", "name email profilePicture")
      .populate("reportedUserId", "name email profilePicture")
      .sort({ createdAt: -1 });

    const counts = {
      pending: await Report.countDocuments({ status: "pending" }),
      reviewed: await Report.countDocuments({ status: "reviewed" }),
      resolved: await Report.countDocuments({ status: "resolved" }),
      dismissed: await Report.countDocuments({ status: "dismissed" }),
      total: await Report.countDocuments(),
    };

    res.json({ success: true, reports, counts });
  } catch (err) {
    console.error("Get reports error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Update report status (Admin only)
router.put("/admin/:reportId/status", auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, msg: "Admin access required" });
    }

    const { status, adminNotes } = req.body;
    const { reportId } = req.params;

    const report = await Report.findByIdAndUpdate(
      reportId,
      { status, adminNotes, reviewedAt: new Date(), reviewedBy: req.user.id },
      { new: true },
    );

    res.json({ success: true, report, message: `Report marked as ${status}` });
  } catch (err) {
    console.error("Update report status error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Get single report details (Admin only)
router.get("/admin/:reportId", auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, msg: "Admin access required" });
    }

    const report = await Report.findById(req.params.reportId)
      .populate("reporterId", "name email profilePicture")
      .populate("reportedUserId", "name email profilePicture");

    if (!report) {
      return res.status(404).json({ success: false, msg: "Report not found" });
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error("Get report error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Test route
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Report routes are working!" });
});

module.exports = router;
