// models/ChallengeModel.js
import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema({
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true }, // puede ser markdown
  starterCode: { type: String }, // código base que ve el usuario
  solutionCode: { type: String }, // solución correcta (oculta al usuario)
  testCases: [
    {
      input: String,
      expectedOutput: String,
    },
  ],
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "easy",
  },
  order: Number,
});

export default mongoose.model("Challenge", challengeSchema);
