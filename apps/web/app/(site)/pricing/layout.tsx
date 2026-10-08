import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planes y precios",
  description: "Compará los planes de CodeBuddies: gratis, Premium mensual y anual.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
