import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mensajes",
  description: "Tus conversaciones en CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
