// src/controllers/adminController.js
import Achievement from "../models/Achievement.js";
import ShopItem from "../models/ShopItem.js";
import Power from "../models/Power.js";

export const createAchievement = async (req, res) => {
  try {
    const { name, description, icon, image, condition } = req.body;

    if (!name || !description || !icon || !condition || !condition.type) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const achievement = new Achievement({
      name,
      description,
      icon,
      image,
      condition,
    });

    await achievement.save();
    res.status(201).json({ message: "Logro creado", achievement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find();
    res.status(200).json(achievements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, image, condition } = req.body;

    const achievement = await Achievement.findByIdAndUpdate(
      id,
      { name, description, icon, image, condition },
      { new: true }
    );

    if (!achievement) {
      return res.status(404).json({ message: "Logro no encontrado" });
    }

    res.status(200).json({ message: "Logro actualizado", achievement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const achievement = await Achievement.findByIdAndDelete(id);

    if (!achievement) {
      return res.status(404).json({ message: "Logro no encontrado" });
    }

    res.status(200).json({ message: "Logro eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createShopItem = async (req, res) => {
  try {
    const { name, description, price, type, properties, image, isActive } =
      req.body;

    if (!name || !description || !price || !type) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const shopItem = new ShopItem({
      name,
      description,
      price,
      type,
      properties,
      image,
      isActive,
    });

    await shopItem.save();
    res.status(201).json({ message: "Ítem creado", shopItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getShopItems = async (req, res) => {
  try {
    const shopItems = await ShopItem.find();
    res.status(200).json(shopItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateShopItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, type, properties, image, isActive } =
      req.body;

    const shopItem = await ShopItem.findByIdAndUpdate(
      id,
      { name, description, price, type, properties, image, isActive },
      { new: true }
    );

    if (!shopItem) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }

    res.status(200).json({ message: "Ítem actualizado", shopItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteShopItem = async (req, res) => {
  try {
    const { id } = req.params;
    const shopItem = await ShopItem.findByIdAndDelete(id);

    if (!shopItem) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }

    res.status(200).json({ message: "Ítem eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPower = async (req, res) => {
  try {
    const { name, description, price, effect, image, emoji, isActive } =
      req.body;

    if (!name || !description || !price || !effect || !effect.type) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const power = new Power({
      name,
      description,
      price,
      effect,
      image,
      emoji: emoji || "⚡",
      isActive,
    });

    await power.save();
    res.status(201).json({ message: "Poder creado", power });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPowers = async (req, res) => {
  try {
    const powers = await Power.find();
    res.status(200).json(powers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePower = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, effect, image, emoji, isActive } =
      req.body;

    const power = await Power.findByIdAndUpdate(
      id,
      { name, description, price, effect, image, emoji, isActive },
      { new: true }
    );

    if (!power) {
      return res.status(404).json({ message: "Poder no encontrado" });
    }

    res.status(200).json({ message: "Poder actualizado", power });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePower = async (req, res) => {
  try {
    const { id } = req.params;
    const power = await Power.findByIdAndDelete(id);

    if (!power) {
      return res.status(404).json({ message: "Poder no encontrado" });
    }

    res.status(200).json({ message: "Poder eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
