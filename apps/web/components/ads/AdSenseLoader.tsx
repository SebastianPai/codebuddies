import Script from "next/script";

// Carga el script de Google AdSense una sola vez para todo el sitio. Inerte
// hasta que se configure NEXT_PUBLIC_ADSENSE_CLIENT_ID (formato
// "ca-pub-XXXXXXXXXXXXXXXX", ver adsense.google.com) -- sin la variable, ni
// siquiera se agrega el <script> al documento. El ocultamiento para
// usuarios Premium vive en AdSlot.tsx, no acá (este loader es global y no
// sabe quién está mirando la página).
export function AdSenseLoader() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
