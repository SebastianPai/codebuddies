import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ajustes",
  description: "Configurá tu perfil y preferencias de CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
