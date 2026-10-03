import type { MetadataRoute } from "next";

// Instalable como app: en el celular abre a pantalla completa y en
// horizontal, sin la barra del navegador (la única forma en iPhone, donde
// Safari no deja pedir pantalla completa desde la página).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CodeBuddies — Juego",
    short_name: "CodeBuddies",
    description: "El mundo multijugador de CodeBuddies.",
    start_url: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
