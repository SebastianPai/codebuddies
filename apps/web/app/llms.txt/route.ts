import { getApiUrl } from "@/config/env";
import { SITE_URL } from "@/config/site";

// /llms.txt: resumen en texto plano para asistentes de IA (ChatGPT, Claude,
// Perplexity, Gemini...). Muchos no ejecutan JavaScript y la web cambia de
// idioma en el navegador, así que acá va todo en los tres idiomas, con los
// cursos reales sacados de la API. Formato: https://llmstxt.org
export const revalidate = 3600;

type CourseItem = { id: string; title?: string | null; description?: string | null };
const LANGS = ["es", "en", "de"] as const;

async function fetchCourses(lang: string): Promise<CourseItem[]> {
  try {
    const res = await fetch(`${getApiUrl()}/courses?lang=${lang}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as CourseItem[]) : [];
  } catch {
    return [];
  }
}

const oneLine = (s?: string | null) => String(s ?? "").replace(/\s+/g, " ").trim();

const INTRO: Record<(typeof LANGS)[number], { heading: string; body: string; courses: string }> = {
  es: {
    heading: "Español",
    body:
      "CodeBuddies (codebuddies.tech) es una plataforma para aprender a programar desde cero, disponible en español, inglés y alemán. " +
      "Tiene cursos interactivos (Python, HTML, CSS, JavaScript y \"Programa con Buddy\", donde el código mueve a un robot llamado Buddy), " +
      "ejercicios de código que se corrigen en el momento, videos por lección, un mundo multijugador, insignias, rankings y certificados verificables. " +
      "Muchos cursos son gratis.",
    courses: "Cursos",
  },
  en: {
    heading: "English",
    body:
      "CodeBuddies (codebuddies.tech) is a platform to learn programming from scratch, available in Spanish, English and German. " +
      "It offers interactive courses (Python, HTML, CSS, JavaScript and \"Code with Buddy\", where your code moves a robot called Buddy), " +
      "code exercises graded instantly, a video for each lesson, a multiplayer world, badges, rankings and verifiable certificates. " +
      "Many courses are free.",
    courses: "Courses",
  },
  de: {
    heading: "Deutsch",
    body:
      "CodeBuddies (codebuddies.tech) ist eine Plattform, um Programmieren von Grund auf zu lernen, auf Spanisch, Englisch und Deutsch. " +
      "Es gibt interaktive Kurse (Python, HTML, CSS, JavaScript und \"Programmieren mit Buddy\", wo dein Code einen Roboter namens Buddy bewegt), " +
      "Code-Übungen mit sofortiger Korrektur, ein Video pro Lektion, eine Multiplayer-Welt, Abzeichen, Ranglisten und überprüfbare Zertifikate. " +
      "Viele Kurse sind kostenlos.",
    courses: "Kurse",
  },
};

export async function GET() {
  const lists = await Promise.all(LANGS.map((l) => fetchCourses(l)));
  const out: string[] = [
    "# CodeBuddies",
    "",
    "> Aprender a programar desde cero en español, inglés y alemán. / Learn to code from scratch in Spanish, English and German. / Programmieren lernen von Grund auf auf Spanisch, Englisch und Deutsch.",
    "",
    `- Sitio / Website: ${SITE_URL}`,
    `- Cursos / Courses / Kurse: ${SITE_URL}/courses`,
    `- Rutas de aprendizaje / Learning paths / Lernpfade: ${SITE_URL}/paths`,
    `- Precios / Pricing / Preise: ${SITE_URL}/pricing`,
    `- Comunidad / Community / Community: ${SITE_URL}/community`,
    "- Idiomas / Languages / Sprachen: es, en, de (se elige en el menú / chosen in the menu / im Menü wählbar)",
    "",
  ];
  LANGS.forEach((lang, i) => {
    const t = INTRO[lang];
    out.push(`## ${t.heading}`, "", t.body, "", `### ${t.courses}`, "");
    for (const c of lists[i]) {
      const desc = oneLine(c.description);
      out.push(`- [${oneLine(c.title) || c.id}](${SITE_URL}/courses/${c.id})${desc ? `: ${desc.slice(0, 220)}` : ""}`);
    }
    out.push("");
  });
  return new Response(out.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
