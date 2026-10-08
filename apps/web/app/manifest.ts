import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "../src/config/site";

// Permite "Agregar a pantalla de inicio" en móvil con el ícono correcto.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CodeBuddies",
    short_name: "CodeBuddies",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0c0e12",
    theme_color: "#0c0e12",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
