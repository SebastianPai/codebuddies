import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comunidad",
  description: "Lo que está pasando en CodeBuddies: nuevos certificados, cursos completados y logros de la comunidad.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
