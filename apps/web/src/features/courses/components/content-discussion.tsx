"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, MessageSquare, Reply, Send, Trash2 } from "lucide-react";
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

export function ContentDiscussion({ target }: Props) {
  const t = useTranslation();
  const basePath = "lessonId" in target ? `lessons/${target.lessonId}` : `exercises/${target.exerciseId}`;
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const isAuthenticated = typeof window !== "undefined" && Boolean(localStorage.getItem("token"));
  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const load = async () => {
    try {
      const data = await api.get<Comment[]>(`/${basePath}/comments`);
      setComments(data);
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath]);

  const post = async (text: string, parentId?: string) => {
    if (!text.trim()) return;
    await api.post(`/${basePath}/comments`, { body: text, parentId });
    setBody("");
    setReplyBody("");
    setReplyTo(null);
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("common.noUndo"))) return;
    await api.delete(`/comments/${id}`);
    await load();
  };

  const sendReport = async () => {
    if (!reportReason.trim()) return;
    await api.post(`/${basePath}/report`, { reason: reportReason });
    setReportReason("");
    setShowReportForm(false);
    setReportSent(true);
  };

  return (
    <section className="mt-8 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-[rgb(var(--primary))]" size={18} />
          <h2 className="font-black">{t("site.discussionTitle")}</h2>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setShowReportForm((v) => !v)}
            className="flex items-center gap-1 text-xs text-[rgb(var(--secondary-text))] hover:text-red-400"
          >
            <AlertTriangle size={14} />
            {t("site.reportContentCta")}
          </button>
        )}
      </div>

      {showReportForm && (
        <div className="mt-3 space-y-2 rounded-lg border border-[rgb(var(--border))] p-3">
          <input
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={t("site.reportReasonPlaceholder")}
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void sendReport()}
            disabled={!reportReason.trim()}
            className="rounded-full bg-red-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {t("site.reportSubmitCta")}
          </button>
        </div>
      )}
      {reportSent && <p className="mt-2 text-xs text-green-400">{t("site.reportSentConfirmation")}</p>}

      {isAuthenticated && (
        <div className="mt-4 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("site.discussionPlaceholder")}
            className="flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void post(body)}
            disabled={!body.trim()}
            className="rounded-full bg-[rgb(var(--primary))] px-3 py-2 text-black disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {comments === null ? (
          <p className="text-sm text-[rgb(var(--secondary-text))]">{t("common.loading")}</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-[rgb(var(--secondary-text))]">{t("site.discussionEmpty")}</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-t border-[rgb(var(--border))] pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold">{comment.user.username}</span>
                  <p className="mt-1 text-sm">{comment.body}</p>
                </div>
                {comment.user.id === currentUserId && (
                  <button type="button" onClick={() => void remove(comment.id)} className="text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="mt-2 flex items-center gap-1 text-xs text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--primary))]"
                >
                  <Reply size={12} /> {t("site.discussionReplyCta")}
                </button>
              )}
              {replyTo === comment.id && (
                <div className="mt-2 flex gap-2 pl-4">
                  <input
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={t("site.discussionReplyPlaceholder")}
                    className="flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void post(replyBody, comment.id)}
                    disabled={!replyBody.trim()}
                    className="rounded-full bg-[rgb(var(--primary))] px-3 py-1 text-black disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                </div>
              )}
              {comment.replies.length > 0 && (
                <div className="mt-3 space-y-2 border-l-2 border-[rgb(var(--border))] pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold">{reply.user.username}</span>
                        <p className="text-sm">{reply.body}</p>
                      </div>
                      {reply.user.id === currentUserId && (
                        <button type="button" onClick={() => void remove(reply.id)} className="text-red-400">
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
