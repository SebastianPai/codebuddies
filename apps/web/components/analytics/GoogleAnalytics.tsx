import Script from "next/script";

// Google Analytics 4 (gtag.js), inerte hasta que se cargue el Measurement ID
// real como config var de Heroku (NEXT_PUBLIC_GA_MEASUREMENT_ID, formato
// "G-XXXXXXXXXX" desde analytics.google.com). Sin la variable, este
// componente no renderiza nada -- no hay script cargado, no hay tracking.
// Es NEXT_PUBLIC_* a propósito: Next.js la horneada en el bundle del cliente
// en build time (igual que NEXT_PUBLIC_ASSETS_URL), necesaria porque gtag.js
// corre en el navegador, no en el server.
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
