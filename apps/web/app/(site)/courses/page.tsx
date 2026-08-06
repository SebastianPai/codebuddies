import type { Metadata } from "next";
import { getApiUrl } from "@/config/env";
import {
  CoursesCatalogClient,
  type Course,
  type CourseCategory,
} from "@/features/courses/components/courses-catalog-client";

// FE2/SEO7: el catálogo hacía todo el fetch client-side ("use client" +
// useEffect), así que un crawler (o cualquier fetch sin JS) veía una página
// vacía. Ahora el fetch inicial corre server-side y ese HTML ya trae los
// cursos reales; el componente cliente solo hidrata la interactividad
// (búsqueda/filtros) sobre esos mismos datos.
//
// Usa /courses (lista plana con categorías) en vez de /modules: el
// agrupamiento por Module quedó huérfano — ningún curso real tiene
// moduleId asignado, así que esa vista siempre mostraba cero cursos.
// CourseCategory (NF6/NF7) es el sistema que sí tiene datos y admin UI.
async function fetchCourses(): Promise<Course[]> {
  try {
    const res = await fetch(`${getApiUrl()}/courses`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Course[];
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<CourseCategory[]> {
  try {
    const res = await fetch(`${getApiUrl()}/course-categories`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return (await res.json()) as CourseCategory[];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "Cursos — CodeBuddies",
  description:
    "Explorá el catálogo completo de cursos de programación de CodeBuddies: rutas prácticas de principiante a avanzado con ejercicios de código reales.",
  openGraph: {
    title: "Cursos — CodeBuddies",
    description:
      "Explorá el catálogo completo de cursos de programación de CodeBuddies.",
    type: "website",
  },
};

export default async function CoursesPage() {
  const [courses, categories] = await Promise.all([
    fetchCourses(),
    fetchCategories(),
  ]);

  const jsonLd =
    courses.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: courses.map((course, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `/courses/${course.id}`,
            name: course.title,
          })),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON.stringify de datos propios del backend, no HTML de usuario
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CoursesCatalogClient
        initialCourses={courses}
        initialCategories={categories}
      />
    </>
  );
}
