import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";
import * as progressService from "../services/progressService.js";
import { JSDOM } from "jsdom";

// Obtener todas las lecciones de un curso
export const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId; // Obtenido del token JWT

    // Verificar que el curso existe
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    // Obtener lecciones ordenadas por createdAt o un campo order si lo tienes
    const lessons = await Lesson.find({ course: courseId })
      .sort({
        createdAt: 1, // O usa un campo order si lo agregas al modelo
      })
      .lean();

    // Obtener progreso del usuario para el curso
    const progress = await UserExerciseProgress.find({
      userId,
      courseId,
    }).lean();

    // Mapear lecciones con isAccessible
    const lessonsWithAccess = lessons.map((lesson, index) => {
      // La primera lección siempre es accesible
      if (index === 0) {
        return { ...lesson, isAccessible: true };
      }

      // Verificar si todos los ejercicios de la lección anterior están completados
      const previousLesson = lessons[index - 1];
      const previousLessonCompleted = previousLesson.exercises.every(
        (exercise) =>
          progress.some(
            (p) =>
              p.lessonId.toString() === previousLesson._id.toString() &&
              p.exerciseOrder === exercise.order &&
              p.completed
          )
      );

      return { ...lesson, isAccessible: previousLessonCompleted };
    });

    res.json(lessonsWithAccess);
  } catch (error) {
    console.error("Error en getLessonsByCourse:", error.message);
    res.status(500).json({ message: "Error al obtener lecciones" });
  }
};

// Obtener una lección por ID
export const getLessonById = async (req, res) => {
  try {
    const lessonId = req.params.id;
    console.log("Buscando lección con ID:", lessonId);
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      console.log("Lección no encontrada para ID:", lessonId);
      return res.status(404).json({ message: "Lección no encontrada" });
    }
    console.log("Lección encontrada:", lesson);
    res.json(lesson);
  } catch (error) {
    console.error("Error en getLessonById:", error.message);
    res.status(500).json({ message: "Error al obtener la lección" });
  }
};

// Crear una lección
export const createLesson = async (req, res) => {
  try {
    const { title, description, course, exercises } = req.body;

    // Validate required fields
    if (!title || !description || !course) {
      return res
        .status(400)
        .json({ message: "Título, descripción y curso son obligatorios" });
    }

    // Verify course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    const newLesson = new Lesson({
      title,
      description,
      course,
      exercises: exercises || [], // Default to empty array if not provided
    });

    const savedLesson = await newLesson.save();
    res.status(201).json(savedLesson);
  } catch (error) {
    console.error("Error en createLesson:", error.message);
    res.status(500).json({ message: "Error al crear la lección" });
  }
};

// Actualizar una lección
export const updateLesson = async (req, res) => {
  try {
    const { title, description, exercises } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Título y descripción son obligatorios" });
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { title, description, exercises },
      { new: true }
    );

    if (!updatedLesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    res.json(updatedLesson);
  } catch (error) {
    console.error("Error en updateLesson:", error.message);
    res.status(500).json({ message: "Error al actualizar la lección" });
  }
};

// Eliminar una lección
export const deleteLesson = async (req, res) => {
  try {
    const deletedLesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!deletedLesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }
    res.json({ message: "Lección eliminada correctamente" });
  } catch (error) {
    console.error("Error en deleteLesson:", error.message);
    res.status(500).json({ message: "Error al eliminar la lección" });
  }
};

// Obtener todas las lecciones
export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find();
    res.status(200).json(lessons);
  } catch (error) {
    console.error("Error en getAllLessons:", error.message);
    res.status(500).json({ message: "Error al obtener las lecciones" });
  }
};

