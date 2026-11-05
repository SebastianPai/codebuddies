"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { X, Filter, Terminal, Zap, RotateCw, BookOpen, ArrowRight, Search } from "lucide-react";
import { api } from "../../../../utils/api";
import { useTranslation } from "../../../i18n/useTranslation";
import { CachedImage, ErrorState } from "@/shared/ui";
import { useApiLang } from "@/shared/hooks/use-api-lang";

const difficultyKeyMap: Record<string, string> = {
  Todas: "site.difficultyAll",
  Principiante: "site.difficultyBeginner",
  Intermedio: "site.difficultyIntermediate",
  Avanzado: "site.difficultyAdvanced",
};

function difficultyLabelKey(value: string) {
  return difficultyKeyMap[value] ?? value;
}

export interface CourseCategory {
  id: string;
  slug: string;
  name: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  imageUrl?: string;
  isNew?: boolean;
  isPopular?: boolean;
  freeLimit?: number | null;
  xpTotal?: number | null;
  lessons?: unknown[];
  categories?: CourseCategory[];
}

// La API manda la dificultad como enum (EASY/MEDIUM/HARD); el filtro y la
// etiqueta usan los nombres en español. Sin esta conversión el filtro por
// dificultad nunca coincidía con ningún curso.
const DIFFICULTY_FROM_API: Record<string, string> = {
  EASY: "Principiante",
  MEDIUM: "Intermedio",
  HARD: "Avanzado",
};
export function normalizeDifficulty(value: string) {
  return DIFFICULTY_FROM_API[String(value).toUpperCase()] ?? value;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const t = useTranslation();
  const level = normalizeDifficulty(difficulty);
  // Texto claro sobre fondo oscuro translúcido: legible sobre cualquier portada.
  const dot = {
    Principiante: "bg-emerald-400",
    Intermedio: "bg-amber-400",
    Avanzado: "bg-rose-400",
  }[level] ?? "bg-slate-300";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {t(difficultyLabelKey(level))}
    </span>
  );
}

const MotionLink = motion.create(Link);

function CourseCard({ course }: { course: Course }) {
  const t = useTranslation();
  const lessons = Array.isArray(course.lessons) ? course.lessons.length : 0;
  const free = lessons > 0 && typeof course.freeLimit === "number" && course.freeLimit >= lessons;
  return (
    <MotionLink
      href={`/courses/${course.id}`}
      initial={{ y: 16, opacity: 0.85 }}
      whileInView={{ y: 0, opacity: 1 }}
      whileHover={{ y: -6 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="
        group flex h-full flex-col overflow-hidden rounded-3xl
        border border-[rgb(var(--border))] bg-[rgb(var(--card))]
        shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]
        transition-[border-color,box-shadow] duration-300
        hover:border-[rgb(var(--primary)/0.6)] hover:shadow-[0_18px_40px_-14px_rgb(var(--primary)/0.35)]
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(var(--primary)/0.5)]
      "
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        <CachedImage
          src={
            course.imageUrl
              ? course.imageUrl
              : "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800"
          }
          alt={course.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <DifficultyBadge difficulty={course.difficulty} />
          <div className="flex flex-wrap justify-end gap-1.5">
            {free && (
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow">
                {t("site.courseCardFree")}
              </span>
            )}
            {course.isNew && (
              <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow">
                {t("site.newBadge")}
              </span>
            )}
            {course.isPopular && (
              <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white shadow">
                {t("site.popularBadge")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="line-clamp-2 md:min-h-[3.5rem] text-xl font-extrabold leading-7 text-[rgb(var(--text))] transition-colors group-hover:text-[rgb(var(--primary-text))]">
          {course.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[rgb(var(--secondary-text))]">
          {course.description}
        </p>

        {course.categories && course.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {course.categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-[rgb(var(--border))] px-2.5 py-0.5 text-xs font-semibold text-[rgb(var(--secondary-text))]"
              >
                {category.name}
              </span>
            ))}
          </div>
        )}

        {/* Lo de abajo queda siempre en el mismo lugar, aunque cambie el largo del texto. */}
        <div className="mt-auto pt-6">
          <div className="mb-4 flex items-center gap-4 text-sm font-semibold text-[rgb(var(--secondary-text))]">
            {lessons > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={16} aria-hidden />
                {lessons === 1 ? t("site.courseCardLesson") : t("site.courseCardLessons", { count: lessons })}
              </span>
            )}
            {typeof course.xpTotal === "number" && course.xpTotal > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Zap size={16} className="text-[rgb(var(--primary))]" aria-hidden />
                {/* Sin toLocaleString: el servidor y el navegador formatean distinto y rompía la hidratación. */}
                {course.xpTotal} XP
              </span>
            )}
          </div>
          <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--button))] px-6 py-3.5 text-base font-extrabold text-[rgb(var(--button-text))] transition-transform duration-150 group-hover:-translate-y-0.5">
            {t("site.courseCardStart")}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
      </div>
    </MotionLink>
  );
}

