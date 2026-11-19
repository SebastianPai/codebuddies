import { getApiUrl } from "@/config/env";
import { HomePage } from "@/features/home/HomePage";
import type { HomeCourse } from "@/features/home/course-meta";

// Los cursos se piden en el servidor (cache de 5 min, igual que /courses)
// para que el HTML de la portada ya traiga el catálogo real.
async function fetchCourses(): Promise<HomeCourse[]> {
  try {
    const res = await fetch(`${getApiUrl()}/courses`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    // Solo lo que usa la portada: así no viajan al cliente los títulos y
    // descripciones de cada lección.
    return (data as HomeCourse[]).map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? null,
      difficulty: course.difficulty ?? null,
      imageUrl: course.imageUrl ?? null,
      xpTotal: course.xpTotal ?? null,
      lessons: (course.lessons ?? []).map(({ id, order, section }) => ({ id, order, section: section ?? null })),
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const courses = await fetchCourses();
  return <HomePage initialCourses={courses} />;
}
