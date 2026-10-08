import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bienvenida",
  description: "Primeros pasos en CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
