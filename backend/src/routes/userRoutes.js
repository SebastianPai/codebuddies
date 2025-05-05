import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getRankings,
  updateProfilePicture,
} from "../controllers/userController.js";
import { upload } from "../services/spacesService.js";

const router = express.Router();

// Ruta protegida para obtener info del usuario logueado
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.status(200).json({
      message: "Ruta protegida accedida correctamente",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture || "",
        university: user.university || "",
        isUniversityStudent: user.isUniversityStudent || false,
        level: user.level || 1,
        xp: user.xp || 0,
        maxXp: user.maxXp || 100,
        powers: user.powers || [],
        achievements: user.achievements || [],
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error del servidor" });
  }
});

// Registrar un nuevo usuario
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "El correo ya está registrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "Usuario registrado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error del servidor" });
  }
});

// Login de usuario
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta." });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        level: user.level || 1,
        xp: user.xp || 0,
        maxXp: user.maxXp || 100,
        profilePicture: user.profilePicture || "",
        university: user.university || "",
        isUniversityStudent: user.isUniversityStudent || false,
        achievements: user.achievements || [],
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error del servidor" });
  }
});

// Update user profile
router.put("/update", verifyToken, async (req, res) => {
  try {
    const { name, profilePicture, university, isUniversityStudent } = req.body;

    if (!name) {
      return res.status(400).json({ message: "El nombre es obligatorio." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        name,
        profilePicture,
        university,
        isUniversityStudent,
      },
      { new: true, select: "-password" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.status(200).json({
      message: "Perfil actualizado correctamente",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Error del servidor" });
  }
});

// Update profile picture
router.put(
  "/profile-picture",
  verifyToken,
  upload.single("profilePicture"),
  updateProfilePicture
);

// Ruta para obtener el ranking (protegida)
router.get("/rankings", verifyToken, getRankings);

export default router;
