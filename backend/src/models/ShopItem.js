// src/models/ShopItem.js
import mongoose from "mongoose";

const shopItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["life", "border", "tag", "power"],
      required: true,
    },
    properties: {
      type: mongoose.Mixed,
      default: {},
    },
    image: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const ShopItem = mongoose.model("ShopItem", shopItemSchema);

export default ShopItem;
