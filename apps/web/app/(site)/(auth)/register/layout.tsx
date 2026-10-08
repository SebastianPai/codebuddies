import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta gratis",
  description: "Creá tu cuenta gratis en CodeBuddies: cursos interactivos de programación, ejercicios en vivo, XP y certificados.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
