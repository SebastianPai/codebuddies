"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, XCircle } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { api } from "@/shared/api";

interface Submission {
  id: string;
  submissionUrl: string | null;
  submissionText: string | null;
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
  reviewNote: string | null;
  submittedAt: string;
}

interface CourseProject {
  id: string;
  title: string;
  instructions: string;
  mySubmission: Submission | null;
}

const STATUS_META = {
  PENDING: { icon: Clock, className: "border-yellow-600 bg-yellow-950/30 text-yellow-300" },
  APPROVED: { icon: CheckCircle2, className: "border-green-700 bg-green-950/30 text-green-300" },
  CHANGES_REQUESTED: { icon: XCircle, className: "border-red-700 bg-red-950/30 text-red-300" },
};

export function CourseProjectSection({ courseId }: { courseId: string }) {
  const t = useTranslation();
  const [project, setProject] = useState<CourseProject | null | undefined>(undefined);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = typeof window !== "undefined" && Boolean(localStorage.getItem("token"));

  const load = async () => {
    try {
      const data = await api.get<CourseProject | null>(`/courses/${courseId}/project`);
      setProject(data);
      if (data?.mySubmission) {
        setUrl(data.mySubmission.submissionUrl ?? "");
        setText(data.mySubmission.submissionText ?? "");
      }
    } catch {
      setProject(null);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/courses/${courseId}/project/submit`, {
        submissionUrl: url || undefined,
        submissionText: text || undefined,
      });
      await load();
    } catch (err: any) {
      setError(err?.status === 403 ? t("site.projectRequiresCompletion") : t("common.unexpectedError"));
    } finally {
      setSaving(false);
    }
  };

  if (project === undefined || project === null) return null;

  const status = project.mySubmission ? STATUS_META[project.mySubmission.status] : null;
  const StatusIcon = status?.icon;

  return (
    <section className="mt-10 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="text-[rgb(var(--primary))]" />
        <h2 className="text-xl font-black">{project.title}</h2>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm text-[rgb(var(--secondary-text))]">{project.instructions}</p>

      {project.mySubmission && status && StatusIcon && (
        <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${status.className}`}>
          <StatusIcon size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">{t(`site.projectStatus${project.mySubmission.status}`)}</p>
            {project.mySubmission.reviewNote && <p className="mt-1">{project.mySubmission.reviewNote}</p>}
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className="mt-5 space-y-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("site.projectUrlPlaceholder")}
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t("site.projectDescriptionPlaceholder")}
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || (!url && !text)}
            className="rounded-full bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
          >
            {project.mySubmission ? t("site.projectResubmitCta") : t("site.projectSubmitCta")}
          </button>
        </div>
      )}
    </section>
  );
}
