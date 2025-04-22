import Module from "../models/ModuleModel.js";
import Course from "../models/CourseModel.js";

// Obtener todos los módulos ordenados
export const getModules = async (req, res) => {
  try {
    const modules = await Module.find().sort({ order: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener módulos" });
  }
};

// Obtener un solo módulo por ID
export const getModuleById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module)
      return res.status(404).json({ message: "Módulo no encontrado" });

    res.json(module);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener el módulo" });
  }
};

// Crear un nuevo módulo
export const createModule = async (req, res) => {
  const { title, description, order } = req.body;
  try {
    const newModule = new Module({ title, description, order });
    await newModule.save();
    res.status(201).json(newModule);
  } catch (err) {
    res.status(500).json({ message: "Error al crear el módulo" });
  }
};

// Actualizar módulo
export const updateModule = async (req, res) => {
  try {
    const updated = await Module.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated)
      return res.status(404).json({ message: "Módulo no encontrado" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar el módulo" });
  }
};

// Eliminar módulo
export const deleteModule = async (req, res) => {
  try {
    const deleted = await Module.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Módulo no encontrado" });
    res.json({ message: "Módulo eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar el módulo" });
  }
};

export const getCoursesByModule = async (req, res) => {
  try {
    const moduleId = req.params.id;
    const courses = await Course.find({ module: moduleId });
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener cursos del módulo",
      error: error.message,
    });
  }
};
