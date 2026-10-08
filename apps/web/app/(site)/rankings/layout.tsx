import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rankings",
  description: "Los mejores estudiantes de CodeBuddies por XP, rachas y temporadas.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
