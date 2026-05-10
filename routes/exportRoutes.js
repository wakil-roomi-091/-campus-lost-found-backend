const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const json2csv = require("json2csv").parse;
const User = require("../models/user");
const Item = require("../models/item");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

// @route   GET /api/export/users/csv
// @desc    Export users as CSV
// @access  Private/Admin
router.get("/users/csv", auth, admin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    const fields = ["name", "email", "role", "createdAt", "updatedAt"];
    const opts = { fields };
    const csv = json2csv(users, opts);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=users_${Date.now()}.csv`,
    );
    res.send(csv);
  } catch (err) {
    console.error("Export users CSV error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/export/users/excel
// @desc    Export users as Excel
// @access  Private/Admin
router.get("/users/excel", auth, admin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    worksheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 35 },
      { header: "Role", key: "role", width: 15 },
      { header: "Joined", key: "createdAt", width: 25 },
      { header: "Last Updated", key: "updatedAt", width: 25 },
    ];

    users.forEach((user) => {
      worksheet.addRow({
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: new Date(user.createdAt).toLocaleString(),
        updatedAt: new Date(user.updatedAt).toLocaleString(),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=users_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export users Excel error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/export/items/csv
// @desc    Export items as CSV
// @access  Private/Admin
router.get("/items/csv", auth, admin, async (req, res) => {
  try {
    const items = await Item.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const fields = [
      "itemName",
      "category",
      "type",
      "location",
      "status",
      "views",
      "userId.name",
      "userId.email",
      "createdAt",
    ];
    const opts = { fields };
    const csv = json2csv(items, opts);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=items_${Date.now()}.csv`,
    );
    res.send(csv);
  } catch (err) {
    console.error("Export items CSV error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/export/items/excel
// @desc    Export items as Excel
// @access  Private/Admin
router.get("/items/excel", auth, admin, async (req, res) => {
  try {
    const items = await Item.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Items");

    worksheet.columns = [
      { header: "Item Name", key: "itemName", width: 25 },
      { header: "Category", key: "category", width: 20 },
      { header: "Type", key: "type", width: 10 },
      { header: "Location", key: "location", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Views", key: "views", width: 8 },
      { header: "Posted By", key: "userName", width: 25 },
      { header: "User Email", key: "userEmail", width: 30 },
      { header: "Date", key: "createdAt", width: 25 },
    ];

    items.forEach((item) => {
      worksheet.addRow({
        itemName: item.itemName,
        category: item.category,
        type: item.type,
        location: item.location,
        status: item.status,
        views: item.views || 0,
        userName: item.userId?.name || "Unknown",
        userEmail: item.userId?.email || "Unknown",
        createdAt: new Date(item.createdAt).toLocaleString(),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=items_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export items Excel error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// @route   GET /api/export/report/pdf
// @desc    Export statistics report as PDF
// @access  Private/Admin
router.get("/report/pdf", auth, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: "lost" });
    const foundItems = await Item.countDocuments({ type: "found" });
    const resolvedItems = await Item.countDocuments({ status: "resolved" });
    const activeItems = await Item.countDocuments({ status: "active" });

    const recentUsers = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(10);
    const recentItems = await Item.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report_${Date.now()}.pdf`,
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Campus Lost & Found", { align: "center" });
    doc
      .fontSize(16)
      .font("Helvetica")
      .text("System Report", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(10)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    // Statistics Section
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Statistics", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12).font("Helvetica");
    doc.text(`• Total Users: ${totalUsers}`);
    doc.text(`• Total Items: ${totalItems}`);
    doc.text(`• Lost Items: ${lostItems}`);
    doc.text(`• Found Items: ${foundItems}`);
    doc.text(`• Active Items: ${activeItems}`);
    doc.text(`• Resolved Items: ${resolvedItems}`);
    doc.moveDown();

    // Recent Users
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Recent Users (Last 10)", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");

    recentUsers.forEach((user, index) => {
      doc.text(`${index + 1}. ${user.name} - ${user.email} (${user.role})`);
    });
    doc.moveDown();

    // Recent Items
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Recent Items (Last 10)", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");

    recentItems.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.itemName} - ${item.type} - ${item.location} (${item.status})`,
      );
      if (item.userId) doc.text(`   Posted by: ${item.userId.name}`);
    });

    doc.end();
  } catch (err) {
    console.error("Export PDF error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
