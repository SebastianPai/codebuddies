import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "URL inválida" });
  }

  // Establecer cabeceras CORS
  const allowedOrigin = req.headers.origin || "*"; // Permitir origen nulo
  console.log(
    `Origen de la solicitud (proxy): ${req.headers.origin || "null"}`
  );
  res.set({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  });

  try {
    const imageUrl = new URL(url);

    // Bloquear URLs internas
    if (
      imageUrl.hostname === "codebuddies-jh-3e772884b367.herokuapp.com" ||
      imageUrl.hostname === "localhost"
    ) {
      const defaultImagePath = path.join(
        __dirname,
        "../../frontend/public/images/default-image.jpg"
      );
      const buffer = fs.readFileSync(defaultImagePath);
      res.set("Content-Type", "image/jpeg");
      return res.send(buffer);
    }

    // Permitir dominios externos específicos
    const allowedDomains = [
      "picsum.photos",
      "fastly.picsum.photos",
      "images.unsplash.com",
      "via.placeholder.com",
      "scontent.fpso1-1.fna.fbcdn.net",
    ];
    const isAllowed = allowedDomains.some((domain) =>
      imageUrl.hostname.includes(domain)
    );

    if (!isAllowed) {
      console.warn(`Dominio no permitido: ${imageUrl.hostname}`);
      const defaultImagePath = path.join(
        __dirname,
        "../../frontend/public/images/default-image.jpg"
      );
      const buffer = fs.readFileSync(defaultImagePath);
      res.set("Content-Type", "image/jpeg");
      return res.send(buffer);
    }

    // Obtener imagen externa
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CodeBuddies/1.0)",
      },
    });

    if (!response.ok) {
      console.error(`Error al obtener imagen: ${response.status}`);
      const defaultImagePath = path.join(
        __dirname,
        "../../frontend/public/images/default-image.jpg"
      );
      const buffer = fs.readFileSync(defaultImagePath);
      res.set("Content-Type", "image/jpeg");
      return res.send(buffer);
    }

    const buffer = await response.buffer();
    res.set({
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=31536000",
    });
    res.send(buffer);
  } catch (err) {
    console.error("Error en proxy-image:", err);
    const defaultImagePath = path.join(
      __dirname,
      "../../frontend/public/images/default-image.jpg"
    );
    const buffer = fs.readFileSync(defaultImagePath);
    res.set("Content-Type", "image/jpeg");
    res.send(buffer);
  }
});

export default router;
