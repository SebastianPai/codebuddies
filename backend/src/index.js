import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import morgan from "morgan";
import userRoutes from "./routes/userRoutes.js";
import moduleRoutes from "./routes/ModuleRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import progressRoutes from "./routes/progress.js";
import imageProxyRoutes from "./routes/imageRoutes.js";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`Origen de la solicitud: ${origin || "null"}`);
      callback(null, true); // Permitir todos los orígenes en local
    } else {
      const allowedOrigins = [
        "https://codebuddies-jh-3e772884b367.herokuapp.com",
        null, // Permitir origen nulo para <iframe>
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`Origen no permitido: ${origin}`);
        callback(new Error("No permitido por CORS"));
      }
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Aplicar CORS globalmente
app.use(cors(corsOptions));

// Después de app.use(cors(corsOptions));
app.use("/images", express.static(path.join(__dirname, "public/images")));

app.use(express.json());

// Configurar Helmet con CSP personalizada
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "http://localhost:5000",
          "https://codebuddies-jh-3e772884b367.herokuapp.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "http://localhost:5173", // Frontend local
          "https://codebuddies-jh-3e772884b367.herokuapp.com", // Frontend producción
          "https://picsum.photos",
          "https://fastly.picsum.photos",
          "https://v.etsystatic.com",
        ],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
        frameSrc: ["'self'"],
      },
    },
  })
);

app.use(morgan("dev"));

// Rutas de la API
app.use("/api/users", userRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api", imageProxyRoutes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "../../frontend/dist")));

// Middleware para manejar rutas del frontend (React Router)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "../../frontend/dist", "index.html"));
});

// Manejar rutas no encontradas para la API
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// Conectar a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

// Configurar puerto dinámico
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
