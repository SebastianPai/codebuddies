import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pase de batalla",
  description: "Entrá cada día y desbloqueá recompensas del pase de batalla de CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
