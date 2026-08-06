"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingDown } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

interface FunnelStep {
  exerciseId: string;
  order: number;
  title: string;
  completedCount: number;
  retentionPercent: number;
}

interface CourseDropoff {
  courseId: string;
  title: string;
  startedCount: number;
  completionRate: number;
  dropoffStep: { title: string; order: number; dropPercent: number } | null;
  funnel: FunnelStep[];
}

interface HardestExercise {
  exerciseId: string;
  title: string;
  courseId: string | null;
  courseTitle: string | null;
  totalAttempts: number;
  failedAttempts: number;
  failureRatePercent: number;
  avgAttemptsToSucceed: number | null;
  completedCount: number;
}

interface StudentExperienceData {
  courseDropoff: CourseDropoff[];
  hardestExercises: HardestExercise[];
}

export default function AdminStudentExperiencePage() {
  const t = useTranslation();
  const [data, setData] = useState<StudentExperienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await api.get<StudentExperienceData>(
          "/admin/analytics/student-experience",
        );
        setData(result);
      } catch {
        toast.error(t("admin.studentExperienceLoadError"));
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 text-white">
      <div className="flex items-center gap-3">
        <Activity className="text-yellow-400" />
        <h1 className="text-3xl font-black">{t("admin.studentExperienceTitle")}</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{t("admin.studentExperienceDescription")}</p>

      {loading ? (
        <div className="mt-8 text-zinc-500">{t("common.loading")}</div>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-xl font-black mb-4">{t("admin.courseDropoffTitle")}</h2>
            {!data || data.courseDropoff.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("admin.courseDropoffEmpty")}</p>
            ) : (
              <div className="space-y-3">
                {data.courseDropoff.map((course) => {
                  const expanded = expandedCourseId === course.courseId;
                  return (
                    <div
                      key={course.courseId}
                      className="rounded-lg border border-zinc-800 bg-[#111111] p-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCourseId(expanded ? null : course.courseId)
                        }
                        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                      >
                        <div>
                          <p className="font-black">{course.title}</p>
                          <p className="text-xs text-zinc-500">
                            {t("admin.startedCount")}: {course.startedCount}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">
                              {t("admin.completionRate")}
                            </p>
                            <p
                              className={`text-lg font-black ${
                                course.completionRate < 40
                                  ? "text-red-400"
                                  : course.completionRate < 70
                                    ? "text-yellow-400"
                                    : "text-green-400"
                              }`}
                            >
                              {course.completionRate}%
                            </p>
                          </div>
                          {course.dropoffStep && (
                            <div className="flex items-center gap-1 rounded-full border border-red-800 px-3 py-1 text-xs text-red-300">
                              <TrendingDown size={12} />
                              {t("admin.dropoffStepLabel")}: {course.dropoffStep.title} (-
                              {course.dropoffStep.dropPercent}%)
                            </div>
                          )}
                        </div>
                      </button>

                      {expanded && (
                        <div className="mt-4 border-t border-zinc-800 pt-4">
                          <p className="mb-2 text-xs uppercase text-zinc-500">
                            {t("admin.funnelLabel")}
                          </p>
                          <div className="space-y-1">
                            {course.funnel.map((step) => (
                              <div key={step.exerciseId} className="flex items-center gap-3">
                                <span className="w-6 shrink-0 text-xs text-zinc-600">
                                  {step.order + 1}
                                </span>
                                <span className="w-48 shrink-0 truncate text-xs text-zinc-300">
                                  {step.title}
                                </span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900">
                                  <div
                                    className="h-full bg-yellow-400"
                                    style={{ width: `${step.retentionPercent}%` }}
                                  />
                                </div>
                                <span className="w-12 shrink-0 text-right text-xs text-zinc-400">
                                  {step.retentionPercent}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-black mb-4">{t("admin.hardestExercisesTitle")}</h2>
            {!data || data.hardestExercises.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("admin.hardestExercisesEmpty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#151515] text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="p-3">{t("admin.exercises")}</th>
                      <th className="p-3">{t("admin.courses")}</th>
                      <th className="p-3">{t("admin.totalAttemptsLabel")}</th>
                      <th className="p-3">{t("admin.failedAttemptsLabel")}</th>
                      <th className="p-3">{t("admin.failureRateLabel")}</th>
                      <th className="p-3">{t("admin.avgAttemptsLabel")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hardestExercises.map((exercise) => (
                      <tr
                        key={exercise.exerciseId}
                        className="border-t border-zinc-800 bg-[#111111]"
                      >
                        <td className="p-3 font-medium">{exercise.title}</td>
                        <td className="p-3 text-zinc-400">{exercise.courseTitle ?? "-"}</td>
                        <td className="p-3">{exercise.totalAttempts}</td>
                        <td className="p-3">{exercise.failedAttempts}</td>
                        <td className="p-3 font-black text-red-400">
                          {exercise.failureRatePercent}%
                        </td>
                        <td className="p-3">{exercise.avgAttemptsToSucceed ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
