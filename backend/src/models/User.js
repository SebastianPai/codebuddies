// src/models/User.js
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
      default: "",
    },
    profileBackground: {
      type: String,
      default: "",
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
    coins: {
      type: Number,
      default: 0,
    },
    powers: [
      {
        powerId: { type: mongoose.Schema.Types.ObjectId, ref: "Power" },
        acquiredAt: { type: Date, default: Date.now },
        usesLeft: { type: Number, default: 1 }, // Número de usos restantes
      },
    ],
    activePowers: [
      {
        powerId: { type: mongoose.Schema.Types.ObjectId, ref: "Power" },
        activatedAt: { type: Date, default: Date.now },
        remainingDuration: { type: Number }, // Ejercicios o días restantes
      },
    ],
    achievements: [
      {
        achievementId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Achievement",
        },
        awardedAt: { type: Date, default: Date.now },
      },
    ],
    completedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    completedExercises: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
        exerciseId: { type: mongoose.Schema.Types.ObjectId },
        completedAt: { type: Date, default: Date.now },
      },
    ],
    lives: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },
    lastLivesReset: {
      type: Date,
      default: Date.now,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastActivity: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    borders: [
      {
        borderId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopItem" },
        acquiredAt: { type: Date, default: Date.now },
      },
    ],
    tags: [
      {
        tagId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopItem" },
        acquiredAt: { type: Date, default: Date.now },
      },
    ],
    activeBorder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopItem",
      default: null,
    },
    activeTag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopItem",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
