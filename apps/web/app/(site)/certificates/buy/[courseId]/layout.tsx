import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comprar certificado",
  description: "Obtené un certificado verificable del curso que completaste.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
