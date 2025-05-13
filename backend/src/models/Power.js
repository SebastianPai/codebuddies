// src/models/Power.js
import mongoose from "mongoose";

const powerSchema = new mongoose.Schema(
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
    effect: {
      type: {
        type: String,
        enum: [
          "double_xp",
          "triple_xp",
          "multiply_xp",
          "skip_exercise",
          "streak_protector",
          "extra_attempts", // Añadido
          "hint_unlock", // Añadido
        ],
        required: true,
      },
      value: {
        type: mongoose.Mixed,
        required: true,
      },
      duration: {
        type: Number,
        required: true, // Número de ejercicios, días, etc.
      },
      durationType: {
        type: String,
        enum: ["exercises", "days", "uses"], // Añadido "uses"
        required: true,
      },
    },
    image: {
      type: String,
      default: "",
    },
    customLogo: {
      type: String, // Añadido para consistencia con el frontend
      default: "",
    },
    emoji: {
      type: String,
      default: "⚡",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Power = mongoose.model("Power", powerSchema);

export default Power;
