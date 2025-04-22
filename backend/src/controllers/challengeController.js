import Challenge from "../models/ChallengeModel.js";

// Obtener todos los retos de una lección
export const getChallengeByLesson = async (req, res) => {
  const { lessonId } = req.params;

  try {
    const challenge = await Challenge.findOne({ lesson: lessonId });

    if (!challenge) {
      return res
        .status(404)
        .json({ message: "Reto no encontrado para esta lección." });
    }

    res.json(challenge);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener el reto", error: err.message });
  }
};

// Obtener un reto individual
export const getChallengeById = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge)
      return res.status(404).json({ message: "Reto no encontrado" });
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener el reto" });
  }
};

// Crear un reto
export const createChallenge = async (req, res) => {
  const { lesson, title, description, starterCode, tests, solution, order } =
    req.body;

  try {
    const newChallenge = new Challenge({
      lesson,
      title,
      description,
      starterCode,
      tests,
      solution,
      order,
    });

    await newChallenge.save();
    res.status(201).json(newChallenge);
  } catch (err) {
    res.status(500).json({ message: "Error al crear el reto" });
  }
};

// Actualizar reto
export const updateChallenge = async (req, res) => {
  try {
    const updated = await Challenge.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated)
      return res.status(404).json({ message: "Reto no encontrado" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar el reto" });
  }
};

// Eliminar reto
export const deleteChallenge = async (req, res) => {
  try {
    const deleted = await Challenge.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Reto no encontrado" });
    res.json({ message: "Reto eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar el reto" });
  }
};
