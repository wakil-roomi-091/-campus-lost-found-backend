const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "FiPackage",
    },
    color: {
      type: String,
      enum: [
        "blue",
        "red",
        "green",
        "yellow",
        "purple",
        "pink",
        "indigo",
        "orange",
        "teal",
        "gray",
      ],
      default: "blue",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Update item count when items are added/removed
categorySchema.virtual("itemCount", {
  ref: "Item",
  localField: "name",
  foreignField: "category",
  count: true,
});

categorySchema.set("toJSON", { virtuals: true });
categorySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Category", categorySchema);
