import Script from "next/script";

// Google Tag Manager -- inerte hasta que se cargue el container ID real
// como config var de Heroku (NEXT_PUBLIC_GTM_CONTAINER_ID, formato
// "GTM-XXXXXXX" desde tagmanager.google.com). Sin la variable, no se carga
// ningún script.
//
// Reemplaza al gtag.js directo: GTM es quien decide qué tags disparar (GA4,
// Ads, etc.) desde su propia consola web, no desde acá -- cargar GA4 directo
// Y a través de GTM al mismo tiempo duplicaría los pageviews. Si en algún
// momento se agrega una GA4 Configuration tag dentro del container de GTM,
// eso alcanza, no hace falta tocar este archivo.
export function GoogleTagManagerHead() {
  const containerId = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID;
  if (!containerId) return null;

  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- esto SÍ está en el root layout, que es el equivalente de _document en App Router para Script beforeInteractive.
    <Script id="gtm-head" strategy="beforeInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');`}
    </Script>
  );
}

// Va como primer hijo de <body> -- ver layout.tsx. El <noscript> real de
// GTM es un <iframe>, que Next.js no puede insertar antes de la hidratación
// vía next/script (eso es solo para <script>), así que este va directo en
// el JSX del layout.
export function GoogleTagManagerBody() {
  const containerId = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID;
  if (!containerId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${containerId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
