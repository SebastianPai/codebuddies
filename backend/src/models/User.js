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
        name: { type: String, required: true },
        icon: { type: String, required: true }, // Store icon name for frontend rendering
      },
    ],
    achievements: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
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
        exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
        completedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
