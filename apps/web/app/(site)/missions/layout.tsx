import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Misiones",
  description: "Completá misiones y ganá recompensas en CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
