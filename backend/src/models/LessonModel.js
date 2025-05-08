import mongoose from "mongoose";

const codeSchema = new mongoose.Schema({
  language: {
    type: String,
    enum: [
      "javascript",
      "python",
      "css",
      "html",
      "c",
      "java",
      "markup",
      "sql",
      "php",
    ],
    required: true,
  },
  initialCode: {
    type: String,
    required: true,
  },
  expectedCode: {
    type: String,
    required: false,
  },
});

const exerciseSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  codes: {
    type: [codeSchema],
    required: true,
    validate: {
      validator: function (codes) {
        // Asegurar que al menos un código esté definido
        return codes.length > 0;
      },
      message: "Debe haber al menos un código definido.",
    },
  },
  instructions: {
    type: String,
    required: false,
  },
  language: {
    type: String,
    enum: [
      "javascript",
      "python",
      "css",
      "html",
      "c",
      "java",
      "markup",
      "sql",
      "php",
    ],
    required: true, // Lenguaje principal del ejercicio
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
