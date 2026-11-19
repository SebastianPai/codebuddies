"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { courseLevel, courseTech, TECH_LABEL, type CourseLevel, type HomeCourse } from "./course-meta";
import { CONTAINER, DISPLAY, Eyebrow, Reveal, SectionTitle } from "./ui";

const LEVELS: CourseLevel[] = ["EASY", "MEDIUM", "HARD"];
const STEPS = ["read", "write", "check"] as const;

// "Aprende a tu manera": los cursos reales agrupados por nivel como caminos
// (se arma solo con el catálogo: un nivel sin cursos no aparece), y debajo el
// método de cada lección en tres pasos.
export function HomePaths({ courses }: { courses: HomeCourse[] }) {
  const t = useTranslation();
  const groups = LEVELS.map((level) => ({
    level,
    courses: courses.filter((course) => courseLevel(course.difficulty) === level),
  })).filter((group) => group.courses.length > 0);

  return (
    <section className="border-y border-[rgb(var(--border)/0.5)] bg-[rgb(var(--card)/0.55)] py-20 sm:py-28">
      <div className={CONTAINER}>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4">
            <Eyebrow>{t("home.paths.eyebrow")}</Eyebrow>
            <SectionTitle>{t("home.paths.title")}</SectionTitle>
            <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--secondary-text))]">{t("home.paths.text")}</p>
          </Reveal>

          <div className={`grid gap-10 sm:grid-cols-2 lg:col-span-8 ${groups.length > 2 ? "lg:grid-cols-3" : ""}`}>
            {groups.map((group, index) => (
              <Reveal key={group.level} delay={index * 0.08}>
                <div className="flex items-baseline gap-3">
                  <span className={`${DISPLAY} text-5xl font-extrabold leading-none text-[rgb(var(--primary))]`}>
                    {index + 1}
                  </span>
                  <h3 className={`${DISPLAY} text-2xl font-bold tracking-tight`}>
                    {t(`home.paths.levels.${group.level}.title`)}
                  </h3>
                </div>
                <p className="mt-3 text-[rgb(var(--secondary-text))]">{t(`home.paths.levels.${group.level}.text`)}</p>
                <ol className="mt-6 border-l-2 border-[rgb(var(--border))]">
                  {group.courses.map((course) => (
                    <li key={course.id} className="relative pl-6 pb-5 last:pb-0">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-[rgb(var(--primary))] bg-[rgb(var(--background))]"
                      />
                      <Link
                        href={`/courses/${course.id}`}
                        className="group inline-flex flex-col font-semibold leading-snug hover:text-[rgb(var(--primary))]"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--secondary-text))]">
                          {TECH_LABEL[courseTech(course.title)]}
                        </span>
                        <span className="mt-0.5">
                          {course.title}
                          <ArrowRight
                            size={15}
                            aria-hidden="true"
                            className="ml-1.5 inline -translate-y-px opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-20">
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--secondary-text))]">
            {t("home.paths.methodTitle")}
          </h3>
          <ol className="mt-6 grid gap-8 md:grid-cols-3 md:gap-0">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="md:border-l md:border-[rgb(var(--border)/0.7)] md:px-8 md:first:border-l-0 md:first:pl-0"
              >
                <span className={`${DISPLAY} text-sm font-extrabold text-[rgb(var(--primary))]`}>0{index + 1}</span>
                <p className={`${DISPLAY} mt-1 text-xl font-bold tracking-tight`}>{t(`home.paths.steps.${step}.title`)}</p>
                <p className="mt-2 text-[rgb(var(--secondary-text))]">{t(`home.paths.steps.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
