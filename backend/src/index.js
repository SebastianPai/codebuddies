import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import morgan from "morgan";
import friendRoutes from "./routes/friendRoutes.js"; // Corregido de 'friend TYPES' a 'friendTypes'
import userRoutes from "./routes/userRoutes.js";
import friendRequestRoutes from "./routes/friendRequestRoutes.js";
import moduleRoutes from "./routes/ModuleRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import multer from "multer";
import path from "path";

dotenv.config();

const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalName)); // Unique filename
  },
});

const upload = multer({ storage });

// Configure CORS to allow requests from the frontend
const corsOptions = {
  origin: "http://localhost:5173", // Frontend origin
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Apply CORS to the /uploads route before serving static files
app.use("/uploads", cors(corsOptions), express.static("uploads"));

app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/friend-requests", friendRequestRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/challenges", challengeRoutes);

// Conectar a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

app.listen(5000, () => {
  console.log("🚀 Servidor corriendo en http://localhost:5000");
});
