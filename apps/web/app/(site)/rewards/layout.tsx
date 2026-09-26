import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Centro de recompensas",
  description: "Historial de todas tus recompensas en CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
