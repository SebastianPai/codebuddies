// backend/src/controllers/courseController.js
import Course from "../models/CourseModel.js";
import Lesson from "../models/LessonModel.js";
import { uploadFileToSpaces } from "../services/spacesService.js";

export const createCourse = async (req, res) => {
  try {
    const { title, description, level, module } = req.body;
    let imageUrl;

    if (req.file) {
      const result = await uploadFileToSpaces(req.file);
      imageUrl = result.Location; // URL del CDN
    }

    const newCourse = new Course({
      title,
      description,
      image: imageUrl,
      level,
      module,
      lessons: [],
    });

    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { title, description, level, module } = req.body;
    let updateData = { title, description, level, module };

    if (req.file) {
      const result = await uploadFileToSpaces(req.file);
      updateData.image = result.Location; // URL del CDN
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedCourse) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }
    res.status(200).json(updatedCourse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("module");
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate("lessons");
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado" });
    res.status(200).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCourseLessons = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { lessons } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }

    course.lessons = lessons;
    await course.save();

    res
      .status(200)
      .json({ message: "Lecciones actualizadas correctamente", course });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al actualizar lecciones", error: error.message });
  }
};

export const getLessonsByCourseId = async (req, res) => {
  try {
    const { id } = req.params;

    const lessons = await Lesson.find({ course: id });

    res.status(200).json(lessons);
  } catch (error) {
    console.error("Error al obtener lecciones por ID de curso:", error);
    res.status(500).json({ message: "Error al obtener las lecciones." });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }
    res.status(200).json({ message: "Curso eliminado" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCoursesByModuleId = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const courses = await Course.find({ module: moduleId });
    res.status(200).json(courses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching courses by module", error });
  }
};
