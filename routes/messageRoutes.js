const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");

// Get all conversations for a user
router.get("/conversations", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // First, clean up any self-messages (messages where sender = receiver)
    await Message.deleteMany({
      fromUserId: userObjectId,
      toUserId: userObjectId,
    });

    // Get all unique conversations using aggregation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ fromUserId: userObjectId }, { toUserId: userObjectId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$fromUserId", userObjectId] },
              "$toUserId",
              "$fromUserId",
            ],
          },
          lastMessage: { $first: "$message" },
          lastMessageTime: { $first: "$createdAt" },
          lastMessageFromMe: {
            $first: {
              $eq: ["$fromUserId", userObjectId],
            },
          },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$toUserId", userObjectId] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      // CRITICAL: Exclude any conversation where _id is the current user (self)
      {
        $match: {
          _id: { $ne: null, $ne: userObjectId },
        },
      },
      { $sort: { lastMessageTime: -1 } },
    ]);

    console.log(
      `📊 Found ${conversations.length} conversation groups for user ${userId}`,
    );

    // Get user details for each conversation
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Skip if conversation ID is invalid or is the current user
        if (!conv._id || conv._id.toString() === userId) {
          console.log(`⚠️ Skipping self-conversation for user ${userId}`);
          return null;
        }

        const otherUser = await User.findById(conv._id).select(
          "name email profilePicture blockedUsers",
        );

        if (!otherUser) {
          console.log(`⚠️ User ${conv._id} not found, skipping`);
          return null;
        }

        // Check if current user has blocked this user or vice versa
        const currentUser = await User.findById(userId).select("blockedUsers");
        const isBlockedByMe = currentUser.blockedUsers?.includes(conv._id);
        const isBlockedByThem = otherUser.blockedUsers?.includes(userId);

        console.log(
          `✅ Conversation with: ${otherUser.name} (${otherUser._id})`,
        );

        return {
          user: {
            _id: otherUser._id,
            name: otherUser.name,
            email: otherUser.email,
            profilePicture: otherUser.profilePicture,
            isBlocked: isBlockedByMe || false,
            hasBlockedMe: isBlockedByThem || false,
          },
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime,
          lastMessageFromMe: conv.lastMessageFromMe,
          unreadCount: conv.unreadCount,
        };
      }),
    );

    // Filter out null values
    const validConversations = populatedConversations.filter(
      (conv) =>
        conv !== null && conv.user && conv.user._id.toString() !== userId,
    );

    console.log(
      `📊 Final: ${validConversations.length} valid conversations for user ${userId}`,
    );

    res.json({ success: true, conversations: validConversations });
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Get messages between two users
router.get("/:otherUserId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    // Check if blocked
    const currentUser = await User.findById(userId).select("blockedUsers");
    const otherUser = await User.findById(otherUserId).select("blockedUsers");

    if (
      currentUser.blockedUsers?.includes(otherUserId) ||
      otherUser.blockedUsers?.includes(userId)
    ) {
      return res.json({ success: true, messages: [], isBlocked: true });
    }

    const messages = await Message.find({
      $or: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
      deleted: { $ne: true },
    }).sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { fromUserId: otherUserId, toUserId: userId, read: false },
      { read: true, readAt: new Date() },
    );

    res.json({ success: true, messages });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Get unread message count
router.get("/unread/count", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Message.countDocuments({
      toUserId: userId,
      read: false,
    });
    res.json({ success: true, count });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ========== NEW FUNCTIONALITY ==========

// Mark all messages as read
router.post("/mark-all-read", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    await Message.updateMany(
      { toUserId: userId, read: false },
      { read: true, readAt: new Date() },
    );

    res.json({ success: true, message: "All messages marked as read" });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Clear all conversations (soft delete all messages)
router.delete("/clear-all", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Soft delete all messages where user is sender or receiver
    await Message.updateMany(
      {
        $or: [{ fromUserId: userId }, { toUserId: userId }],
      },
      { deleted: true, message: "This message was deleted" },
    );

    res.json({ success: true, message: "All chats cleared" });
  } catch (err) {
    console.error("Clear chats error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// Delete a single message (soft delete)
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, msg: "Message not found" });
    }

    // Only sender can delete their message
    if (message.fromUserId.toString() !== userId) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    // Soft delete
    message.deleted = true;
    message.message = "This message was deleted";
    await message.save();

    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
