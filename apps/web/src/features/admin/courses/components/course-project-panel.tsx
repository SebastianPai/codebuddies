"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Save, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "@/i18n/useTranslation";
import { Card, Loader } from "@/shared/ui";
import { api } from "@/shared/api";

interface Submission {
  id: string;
  submissionUrl: string | null;
  submissionText: string | null;
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
  reviewNote: string | null;
  submittedAt: string;
  user: { username: string; email: string };
}

interface Props {
  courseId: string;
}

export function CourseProjectPanel({ courseId }: Props) {
  const t = useTranslation();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const load = async () => {
    try {
      const project = await api.get<{ title: string; instructions: string } | null>(
        `/courses/${courseId}/project`,
      );
      if (project) {
        setTitle(project.title);
        setInstructions(project.instructions);
      }
      const subs = await api.get<Submission[]>(`/admin/courses/${courseId}/project/submissions`);
      setSubmissions(subs);
    } catch {
      // sin proyecto configurado todavía
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/courses/${courseId}/project`, { title, instructions });
      toast.success(t("admin.courseProjectSaved"));
      await load();
    } catch {
      toast.error(t("admin.courseProjectSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const review = async (submissionId: string, status: "APPROVED" | "CHANGES_REQUESTED") => {
    const reviewNote = status === "CHANGES_REQUESTED" ? window.prompt(t("admin.courseProjectReviewNotePrompt")) ?? undefined : undefined;
    await api.patch(`/admin/course-project-submissions/${submissionId}/review`, { status, reviewNote });
    await load();
  };

  if (!loaded) return <Loader label="" size={20} />;

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <ClipboardList size={18} className="text-[rgb(var(--secondary-text))]" />
        <h2 className="font-medium text-[rgb(var(--text))]">{t("admin.courseProjectTitle")}</h2>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("common.title")}
        className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm"
      />
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={3}
        placeholder={t("admin.courseProjectInstructionsPlaceholder")}
        className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !title || !instructions}
        className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
      >
        <Save size={14} />
        {t("common.save")}
      </button>

      {submissions.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-[rgb(var(--border))] pt-4">
          <p className="text-sm font-bold">{t("admin.courseProjectSubmissions")}</p>
          {submissions.map((submission) => (
            <div key={submission.id} className="rounded-lg border border-[rgb(var(--border))] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold">{submission.user.username}</span>
                <span className="text-xs text-[rgb(var(--secondary-text))]">{submission.status}</span>
              </div>
              {submission.submissionUrl && (
                <a href={submission.submissionUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-[rgb(var(--primary))]">
                  {submission.submissionUrl}
                </a>
              )}
              {submission.submissionText && <p className="mt-1 text-[rgb(var(--secondary-text))]">{submission.submissionText}</p>}
              {submission.status === "PENDING" && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => void review(submission.id, "APPROVED")} className="flex items-center gap-1 rounded-md border border-green-800 px-2 py-1 text-xs text-green-300">
                    <CheckCircle2 size={12} /> {t("admin.courseProjectApprove")}
                  </button>
                  <button type="button" onClick={() => void review(submission.id, "CHANGES_REQUESTED")} className="flex items-center gap-1 rounded-md border border-red-800 px-2 py-1 text-xs text-red-300">
                    <XCircle size={12} /> {t("admin.courseProjectRequestChanges")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
