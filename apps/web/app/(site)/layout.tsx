import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />

      <main className="pt-24 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-100px)]">
        {children}
      </main>

      <Footer />
    </>
  );
}