// Obtener un ejercicio por lessonId y order
export const getExerciseByOrder = async (req, res) => {
  try {
    const { courseId, lessonId, order } = req.params;
    const userId = req.user.userId;

    console.log("Buscando ejercicio:", { courseId, lessonId, order, userId });

    // Si courseId no está presente, omitir verificación de progreso
    if (courseId) {
      const canAccess = await progressService.canAccessExercise(
        userId,
        courseId,
        lessonId,
        parseInt(order)
      );
      if (!canAccess) {
        console.log("Acceso denegado: ejercicios anteriores incompletos");
        return res.status(403).json({
          message: "Debes completar los ejercicios anteriores primero.",
        });
      }
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      console.log("Lección no encontrada:", lessonId);
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    const exercise = lesson.exercises.find(
      (ex) => ex.order === parseInt(order)
    );
    if (!exercise) {
      console.log("Ejercicio no encontrado, orden:", order);
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    console.log("Ejercicio encontrado:", exercise);
    res.json(exercise);
  } catch (error) {
    console.error("Error en getExerciseByOrder:", error.message);
    res.status(500).json({ message: "Error al obtener el ejercicio" });
  }
};

// Actualizar un ejercicio por lessonId y order
export const updateExercise = async (req, res) => {
  try {
    const { lessonId, order } = req.params;
    const { title, content, instructions, language, expectedOutput } = req.body;

    // Find the lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    // Find the exercise by order
    const exerciseOrder = parseInt(order); // Ensure order is an integer
    const exerciseIndex = lesson.exercises.findIndex(
      (ex) => ex.order === exerciseOrder
    );
    if (exerciseIndex === -1) {
      return res.status(404).json({ message: "Ejercicio no encontrado." });
    }

    // Update the exercise with only the provided fields
    const updatedExercise = {
      ...lesson.exercises[exerciseIndex],
      order: exerciseOrder,
      title: title ?? lesson.exercises[exerciseIndex].title,
      content: content ?? lesson.exercises[exerciseIndex].content,
      instructions:
        instructions ?? lesson.exercises[exerciseIndex].instructions,
      language: language ?? lesson.exercises[exerciseIndex].language,
      expectedOutput:
        expectedOutput ?? lesson.exercises[exerciseIndex].expectedOutput,
    };

    lesson.exercises[exerciseIndex] = updatedExercise;

    // Mark the exercises array as modified
    lesson.markModified("exercises");

    await lesson.save();

    res.status(200).json({
      message: "Ejercicio actualizado exitosamente.",
      exercise: updatedExercise,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al actualizar el ejercicio.",
      error: error.message,
    });
  }
};

// Eliminar un ejercicio por lessonId y order
export const deleteExercise = async (req, res) => {
  try {
    const { lessonId, order } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    const exerciseIndex = lesson.exercises.findIndex(
      (ex) => ex.order === parseInt(order)
    );
    if (exerciseIndex === -1) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

    // Remove exercise from array
    lesson.exercises.splice(exerciseIndex, 1);
    await lesson.save();

    res.json({ message: "Ejercicio eliminado correctamente" });
  } catch (error) {
    console.error("Error en deleteExercise:", error.message);
    res.status(500).json({ message: "Error al eliminar el ejercicio" });
  }
};

// ... other imports and functions remain the same ...

// Crear un ejercicio en una lección
export const createExercise = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { order, title, content, instructions, language, expectedOutput } =
      req.body;

    console.log("Creating exercise for lessonId:", lessonId);
    console.log("Request body:", req.body);

    // Find the lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      console.log("Lesson not found for lessonId:", lessonId);
      return res.status(404).json({ message: "Lección no encontrada." });
    }

    console.log("Lesson found:", lesson);

    // Create the new exercise
    const newExercise = {
      order,
      title,
      content,
      instructions,
      language,
      expectedOutput,
    };

    lesson.exercises.push(newExercise);
    await lesson.save();

    res.status(201).json({
      message: "Ejercicio creado exitosamente.",
      exercise: newExercise,
    });
  } catch (error) {
    console.error("Error in createExercise:", error);
    res
      .status(500)
      .json({ message: "Error al crear el ejercicio.", error: error.message });
  }
};

