import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de creador",
  description: "Publicá y gestioná tus objetos en el marketplace de CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
