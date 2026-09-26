import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referidos",
  description: "Invitá amigos a CodeBuddies y ganá recompensas.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
