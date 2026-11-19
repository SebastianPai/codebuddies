"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { api } from "@/shared/api/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { curateCourses, type HomeCourse } from "./course-meta";
import { HomeHero } from "./HomeHero";
import { HomeCourses } from "./HomeCourses";
import { HomePaths } from "./HomePaths";
import { HomeGame } from "./HomeGame";
import { HomeStudio } from "./HomeStudio";
import { HomeProgress } from "./HomeProgress";
import { HomeFinalCta } from "./HomeFinalCta";

// Portada pública. Los cursos llegan renderizados desde el servidor (en
// español, el idioma por defecto de la API) para que el HTML ya los traiga;
// si el visitante usa otro idioma, o el fetch del servidor falló, se vuelven a
// pedir desde el navegador (el cliente de la API manda Accept-Language).
export function HomePage({ initialCourses }: { initialCourses: HomeCourse[] }) {
  const lang = useLanguage()?.lang ?? "es";
  // Cursos pedidos desde el navegador, guardados con el idioma que se pidió.
  const [fetched, setFetched] = useState<{ lang: string; courses: HomeCourse[] } | null>(null);
  const serverCoursesFit = lang === "es" && initialCourses.length > 0;

  useEffect(() => {
    if (serverCoursesFit) return;
    let cancelled = false;
    api
      .get<HomeCourse[]>("/courses")
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setFetched({ lang, courses: data });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lang, serverCoursesFit]);

  const allCourses =
    !serverCoursesFit && fetched?.lang === lang && fetched.courses.length > 0 ? fetched.courses : initialCourses;

  const featured = curateCourses(allCourses, 4);
  const forPaths = curateCourses(allCourses, 12);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-10 overflow-x-clip">
        <HomeHero />
        <HomeCourses courses={featured} />
        <HomePaths courses={forPaths} />
        <HomeGame />
        <HomeStudio />
        <HomeProgress />
        <HomeFinalCta />
      </div>
    </MotionConfig>
  );
}
