import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../src/config/site";
import { ThemeProvider } from "next-themes";
import { BoostBanner } from "@/features/boosts/BoostBanner";
import { WebOnboarding } from "@/features/onboarding/WebOnboarding";
import { RewardProvider } from "../contexts/RewardContext";
import { LanguageProvider } from "../src/i18n/LanguageContext";
import GlobalChatProvider from "../components/chat/GlobalChatProvider";
import GlobalNotificationsProvider from "../components/notifications/GlobalNotificationsProvider";
import AppToastContainer from "../components/ui/AppToastContainer";
import {
  ConsentDefaults,
  GoogleTagManagerBody,
  GoogleTagManagerHead,
} from "../components/analytics/GoogleTagManager";
import CookieBanner from "../components/consent/CookieBanner";
import { GtmRouteTracker } from "../components/analytics/GtmRouteTracker";
import { AdSenseLoader } from "../components/ads/AdSenseLoader";

// Íconos (favicon.ico, icon.png, apple-icon.png) e imagen para compartir
// (opengraph-image.png / twitter-image.png) salen de archivos en app/ por
// convención de Next.js — no hace falta listarlos acá.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "CodeBuddies — Aprendé a programar jugando",
    template: "%s · CodeBuddies",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "aprender a programar",
    "cursos de programación",
    "programación para principiantes",
    "HTML",
    "CSS",
    "JavaScript",
    "Python",
    "certificados",
    "ejercicios de código",
  ],
  // Verificación de sitio de Google AdSense (método alternativo al script,
  // que Google no pudo detectar) -- vía la Metadata API de Next.js para que
  // quede en el HTML server-rendered que recibe Googlebot, no inyectado
  // después en el cliente.
  other: {
    "google-adsense-account": "ca-pub-5652535704352954",
  },
  openGraph: {
    title: "CodeBuddies — Aprendé a programar jugando",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "es_ES",
    alternateLocale: ["en_US", "de_DE"],
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeBuddies — Aprendé a programar jugando",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0e12" },
    { media: "(prefers-color-scheme: light)", color: "#f3f4f6" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <ConsentDefaults />
      <GoogleTagManagerHead />
      <body>
        <GoogleTagManagerBody />
        <GtmRouteTracker />
        <AdSenseLoader />
        <ThemeProvider attribute="data-theme" defaultTheme="dark">
          {/* LanguageProvider va por fuera: RewardProvider pinta las tarjetas
              de recompensa (con textos traducidos) y, si quedaba afuera del
              idioma, la primera recompensa tumbaba la página entera. */}
          <LanguageProvider>
            <RewardProvider>
              <GlobalNotificationsProvider>
                <GlobalChatProvider>
                  {children}
                  <AppToastContainer />
                  <CookieBanner />
                  <BoostBanner />
                  <WebOnboarding />
                </GlobalChatProvider>
              </GlobalNotificationsProvider>
            </RewardProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
