import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de reembolsos",
  description: "Condiciones de reembolso de suscripciones, monedas y certificados de CodeBuddies.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
