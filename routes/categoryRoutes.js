const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const Item = require("../models/item");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

// @route   GET /api/categories
// @desc    Get all active categories (public)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      order: 1,
      name: 1,
    });

    // Get item counts for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const itemCount = await Item.countDocuments({
          category: category.name,
        });
        return {
          ...category.toJSON(),
          itemCount,
        };
      }),
    );

    res.json({ success: true, categories: categoriesWithCount });
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/categories/all
// @desc    Get all categories (including inactive) - Admin only
// @access  Private/Admin
router.get("/all", auth, admin, async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const itemCount = await Item.countDocuments({
          category: category.name,
        });
        return {
          ...category.toJSON(),
          itemCount,
        };
      }),
    );

    res.json({ success: true, categories: categoriesWithCount });
  } catch (err) {
    console.error("Get all categories error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private/Admin
router.post("/", auth, admin, async (req, res) => {
  try {
    const { name, description, icon, color, order } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, msg: "Category name is required" });
    }

    // Create slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Check if category already exists
    const existingCategory = await Category.findOne({
      $or: [{ name }, { slug }],
    });
    if (existingCategory) {
      return res
        .status(400)
        .json({ success: false, msg: "Category already exists" });
    }

    const category = new Category({
      name: name.trim(),
      slug,
      description: description || "",
      icon: icon || "FiPackage",
      color: color || "blue",
      order: order || 0,
    });

    await category.save();

    res.json({ success: true, category, msg: "Category created successfully" });
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private/Admin
router.put("/:id", auth, admin, async (req, res) => {
  try {
    const { name, description, icon, color, isActive, order } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, msg: "Category not found" });
    }

    // Update slug if name changed
    let slug = category.slug;
    if (name && name !== category.name) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      // Check if new slug already exists
      const existingCategory = await Category.findOne({
        slug,
        _id: { $ne: req.params.id },
      });
      if (existingCategory) {
        return res
          .status(400)
          .json({
            success: false,
            msg: "Category with this name already exists",
          });
      }
    }

    category.name = name || category.name;
    category.slug = slug;
    category.description =
      description !== undefined ? description : category.description;
    category.icon = icon || category.icon;
    category.color = color || category.color;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    category.order = order !== undefined ? order : category.order;

    await category.save();

    res.json({ success: true, category, msg: "Category updated successfully" });
  } catch (err) {
    console.error("Update category error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category (only if no items use it)
// @access  Private/Admin
router.delete("/:id", auth, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, msg: "Category not found" });
    }

    // Check if any items use this category
    const itemsUsingCategory = await Item.countDocuments({
      category: category.name,
    });
    if (itemsUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        msg: `Cannot delete category. ${itemsUsingCategory} item(s) are using this category.`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({ success: true, msg: "Category deleted successfully" });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   PUT /api/categories/reorder
// @desc    Reorder categories (drag and drop)
// @access  Private/Admin
router.put("/reorder", auth, admin, async (req, res) => {
  try {
    const { categories } = req.body;

    for (const cat of categories) {
      await Category.findByIdAndUpdate(cat._id, { order: cat.order });
    }

    res.json({ success: true, msg: "Categories reordered successfully" });
  } catch (err) {
    console.error("Reorder categories error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
