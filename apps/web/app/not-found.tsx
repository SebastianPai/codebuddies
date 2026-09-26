import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import NotFoundScreen from "../components/system/NotFoundScreen";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: true },
};

// Cualquier URL que no existe (o un notFound() de una página) cae acá, con
// el navbar y el footer del sitio en vez de la página 404 genérica de Next.
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <NotFoundScreen />
      </main>
      <Footer />
    </>
  );
}
