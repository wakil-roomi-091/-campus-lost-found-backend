const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
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
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    transactionCompleted: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Index for faster queries
ratingSchema.index({ toUserId: 1, createdAt: -1 });
ratingSchema.index({ fromUserId: 1, toUserId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);
