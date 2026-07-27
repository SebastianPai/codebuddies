import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

import { ThemeProvider } from "next-themes";
import { RewardProvider } from "../contexts/RewardContext";
import { LanguageProvider } from "../src/i18n/LanguageContext";
import GlobalChatProvider from "../components/chat/GlobalChatProvider";
import GlobalNotificationsProvider from "../components/notifications/GlobalNotificationsProvider";
import AppToastContainer from "../components/ui/AppToastContainer";

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
