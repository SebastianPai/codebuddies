import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis certificados",
  description: "Tus certificados verificables de CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
