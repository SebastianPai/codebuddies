import { Bricolage_Grotesque, Pixelify_Sans } from "next/font/google";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import RewardsHub from "../../components/rewards-hub/RewardsHub";
import LegalUpdateNotice from "../../components/consent/LegalUpdateNotice";

// La portada tiene su propio layout (mismo Navbar, Footer y avisos que
// app/(site)) para que sus secciones vayan de borde a borde: el layout del
// sitio encierra todo en una columna de max-w-7xl.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-home-display",
  display: "swap",
});

const pixel = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-home-pixel",
  display: "swap",
});

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className={`${display.variable} ${pixel.variable} min-h-screen`}>{children}</main>
      <Footer />
      <RewardsHub />
      <LegalUpdateNotice />
    </>
  );
}
