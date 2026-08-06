"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Terminal,
  Cpu,
  Code2,
  Database,
  Flame,
  Zap,
  ChevronRight,
  ArrowRight,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../utils/api";
import { useTranslation } from "../../src/i18n/useTranslation"; // ← Asegúrate que la ruta sea correcta

// Interfaces
interface CoursePreview {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  image?: string;
  description?: string;
}

type CommunityStats = {
  users: number;
  certificatesIssued: number;
  totalXpEarned: number;
  topLearners: Array<{ username: string; value: number }>;
  streakLeaders: Array<{ username: string; value: number }>;
};

// Componente FactCard estilo "Recorte de Periódico"
function NewspaperFact({
  emoji,
  title,
  text,
  id,
}: {
  emoji: string;
  title: string;
  text: string;
  id: string;
}) {
  return (
    <div className="relative group mb-8 transform hover:rotate-0 transition-transform duration-500 -rotate-1">
      <div className="bg-[#e4e0d7] text-[#1a1a1a] p-6 border-2 border-black shadow-[8px_8px_0_0_#000] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4 border-b-2 border-black/20 pb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-tighter bg-black text-[#e4e0d7] px-2">
              DESCLASIFICADO: {id}
            </span>
            <span className="text-2xl">{emoji}</span>
          </div>
          <h3 className="font-serif text-2xl font-black uppercase mb-3 leading-none tracking-tighter">
            {title}
          </h3>
          <p className="font-serif text-base leading-snug opacity-90 italic">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

// Card de Curso
function CourseCard({ course }: { course: CoursePreview }) {
  const t = useTranslation();
  const difficultyColors = {
    EASY: "bg-green-500",
    MEDIUM: "bg-yellow-500",
    HARD: "bg-red-500",
  };

  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="group relative bg-white border-4 border-black p-4 shadow-[8px_8px_0_0_#000] hover:shadow-[12px_12px_0_0_rgb(var(--primary))] transition-all"
    >
      <div
        className={`absolute -top-3 -right-3 px-3 py-1 text-[10px] font-black uppercase text-black border-2 border-black z-20 ${difficultyColors[course.difficulty]}`}
      >
        {course.difficulty}
      </div>
      <div className="aspect-video bg-zinc-800 border-2 border-black mb-4 overflow-hidden relative">
        <img
          src={
            course.image ||
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop"
          }
          alt={course.title}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
          <PlayCircle
            className="text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300"
            size={48}
          />
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-2xl text-black font-black uppercase tracking-tighter group-hover:text-[rgb(var(--primary))] transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-black font-mono opacity-60 line-clamp-2 italic">
          {course.description}
        </p>
        <Link href={`/courses/${course.id}`} className="block pt-2">
          <div className="flex justify-between items-center border-t-2 border-black pt-4 group/btn">
            <span className="font-bold text-sm text-black uppercase italic">
              {t.landing.courses.loadMission}
            </span>
            <ChevronRight
              size={20}
              className="text-black group-hover/btn:translate-x-1 transition-transform"
            />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}

function LeaderList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ username: string; value: number }>;
}) {
  return (
    <div className="border border-white/10 bg-white/5 p-6">
      <h3 className="mb-4 text-2xl font-black">{title}</h3>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={`${row.username}-${index}`} className="flex justify-between">
            <span>
              #{index + 1} {row.username}
            </span>
            <span className="font-mono text-[rgb(var(--primary))]">
              {row.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrutalistLanding() {
  const t = useTranslation();

  const [courses, setCourses] = useState<CoursePreview[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(
    null,
  );

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await api.get<CoursePreview[]>("/courses");
        setCourses(data.slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
    api
      .get<CommunityStats>("/rankings/community-stats")
      .then(setCommunityStats)
      .catch(() => setCommunityStats(null));
  }, []);

  const techLogos = [
    { icon: <Code2 />, name: "React" },
    { icon: <Terminal />, name: "Python" },
    { icon: <Database />, name: "PostgreSQL" },
    { icon: <Cpu />, name: "Next.js" },
    { icon: <Zap />, name: "TypeScript" },
    { icon: <Flame />, name: "Firebase" },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--text))] selection:bg-[rgb(var(--primary))] selection:text-[rgb(var(--button-text))] relative overflow-x-hidden font-sans">
      {/* --- FONDO DINÁMICO "UNIVERSO HACKER" --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5ff3f10,transparent)]"></div>
      </div>

      <div className="relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 px-4 flex flex-col items-center min-h-[90vh]">
          <div className="flex flex-col md:flex-row items-center gap-12 max-w-7xl mx-auto w-full relative z-10">
            <div className="flex-1 text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-block bg-[rgb(var(--primary))] text-black font-black px-4 py-1 mb-6 transform -skew-x-12 border-2 border-black shadow-[4px_4px_0_0_#000]"
              >
                {t.landing.hero.level}
              </motion.div>
              <h1 className="text-[14vw] md:text-[9vw] font-black uppercase leading-[0.8] tracking-tighter mb-8 drop-shadow-[6px_6px_0_rgb(var(--primary))]">
                {t.landing.hero.title1} <br />
                <span className="text-outline">{t.landing.hero.title2}</span>
              </h1>
              <div className="max-w-md space-y-6">
                <div className="font-mono text-sm md:text-base border-l-4 border-[rgb(var(--primary))] pl-4 py-2 bg-black/5 animate-pulse italic">
                  &gt; {t.landing.hero.terminalLine1} <br />
                  &gt; {t.landing.hero.terminalLine2}
                </div>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link href="/register" className="relative group">
                    <div className="absolute inset-0 bg-red-900 translate-y-2 translate-x-1 rounded-sm"></div>
                    <button className="relative bg-red-600 text-white px-8 py-4 font-black text-xl uppercase border-2 border-black group-hover:-translate-y-1 active:translate-y-1 transition-all">
                      {t.landing.hero.startGame}
                    </button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="bg-white p-4 pb-16 border-2 border-black shadow-[15px_15px_0_0_#000] rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-zinc-200 aspect-square overflow-hidden border-2 border-black relative">
                  <img
                    src="/robot-head.png"
                    alt={t.landing.hero.robotAlt}
                    className="w-full h-full object-contain p-4 grayscale hover:grayscale-0 transition-all"
                  />
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] px-2 font-bold animate-pulse">
                    REC ●
                  </div>
                </div>
                <div className="mt-4 font-serif text-black text-xl font-bold italic tracking-tighter">
                  {t.landing.hero.subject}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- CARRUSEL DE LOGOS --- */}
        <div className="bg-black py-8 border-y-4 border-black overflow-hidden relative">
          <div className="flex whitespace-nowrap animate-scroll">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center">
                {techLogos.map((tech, idx) => (
                  <div
                    key={idx}
                    className="flex items-center mx-12 gap-4 group"
                  >
                    <div className="text-[rgb(var(--primary))] group-hover:scale-125 transition-transform duration-300">
                      {tech.icon}
                    </div>
                    <span className="text-white text-3xl font-black uppercase italic tracking-tighter">
                      {tech.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* --- SHOWCASE DE CURSOS --- */}
        <section className="py-24 border-b-4 border-black bg-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
                  {t.landing.courses.title1} <br />
                  <span className="text-[rgb(var(--primary))]">
                    {t.landing.courses.title2}.
                  </span>
                </h2>
                <p className="font-mono text-lg opacity-70 border-l-4 border-[rgb(var(--primary))] pl-4 italic">
                  &gt; {t.landing.courses.loadingModules}
                </p>
              </div>
              <Link href="/courses">
                <button className="group flex items-center gap-2 bg-black text-white px-8 py-4 font-black uppercase border-2 border-black hover:bg-[rgb(var(--primary))] hover:text-black transition-all shadow-[6px_6px_0_0_rgb(var(--primary))]">
                  {t.landing.courses.explore}{" "}
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-2 transition-transform"
                  />
                </button>
              </Link>
            </div>
            {loadingCourses ? (
              <div className="flex justify-center py-20 font-mono animate-pulse uppercase font-bold text-[rgb(var(--primary))]">
                {t.landing.courses.decoding}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))
                ) : (
                  <div className="col-span-full border-4 border-dashed border-black/20 p-20 text-center font-mono opacity-50 uppercase font-black text-black">
                    {t.landing.courses.empty}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="py-20 border-b-4 border-black bg-black text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-sm uppercase text-[rgb(var(--primary))]">
                  {t("site.communityPulseLabel")}
                </p>
                <h2 className="mt-3 text-5xl font-black uppercase tracking-tighter">
                  {t("site.learnersShippingProgressTitle")}
                </h2>
              </div>
              <Link href="/rankings" className="font-black text-[rgb(var(--primary))]">
                {t("site.viewRankingsLink")}
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                [t("site.membersLabel"), communityStats?.users ?? 0],
                [t("admin.certificatesIssuedLabel"), communityStats?.certificatesIssued ?? 0],
                [t("site.totalXpEarnedLabel"), communityStats?.totalXpEarned ?? 0],
              ].map(([label, value]) => (
                <div key={label as string} className="border border-white/10 bg-white/5 p-6">
                  <p className="text-sm uppercase text-white/50">{label as string}</p>
                  <p className="mt-2 text-4xl font-black text-[rgb(var(--primary))]">
                    {Number(value).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <LeaderList title={t("site.topLearnersTitle")} rows={communityStats?.topLearners ?? []} />
              <LeaderList
                title={t("site.activeStreakLeadersTitle")}
                rows={communityStats?.streakLeaders ?? []}
              />
            </div>
          </div>
        </section>

        {/* --- HECHOS CIENTÍFICOS Y HUD --- */}
        <section className="py-32 px-6 max-w-7xl mx-auto border-b-4 border-black">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative group">
              <div className="absolute -inset-4 bg-[rgb(var(--primary))]/20 blur-xl"></div>
              <div className="relative bg-zinc-900 border-4 border-black rounded-3xl overflow-hidden shadow-[20px_20px_0_0_#000]">
                <div className="bg-black p-3 flex justify-between px-6 border-b-2 border-white/10">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  </div>
                  <span className="text-[rgb(var(--primary))] font-mono text-xs font-bold uppercase italic tracking-widest">
                    {t.landing.hud.system}
                  </span>
                </div>
                <div className="aspect-video relative bg-[#1a1a1a] flex flex-col p-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[rgb(var(--primary))] text-[10px] font-black uppercase tracking-widest">
                        {t.landing.hud.score}
                      </p>
                      <p className="text-white text-4xl font-black tabular-nums tracking-tighter">
                        14,250
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40 text-[10px] font-black uppercase">
                        {t.landing.hud.level}
                      </p>
                      <p className="text-5xl font-black italic text-transparent bg-clip-text bg-linear-to-b from-white to-zinc-600">
                        90
                      </p>
                    </div>
                  </div>
                  <motion.div
                    whileInView={{ scale: [1, 1.1, 1] }}
                    className="m-auto bg-[rgb(var(--primary))] p-6 border-4 border-black shadow-[6px_6px_0_0_#000] cursor-pointer"
                  >
                    <p className="text-black font-black text-3xl uppercase leading-none italic text-center">
                      {t.landing.hud.ready} <br />
                      <span className="text-white drop-shadow-[2px_2px_0_#000]">
                        {t.landing.hud.xp}
                      </span>
                    </p>
                  </motion.div>
                  <div className="mt-auto">
                    <div className="h-6 bg-black border-2 border-white/20 p-1">
                      <div className="h-full bg-[rgb(var(--primary))] w-[85%] shadow-[0_0_15px_rgb(var(--primary))]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-5xl font-black uppercase mb-12 leading-none border-l-8 border-[rgb(var(--primary))] pl-6 italic">
                {t.landing.philosophy.title1} <br />
                <span className="text-[rgb(var(--primary))]">
                  {t.landing.philosophy.title2}
                </span>
              </h2>
              <NewspaperFact
                id="NEURO-01"
                emoji="🧠"
                title={t.landing.facts.brainTitle}
                text={t.landing.facts.brainText}
              />
              <NewspaperFact
                id="EDU-99"
                emoji="🗞️"
                title={t.landing.facts.learningTitle}
                text={t.landing.facts.learningText}
              />
            </div>
          </div>
        </section>

        {/* --- SECCIÓN FINAL: CTA DE RECLUTAMIENTO --- */}
        <section className="py-32 px-4 relative overflow-hidden bg-black text-white">
          <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-[rgb(var(--primary))]/10 blur-[120px] rounded-full"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ y: 20 }}
              whileInView={{ y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[rgb(var(--primary))] text-[rgb(var(--primary))] font-mono text-sm mb-8 uppercase tracking-[0.2em]"
            >
              <ShieldCheck size={18} /> {t.landing.cta.secure}
            </motion.div>
            <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-8 italic">
              {t.landing.cta.title1} <br />
              <span className="text-[rgb(var(--primary))] text-glow">
                {t.landing.cta.title2}
              </span>
              ?
            </h2>
            <p className="text-xl md:text-2xl font-mono mb-12 opacity-70 max-w-2xl mx-auto italic">
              &gt; {t.landing.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full bg-[rgb(var(--primary))] text-black px-10 py-5 font-black text-2xl uppercase border-4 border-black hover:bg-white transition-all shadow-[8px_8px_0_0_#fff]">
                  {t.landing.cta.register}
                </button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <button className="w-full bg-transparent text-white px-10 py-5 font-black text-2xl uppercase border-4 border-white hover:bg-[rgb(var(--primary))] hover:text-black transition-all italic">
                  {t.landing.cta.login}
                </button>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <style>{`
 @keyframes scroll {
 0% { transform: translateX(0); }
 100% { transform: translateX(-50%); }
 }
 .animate-scroll {
 animation: scroll 25s linear infinite;
 }
 .text-outline {
 -webkit-text-stroke: 2px rgb(var(--text));
 color: transparent;
 }
 .text-glow {
 text-shadow: 0 0 20px rgba(var(--primary), 0.5);
 }
 body {
 background-color: rgb(var(--background));
 }
 `}</style>
    </div>
  );
}
