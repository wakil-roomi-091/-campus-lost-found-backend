const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    action: {
      type: String,
      required: true,
      enum: [
        "login",
        "logout",
        "register",
        "create_item",
        "update_item",
        "delete_item",
        "update_profile",
        "change_password",
        "mark_resolved",
        "rate_transaction",
        "admin_update_user",
        "admin_delete_user",
        "admin_update_role",
        "admin_delete_item",
        "create_category",
        "update_category",
        "delete_category",
        "export_data",
      ],
    },
    actionType: {
      type: String,
      enum: ["auth", "item", "profile", "admin", "category", "export"],
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
  },
  { timestamps: true },
);

// Index for faster queries
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
