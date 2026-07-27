import Navbar from "../../components/Navbar";

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
