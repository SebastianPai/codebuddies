import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notificaciones",
  description: "Tus notificaciones de CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
