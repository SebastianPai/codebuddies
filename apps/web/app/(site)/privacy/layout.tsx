import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo CodeBuddies recopila, usa y protege tus datos personales.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
