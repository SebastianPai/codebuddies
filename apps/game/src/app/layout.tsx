import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "../i18n/LanguageContext";

// Nota (Fase 11.5 — Production Readiness Gate): este archivo traía Geist /
// Geist Mono de `next/font/google` desde el scaffold de create-next-app, pero
// nada en el proyecto las usaba — la tipografía real del juego es Inter,
// cargada en globals.css con un `@import url(fonts.googleapis.com/...)`
// directo, que es independiente de esto. Las variables `--font-geist-sans` /
// `--font-geist-mono` no aparecían en ningún `font-family` de todo el
// repo (confirmado por búsqueda), así que quitarlas no cambia un solo pixel
// del juego. Lo que sí hacían era obligar a Turbopack a resolver esas dos
// fuentes contra Google Fonts EN TIEMPO DE BUILD, y un build de producción no
// puede depender de que esa red esté disponible en ese momento — es
// exactamente lo que rompía `next build` con un error TLS.
export const metadata: Metadata = {
  title: "CodeBuddies — Juego",
  description:
    "El mundo multijugador de CodeBuddies: explorá salas, personalizá tu avatar y jugá con la comunidad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
