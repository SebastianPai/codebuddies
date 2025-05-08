import "./config/env.js"; // Cargar variables de entorno primero
import express from "express";
import cors from "cors";
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
import { setMaxListeners } from "events";

// Aumentar el límite de listeners
setMaxListeners(15);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`Origen de la solicitud: ${origin || "null"}`);
      callback(null, true);
    } else {
      const allowedOrigins = [
        "https://www.codebuddies.live",
        "https://codebuddies.live",
        "https://codebuddies-jh-3e772884b367.herokuapp.com",
        "https://cdn.pixabay.com",
        "https://fastly.picsum.photos",
        "https://picsum.photos",
        // Agregar dominios de Google Analytics
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://www.googletagmanager.com",
        null,
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

app.use(cors(corsOptions));

// Validar rutas con barras dobles
app.use((req, res, next) => {
  if (req.path.includes("//")) {
    console.error(`Ruta inválida con barras dobles: ${req.path}`);
    return res.status(400).json({ error: "Ruta inválida" });
  }
  next();
});

// Servir imágenes estáticas
app.use("/images", express.static(path.join(__dirname, "../public/images")));

// Parsear JSON
app.use(express.json());

// Configurar Helmet con CSP
const allowedConnectSrc = [
  "'self'",
  "https://www.codebuddies.live",
  "https://codebuddies.live",
  "https://codebuddies-jh-3e772884b367.herokuapp.com",
  "https://cdn.pixabay.com",
  "https://fastly.picsum.photos",
  "https://picsum.photos",
  // Agregar dominios de Google Analytics
  "https://www.google-analytics.com",
  "https://analytics.google.com",
  "https://www.googletagmanager.com",
];

if (process.env.NODE_ENV === "development") {
  allowedConnectSrc.push("http://localhost:5000");
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: allowedConnectSrc,
        imgSrc: [
          "'self'",
          "data:",
          "http://localhost:5173",
          "https://www.codebuddies.live",
          "https://codebuddies.live",
          "https://cdn.pixabay.com",
          "https://fastly.picsum.photos",
          "https://picsum.photos",
          "https://codebuddiesimages.nyc3.cdn.digitaloceanspaces.com",
          // Agregar dominio para píxeles de seguimiento de Google Analytics
          "https://www.google-analytics.com",
        ],
        scriptSrc: [
          "'self'",
          // Agregar Google Tag Manager para el script de Google Analytics
          "https://www.googletagmanager.com",
          // Opcional: Permitir scripts inline si usas gtag directamente
          // "'unsafe-inline'",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
        frameSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      },
    },
  })
);

app.use(morgan("dev"));

// Logging para rutas de API
app.use("/api", (req, res, next) => {
  console.log(`Solicitud API: ${req.method} ${req.path}`);
  next();
});

// Servir archivos estáticos del frontend
app.use(
  express.static(path.join(__dirname, "../../frontend/dist"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);

// Rutas de la API
app.use("/api/users", userRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api", imageProxyRoutes);

// Middleware para manejar rutas del frontend (React Router)
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/images") ||
    req.path.startsWith("/monaco-editor") ||
    req.path.startsWith("/assets")
  ) {
    return next();
  }
  console.log(`Sirviendo index.html para la ruta: ${req.path}`);
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
  res.status(404).json({ error: "Ruta no encontrada" });
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
