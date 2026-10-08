import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Facturación",
  description: "Gestioná tu suscripción, métodos de pago y facturas de CodeBuddies.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
