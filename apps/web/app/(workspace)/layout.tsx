import type { Metadata } from "next";
import Navbar from "../../components/Navbar";

export const metadata: Metadata = {
  title: "Editor de código",
  robots: { index: false, follow: false },
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 min-h-screen">
        {children}
      </main>
    </>
  );
}
