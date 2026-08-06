import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { RewardProvider } from "../contexts/RewardContext";
import { LanguageProvider } from "../src/i18n/LanguageContext";
import GlobalChatProvider from "../components/chat/GlobalChatProvider";
import GlobalNotificationsProvider from "../components/notifications/GlobalNotificationsProvider";
import AppToastContainer from "../components/ui/AppToastContainer";

const SITE_DESCRIPTION =
  "Aprendé a programar con cursos interactivos, ejercicios de código en vivo y certificados verificables.";

// El dominio de producción real que ya asume el backend por default para
// las URLs de verificación de certificados (ver
// CERTIFICATE_VERIFICATION_BASE_URL en certificates.service.ts) — se usa
// acá también para que las imágenes de Open Graph/Twitter resuelvan como
// URLs absolutas. Si el dominio real termina siendo otro, actualizar los
// dos lugares juntos.
export const metadata: Metadata = {
  metadataBase: new URL("https://codebuddies.app"),
  title: {
    default: "CodeBuddies — Aprendé a programar",
    template: "%s · CodeBuddies",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "CodeBuddies",
    description: SITE_DESCRIPTION,
    siteName: "CodeBuddies",
    type: "website",
    images: ["/robot-head.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeBuddies",
    description: SITE_DESCRIPTION,
    images: ["/robot-head.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark">
          <RewardProvider>
            <LanguageProvider>
              <GlobalNotificationsProvider>
                <GlobalChatProvider>
                  {children}
                  <AppToastContainer />
                </GlobalChatProvider>
              </GlobalNotificationsProvider>
            </LanguageProvider>
          </RewardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
