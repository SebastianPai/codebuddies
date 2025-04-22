// models/CourseModel.js
import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    image: String,
    level: {
      type: String,
      enum: ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"],
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    lessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
