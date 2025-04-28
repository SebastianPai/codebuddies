import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    res.status(400).json({ message: "URL inválida" });
    return;
  }

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
      const defaultImagePath = path.join(
        __dirname,
        "../../Uploads/default-image.jpg"
      );
      const buffer = fs.readFileSync(defaultImagePath);
      res.set("Content-Type", "image/jpeg");
      res.send(buffer);
      return;
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CodeBuddies/1.0)",
      },
    });
    if (!response.ok) {
      const defaultImagePath = path.join(
        __dirname,
        "../../Uploads/default-image.jpg"
      );
      const buffer = fs.readFileSync(defaultImagePath);
      res.set("Content-Type", "image/jpeg");
      res.send(buffer);
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
    const defaultImagePath = path.join(
      __dirname,
      "../../Uploads/default-image.jpg"
    );
    const buffer = fs.readFileSync(defaultImagePath);
    res.set("Content-Type", "image/jpeg");
    res.send(buffer);
  }
});

export default router;
