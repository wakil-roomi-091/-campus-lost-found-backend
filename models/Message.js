const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },
    itemName: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    // NEW FIELD: For soft delete functionality
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Indexes for faster queries
messageSchema.index({ fromUserId: 1, toUserId: 1, createdAt: -1 });
messageSchema.index({ toUserId: 1, read: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ toUserId: 1, emailSent: 1 });
messageSchema.index({ deleted: 1 }); // NEW INDEX for deleted field

module.exports = mongoose.model("Message", messageSchema);
