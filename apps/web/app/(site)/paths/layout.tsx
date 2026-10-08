import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rutas de aprendizaje",
  description: "Rutas guiadas de cursos para aprender programación paso a paso en CodeBuddies.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
