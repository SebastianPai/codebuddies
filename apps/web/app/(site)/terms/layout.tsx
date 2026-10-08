import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso de CodeBuddies.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
