import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import morgan from "morgan";
import friendRoutes from "./routes/friendRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import friendRequestRoutes from "./routes/friendRequestRoutes.js";
import moduleRoutes from "./routes/ModuleRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";

dotenv.config();

const app = express();

// 👉 ESTA ES LA LÍNEA QUE FALTABA:
app.use(express.json());

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// 👉 Aquí conectas las rutas
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
