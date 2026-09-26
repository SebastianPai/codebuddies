import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Monedas y objetos para tu avatar y tu sala en CodeBuddies.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
