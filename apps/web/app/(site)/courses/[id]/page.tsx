"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../../../src/i18n/useTranslation";

import {
  ChevronDown,
  PlayCircle,
  CheckCircle2,
  Lock,
  Trophy,
  Zap,
  User,
  BookOpen,
  Flame,
  Award,
  ArrowRight,
  Crown,
  Download,
  ExternalLink,
  FileCheck2,
} from "lucide-react";

import { fetcher } from "../../../../utils/fetcher";
import { Exercise } from "../../../../src/types/exercise";
import { EmptyState, ErrorState } from "@/shared/ui";
import { CourseReviews } from "@/features/courses/components/course-reviews";
import { CourseProjectSection } from "@/features/courses/components/course-project-section";
import { ReferralCourseBanner } from "@/features/courses/components/referral-course-banner";

interface CertificateStatus {
  completed: boolean;
  eligible: boolean;
  hasCertificate: boolean;
  accessType: string | null;
  certificateId: string | null;
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslation();

  const [course, setCourse] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [streak, setStreak] = useState(0); // ← nuevo (puedes calcularlo real)
  const [certificateStatus, setCertificateStatus] =
    useState<CertificateStatus | null>(null);
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [certificateError, setCertificateError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoadError(false);

    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      setIsLoggedIn(!!token);

      const lang = localStorage.getItem("lang") || "es";
      const data = await fetcher(`/courses/${id}?lang=${lang}`);
      setCourse(data);

      if (token && userId) {
        try {
          const progress = await fetcher(`/progress/user/${userId}`);
          const completedExIds = progress
            .map((p: any) => p.exercise?.id)
            .filter(Boolean);

          setCompletedExercises(completedExIds);

          const totalXP = progress.reduce(
            (acc: number, p: any) =>
              acc + (p.exercise?.experience ?? 0) + (p.lesson?.experience ?? 0),
            0,
          );
          setUserXP(totalXP);

          const me = await fetcher(`/identity/me`);
          setStreak(me?.streak ?? 0);

          const status = await fetcher(`/certificates/course/${id}/status`);
          setCertificateStatus(status);
        } catch (err) {
          // Progress/certificate are secondary to the course itself — don't block
          // the page on them, just leave those sections at their default state.
          console.error("Error cargando progreso/certificado", err);
        }
      }
    } catch (err) {
      console.error("Error cargando curso", err);
      setLoadError(true);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalExercises = useMemo(() => {
    return (
      course?.lessons?.reduce(
        (acc: number, l: any) => acc + (l.exercises?.length || 0),
        0,
      ) ?? 0
    );
  }, [course]);

  const progressPercent = useMemo(() => {
    if (!totalExercises) return 0;
    return Math.min(
      100,
      Math.floor((completedExercises.length / totalExercises) * 100),
    );
  }, [completedExercises, totalExercises]);

  const handleIssueCertificate = async () => {
    if (!id) return;

    try {
      setIssuingCertificate(true);
      setCertificateError(null);

      const certificate = await fetcher(`/certificates/course/${id}/issue`, {
        method: "POST",
      });

      setCertificateStatus({
        completed: true,
        eligible: true,
        hasCertificate: true,
        accessType: certificateStatus?.accessType ?? null,
        certificateId: certificate.id,
      });
    } catch (err: any) {
      setCertificateError(
        err?.message || t("site.generateCertificateError"),
      );
    } finally {
      setIssuingCertificate(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <ErrorState message={t.courseDetail.loadError} />
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[rgb(var(--button))] text-[rgb(var(--button-text))] font-bold uppercase tracking-wide rounded-lg hover:bg-[rgb(var(--button)/0.9)] transition"
        >
          {t("common.refresh")}
        </button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-[rgb(var(--primary-text))] animate-pulse">
        {t.courseDetail.loading}...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 pt-6 md:pt-12 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-[rgb(var(--background))] to-[rgb(var(--background)/0.4)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">
        {/* columna principal */}
        <div className="lg:col-span-8 space-y-8 md:space-y-10">
          {/* Hero mejorado */}
          <header className="relative overflow-hidden rounded-2xl border-4 border-[rgb(var(--primary)/0.3)] bg-gradient-to-br from-[rgb(var(--card))] to-[rgb(var(--card)/0.7)] p-8 md:p-10 shadow-xl">
            <div className="absolute -right-12 -top-12 opacity-10 text-[20rem] font-black leading-none text-[rgb(var(--primary))]">
              {course.title.slice(0, 3)}
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[rgb(var(--primary)/0.1)] border-2 border-[rgb(var(--primary))] rounded-full text-sm font-mono font-bold uppercase tracking-wide">
                  <Award size={16} />
                  {course.difficulty || t("site.difficultyIntermediate")}
                </span>
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[rgb(var(--cb-warning)/0.15)] border-2 border-[rgb(var(--cb-warning))] rounded-full text-sm font-mono font-bold uppercase tracking-wide text-[rgb(var(--warning-text))]">
                    <Flame size={16} className="text-[rgb(var(--cb-warning))]" />
                    {streak} {t(streak > 1 ? "site.streakDaysPlural" : "site.streakDaysSingular")}
                  </span>
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-[rgb(var(--primary-text))] leading-tight">
                {course.title}_
              </h1>

              <p className="mt-5 text-lg md:text-xl font-mono text-[rgb(var(--secondary-text))] max-w-3xl">
                {course.description}
              </p>

              {course.prerequisites?.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border-2 border-[rgb(var(--cb-warning))] bg-[rgb(var(--cb-warning)/0.1)] p-4">
                  <Lock size={16} className="text-[rgb(var(--warning-text))]" />
                  <span className="text-sm font-bold uppercase text-[rgb(var(--warning-text))]">
                    {t("site.coursePrerequisitesTitle")}:
                  </span>
                  {course.prerequisites.map((prerequisite: { id: string; title: string | null }) => (
                    <Link
                      key={prerequisite.id}
                      href={`/courses/${prerequisite.id}`}
                      className="rounded-full border border-[rgb(var(--warning-text))] px-3 py-1 text-xs font-bold text-[rgb(var(--warning-text))] transition hover:opacity-80"
                    >
                      {prerequisite.title}
                    </Link>
                  ))}
                </div>
              )}

              <ReferralCourseBanner courseId={id} />
            </div>
          </header>

          {/* Lista de lecciones – tarjetas más pulidas */}
          {!course.lessons || course.lessons.length === 0 ? (
            <EmptyState title={t.courseDetail.noLessons} />
          ) : (
          <div className="space-y-5">
            {course.lessons?.map((lesson: any) => {
              const isOpen = openLesson === lesson.id;
              // El backend ya calcula esto (course.service.ts) contra la
              // suscripción premium real del usuario — antes acá se
              // re-derivaba solo mirando isLoggedIn, así que cualquier
              // usuario logueado (sin importar si tenía premium) veía todo
              // desbloqueado.
              const isLocked = Boolean(lesson.locked);
              const completedCount =
                lesson.exercises?.filter((ex: Exercise) =>
                  completedExercises.includes(ex.id),
                ).length || 0;
              const totalInLesson = lesson.exercises?.length || 0;

              return (
                <div
                  key={lesson.id}
                  className={`group rounded-xl overflow-hidden border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] transition-all duration-300 hover:border-[rgb(var(--primary)/0.6)] hover:shadow-xl hover:shadow-[rgb(var(--primary)/0.08)] ${
                    isLocked ? "opacity-60 saturate-50" : ""
                  }`}
                  role="region"
                  aria-labelledby={`lesson-${lesson.id}`}
                >
                  <button
                    disabled={isLocked}
                    onClick={() => setOpenLesson(isOpen ? null : lesson.id)}
                    className="w-full flex items-center justify-between p-6 text-left transition disabled:cursor-not-allowed"
                    aria-expanded={isOpen}
                    aria-controls={`lesson-content-${lesson.id}`}
                  >
                    <div className="flex items-center gap-5 flex-1">
                      <div className="flex-shrink-0">
                        <span className="inline-block bg-[rgb(var(--code-background))] text-[rgb(var(--primary-text))] font-mono px-4 py-2 text-base border-2 border-[rgb(var(--primary))] rounded-lg font-bold">
                          L-{String(lesson.order).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          id={`lesson-${lesson.id}`}
                          className="text-2xl font-black uppercase italic group-hover:text-[rgb(var(--primary-text))] transition-colors"
                        >
                          {lesson.title || t.courseDetail.lessonFallback}
                        </h3>

                        <div className="mt-1.5 flex items-center gap-4 text-sm font-mono text-[rgb(var(--secondary-text))]">
                          <span>
                            {completedCount}/{totalInLesson} {t("site.completedMasculineSuffix")}
                          </span>
                          {totalInLesson > 0 && (
                            <span className="text-[rgb(var(--primary-text))] font-bold">
                              {Math.round(
                                (completedCount / totalInLesson) * 100,
                              )}
                              %
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isLocked ? (
                      <Lock size={28} className="text-[rgb(var(--disabled))]" />
                    ) : (
                      <ChevronDown
                        size={28}
                        className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {isLocked && (
                    <Link
                      href="/premium"
                      className="flex items-center justify-center gap-2 border-t-2 border-[rgb(var(--border))] bg-[rgb(var(--primary)/0.08)] px-6 py-3 text-xs font-black uppercase text-[rgb(var(--primary-text))] transition hover:bg-[rgb(var(--primary)/0.15)]"
                    >
                      <Lock size={14} />
                      {t("site.premiumTitle")}
                    </Link>
                  )}

                  <AnimatePresence>
                    {isOpen && !isLocked && (
                      <motion.div
                        id={`lesson-content-${lesson.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="border-t-2 border-[rgb(var(--border))] bg-[rgb(var(--code-background)/0.6)]"
                      >
                        <div className="p-6 md:p-8 space-y-6">
                          {lesson.description && (
                            <p className="text-base font-mono italic text-[rgb(var(--secondary-text))] border-l-4 border-[rgb(var(--primary)/0.4)] pl-5 py-1">
                              {lesson.description}
                            </p>
                          )}

                          <div className="space-y-3">
                            {lesson.exercises?.map((ex: Exercise) => {
                              const completed = completedExercises.includes(
                                ex.id,
                              );

                              return (
                                <Link
                                  key={ex.id}
                                  href={`/learn/exercise/${ex.type.toLowerCase()}/${ex.id}`}
                                  className={`group/ex flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                                    completed
                                      ? "border-[rgb(var(--success)/0.5)] bg-[rgb(var(--success)/0.08)]"
                                      : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary))] hover:bg-[rgb(var(--card)/0.5)]"
                                  }`}
                                >
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="flex items-center gap-3">
                                      {completed ? (
                                        <CheckCircle2
                                          size={22}
                                          className="text-[rgb(var(--success))]"
                                        />
                                      ) : (
                                        <PlayCircle size={22} />
                                      )}

                                      <span className="font-mono font-semibold text-base">
                                        {ex.title}
                                      </span>
                                    </div>

                                    <span className="text-sm font-mono text-[rgb(var(--secondary-text))] ml-auto">
                                      +{ex.experience} XP
                                    </span>
                                  </div>

                                  {completed && (
                                    <span className="text-xs font-mono uppercase bg-[rgb(var(--success)/0.2)] px-3 py-1 rounded-full ml-4">
                                      {t.courseDetail.xpClaimed}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}

                            {(!lesson.exercises ||
                              lesson.exercises.length === 0) && (
                              <p className="text-center py-8 text-[rgb(var(--disabled))] font-mono italic text-sm uppercase tracking-wide">
                                {t.courseDetail.exercisesEmpty}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          )}

          <CourseReviews courseId={id} />
          <CourseProjectSection courseId={id} />
        </div>

        {/* Sidebar – más compacto y profesional */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8 self-start">
          {/* Card de estado / login */}
          <div className="rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-lg">
            {!isLoggedIn ? (
              <div className="text-center space-y-6 py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-[rgb(var(--primary)/0.1)] flex items-center justify-center border-2 border-[rgb(var(--primary)/0.4)]">
                  <User size={32} className="text-[rgb(var(--primary))]" />
                </div>

                <div>
                  <h4 className="font-black uppercase italic text-2xl mb-2 text-[rgb(var(--primary-text))]">
                    {t.courseDetail.sidebar.restrictedAccess}
                  </h4>
                  <p className="text-sm font-mono text-[rgb(var(--secondary-text))] mb-5">
                    {t("site.loginToUnlockContent")}
                  </p>

                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[rgb(var(--button))] text-[rgb(var(--button-text))] font-bold uppercase tracking-wide rounded-lg hover:bg-[rgb(var(--button)/0.9)] transition"
                  >
                    {t("site.loginAction")} <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {/* Nivel / Streak */}
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary)/0.6)] flex items-center justify-center shadow-md">
                    <Zap size={28} className="text-black" />
                  </div>
                  <div>
                    <h4 className="font-black uppercase italic text-xl">
                      {t.courseDetail.sidebar.statusActive}
                    </h4>
                    <p className="font-mono text-sm text-[rgb(var(--secondary-text))]">
                      {t("site.approximateLevelPrefix", { level: Math.floor(userXP / 500) + 1 })}
                    </p>
                  </div>
                </div>

                {/* Progress bar animada */}
                <div>
                  <div className="flex justify-between text-xs font-mono uppercase mb-2">
                    <span>{t.courseDetail.sidebar.progress}</span>
                    <span className="font-bold">{progressPercent}%</span>
                  </div>

                  <div className="h-5 bg-[rgb(var(--progress-background))] rounded-full border-2 border-[rgb(var(--border))] overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary)/0.7)] rounded-r-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[rgb(var(--background))] border-2 border-[rgb(var(--border))] rounded-lg p-4 text-center">
                    <Trophy
                      size={20}
                      className="mx-auto mb-2 text-[rgb(var(--primary))]"
                    />
                    <div className="text-2xl font-black">
                      {completedExercises.length}
                    </div>
                    <div className="text-xs uppercase font-mono text-[rgb(var(--secondary-text))] mt-1">
                      {t.courseDetail.sidebar.exercises}
                    </div>
                  </div>

                  <div className="bg-[rgb(var(--background))] border-2 border-[rgb(var(--border))] rounded-lg p-4 text-center">
                    <Zap
                      size={20}
                      className="mx-auto mb-2 text-[rgb(var(--primary))]"
                    />
                    <div className="text-2xl font-black">
                      {userXP.toLocaleString()}
                    </div>
                    <div className="text-xs uppercase font-mono text-[rgb(var(--secondary-text))] mt-1">
                      {t.courseDetail.sidebar.xp}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isLoggedIn && certificateStatus && (
            <CertificatePanel
              courseId={id}
              status={certificateStatus}
              issuing={issuingCertificate}
              error={certificateError}
              onIssue={handleIssueCertificate}
            />
          )}

          {/* Resumen del curso */}
          <div className="rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-lg">
            <h4 className="font-black uppercase italic text-xl flex items-center gap-3 mb-5 text-[rgb(var(--primary-text))]">
              <BookOpen size={22} /> {t.courseDetail.summary.title}
            </h4>

            <dl className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <dt className="text-[rgb(var(--secondary-text))]">
                  {t.courseDetail.summary.totalLessons}
                </dt>
                <dd className="font-bold">{course.lessons?.length || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[rgb(var(--secondary-text))]">
                  {t.courseDetail.summary.difficulty}
                </dt>
                <dd className="font-bold">{course.difficulty}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[rgb(var(--secondary-text))]">
                  {t.courseDetail.summary.id}
                </dt>
                <dd className="font-mono font-bold">
                  {course.id.slice(0, 8).toUpperCase()}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CertificatePanel({
  courseId,
  status,
  issuing,
  error,
  onIssue,
}: {
  courseId: string;
  status: CertificateStatus;
  issuing: boolean;
  error: string | null;
  onIssue: () => void;
}) {
  const t = useTranslation();
  const baseClass =
    "w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-black uppercase text-sm transition";

  if (!status.completed) {
    return (
      <div className="rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-lg">
        <h4 className="font-black uppercase italic text-xl flex items-center gap-3 mb-3 text-[rgb(var(--primary))]">
          <FileCheck2 size={22} /> {t("site.certificateHeading")}
        </h4>
        <p className="font-mono text-sm text-[rgb(var(--secondary-text))]">
          {t("site.completeCourseUnlockCertificateHint")}
        </p>
      </div>
    );
  }

  if (status.hasCertificate && status.certificateId) {
    return (
      <div className="rounded-xl border-4 border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] p-6 shadow-lg">
        <h4 className="font-black uppercase italic text-xl flex items-center gap-3 mb-3 text-[rgb(var(--primary-text))]">
          <Trophy size={22} /> {t("site.certificateIssuedTitle")}
        </h4>
        <div className="space-y-3">
          <Link
            href={`/certificates/${status.certificateId}`}
            className={`${baseClass} bg-[rgb(var(--button))] text-[rgb(var(--button-text))]`}
          >
            {t("site.viewCertificateLink")} <ExternalLink size={16} />
          </Link>
          <Link
            href={`/certificates/${status.certificateId}?print=1`}
            className={`${baseClass} border-2 border-[rgb(var(--primary))] text-[rgb(var(--primary-text))]`}
          >
            {t("site.downloadPdf")} <Download size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (status.eligible) {
    return (
      <div className="rounded-xl border-4 border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--card))] p-6 shadow-lg">
        <h4 className="font-black uppercase italic text-xl flex items-center gap-3 mb-3 text-[rgb(var(--primary-text))]">
          <Award size={22} /> {t("site.certificateAvailableTitle")}
        </h4>
        <button
          onClick={onIssue}
          disabled={issuing}
          className={`${baseClass} bg-[rgb(var(--button))] text-[rgb(var(--button-text))] disabled:opacity-60`}
        >
          {issuing ? t("site.generatingEllipsis") : t("site.generateCertificateButton")}
        </button>
        {error && <p className="mt-3 text-sm text-[rgb(var(--error-text))]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-4 border-[rgb(var(--primary)/0.35)] bg-[rgb(var(--card))] p-6 shadow-lg">
      <h4 className="font-black uppercase italic text-xl mb-2 text-[rgb(var(--primary-text))]">
        {t("site.courseCompletedTitle")}
      </h4>
      <p className="font-mono text-sm text-[rgb(var(--secondary-text))] mb-5">
        {t("site.getVerifiableCertificateHint")}
      </p>
      <div className="space-y-3">
        <Link
          href={`/certificates/buy/${courseId}`}
          className={`${baseClass} bg-[rgb(var(--button))] text-[rgb(var(--button-text))]`}
        >
          {t("site.buyCertificateTitle")}
        </Link>
        <Link
          href="/premium"
          className={`${baseClass} border-2 border-[rgb(var(--primary))] text-[rgb(var(--primary-text))]`}
        >
          {t("site.getPremiumLink")} <Crown size={16} />
        </Link>
      </div>
    </div>
  );
}
