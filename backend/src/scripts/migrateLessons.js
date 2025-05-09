import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: resolve(__dirname, "../../.env") });

// Verificar MONGO_URI
if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI no está definida en el archivo .env");
}

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir el esquema actual (nuevo)
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
      validator: (codes) => codes.length > 0,
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
    required: true,
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

// Función para migrar los datos
async function migrateLessons() {
  try {
    // Obtener todas las lecciones
    const lessons = await Lesson.find();

    let updatedCount = 0;

    for (const lesson of lessons) {
      let needsUpdate = false;
      const updatedExercises = lesson.exercises.map((exercise) => {
        // Si el ejercicio ya tiene el array codes, no lo modificamos
        if (exercise.codes && exercise.codes.length > 0) {
          return exercise;
        }

        // Mapear lenguajes antiguos a nuevos
        const languageMap = {
          markup: "html",
          javascript: "javascript",
          python: "python",
          css: "css",
          html: "html",
          c: "c",
          java: "java",
        };
        const newLanguage = languageMap[exercise.language] || "html";

        // Manejar content y expectedOutput
        const initialCode =
          exercise.content?.trim() ||
          `<!-- Código inicial para ${exercise.title} -->`;
        const expectedCode =
          exercise.expectedOutput?.trim() ||
          `<!-- Código esperado para ${exercise.title} -->`;

        needsUpdate = true;

        return {
          order: exercise.order || 0,
          title: exercise.title || "Sin título",
          codes: [
            {
              language: newLanguage,
              initialCode,
              expectedCode,
            },
          ],
          instructions: exercise.instructions || "",
          language: newLanguage,
        };
      });

      if (needsUpdate) {
        // Actualizar la lección solo si hubo cambios
        await Lesson.updateOne(
          { _id: lesson._id },
          {
            $set: {
              exercises: updatedExercises,
            },
            $unset: {
              "exercises.$[].content": "",
              "exercises.$[].expectedOutput": "",
            },
          }
        );
        updatedCount++;
        console.log(`Lección "${lesson.title}" migrada con éxito.`);
      }
    }

    console.log(
      `Migración completada. ${updatedCount} lecciones actualizadas.`
    );
  } catch (error) {
    console.error("Error durante la migración:", error);
  } finally {
    await mongoose.connection.close();
  }
}

// Ejecutar la migración
migrateLessons();
