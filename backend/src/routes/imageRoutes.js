// backend/src/routes/imageProxy.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "URL inválida" });
  }

  try {
    // Validar la URL
    const imageUrl = new URL(url);
    // Lista de dominios permitidos (puedes expandirla según tus necesidades)
    const allowedDomains = [
      "picsum.photos",
      "images.unsplash.com",
      "via.placeholder.com",
      "scontent.fpso1-1.fna.fbcdn.net", // Temporalmente para Facebook
      "codebuddies-jh-3e772884b367.herokuapp.com",
    ];
    const isAllowed = allowedDomains.some((domain) =>
      imageUrl.hostname.includes(domain)
    );

    if (!isAllowed) {
      // Servir una imagen de respaldo si el dominio no está permitido
      return res.redirect("/uploads/default-image.jpg");
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CodeBuddies/1.0)",
      },
    });
    if (!response.ok) {
      return res.redirect("/uploads/default-image.jpg");
    }

    const buffer = await response.buffer();
    res.set(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );
    res.set("Cache-Control", "public, max-age=31536000"); // Cachear por 1 año
    res.send(buffer);
  } catch (err) {
    console.error("Error en proxy-image:", err);
    res.redirect("/uploads/default-image.jpg");
  }
});

export default router;
