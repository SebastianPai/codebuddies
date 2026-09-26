import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi panel",
  description: "Tu progreso, misiones y cursos en curso en CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
