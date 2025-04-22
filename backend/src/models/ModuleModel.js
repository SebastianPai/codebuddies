import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    level: {
      type: String,
      enum: ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Module", moduleSchema);