interface CoursesCatalogClientProps {
  initialCourses: Course[];
  initialCategories: CourseCategory[];
}

// El catálogo agrupaba cursos por "Module", un concepto que en la práctica
// quedó sin usar (todos los cursos reales tienen moduleId null, así que la
// página nunca mostraba nada). Se reemplazó por CourseCategory (NF6/NF7),
// que sí tiene datos y admin UI — acá se filtra sobre una grilla plana en
// vez de repetir secciones por cada categoría (un curso puede tener varias
// categorías a la vez, así que "agrupar" duplicaría tarjetas).
export function CoursesCatalogClient({
  initialCourses,
  initialCategories,
}: CoursesCatalogClientProps) {
  const t = useTranslation();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficulty, setDifficulty] = useState("Todas");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [categories, setCategories] = useState<CourseCategory[]>(initialCategories);

  const searchRef = useRef<HTMLInputElement>(null);
  const difficulties = ["Todas", "Principiante", "Intermedio", "Avanzado"];

  const apiLang = useApiLang();
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api.get<Course[]>(`/courses?lang=${apiLang}`);
      setCourses(data);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [apiLang]);

  // El catálogo ya llega server-rendered en español (ver page.tsx). Se vuelve a
  // pedir si ese fetch no trajo nada (API caída durante el build/ISR), si el
  // usuario usa otro idioma (títulos y descripciones traducidos) o al
  // presionar "reintentar".
  useEffect(() => {
    if (initialCourses.length === 0 || apiLang !== "es") fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiLang]);

  useEffect(() => {
    if (initialCategories.length === 0) {
      api
        .get<CourseCategory[]>("/course-categories")
        .then(setCategories)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchExpanded(true);
      }
      if (e.key === "Escape") setSearchExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (searchExpanded) searchRef.current?.focus();
  }, [searchExpanded]);

  const filtered = useMemo(() => {
    const text = searchTerm.toLowerCase();
    return courses.filter(
      (c) =>
        (!text ||
          c.title.toLowerCase().includes(text) ||
          c.description.toLowerCase().includes(text)) &&
        (difficulty === "Todas" ||
          normalizeDifficulty(c.difficulty).toLowerCase() === difficulty.toLowerCase()) &&
        (categoryFilter === "Todas" ||
          c.categories?.some((category) => category.id === categoryFilter)),
    );
  }, [courses, searchTerm, difficulty, categoryFilter]);

  if (loading && courses.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[rgb(var(--background))] text-[rgb(var(--primary-text))]">
        <Terminal size={80} className="animate-pulse mb-10 opacity-70" />
        <div className="font-mono text-3xl md:text-4xl font-black uppercase border-4 border-[rgb(var(--primary))/0.6] px-16 py-8 shadow-[12px_12px_0_#000]">
          {t("site.coursesLoadingBoot")}
        </div>
      </div>
    );
  }

  if (loadError && courses.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[rgb(var(--background))] px-6 text-center">
        <ErrorState message={t("common.unexpectedError")} />
        <button
          onClick={fetchCourses}
          className="inline-flex items-center gap-2 px-7 py-4 font-black uppercase tracking-wider bg-[rgb(var(--button))] text-[rgb(var(--button-text))] border-4 border-white/20 shadow-[8px_8px_0_0_rgba(255,255,255,0.08)] hover:shadow-[12px_12px_0_0_rgb(var(--primary)/0.4)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-150"
        >
          <RotateCw size={18} /> {t("common.refresh")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--text))] relative overflow-x-hidden selection:bg-[rgb(var(--button))] selection:text-[rgb(var(--button-text))]">
      {/* Grid sutil hacker */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[60px_60px]"></div>
      </div>

      {/* Hero dark brutal */}
      <header className="relative pt-24 pb-20 px-6 md:px-12 border-b-8 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-[rgb(var(--button))] text-[rgb(var(--button-text))] font-black px-8 py-3 mb-10 -skew-x-12 border-4 border-[rgb(var(--border))] shadow-[8px_8px_0_0_rgba(0,0,0,0.6)]">
            {t("site.coursesDeclassifiedBadge")}
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase leading-none tracking-tighter mb-12 drop-shadow-[12px_12px_0_rgb(var(--primary)/0.6)]">
            {t("site.coursesHeroTitle1")}
            <br />
            {t("site.coursesHeroTitle2")}
          </h1>

          <p className="font-mono text-xl md:text-2xl max-w-3xl italic border-l-8 border-[rgb(var(--primary))/0.5] pl-8 py-5 bg-[rgb(var(--card)/0.4)]">
            {t("site.coursesHeroSubtitle")}
          </p>

          <Link
            href="/paths"
            className="mt-8 inline-flex items-center gap-2 border-2 border-[rgb(var(--primary))] px-5 py-3 font-mono text-sm font-bold uppercase text-[rgb(var(--primary))] transition hover:bg-[rgb(var(--primary))] hover:text-black"
          >
            {t("site.pathsLabel")} →
          </Link>
        </div>
      </header>

      {/* Buscador estilo terminal dark */}
      <div className="max-w-5xl mx-auto px-6 -mt-14 relative z-20">
        {!searchExpanded ? (
          <button
            onClick={() => setSearchExpanded(true)}
            className={`
              w-full bg-[rgb(var(--card)/0.9)] text-[rgb(var(--primary-text))]
              border-4 border-[rgb(var(--border))] p-5 sm:p-8
              shadow-[10px_10px_0_0_rgba(0,0,0,0.7)]
              hover:shadow-[14px_14px_0_rgb(var(--primary)/0.4)]
              hover:-translate-y-2 transition-all duration-200
              font-mono font-black uppercase text-lg sm:text-2xl flex items-center justify-between gap-4
            `}
          >
            <span className="flex min-w-0 items-center gap-3 truncate">
              <Search size={22} className="shrink-0" aria-hidden />
              <span className="truncate">{t("site.startSearchButton")}</span>
            </span>
            {/* El atajo de teclado no sirve en celular: solo se muestra con pantalla ancha. */}
            <div className="hidden shrink-0 gap-5 opacity-70 md:flex">
              <kbd className="px-5 py-2 bg-[rgb(var(--background)/0.8)] border-2 border-[rgb(var(--border))] text-[rgb(var(--text))]">
                CTRL
              </kbd>
              <kbd className="px-5 py-2 bg-[rgb(var(--background)/0.8)] border-2 border-[rgb(var(--border))] text-[rgb(var(--text))]">
                K
              </kbd>
            </div>
          </button>
        ) : (
          <div className="bg-[rgb(var(--card)/0.97)] border-6 border-[rgb(var(--primary))/0.5] shadow-[12px_12px_0_0_rgba(0,0,0,0.7)] p-3">
            <div className="bg-[rgb(var(--background)/0.8)] p-5 border-b-4 border-[rgb(var(--border))] flex justify-between items-center">
              <div className="flex gap-5">
                <button
                  onClick={() => setSearchExpanded(false)}
                  aria-label={t("common.cancel")}
                  className="w-8 h-8 bg-red-700/80 border-2 border-red-500/40 flex items-center justify-center rounded-sm"
                >
                  <X size={18} className="text-white" />
                </button>
                <div className="w-8 h-8 bg-yellow-500/70 border-2 border-yellow-400/40 rounded-sm" />
                <div className="w-8 h-8 bg-green-600/80 border-2 border-green-400/40 rounded-sm" />
              </div>
              <span className="font-mono uppercase text-sm opacity-70 text-[rgb(var(--text))]">
                search_protocol_v1.1
              </span>
            </div>

            <div className="p-10 font-mono text-2xl text-[rgb(var(--primary-text))] leading-relaxed">
              query(
              <input
                ref={searchRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={t("site.searchQueryPlaceholder")}
                className="bg-transparent border-b-4 border-[rgb(var(--primary))] outline-none inline-block min-w-65 text-[rgb(var(--text))] caret-[rgb(var(--primary))]"
                placeholder={t("site.searchQueryPlaceholder")}
              />
              );
            </div>

            <div className="p-6 bg-[rgb(var(--background)/0.7)] border-t-4 border-[rgb(var(--border))] flex flex-wrap gap-5">
              <div className="flex items-center gap-4 font-black uppercase text-[rgb(var(--text))]">
                <Filter size={22} /> {t("site.filtersLabel")}
              </div>

              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  className={`
                    px-6 py-3 border-4 font-black uppercase text-sm tracking-wider transition-all
                    ${
                      difficulty === d
                        ? "bg-[rgb(var(--button))] text-[rgb(var(--button-text))] shadow-[6px_6px_0_0_rgba(0,0,0,0.6)] -translate-y-1"
                        : "border-[rgb(var(--border))] text-[rgb(var(--text))] hover:bg-[rgb(var(--border)/0.5)]"
                    }
                  `}
                >
                  {t(difficultyLabelKey(d))}
                </button>
              ))}

              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label={t("site.allCategoriesOption")}
                  className="bg-[rgb(var(--background)/0.8)] border-4 border-[rgb(var(--border))] px-6 py-3 font-mono font-black uppercase text-sm text-[rgb(var(--text))]"
                >
                  <option value="Todas">{t("site.allCategoriesOption")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        {filtered.length === 0 ? (
          <div className="text-center py-40 border-6 border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card)/0.4)] shadow-[12px_12px_0_0_rgba(0,0,0,0.7)] -rotate-1">
            <div className="text-8xl font-black mb-10 text-[rgb(var(--primary-text))]/80">
              {t("site.notFoundTitle")}
            </div>
            <p className="text-3xl font-black uppercase mb-12 text-[rgb(var(--text))]/90">
              {t("site.noMissionsMatchSearch")}
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setDifficulty("Todas");
                setCategoryFilter("Todas");
              }}
              className="font-mono text-2xl uppercase border-b-6 border-[rgb(var(--primary))/0.6] pb-2 text-[rgb(var(--primary-text))] hover:opacity-80"
            >
              {t("site.restartSearchButton")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
