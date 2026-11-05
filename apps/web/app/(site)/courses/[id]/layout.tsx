import type { Metadata } from "next";
import { getApiUrl } from "@/config/env";
import { SITE_NAME, SITE_URL } from "@/config/site";

interface CourseLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

interface CourseMetadataPayload {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  freeLimit?: number | null;
  lessons?: unknown[];
}

async function fetchCourse(id: string, lang = "es"): Promise<CourseMetadataPayload | null> {
  try {
    const res = await fetch(`${getApiUrl()}/courses/${id}?lang=${lang}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CourseMetadataPayload;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: CourseLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const course = await fetchCourse(id);

  if (!course?.title) {
    return { title: "Curso" };
  }

  const description = course.description ?? undefined;
  const images = course.imageUrl ? [course.imageUrl] : undefined;

  return {
    title: course.title,
    description,
    openGraph: {
      title: course.title,
      description,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description,
      images,
    },
  };
}

// Datos estructurados "Course" para Google y los asistentes de IA. Un idioma
// cuenta solo si el curso está traducido (la API devuelve el español cuando
// falta la traducción, así que se compara el título).
async function courseJsonLd(id: string) {
  const [es, en, de] = await Promise.all([fetchCourse(id, "es"), fetchCourse(id, "en"), fetchCourse(id, "de")]);
  if (!es?.title) return null;
  const languages = ["es"];
  if (en?.title && en.title !== es.title) languages.push("en");
  if (de?.title && de.title !== es.title) languages.push("de");
  const total = Array.isArray(es.lessons) ? es.lessons.length : 0;
  const free = total > 0 && typeof es.freeLimit === "number" && es.freeLimit >= total;
  const names = [en, de].filter((c, i) => c?.title && languages.includes(i ? "de" : "en")).map((c) => c!.title as string);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: es.title,
    ...(names.length ? { alternateName: names } : {}),
    description: es.description ?? undefined,
    url: `${SITE_URL}/courses/${id}`,
    ...(es.imageUrl ? { image: es.imageUrl } : {}),
    inLanguage: languages,
    isAccessibleForFree: free,
    provider: { "@type": "EducationalOrganization", name: SITE_NAME, url: SITE_URL },
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
    ...(free ? { offers: { "@type": "Offer", price: 0, priceCurrency: "USD", category: "Free" } } : {}),
  };
}

export default async function CourseLayout({ children, params }: CourseLayoutProps) {
  const { id } = await params;
  const jsonLd = await courseJsonLd(id);
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // Datos propios de la API; "<" escapado para que un texto no cierre la etiqueta.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      {children}
    </>
  );
}
