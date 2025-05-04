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

// Servir imágenes estáticas
app.use("/images", express.static(path.join(__dirname, "public/images")));

// Parsear JSON
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
          "https://codebuddies.live",
          "https://www.codebuddies.live",
          "https://codebuddies-jh-3e772884b367.herokuapp.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "http://localhost:5173", // Frontend local
          "https://codebuddies-jh-3e772884b367.herokuapp.com", // Frontend producción
          "https://picsum.photos",
          "https://codebuddies.live",
          "https://www.codebuddies.live",
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

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "../../frontend/dist")));

// Rutas de la API
app.use("/api/users", userRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api", imageProxyRoutes);

// Middleware para manejar rutas del frontend (React Router)
app.use((req, res, next) => {
  // Excluir rutas de la API
  if (req.path.startsWith("/api") || req.path.startsWith("/images")) {
    return next();
  }
  // Servir index.html para las rutas del frontend
  res.sendFile(
    path.join(__dirname, "../../frontend/dist", "index.html"),
    (err) => {
      if (err) {
        console.error("Error al enviar index.html:", err);
        next(err);
      }
    }
  );
});

// Manejar rutas no encontradas
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
