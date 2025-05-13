// src/models/Achievement.js
import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema(
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
    icon: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    condition: {
      type: {
        type: String,
        enum: [
          "exercises_completed",
          "courses_completed",
          "specific_courses",
          "level_reached",
        ],
        required: true,
      },
      value: {
        type: mongoose.Mixed,
        required: true,
      },
    },
  },
  { timestamps: true }
);

const Achievement = mongoose.model("Achievement", achievementSchema);

export default Achievement;
