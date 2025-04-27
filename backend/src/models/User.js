// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePicture: {
      type: String,
      default: "", // URL or path to profile picture
    },
    university: {
      type: String,
      default: "",
    },
    isUniversityStudent: {
      type: Boolean,
      default: false,
    },
    level: {
      type: Number,
      default: 1,
    },
    xp: {
      type: Number,
      default: 0,
    },
    maxXp: {
      type: Number,
      default: 100,
    },
    powers: [
      {
        name: String,
        icon: String, // Store icon name or color for frontend rendering
      },
    ],
    achievements: [
      {
        name: String,
        description: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
