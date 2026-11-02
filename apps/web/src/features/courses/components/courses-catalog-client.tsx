"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { X, Filter, Terminal, Zap, RotateCw } from "lucide-react";
import { api } from "../../../../utils/api";
import { useTranslation } from "../../../i18n/useTranslation";
import { CachedImage, ErrorState } from "@/shared/ui";

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
  categories?: CourseCategory[];
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const t = useTranslation();
  // bg-*-800/700 (not the lighter 600s): at text-xs, green-600 and red-600 land at
  // ~3.1:1 and ~4:1 against their own -100 text, both under the 4.5:1 AA minimum.
  const map = {
    Principiante: "bg-green-800/90 border-green-400/50 text-green-100",
    Intermedio: "bg-yellow-500/90 border-yellow-400/50 text-yellow-950",
    Avanzado: "bg-red-700/90 border-red-400/50 text-red-100",
  };

  const colorClass =
    map[difficulty as keyof typeof map] ||
    "bg-gray-700/90 border-gray-500/50 text-gray-200";

  return (
    <div
      className={`
        absolute -top-5 -right-5 -rotate-6 z-20
        border-4 ${colorClass}
        px-5 py-1.5 font-black uppercase text-xs tracking-widest
        shadow-[4px_4px_0_0_rgba(0,0,0,0.6)]
      `}
    >
      {t(difficultyLabelKey(difficulty))}
    </div>
  );
}

const MotionLink = motion.create(Link);

function CourseCard({ course }: { course: Course }) {
  const t = useTranslation();
  return (
    <MotionLink
      href={`/courses/${course.id}`}
      initial={{ y: 20, opacity: 0.85 }}
      whileInView={{ y: 0, opacity: 1 }}
      whileHover={{ y: -12, scale: 1.03 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", stiffness: 250, damping: 20 }}
      className={`
        group relative block
        bg-[rgb(var(--card))] border-4 border-white/10 p-6
        shadow-[10px_10px_0_0_rgba(0,0,0,0.7)]
        hover:shadow-[14px_14px_0_0_rgb(var(--primary)/0.5)]
        hover:border-[rgb(var(--primary))/0.4]
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(var(--primary)/0.5)]
        transition-all duration-300
      `}
    >
      <DifficultyBadge difficulty={course.difficulty} />

      <div className="aspect-4/3 mb-6 border-4 border-white/10 overflow-hidden bg-black relative">
        <CachedImage
          src={
            course.imageUrl
              ? course.imageUrl
              : "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800"
          }
          alt={course.title}
          className="w-full h-full object-cover grayscale-[0.6] contrast-125 group-hover:grayscale-0 group-hover:contrast-100 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors duration-500 flex items-center justify-center">
          <Zap
            className="text-[rgb(var(--primary))] opacity-50 group-hover:opacity-90 scale-90 group-hover:scale-125 transition-all duration-500"
            size={64}
          />
        </div>
      </div>

      <h3 className="font-black text-2xl uppercase leading-tight mb-4 tracking-tight text-[rgb(var(--text))] group-hover:text-[rgb(var(--primary-text))] transition-colors">
        {course.title}
        {course.isNew && (
          <span className="ml-3 text-xs bg-red-700/90 text-white px-3 py-1 font-mono uppercase -rotate-4 inline-block shadow-[3px_3px_0_#000]">
            {t("site.newBadge")}
          </span>
        )}
        {course.isPopular && (
          <span className="ml-3 text-xs bg-purple-700/90 text-white px-3 py-1 font-mono uppercase rotate-5 inline-block shadow-[3px_3px_0_#000]">
            {t("site.popularBadge")}
          </span>
        )}
      </h3>

      <p className="font-mono text-sm text-[rgb(var(--secondary-text))] line-clamp-3 mb-6 border-l-4 border-[rgb(var(--primary))/0.4] pl-4 italic">
        {course.description}
      </p>

      {course.categories && course.categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {course.categories.map((category) => (
            <span
              key={category.id}
              className="border-2 border-[rgb(var(--border))] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[rgb(var(--secondary-text))]"
            >
              {category.name}
            </span>
          ))}
        </div>
      )}

      <span className="flex w-full items-center justify-center gap-2 px-7 py-4 font-black uppercase tracking-wider text-base bg-[rgb(var(--button))] text-[rgb(var(--button-text))] border-4 border-white/20 shadow-[8px_8px_0_0_rgba(255,255,255,0.08)] group-hover:shadow-[12px_12px_0_0_rgb(var(--primary)/0.4)] group-hover:-translate-y-1 group-hover:-translate-x-1 transition-all duration-150">
        {t("site.startMissionButton")}
      </span>
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

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api.get<Course[]>("/courses");
      setCourses(data);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // El catálogo ya llega server-rendered (ver page.tsx) — solo se vuelve a
  // pedir acá si ese fetch server-side no trajo nada (API caída durante el
  // build/ISR) o cuando el usuario presiona "reintentar".
  useEffect(() => {
    if (initialCourses.length === 0) fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          c.difficulty.toLowerCase() === difficulty.toLowerCase()) &&
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
              border-4 border-[rgb(var(--border))] p-8
              shadow-[10px_10px_0_0_rgba(0,0,0,0.7)]
              hover:shadow-[14px_14px_0_rgb(var(--primary)/0.4)]
              hover:-translate-y-2 transition-all duration-200
              font-mono font-black uppercase text-2xl flex items-center justify-between
            `}
          >
            <span>{t("site.startSearchButton")}</span>
            <div className="flex gap-5 opacity-70">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
