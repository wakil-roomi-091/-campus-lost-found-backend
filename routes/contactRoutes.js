// server/routes/contactRoutes.js
const express = require("express");
const nodemailer = require("nodemailer");
const ContactMessage = require("../models/ContactMessage");
const router = express.Router();

// ========== USE THE EXACT SAME CONFIG AS YOUR WORKING OTP ==========
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "a82dc3001@smtp-brevo.com", // ← Your Brevo SMTP login (from OTP)
    pass: process.env.BREVO_SMTP_KEY, // ← Your Brevo SMTP key
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error.message);
  } else {
    console.log("✅ Email transporter ready (same as OTP)");
  }
});

// Send contact form email (Public)
router.post("/send", async (req, res) => {
  console.log("📨 Contact form received:", req.body);

  try {
    const { name, email, subject, message, userId } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
      userId: userId || null,
    });

    console.log("✅ Message saved to DB with ID:", contactMessage._id);

    // ========== EMAIL TO ADMIN (Using same format as OTP) ==========
    const adminMailOptions = {
      from: '"Campus Lost & Found" <wakila971@gmail.com>',
      to: "wakila971@gmail.com",
      subject: "🔔 New Contact Form Message",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">New Contact Form Submission</h2>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p><strong>👤 Name:</strong> ${name}</p>
            <p><strong>📧 Email:</strong> ${email}</p>
            <p><strong>📌 Subject:</strong> ${subject}</p>
            <p><strong>💬 Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
              ${message.replace(/\n/g, "<br>")}
            </div>
            <p><strong>📅 Time:</strong> ${new Date().toLocaleString()}</p>
            <hr>
            <p style="text-align: center;">
              <a href="http://localhost:3000/admin/contact-messages" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
            </p>
          </div>
        </div>
      `,
    };

    // ========== AUTO-REPLY TO USER ==========
    const userMailOptions = {
      from: '"Campus Lost & Found" <wakila971@gmail.com>',
      to: email,
      subject: "✅ We've received your message - Campus Lost & Found",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Thank You for Contacting Us!</h2>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Dear <strong>${name}</strong>,</p>
            <p>Thank you for reaching out to <strong>Campus Lost & Found</strong>. We have received your message and our support team will get back to you within <strong>24-48 hours</strong>.</p>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #2e7d32;"><strong>📝 Your Message Summary:</strong></p>
              <p style="margin: 10px 0 0 0;"><strong>Subject:</strong> ${subject}</p>
              <p style="margin: 5px 0 0 0;"><strong>Reference ID:</strong> ${contactMessage._id}</p>
            </div>
            <p>Best regards,<br><strong>Campus Lost & Found Support Team</strong></p>
          </div>
        </div>
      `,
    };

    // Send both emails
    await transporter.sendMail(adminMailOptions);
    console.log("✅ Admin email sent to: wakila971@gmail.com");

    await transporter.sendMail(userMailOptions);
    console.log("✅ Auto-reply email sent to:", email);

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: contactMessage,
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
      error: error.message,
    });
  }
});

// Get all contact messages (Admin only)
router.get("/admin/messages", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || "all";

    const skip = (page - 1) * limit;

    let filter = {};
    if (status !== "all") {
      filter.status = status;
    }

    const messages = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ContactMessage.countDocuments(filter);

    res.json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch messages" });
  }
});

// Get single contact message (Admin only)
router.get("/admin/messages/:id", async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error("Error fetching message:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch message" });
  }
});

// Update message status (Admin only)
router.put("/admin/messages/:id/status", async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const validStatuses = ["pending", "in-progress", "resolved", "spam"];

    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    message.status = status;
    if (adminNote) message.adminNote = adminNote;
    await message.save();

    res.json({
      success: true,
      message: "Status updated successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
});

// Reply to user (Admin only)
router.post("/admin/messages/:id/reply", async (req, res) => {
  try {
    const { replyMessage } = req.body;
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    if (!replyMessage || replyMessage.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Reply message is required" });
    }

    message.replyMessage = replyMessage;
    message.repliedAt = new Date();
    message.status = "resolved";
    await message.save();

    // Send reply email to user
    try {
      const replyMailOptions = {
        from: '"Campus Lost & Found Support" <wakila971@gmail.com>',
        to: message.email,
        subject: `Re: ${message.subject} - Response from Support`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h2 style="color: white; margin: 0;">Response from Support Team</h2>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
              <p>Dear <strong>${message.name}</strong>,</p>
              <p>Thank you for your patience. Here's the response to your inquiry:</p>
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                ${replyMessage.replace(/\n/g, "<br>")}
              </div>
              <p>Best regards,<br><strong>Campus Lost & Found Support Team</strong></p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(replyMailOptions);
      console.log("✅ Reply email sent to:", message.email);
    } catch (emailError) {
      console.error("❌ Reply email error:", emailError.message);
    }

    res.json({ success: true, message: "Reply sent successfully" });
  } catch (error) {
    console.error("Error sending reply:", error);
    res.status(500).json({ success: false, message: "Failed to send reply" });
  }
});

// Delete message (Admin only)
router.delete("/admin/messages/:id", async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }
    res.json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete message" });
  }
});

// Get statistics (Admin only)
router.get("/admin/stats", async (req, res) => {
  try {
    const total = await ContactMessage.countDocuments();
    const pending = await ContactMessage.countDocuments({ status: "pending" });
    const inProgress = await ContactMessage.countDocuments({
      status: "in-progress",
    });
    const resolved = await ContactMessage.countDocuments({
      status: "resolved",
    });
    const spam = await ContactMessage.countDocuments({ status: "spam" });
    const unread = await ContactMessage.countDocuments({ isRead: false });

    res.json({
      success: true,
      stats: { total, pending, inProgress, resolved, spam, unread },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

module.exports = router;
