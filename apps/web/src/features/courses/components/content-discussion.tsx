"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, MessageSquare, Reply, RotateCcw, Send, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { api } from "@/shared/api";

interface CommentUser {
  id: string;
  username: string;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: CommentUser;
  replies: Comment[];
}

interface Props {
  target: { lessonId: string } | { exerciseId: string };
}

type LoadState = "loading" | "error" | "ready";

const COMMENT_MAX = 3000;
const REPORT_MAX = 200;

function errorStatus(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "status" in error
    ? (error as { status?: number }).status
    : undefined;
}

export function ContentDiscussion({ target }: Props) {
  const t = useTranslation();
  const basePath = "lessonId" in target ? `lessons/${target.lessonId}` : `exercises/${target.exerciseId}`;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState<"root" | "reply" | null>(null);
  const [postError, setPostError] = useState<{ scope: "root" | "reply"; message: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const [session, setSession] = useState<{ authenticated: boolean; userId: string | null }>({
    authenticated: false,
    userId: null,
  });

  useEffect(() => {
    setSession({
      authenticated: Boolean(localStorage.getItem("token")),
      userId: localStorage.getItem("userId"),
    });
  }, []);

  // Antes un fallo al cargar se mostraba como "todavía no hay comentarios"
  // (mentira), y un fallo al publicar/borrar/reportar no avisaba nada.
  const load = useCallback(async () => {
    setLoadState((current) => (current === "ready" ? "ready" : "loading"));
    try {
      const data = await api.get<Comment[]>(`/${basePath}/comments`);
      setComments(data);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [basePath]);

  useEffect(() => {
    setLoadState("loading");
    void load();
  }, [load]);

  const describeError = (error: unknown, fallbackKey: string) =>
    errorStatus(error) === 429 ? t("site.discussion.rateLimited") : t(fallbackKey);

  const post = async (text: string, parentId?: string) => {
    const scope = parentId ? "reply" : "root";
    if (!text.trim() || posting) return;
    setPosting(scope);
    setPostError(null);
    try {
      await api.post(`/${basePath}/comments`, { body: text.trim(), parentId });
      // El texto solo se limpia si se publicó: si falla, sigue ahí.
      if (parentId) {
        setReplyBody("");
        setReplyTo(null);
      } else {
        setBody("");
      }
      await load();
    } catch (error) {
      setPostError({ scope, message: describeError(error, "site.discussion.postError") });
    } finally {
      setPosting(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("common.noUndo"))) return;
    setActionError(null);
    try {
      await api.delete(`/comments/${id}`);
      await load();
    } catch {
      setActionError(t("site.discussion.deleteError"));
    }
  };

  const sendReport = async () => {
    if (!reportReason.trim() || reportSending) return;
    setReportSending(true);
    setReportError(null);
    try {
      await api.post(`/${basePath}/report`, { reason: reportReason.trim() });
      setReportReason("");
      setShowReportForm(false);
      setReportSent(true);
    } catch (error) {
      setReportError(describeError(error, "site.discussion.reportError"));
    } finally {
      setReportSending(false);
    }
  };

  const inputClass =
    "min-w-0 flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm outline-none focus:border-[rgb(var(--primary))]";

  return (
    <section className="mt-8 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-[rgb(var(--primary))]" size={18} />
          <h2 className="font-black">{t("site.discussionTitle")}</h2>
        </div>
        {session.authenticated && (
          <button
            type="button"
            onClick={() => {
              setShowReportForm((v) => !v);
              setReportError(null);
            }}
            className="flex items-center gap-1 text-xs text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--error-text))]"
          >
            <AlertTriangle size={14} />
            {t("site.reportContentCta")}
          </button>
        )}
      </div>

      {showReportForm && (
        <form
          className="mt-3 space-y-2 rounded-lg border border-[rgb(var(--border))] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendReport();
          }}
        >
          <input
            value={reportReason}
            maxLength={REPORT_MAX}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={t("site.reportReasonPlaceholder")}
            className={`w-full ${inputClass}`}
          />
          {reportError && <InlineError message={reportError} />}
          <button
            type="submit"
            disabled={!reportReason.trim() || reportSending}
            className="rounded-full bg-[rgb(var(--error))] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {t("site.reportSubmitCta")}
          </button>
        </form>
      )}
      {reportSent && (
        <p role="status" className="mt-2 text-xs text-[rgb(var(--success-text))]">
          {t("site.reportSentConfirmation")}
        </p>
      )}

      {session.authenticated ? (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void post(body);
          }}
        >
          <div className="flex gap-2">
            <input
              value={body}
              maxLength={COMMENT_MAX}
              onChange={(e) => {
                setBody(e.target.value);
                if (postError?.scope === "root") setPostError(null);
              }}
              placeholder={t("site.discussionPlaceholder")}
              aria-invalid={postError?.scope === "root"}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!body.trim() || posting !== null}
              aria-label={t("site.discussionPlaceholder")}
              className="flex items-center justify-center rounded-full bg-[rgb(var(--primary))] px-3 py-2 text-black disabled:opacity-50"
            >
              {posting === "root" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {postError?.scope === "root" && <InlineError message={postError.message} />}
        </form>
      ) : (
        <p className="mt-4 text-sm text-[rgb(var(--secondary-text))]">
          <Link href="/login" className="font-semibold text-[rgb(var(--primary))] underline underline-offset-2">
            {t("site.discussion.loginToComment")}
          </Link>
        </p>
      )}

      {actionError && <InlineError message={actionError} className="mt-3" />}

      <div className="mt-5 space-y-4" aria-live="polite">
        {loadState === "loading" ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[rgb(var(--border)/0.4)]" />
            ))}
          </div>
        ) : loadState === "error" ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-[rgb(var(--error)/0.4)] bg-[rgb(var(--error)/0.08)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--error-text))]">
              <AlertTriangle size={16} />
              {t("site.discussion.loadError")}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadState("loading");
                void load();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-bold"
            >
              <RotateCcw size={13} />
              {t("site.discussion.retry")}
            </button>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-[rgb(var(--secondary-text))]">{t("site.discussionEmpty")}</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-t border-[rgb(var(--border))] pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold">{comment.user.username}</span>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
                </div>
                {comment.user.id === session.userId && (
                  <button
                    type="button"
                    onClick={() => void remove(comment.id)}
                    aria-label={t("common.delete")}
                    className="shrink-0 p-1 text-[rgb(var(--error-text))]"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {session.authenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(replyTo === comment.id ? null : comment.id);
                    if (postError?.scope === "reply") setPostError(null);
                  }}
                  className="mt-2 flex items-center gap-1 text-xs text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--primary))]"
                >
                  <Reply size={12} /> {t("site.discussionReplyCta")}
                </button>
              )}
              {replyTo === comment.id && (
                <form
                  className="mt-2 pl-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void post(replyBody, comment.id);
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      value={replyBody}
                      maxLength={COMMENT_MAX}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={t("site.discussionReplyPlaceholder")}
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!replyBody.trim() || posting !== null}
                      aria-label={t("site.discussionReplyCta")}
                      className="flex items-center justify-center rounded-full bg-[rgb(var(--primary))] px-3 py-1 text-black disabled:opacity-50"
                    >
                      {posting === "reply" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                  {postError?.scope === "reply" && <InlineError message={postError.message} />}
                </form>
              )}
              {comment.replies.length > 0 && (
                <div className="mt-3 space-y-2 border-l-2 border-[rgb(var(--border))] pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-bold">{reply.user.username}</span>
                        <p className="whitespace-pre-wrap break-words text-sm">{reply.body}</p>
                      </div>
                      {reply.user.id === session.userId && (
                        <button
                          type="button"
                          onClick={() => void remove(reply.id)}
                          aria-label={t("common.delete")}
                          className="shrink-0 p-1 text-[rgb(var(--error-text))]"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function InlineError({ message, className = "mt-2" }: { message: string; className?: string }) {
  return (
    <p role="alert" className={`${className} flex items-start gap-1.5 text-xs font-semibold text-[rgb(var(--error-text))]`}>
      <AlertTriangle size={13} className="mt-px shrink-0" />
      {message}
    </p>
  );
}
