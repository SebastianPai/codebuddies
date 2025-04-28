import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    res.status(400).json({ message: "URL inválida" });
    return;
  }

  // Configurar cabeceras CORS para todas las respuestas
  const allowedOrigin =
    process.env.NODE_ENV === "production"
      ? "https://codebuddies-jh-3e772884b367.herokuapp.com"
      : "http://localhost:5173";
  res.set("Access-Control-Allow-Origin", allowedOrigin);
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  try {
    const imageUrl = new URL(url);
    const allowedDomains = [
      "picsum.photos",
      "fastly.picsum.photos",
      "images.unsplash.com",
      "via.placeholder.com",
      "scontent.fpso1-1.fna.fbcdn.net",
      "codebuddies-jh-3e772884b367.herokuapp.com",
    ];
    const isAllowed = allowedDomains.some((domain) =>
      imageUrl.hostname.includes(domain)
    );

    if (!isAllowed) {
      // Redirección con cabeceras CORS
      res.redirect(302, "/uploads/default-image.jpg");
      return;
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CodeBuddies/1.0)",
      },
    });
    if (!response.ok) {
      res.redirect(302, "/uploads/default-image.jpg");
      return;
    }

    const buffer = await response.buffer();
    res.set(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );
    res.set("Cache-Control", "public, max-age=31536000");
    res.send(buffer);
  } catch (err) {
    console.error("Error en proxy-image:", err);
    res.redirect(302, "/uploads/default-image.jpg");
  }
});

export default router;
