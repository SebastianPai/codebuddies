// Dominio público de la web. Se usa para URLs absolutas de SEO (sitemap,
// robots, metadataBase de Open Graph). Antes estaba hardcodeado como
// codebuddies.app, que no es el dominio de producción.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://codebuddies.tech"
).replace(/\/$/, "");

export const SITE_NAME = "CodeBuddies";

export const SITE_DESCRIPTION =
  "Aprendé a programar con cursos interactivos, ejercicios de código en vivo y certificados verificables.";

// Contacto que aparece en el footer y en las políticas legales (soporte,
// privacidad y reembolsos).
export const SUPPORT_EMAIL = "codebudies.ceo@gmail.com";
