import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificar certificado",
  description: "Verificá la autenticidad de un certificado emitido por CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
