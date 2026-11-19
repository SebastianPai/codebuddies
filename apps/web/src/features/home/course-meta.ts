// Datos de los cursos tal como los devuelve GET /courses, y lo poco que la
// portada deriva de ellos (tecnología, nivel, módulos). Nada inventado: si un
// campo no viene, la tarjeta simplemente no lo muestra.

export type HomeCourseLesson = {
  id: string;
  order: number;
  section?: string | null;
};

export type HomeCourse = {
  id: string;
  title: string;
  description?: string | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  xpTotal?: number | null;
  lessons?: HomeCourseLesson[];
};

export type CourseTech = "python" | "javascript" | "web" | "code";
export type CourseLevel = "EASY" | "MEDIUM" | "HARD";

// La API no tiene un campo "lenguaje" en el curso: se deduce del título (que
// existe traducido en es/en/de). "Programa con Buddy" se programa en
// JavaScript (el robot y la nave corren el JS del alumno).
export function courseTech(title: string): CourseTech {
  if (/python/i.test(title)) return "python";
  if (/javascript|typescript/i.test(title)) return "javascript";
  if (/html|css|\bweb\b/i.test(title)) return "web";
  if (/buddy/i.test(title)) return "javascript";
  return "code";
}

export const TECH_LABEL: Record<CourseTech, string> = {
  python: "Python",
  javascript: "JavaScript",
  web: "HTML · CSS",
  code: "Code",
};

export function courseLevel(difficulty?: string | null): CourseLevel {
  const value = (difficulty ?? "").toUpperCase();
  if (value === "MEDIUM" || value === "INTERMEDIATE") return "MEDIUM";
  if (value === "HARD" || value === "ADVANCED") return "HARD";
  return "EASY";
}

export const LEVEL_LABEL_KEY: Record<CourseLevel, string> = {
  EASY: "site.difficultyBeginner",
  MEDIUM: "site.difficultyIntermediate",
  HARD: "site.difficultyAdvanced",
};

export function sortedLessons(course: HomeCourse): HomeCourseLesson[] {
  return [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
}

export function moduleCount(course: HomeCourse): number {
  return new Set((course.lessons ?? []).map((l) => l.section).filter(Boolean)).size;
}

export function firstLessonHref(course: HomeCourse): string | null {
  const first = sortedLessons(course)[0];
  return first ? `/courses/${course.id}/lessons/${first.id}` : null;
}

const LEVEL_ORDER: Record<CourseLevel, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };

// Selección para la portada: primero los de inicio (con portada antes que sin
// ella), después los de nivel más alto. Así el destacado siempre es una
// puerta de entrada para alguien que nunca programó.
export function curateCourses(courses: HomeCourse[], limit = 4): HomeCourse[] {
  return [...courses]
    .filter((c) => (c.lessons?.length ?? 0) > 0)
    .sort((a, b) => {
      const level = LEVEL_ORDER[courseLevel(a.difficulty)] - LEVEL_ORDER[courseLevel(b.difficulty)];
      if (level !== 0) return level;
      return Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl));
    })
    .slice(0, limit);
}
