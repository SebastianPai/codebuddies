import Lesson from "../models/LessonModel.js";
import Course from "../models/CourseModel.js";

// Obtener todas las lecciones de un curso
export const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }
    const lessons = await Lesson.find({ course: courseId }).sort({
      createdAt: 1,
    });
    res.json(lessons);
  } catch (error) {
    console.error("Error en getLessonsByCourse:", error.message);
    res.status(500).json({ message: "Error al obtener lecciones" });
  }
};

// Obtener una lección por ID
export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }
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
    const { lessonId, order } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    const exercise = lesson.exercises.find(
      (ex) => ex.order === parseInt(order)
    );
    if (!exercise) {
      return res.status(404).json({ message: "Ejercicio no encontrado" });
    }

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

    // Validate required fields
    if (!title || !content || !language) {
      return res
        .status(400)
        .json({ message: "Título, contenido y lenguaje son obligatorios" });
    }

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

    // Update exercise fields
    lesson.exercises[exerciseIndex] = {
      ...lesson.exercises[exerciseIndex],
      title,
      content,
      instructions: instructions || "",
      language,
      expectedOutput: expectedOutput || "",
    };

    await lesson.save();
    res.json(lesson.exercises[exerciseIndex]);
  } catch (error) {
    console.error("Error en updateExercise:", error.message);
    res.status(500).json({ message: "Error al actualizar el ejercicio" });
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

    // Validate required fields
    if (!order || !title || !content || !language) {
      return res.status(400).json({
        message: "Orden, título, contenido y lenguaje son obligatorios",
      });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    // Check if order is unique
    const existingExercise = lesson.exercises.find((ex) => ex.order === order);
    if (existingExercise) {
      return res
        .status(400)
        .json({ message: "Ya existe un ejercicio con este orden" });
    }

    // Validate language
    const validLanguages = [
      "javascript",
      "python",
      "css",
      "html",
      "c",
      "java",
      "markup",
    ];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ message: "Lenguaje no válido" });
    }

    const newExercise = {
      order,
      title,
      content,
      instructions: instructions || "",
      language,
      expectedOutput: expectedOutput || "",
    };

    lesson.exercises.push(newExercise);
    await lesson.save();

    res.status(201).json(newExercise);
  } catch (error) {
    console.error("Error en createExercise:", error.message);
    res.status(500).json({ message: "Error al crear el ejercicio" });
  }
};
