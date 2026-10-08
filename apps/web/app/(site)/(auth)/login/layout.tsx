import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Entrá a tu cuenta de CodeBuddies y seguí aprendiendo a programar donde lo dejaste.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
