import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getRankings,
  updateProfilePicture,
  getLives,
  getStreak,
  getAchievements,
  updateProfileBackground,
  getPublicProfile,
  getCoins,
  spendCoins,
  buyLives,
  setActiveBorder,
  setActiveTag,
  activatePower,
} from "../controllers/userController.js";
import { upload } from "../services/spacesService.js";

const router = express.Router();

// Ruta protegida para obtener info del usuario logueado
router.get("/me", verifyToken, async (req, res) => {
  try {
    console.log("req.user:", req.user); // Log para depurar
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    console.log("Usuario encontrado:", user); // Log para depurar

    // Inicializar campos por defecto si no existen
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture || "",
      profileBackground: user.profileBackground || "",
      university: user.university || "",
      isUniversityStudent: user.isUniversityStudent || false,
      level: user.level || 1,
      xp: user.xp || 0,
      maxXp: user.maxXp || 100,
      coins: user.coins || 0,
      powers: user.powers || [],
      activePowers: user.activePowers || [],
      achievements: user.achievements || [],
      streak: user.streak || 0,
      lives: user.lives || 5,
      borders: user.borders || [],
      tags: user.tags || [],
      activeBorder: user.activeBorder || null,
      activeTag: user.activeTag || null,
      role: user.role || "user",
    };

    // Intentar populate solo si las colecciones existen
    try {
      const populatedUser = await User.findById(req.user.userId)
        .select("-password")
        .populate("achievements.achievementId")
        .populate("borders.borderId")
        .populate("tags.tagId")
        .populate("activeBorder")
        .populate("activeTag")
        .populate("powers.powerId")
        .populate("activePowers.powerId");

      if (populatedUser) {
        userData.achievements = populatedUser.achievements.map((a) => ({
          id: a.achievementId?._id,
          name: a.achievementId?.name || "Desconocido",
          description: a.achievementId?.description || "",
          icon: a.achievementId?.icon || "",
          image: a.achievementId?.image || "",
          awardedAt: a.awardedAt,
        }));
        userData.borders = populatedUser.borders.map((b) => ({
          id: b.borderId?._id,
          name: b.borderId?.name || "Desconocido",
          description: b.borderId?.description || "",
          properties: b.borderId?.properties || {},
          image: b.borderId?.image || "",
          acquiredAt: b.acquiredAt,
        }));
        userData.tags = populatedUser.tags.map((t) => ({
          id: t.tagId?._id,
          name: t.tagId?.name || "Desconocido",
          description: t.tagId?.description || "",
          properties: t.tagId?.properties || {},
          image: t.tagId?.image || "",
          acquiredAt: t.acquiredAt,
        }));
        userData.activeBorder = populatedUser.activeBorder
          ? {
              id: populatedUser.activeBorder._id,
              name: populatedUser.activeBorder.name || "Desconocido",
              description: populatedUser.activeBorder.description || "",
              properties: populatedUser.activeBorder.properties || {},
              image: populatedUser.activeBorder.image || "",
            }
          : null;
        userData.activeTag = populatedUser.activeTag
          ? {
              id: populatedUser.activeTag._id,
              name: populatedUser.activeTag.name || "Desconocido",
              description: populatedUser.activeTag.description || "",
              properties: populatedUser.activeTag.properties || {},
              image: populatedUser.activeTag.image || "",
            }
          : null;
        userData.powers = populatedUser.powers.map((p) => ({
          id: p.powerId?._id,
          name: p.powerId?.name || "Desconocido",
          description: p.powerId?.description || "",
          effect: p.powerId?.effect || {},
          image: p.powerId?.image || "",
          emoji: p.powerId?.emoji || "",
          usesLeft: p.usesLeft,
          acquiredAt: p.acquiredAt,
        }));
        userData.activePowers = populatedUser.activePowers.map((ap) => ({
          id: ap.powerId?._id,
          name: ap.powerId?.name || "Desconocido",
          description: ap.powerId?.description || "",
          effect: ap.powerId?.effect || {},
          image: ap.powerId?.image || "",
          emoji: ap.powerId?.emoji || "",
          remainingDuration: ap.remainingDuration,
          activatedAt: ap.activatedAt,
        }));
      }
    } catch (populateError) {
      console.warn(
        "Error en populate, usando datos sin populate:",
        populateError
      );
      // Continúa con los datos sin populate
    }

    res.status(200).json({
      message: "Ruta protegida accedida correctamente",
      user: userData,
    });
  } catch (error) {
    console.error("Error en /me:", error);
    res
      .status(500)
      .json({ message: "Error del servidor", error: error.message });
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
      profilePicture: "",
      profileBackground: "",
      university: "",
      isUniversityStudent: false,
      level: 1,
      xp: 0,
      maxXp: 100,
      coins: 0,
      powers: [],
      activePowers: [],
      achievements: [],
      completedCourses: [],
      completedExercises: [],
      lives: 5,
      lastLivesReset: new Date(),
      streak: 0,
      lastActivity: null,
      role: "user",
      borders: [],
      tags: [],
      activeBorder: null,
      activeTag: null,
    });

    await newUser.save();

    res.status(201).json({ message: "Usuario registrado correctamente" });
  } catch (error) {
    console.error("Error en /register:", error);
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
      { userId: user._id, email: user.email, role: user.role },
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
        coins: user.coins || 0,
        profilePicture: user.profilePicture || "",
        profileBackground: user.profileBackground || "",
        university: user.university || "",
        isUniversityStudent: user.isUniversityStudent || false,
        achievements: user.achievements || [],
        streak: user.streak || 0,
        lives: user.lives || 5,
        role: user.role || "user",
        borders: user.borders || [],
        tags: user.tags || [],
        activeBorder: user.activeBorder || null,
        activeTag: user.activeTag || null,
        powers: user.powers || [],
        activePowers: user.activePowers || [],
      },
    });
  } catch (error) {
    console.error("Error en /login:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
});

// Update user profile
router.put("/update", verifyToken, async (req, res) => {
  try {
    const {
      name,
      profilePicture,
      profileBackground,
      university,
      isUniversityStudent,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "El nombre es obligatorio." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        name,
        profilePicture,
        profileBackground,
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
    console.error("Error en /update:", error);
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

// Update profile background
router.put("/profile-background", verifyToken, updateProfileBackground);

// Ruta para obtener el ranking (protegida)
router.get("/rankings", verifyToken, getRankings);

// Ruta para obtener las vidas
router.get("/lives", verifyToken, getLives);

// Ruta para comprar vidas
router.post("/buy-lives", verifyToken, buyLives);

// Ruta para obtener la racha
router.get("/streak", verifyToken, getStreak);

// Ruta para obtener los logros
router.get("/achievements", verifyToken, getAchievements);

// Ruta para obtener el perfil público de un usuario
router.get("/profile/:userId", verifyToken, getPublicProfile);

// Ruta para obtener las monedas
router.get("/coins", verifyToken, getCoins);

// Ruta para gastar monedas
router.post("/spend-coins", verifyToken, spendCoins);

// Rutas para activar bordes, etiquetas y poderes
router.post("/set-active-border", verifyToken, setActiveBorder);
router.post("/set-active-tag", verifyToken, setActiveTag);
router.post("/activate-power", verifyToken, activatePower);

export default router;
