const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const Item = require("../models/item");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

// ========== USER MANAGEMENT ==========

// Get all users (admin only)
router.get("/users", auth, admin, async (req, res) => {
  try {
    console.log("📋 Admin fetching all users...");
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    console.log(`✅ Found ${users.length} users`);
    res.json({ success: true, users });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Get single user (admin only)
router.get("/users/:id", auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Update user role (admin only)
router.put("/users/:id/role", auth, admin, async (req, res) => {
  try {
    const { role } = req.body;
    console.log(`📝 Admin updating user ${req.params.id} role to ${role}`);

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ success: false, msg: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    console.log(`✅ User role updated successfully`);
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Error updating user role:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Delete user (admin only)
router.delete("/users/:id", auth, admin, async (req, res) => {
  try {
    console.log(`🗑️ Admin deleting user ${req.params.id}...`);

    // First delete all items by this user
    await Item.deleteMany({ userId: req.params.id });
    console.log(`✅ Deleted all items for user ${req.params.id}`);

    // Then delete the user
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    console.log(`✅ User deleted successfully`);
    res.json({ success: true, msg: "User and all their items deleted" });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ========== ITEM MANAGEMENT ==========

// Get all items (admin only)
router.get("/items", auth, admin, async (req, res) => {
  try {
    console.log("📋 Admin fetching all items...");
    const items = await Item.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    console.log(`✅ Found ${items.length} items`);
    res.json({ success: true, items });
  } catch (err) {
    console.error("❌ Error fetching items:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Delete any item (admin only)
router.delete("/items/:id", auth, admin, async (req, res) => {
  try {
    console.log(`🗑️ Admin deleting item ${req.params.id}...`);
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, msg: "Item not found" });
    }
    console.log(`✅ Item deleted successfully`);
    res.json({ success: true, msg: "Item deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting item:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Get stats (admin only)
router.get("/stats", auth, admin, async (req, res) => {
  try {
    console.log("📊 Admin fetching stats...");

    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: "lost" });
    const foundItems = await Item.countDocuments({ type: "found" });
    const resolvedItems = await Item.countDocuments({ status: "resolved" });
    const activeItems = await Item.countDocuments({ status: "active" });

    const stats = {
      totalUsers,
      totalItems,
      lostItems,
      foundItems,
      resolvedItems,
      activeItems,
    };

    console.log("✅ Stats:", stats);
    res.json({ success: true, stats });
  } catch (err) {
    console.error("❌ Error fetching stats:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ========== HEALTH & REPORTS ==========

// Get system health data
router.get("/health", auth, admin, async (req, res) => {
  try {
    // Get database stats
    const dbStats = await mongoose.connection.db.stats();
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    // Get counts
    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();

    // Calculate uptime
    const uptime = process.uptime();

    // Get memory usage
    const memoryUsage = process.memoryUsage();

    const healthData = {
      server: {
        status: "healthy",
        uptime: Math.floor(uptime),
        responseTime: 120, // You can calculate actual response time
        startTime: new Date(Date.now() - uptime * 1000).toISOString(),
      },
      database: {
        status: "healthy",
        connections: dbStats.connections?.current || 0,
        collections: collections.length,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024), // Convert to MB
        storageSize: Math.round(dbStats.storageSize / 1024 / 1024),
      },
      api: {
        status: "healthy",
        endpoints: 24, // Total API endpoints count
        totalUsers,
        totalItems,
        requests: 1567, // You can track this with middleware
      },
      memory: {
        usage: Math.round(memoryUsage.rss / 1024 / 1024), // Convert to MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
    };

    res.json({ success: true, health: healthData });
  } catch (err) {
    console.error("Health check error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Get real reports data
router.get("/reports", auth, admin, async (req, res) => {
  try {
    const { range = "week" } = req.query;

    // Calculate date ranges
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case "day":
        startDate.setDate(now.getDate() - 1);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get user stats
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate },
    });
    const activeUsers = await User.countDocuments({
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    // Get item stats
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: "lost" });
    const foundItems = await Item.countDocuments({ type: "found" });
    const resolvedItems = await Item.countDocuments({ status: "resolved" });
    const activeItems = await Item.countDocuments({ status: "active" });

    // Get items within date range
    const itemsInRange = await Item.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Get daily activity for chart
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const count = await Item.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });

      dailyActivity.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        count,
      });
    }

    // Get recent activity
    const recentActivity = await Item.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .select("itemName type status createdAt userId");

    const formattedActivity = recentActivity.map((item) => ({
      id: item._id,
      event: `${item.type === "lost" ? "Lost" : "Found"} item reported: ${item.itemName}`,
      user: item.userId?.name || "Unknown",
      time: item.createdAt,
      status: item.status,
    }));

    const reportsData = {
      userStats: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
      },
      itemStats: {
        total: totalItems,
        lost: lostItems,
        found: foundItems,
        resolved: resolvedItems,
        active: activeItems,
        inRange: itemsInRange,
      },
      activityStats: {
        daily: itemsInRange,
        weekly: await Item.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        monthly: await Item.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      },
      charts: {
        dailyActivity,
      },
      recentActivity: formattedActivity,
    };

    res.json({ success: true, reports: reportsData });
  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
