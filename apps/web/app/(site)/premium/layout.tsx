import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CodeBuddies Premium",
  description: "Certificados ilimitados, el track Premium del pase y beneficios exclusivos con CodeBuddies Premium.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
