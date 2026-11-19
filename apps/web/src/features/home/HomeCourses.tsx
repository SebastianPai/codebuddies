"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Layers, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  courseLevel,
  courseTech,
  firstLessonHref,
  LEVEL_LABEL_KEY,
  moduleCount,
  TECH_LABEL,
  type CourseTech,
  type HomeCourse,
} from "./course-meta";
import { CONTAINER, DISPLAY, Eyebrow, Reveal, SectionTitle } from "./ui";

// Portada de respaldo para cursos sin imagen: colores de la tecnología y una
// línea de código del lenguaje (decorativa, no se presenta como dato).
const TECH_COVER: Record<CourseTech, { bg: string; ink: string; snippet: string }> = {
  python: { bg: "#13263d", ink: "#ffd43b", snippet: 'print("Hola")' },
  javascript: { bg: "#23220f", ink: "#f7df1e", snippet: "const app = () => {}" },
  web: { bg: "#2a1610", ink: "#f16529", snippet: "<main>…</main>" },
  code: { bg: "#151b26", ink: "#93c5fd", snippet: "{ }" },
};

const NUMBER_LOCALE: Record<string, string> = { es: "es-ES", "en-us": "en-US", de: "de-DE" };

function CourseCover({
  course,
  sizes,
  priority = false,
  small = false,
}: {
  course: HomeCourse;
  sizes: string;
  priority?: boolean;
  small?: boolean;
}) {
  const tech = courseTech(course.title);
  if (course.imageUrl) {
    return (
      <Image
        src={course.imageUrl}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
    );
  }
  const cover = TECH_COVER[tech];
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 flex flex-col justify-between ${small ? "p-3" : "p-5"}`}
      style={{ backgroundColor: cover.bg, color: cover.ink }}
    >
      <span className={`${DISPLAY} font-extrabold leading-none tracking-tight ${small ? "text-base sm:text-lg" : "text-3xl sm:text-4xl"}`}>
        {TECH_LABEL[tech]}
      </span>
      {!small && (
        <code className="self-end rounded-md bg-black/25 px-2 py-1 font-mono text-xs opacity-90 sm:text-sm">{cover.snippet}</code>
      )}
    </div>
  );
}

function CourseMeta({ course, compact = false }: { course: HomeCourse; compact?: boolean }) {
  const t = useTranslation();
  const lang = useLanguage()?.lang ?? "es";
  const tech = courseTech(course.title);
  const lessons = course.lessons?.length ?? 0;
  const modules = moduleCount(course);
  const items = [
    lessons > 0 && { icon: <BookOpen size={14} aria-hidden="true" />, text: t("home.courses.lessons", { count: lessons }) },
    modules > 0 && !compact && { icon: <Layers size={14} aria-hidden="true" />, text: t("home.courses.modules", { count: modules }) },
    course.xpTotal && !compact && { icon: <Zap size={14} aria-hidden="true" />, text: t("home.courses.xp", { xp: new Intl.NumberFormat(NUMBER_LOCALE[lang] ?? "es-ES").format(course.xpTotal) }) },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; text: string }>;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[rgb(var(--secondary-text))]">
      <span className="rounded-md bg-[rgb(var(--primary)/0.14)] px-2 py-0.5 text-xs font-bold text-[rgb(var(--primary))]">
        {TECH_LABEL[tech]}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider">{t(LEVEL_LABEL_KEY[courseLevel(course.difficulty)])}</span>
      {items.map((item) => (
        <span key={item.text} className="inline-flex items-center gap-1.5">
          {item.icon}
          {item.text}
        </span>
      ))}
    </div>
  );
}

function FeaturedCourse({ course }: { course: HomeCourse }) {
  const t = useTranslation();
  const tryHref = firstLessonHref(course);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[rgb(var(--border)/0.6)] bg-[rgb(var(--card))]">
      <Link href={`/courses/${course.id}`} className="relative block aspect-[16/9] overflow-hidden" tabIndex={-1} aria-hidden="true">
        <CourseCover course={course} sizes="(min-width: 1024px) 700px, 100vw" priority={false} />
      </Link>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--secondary-text))]">{t("home.courses.featured")}</p>
        <h3 className={`${DISPLAY} mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl`}>
          <Link href={`/courses/${course.id}`} className="hover:text-[rgb(var(--primary))] focus-visible:text-[rgb(var(--primary))]">
            {course.title}
          </Link>
        </h3>
        {course.description && (
          <p className="mt-3 line-clamp-3 max-w-2xl leading-relaxed text-[rgb(var(--text)/0.78)]">{course.description}</p>
        )}
        <div className="mt-5">
          <CourseMeta course={course} />
        </div>
        <div className="mt-auto flex flex-wrap gap-x-6 gap-y-3 pt-7">
          <Link
            href={`/courses/${course.id}`}
            className="inline-flex items-center gap-2 font-bold text-[rgb(var(--primary))] hover:gap-3 transition-[gap]"
          >
            {t("home.courses.view")} <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {tryHref && (
            <Link href={tryHref} className="font-semibold text-[rgb(var(--text)/0.8)] underline-offset-4 hover:underline">
              {t("home.courses.tryFirst")}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function CourseRow({ course }: { course: HomeCourse }) {
  const t = useTranslation();
  const tryHref = firstLessonHref(course);
  return (
    <article className="group grid grid-cols-[96px_1fr] gap-4 py-5 sm:grid-cols-[148px_1fr] sm:gap-5">
      <Link
        href={`/courses/${course.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/3] overflow-hidden rounded-xl"
      >
        <CourseCover course={course} sizes="148px" small />
      </Link>
      <div className="min-w-0">
        <h3 className={`${DISPLAY} text-lg font-bold leading-snug tracking-tight sm:text-xl`}>
          <Link href={`/courses/${course.id}`} className="hover:text-[rgb(var(--primary))] focus-visible:text-[rgb(var(--primary))]">
            {course.title}
          </Link>
        </h3>
        {course.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[rgb(var(--secondary-text))]">{course.description}</p>
        )}
        <div className="mt-3">
          <CourseMeta course={course} compact />
        </div>
        {tryHref && (
          <Link href={tryHref} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[rgb(var(--primary))]">
            {t("home.courses.tryFirst")} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function HomeCourses({ courses }: { courses: HomeCourse[] }) {
  const t = useTranslation();
  const [featured, ...rest] = courses;

  return (
    <section id="cursos" className="scroll-mt-28 py-20 sm:py-28">
      <div className={CONTAINER}>
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Eyebrow>{t("home.courses.eyebrow")}</Eyebrow>
            <SectionTitle>{t("home.courses.title")}</SectionTitle>
            <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--secondary-text))]">{t("home.courses.text")}</p>
          </div>
          <Link
            href="/courses"
            className="inline-flex shrink-0 items-center gap-2 font-bold text-[rgb(var(--text))] underline-offset-4 hover:underline"
          >
            {t("home.courses.all")} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </Reveal>

        {featured ? (
          <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-10">
            <Reveal className="lg:col-span-7">
              <FeaturedCourse course={featured} />
            </Reveal>
            {rest.length > 0 && (
              <Reveal delay={0.08} className="divide-y divide-[rgb(var(--border)/0.6)] lg:col-span-5 lg:-mt-5">
                {rest.map((course) => (
                  <CourseRow key={course.id} course={course} />
                ))}
              </Reveal>
            )}
          </div>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-[rgb(var(--border))] p-10 text-center">
            <p className="text-[rgb(var(--secondary-text))]">{t("home.courses.empty")}</p>
            <Link href="/courses" className="mt-4 inline-flex items-center gap-2 font-bold text-[rgb(var(--primary))]">
              {t("home.courses.emptyCta")} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
