const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Get allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://campus-lost-found-frontend-xeac.vercel.app",
    ];

// CORS configuration for Socket.io
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// CORS middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== SESSION MIDDLEWARE (for Google OAuth) ==========
app.use(
  session({
    secret: process.env.SESSION_SECRET || "campus_lost_found_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true in production (HTTPS)
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

// ========== INITIALIZE PASSPORT ==========
app.use(passport.initialize());
app.use(passport.session());

// Socket.io connection handling
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  socket.on("user-connected", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(
      `✅ User ${userId} connected. Total users: ${connectedUsers.size}`,
    );
    const onlineUsers = Array.from(connectedUsers.keys());
    io.emit("online-users", onlineUsers);
  });

  socket.on("send-message", async (data) => {
    const { fromUserId, toUserId, message, itemId, itemName, fromUserName } =
      data;
    console.log(`📨 Message from ${fromUserId} to ${toUserId}: ${message}`);

    try {
      const Message = require("./models/Message");
      const newMessage = new Message({
        fromUserId,
        toUserId,
        message,
        itemId,
        itemName,
        read: false,
        emailSent: false,
      });
      await newMessage.save();
      console.log(`✅ Message saved to database with ID: ${newMessage._id}`);

      const recipientSocketId = connectedUsers.get(toUserId);
      const isRecipientOnline = !!recipientSocketId;

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("new-message", {
          ...data,
          messageId: newMessage._id,
          timestamp: newMessage.createdAt,
          fromUserName: fromUserName,
        });
        console.log(`📤 Message sent real-time to online user ${toUserId}`);
      } else {
        console.log(
          `📧 User ${toUserId} is offline, sending email notification...`,
        );
        const {
          sendMessageNotification,
        } = require("./services/emailNotification");
        await sendMessageNotification(toUserId, fromUserId, message, itemName);
      }

      socket.emit("message-sent", { success: true, messageId: newMessage._id });
    } catch (err) {
      console.error("Error saving message:", err);
      socket.emit("message-error", { error: "Failed to send message" });
    }
  });

  socket.on("mark-read", async (messageId) => {
    try {
      const Message = require("./models/Message");
      await Message.findByIdAndUpdate(messageId, {
        read: true,
        readAt: new Date(),
      });
    } catch (err) {
      console.error("Error marking message as read:", err);
    }
  });

  socket.on("disconnect", () => {
    let disconnectedUserId = null;
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        connectedUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      console.log(
        `❌ User ${disconnectedUserId} disconnected. Total users: ${connectedUsers.size}`,
      );
      const onlineUsers = Array.from(connectedUsers.keys());
      io.emit("online-users", onlineUsers);
    }
  });
});

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const itemRoutes = require("./routes/itemRoutes");
const adminRoutes = require("./routes/adminRoutes");
const profileRoutes = require("./routes/profileRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const otpRoutes = require("./routes/otpRoutes");
const messageRoutes = require("./routes/messageRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const exportRoutes = require("./routes/exportRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const reportRoutes = require("./routes/reportRoutes");
const contactRoutes = require("./routes/contactRoutes");
const socialAuthRoutes = require("./routes/socialAuthRoutes");

const ContactMessage = require("./models/ContactMessage");

// Import Category model for seeding
const Category = require("./models/Category");

// Function to seed default categories with valid colors
const seedDefaultCategories = async () => {
  try {
    const categoryCount = await Category.countDocuments();

    if (categoryCount === 0) {
      console.log("📦 No categories found. Seeding default categories...");

      const defaultCategories = [
        {
          name: "Electronics",
          slug: "electronics",
          color: "blue",
          order: 1,
          isActive: true,
        },
        {
          name: "Wallet/Purse",
          slug: "wallet-purse",
          color: "red",
          order: 2,
          isActive: true,
        },
        {
          name: "Keys",
          slug: "keys",
          color: "yellow",
          order: 3,
          isActive: true,
        },
        {
          name: "Books",
          slug: "books",
          color: "green",
          order: 4,
          isActive: true,
        },
        {
          name: "Clothing",
          slug: "clothing",
          color: "purple",
          order: 5,
          isActive: true,
        },
        {
          name: "Accessories",
          slug: "accessories",
          color: "pink",
          order: 6,
          isActive: true,
        },
        {
          name: "ID Cards",
          slug: "id-cards",
          color: "indigo",
          order: 7,
          isActive: true,
        },
        {
          name: "Documents",
          slug: "documents",
          color: "orange",
          order: 8,
          isActive: true,
        },
        {
          name: "Jewelry",
          slug: "jewelry",
          color: "teal",
          order: 9,
          isActive: true,
        },
        {
          name: "Sports Equipment",
          slug: "sports-equipment",
          color: "teal",
          order: 10,
          isActive: true,
        },
        {
          name: "Other",
          slug: "other",
          color: "gray",
          order: 11,
          isActive: true,
        },
      ];

      await Category.insertMany(defaultCategories);
      console.log(`✅ Seeded ${defaultCategories.length} default categories`);
    } else {
      console.log(`✅ ${categoryCount} categories already exist`);
    }
  } catch (err) {
    console.error("❌ Error seeding categories:", err);
  }
};

// ========== USE ROUTES ==========
// Auth routes - for login/register (keeps your frontend working)
app.use("/api/users", authRoutes);
app.use("/api/auth", authRoutes);

// User routes - for block/unblock/profile
app.use("/api/users", userRoutes);

// Other routes
app.use("/api/items", itemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/contact", contactRoutes);

// ========== GOOGLE OAUTH ROUTE ==========
app.use("/api/auth", socialAuthRoutes);

// Test routes
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!", success: true });
});

// MongoDB connection with category seeding
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/semester_project";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    await seedDefaultCategories();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Socket.io ready for connections`);
      console.log(`📝 Available routes:`);
      console.log(`   - Auth: /api/users/login, /api/users/register`);
      console.log(`   - Google Auth: /api/auth/google`);
      console.log(`   - Block: /api/users/block`);
      console.log(`   - Items: /api/items`);
      console.log(`   - Reports: /api/reports`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
