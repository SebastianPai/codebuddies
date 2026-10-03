import type { Metadata, Viewport } from "next";
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
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CodeBuddies" },
};

// Celular: ocupa toda la pantalla (también bajo el notch) y no hace zoom con
// doble toque, que en un juego se confunde con mover la cámara.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0b0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
