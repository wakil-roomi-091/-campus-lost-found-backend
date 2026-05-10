const express = require("express");
const router = express.Router();
const Item = require("../models/item");
const auth = require("../middleware/authMiddleware");
const { uploadItem } = require("../config/cloudinary");
const { logActivity } = require("../middleware/activityLogger");

// POST - Create new item with images
router.post("/", auth, async (req, res) => {
  try {
    const { itemName, category, type, location, description, date, images } =
      req.body;

    console.log("\n========== 📦 ITEM CREATION ==========");
    console.log("📝 User ID:", req.user.id);
    console.log("📎 Files uploaded:", req.files?.length || 0);

    const imageUrls = images && Array.isArray(images) ? images : [];

    const itemData = {
      itemName,
      category,
      type,
      location,
      description,
      date,
      images: imageUrls,
      userId: req.user.id,
    };

    console.log("💾 Saving item data:", itemData);

    const item = new Item(itemData);
    await item.save();

    console.log("✅ Item created successfully!");
    console.log("🆔 Item ID:", item._id);
    console.log("🖼️ Images in database:", item.images);
    console.log("========== ✅ COMPLETE ==========\n");

    // Log activity
    await logActivity(
      req,
      req.user.id,
      "create_item",
      "item",
      {
        itemId: item._id,
        itemName: item.itemName,
        type: item.type,
      },
      "success",
    );

    res.json({ success: true, item });
  } catch (err) {
    console.error("❌ Create item error:", err);
    res
      .status(500)
      .json({ success: false, msg: "Server error: " + err.message });
  }
});

// GET - All items
router.get("/", async (req, res) => {
  try {
    const items = await Item.find().populate("userId", "name email");
    res.json({ success: true, items });
  } catch (err) {
    console.error("❌ Get all items error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// GET - Search items
router.get("/search", async (req, res) => {
  try {
    const { name, category, location, type } = req.query;
    let filter = {};

    if (name) {
      filter.itemName = { $regex: name, $options: "i" };
    }
    if (category) {
      filter.category = category;
    }
    if (location) {
      filter.location = location;
    }
    if (type) {
      filter.type = type;
    }

    const items = await Item.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, items });
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// GET - User's items
router.get("/user/me", auth, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, items });
  } catch (err) {
    console.error("❌ Get user items error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// GET - Items by user ID
router.get("/user/:userId", async (req, res) => {
  try {
    const items = await Item.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, items });
  } catch (err) {
    console.error("❌ Error fetching user items:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// GET - Single item
router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      "userId",
      "name email",
    );
    if (!item) {
      return res.status(404).json({ success: false, msg: "Item not found" });
    }

    item.views = (item.views || 0) + 1;
    await item.save();

    res.json({ success: true, item });
  } catch (err) {
    console.error("❌ Get item error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// PUT - Update item
router.put("/:id", auth, uploadItem.array("images", 5), async (req, res) => {
  try {
    console.log("📝 Updating item:", req.params.id);
    console.log("Request body:", req.body);

    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, msg: "Item not found" });
    }

    if (item.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({ success: false, msg: "Not authorized" });
    }

    const { itemName, category, type, location, description, date, status } =
      req.body;

    if (itemName !== undefined) item.itemName = itemName;
    if (category !== undefined) item.category = category;
    if (type !== undefined) item.type = type;
    if (location !== undefined) item.location = location;
    if (description !== undefined) item.description = description;
    if (date !== undefined) item.date = date;
    if (status !== undefined) item.status = status;

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.path);
      item.images = [...(item.images || []), ...newImages];
    }

    await item.save();
    console.log("✅ Item updated successfully:", item._id);
    console.log("New status:", item.status);

    // Log activity
    await logActivity(
      req,
      req.user.id,
      "update_item",
      "item",
      {
        itemId: item._id,
        itemName: item.itemName,
      },
      "success",
    );

    res.json({ success: true, item });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// DELETE - Delete item
router.delete("/:id", auth, async (req, res) => {
  try {
    console.log("🗑️ Deleting item:", req.params.id);

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, msg: "Item not found" });
    }

    if (item.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({ success: false, msg: "Not authorized" });
    }

    await Item.findByIdAndDelete(req.params.id);
    console.log("✅ Item deleted successfully:", req.params.id);

    // Log activity
    await logActivity(
      req,
      req.user.id,
      "delete_item",
      "item",
      {
        itemId: req.params.id,
      },
      "success",
    );

    res.json({ success: true, msg: "Item deleted successfully" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
