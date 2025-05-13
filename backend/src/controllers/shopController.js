import ShopItem from "../models/ShopItem.js";
import Power from "../models/Power.js";
import User from "../models/User.js";
import * as coinService from "../services/coinService.js";
import * as livesService from "../services/livesService.js";

export const getShopItems = async (req, res) => {
  try {
    const shopItems = await ShopItem.find({ isActive: true });
    const powers = await Power.find({ isActive: true });

    const formattedItems = [
      ...shopItems.map((item) => ({
        _id: item._id.toString(),
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image || "",
        type: item.type,
        properties: item.properties || {},
      })),
      ...powers.map((item) => ({
        _id: item._id.toString(),
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image || "",
        customLogo: item.customLogo || "",
        type: "power",
        properties: item.properties || {},
        emoji: item.emoji || "",
      })),
    ];

    res.status(200).json(formattedItems);
  } catch (error) {
    console.error("Error en getShopItems:", error);
    res
      .status(500)
      .json({ message: error.message || "Error al obtener ítems" });
  }
};

export const purchaseItem = async (req, res) => {
  try {
    const { itemId, itemType } = req.body;
    console.log("Compra solicitada:", { itemId, itemType, user: req.user }); // Añadir log

    if (!itemId || !itemType) {
      return res.status(400).json({ message: "Faltan itemId o itemType" });
    }

    const validTypes = ["life", "border", "tag", "power"];
    if (!validTypes.includes(itemType)) {
      console.error("Tipo de ítem inválido:", itemType);
      return res.status(400).json({ message: "Tipo de ítem inválido" });
    }

    if (!req.user) {
      console.error("req.user es undefined");
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const userId = req.user.userId;
    if (!userId) {
      console.error("No se encontró userId en req.user:", req.user);
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    let item;
    if (itemType === "power") {
      item = await Power.findById(itemId);
    } else {
      item = await ShopItem.findById(itemId);
    }

    if (!item || !item.isActive) {
      return res
        .status(404)
        .json({ message: "Ítem no encontrado o no disponible" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.coins < item.price) {
      return res.status(400).json({ message: "No tienes suficientes monedas" });
    }

    console.log("Deduciendo monedas:", { userId, amount: item.price }); // Añadir log
    await coinService.deductCoins(userId, item.price);

    const itemData = {
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image || "",
      customLogo: item.customLogo || "",
      type: itemType,
      properties: item.properties || {},
      ...(itemType === "power" && { emoji: item.emoji || "" }),
    };

    switch (itemType) {
      case "life": {
        const amount = item.properties?.amount || 1;
        user.lives = Math.min(user.lives + amount, 5);
        break;
      }
      case "border": {
        if (!user.borders.some((b) => b.borderId.toString() === itemId)) {
          user.borders.push({ borderId: itemId });
          user.activeBorder = itemId;
        } else {
          return res.status(400).json({ message: "Ya posees este borde" });
        }
        break;
      }
      case "tag": {
        if (!user.tags.some((t) => t.tagId.toString() === itemId)) {
          user.tags.push({ tagId: itemId });
          user.activeTag = itemId;
        } else {
          return res.status(400).json({ message: "Ya posees esta etiqueta" });
        }
        break;
      }
      case "power": {
        const existingPower = user.powers.find(
          (p) => p.powerId.toString() === itemId
        );
        if (existingPower) {
          existingPower.usesLeft += 1;
        } else {
          user.powers.push({ powerId: itemId, usesLeft: 1 });
          user.activePowers = user.activePowers || [];
          user.activePowers.push({
            powerId: itemId,
            remainingDuration: item.effect?.duration || 1,
            activatedAt: new Date(),
          });
        }
        break;
      }
      default: {
        return res.status(400).json({ message: "Tipo de ítem inválido" });
      }
    }

    await user.save();
    await user.populate("activeBorder activeTag");

    res.status(200).json({
      message: "Compra realizada con éxito",
      user: {
        coins: user.coins,
        lives: user.lives,
        borders: user.borders,
        tags: user.tags,
        powers: user.powers,
        activeBorder: user.activeBorder
          ? {
              borderId: user.activeBorder._id.toString(),
              name: user.activeBorder.name,
              description: user.activeBorder.description,
              properties: user.activeBorder.properties || {},
              image: user.activeBorder.image || "",
            }
          : null,
        activeTag: user.activeTag
          ? {
              tagId: user.activeTag._id.toString(),
              name: user.activeTag.name,
              description: user.activeTag.description,
              properties: user.activeTag.properties || {},
              image: user.activeTag.image || "",
            }
          : null,
        activePowers: user.activePowers.map((p) => ({
          ...p,
          powerId: p.powerId.toString(),
        })),
      },
    });
  } catch (error) {
    console.error("Error en purchaseItem:", error);
    res
      .status(400)
      .json({ message: error.message || "Error al procesar la compra" });
  }
};