// Validar el HTML del usuario
export const validateHtml = async (req, res) => {
  try {
    const { userCode, expectedOutput } = req.body;

    // Validar que se hayan enviado los datos necesarios
    if (!userCode || !expectedOutput) {
      return res.status(400).json({
        isCorrect: false,
        message: "⚠️ Código o salida esperada no proporcionados.",
      });
    }

    // Función para eliminar comentarios del código HTML
    const stripComments = (code) => code.replace(/<!--[\s\S]*?-->/g, "").trim();

    // Limpiar el código del usuario y la salida esperada
    const cleanUserCode = stripComments(userCode);
    const cleanExpectedOutput = stripComments(expectedOutput);

    // Parsear el código del usuario y la salida esperada con JSDOM
    const userDom = new JSDOM(cleanUserCode);
    const expectedDom = new JSDOM(cleanExpectedOutput);

    const userDoc = userDom.window.document;
    const expectedDoc = expectedDom.window.document;

    // Validar el DOCTYPE
    if (!cleanUserCode.toLowerCase().startsWith("<!doctype html>")) {
      throw new Error("Falta el <!DOCTYPE html>");
    }

    // Validar la estructura básica del HTML
    const userHtml = userDoc.querySelector("html");
    const userHead = userDoc.querySelector("head");
    const userBody = userDoc.querySelector("body");

    if (!userHtml || !userHead || !userBody) {
      throw new Error(
        "Falta la estructura básica de HTML (<html>, <head>, <body>)"
      );
    }

    const expectedBody = expectedDoc.querySelector("body");
    if (!expectedBody) {
      throw new Error("La salida esperada debe tener un elemento <body>");
    }

    // Función para obtener un mapa de elementos y sus cantidades, incluyendo anidamiento
    const getElementStructure = (element, parentPath = "") => {
      const structure = {};
      const children = Array.from(element.children);
      children.forEach((child, index) => {
        const tagName = child.tagName.toLowerCase();
        const currentPath = parentPath
          ? `${parentPath}.${tagName}[${index}]`
          : tagName;

        // Contar el elemento actual
        structure[tagName] = (structure[tagName] || 0) + 1;

        // Recursivamente contar los elementos hijos
        const childStructure = getElementStructure(child, currentPath);
        for (const [childTag, count] of Object.entries(childStructure)) {
          structure[childTag] = (structure[childTag] || 0) + count;
        }
      });
      return structure;
    };

    // Obtener la estructura de elementos en el expectedOutput y userCode
    const expectedStructure = getElementStructure(expectedBody);
    const userStructure = getElementStructure(userBody);

    // Comparar la estructura de elementos
    for (const [tagName, expectedCount] of Object.entries(expectedStructure)) {
      const userCount = userStructure[tagName] || 0;
      if (userCount !== expectedCount) {
        throw new Error(
          `Se esperaban exactamente ${expectedCount} elemento(s) <${tagName}>, pero se encontraron ${userCount}`
        );
      }
    }

    // Asegurarnos de que no haya elementos adicionales en el userCode
    for (const [tagName, userCount] of Object.entries(userStructure)) {
      const expectedCount = expectedStructure[tagName] || 0;
      if (userCount !== expectedCount) {
        throw new Error(
          `Se encontraron ${userCount} elemento(s) <${tagName}>, pero se esperaban ${expectedCount}`
        );
      }
    }

    // Validar que los elementos que normalmente contienen texto no estén vacíos
    const textContainingTags = [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "span",
      "div",
    ];
    const validateTextContent = (element, tagName, path) => {
      if (textContainingTags.includes(tagName) && !element.textContent.trim()) {
        throw new Error(
          `El elemento <${tagName}> en ${path} no puede estar vacío`
        );
      }
      Array.from(element.children).forEach((child, index) => {
        const childTag = child.tagName.toLowerCase();
        const childPath = path ? `${path}.${childTag}[${index}]` : childTag;
        validateTextContent(child, childTag, childPath);
      });
    };

    validateTextContent(userBody, "body", "body");

    // Si todas las validaciones pasan
    res.json({ isCorrect: true, message: "✅ ¡Respuesta correcta!" });
  } catch (error) {
    res.json({
      isCorrect: false,
      message: `❌ ${
        error.message ||
        "Intenta de nuevo. Verifica la sintaxis y el contenido del código."
      }`,
    });
  }
};

// controllers/lessonController.js
export const getAllProgressByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId; // Obtained from JWT

    // Verify that the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    // Fetch all progress for the user and course
    const progress = await UserExerciseProgress.find({
      userId,
      courseId,
    }).lean();

    res.json(progress);
  } catch (error) {
    console.error("Error en getAllProgressByCourse:", error.message);
    res.status(500).json({ message: "Error al obtener el progreso" });
  }
};
