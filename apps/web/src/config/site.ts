// Dominio público de la web. Se usa para URLs absolutas de SEO (sitemap,
// robots, metadataBase de Open Graph). Antes estaba hardcodeado como
// codebuddies.app, que no es el dominio de producción.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://codebuddies.tech"
).replace(/\/$/, "");

export const SITE_NAME = "CodeBuddies";

// Los buscadores leen esto: tiene que decir que la plataforma está en tres
// idiomas (no solo en español) y qué se aprende.
export const SITE_DESCRIPTION =
  "Aprendé a programar desde cero en español, inglés o alemán: cursos de Python, HTML, CSS y JavaScript con ejercicios en vivo, el robot Buddy y certificados verificables.";

// Idiomas de la plataforma (códigos BCP 47), para los datos estructurados.
export const SITE_LANGUAGES = ["es", "en", "de"] as const;

// Contacto que aparece en el footer y en las políticas legales (soporte,
// privacidad y reembolsos).
export const SUPPORT_EMAIL = "codebuddies.ceo@gmail.com";
