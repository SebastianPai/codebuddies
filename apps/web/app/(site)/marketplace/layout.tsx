import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Objetos, muebles y cosméticos creados por la comunidad de CodeBuddies.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
