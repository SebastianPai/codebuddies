import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  instructions: {
    type: String,
    required: false,
  },
  language: {
    type: String,
    enum: ["javascript", "python", "css", "html", "c", "java", "markup"], // lenguajes que soportas
    default: "javascript",
    required: true,
  },
  expectedOutput: {
    type: String,
    required: false, // lo puedes usar para validar la respuesta
  },
});

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  exercises: [exerciseSchema],
});

const Lesson = mongoose.model("Lesson", lessonSchema);

export default Lesson;
