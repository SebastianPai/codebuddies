"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { api } from "@/shared/api";
import { Skeleton } from "@/shared/ui";

interface CourseReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; username: string };
}

interface ReviewsResponse {
  items: CourseReview[];
  summary: { average: number; count: number };
}

function StarRating({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={onChange ? 24 : 16}
            className={star <= value ? "fill-[rgb(var(--primary))] text-[rgb(var(--primary))]" : "text-[rgb(var(--secondary-text))]"}
          />
        </button>
      ))}
    </div>
  );
}

export function CourseReviews({ courseId }: { courseId: string }) {
  const t = useTranslation();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isAuthenticated = typeof window !== "undefined" && Boolean(localStorage.getItem("token"));

  const load = async () => {
    try {
      const response = await api.get<ReviewsResponse>(`/courses/${courseId}/reviews`);
      setData(response);
    } catch {
      setData({ items: [], summary: { average: 0, count: 0 } });
    }
  };

  useEffect(() => {
    void load();
    if (!isAuthenticated) return;
    api
      .get<CourseReview | null>(`/courses/${courseId}/reviews/me`)
      .then((mine) => {
        if (mine) {
          setMyRating(mine.rating);
          setMyComment(mine.comment ?? "");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const submit = async () => {
    if (myRating === 0) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.put(`/courses/${courseId}/reviews/me`, { rating: myRating, comment: myComment || undefined });
      await load();
    } catch (error: any) {
      setFormError(error?.status === 403 ? t("site.reviewRequiresEnrollment") : t("common.unexpectedError"));
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return <Skeleton className="h-40 rounded-lg" />;
  }

  return (
    <section className="mt-10 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">{t("site.courseReviewsTitle")}</h2>
        {data.summary.count > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(data.summary.average)} />
            <span className="text-sm text-[rgb(var(--secondary-text))]">
              {data.summary.average.toFixed(1)} ({data.summary.count})
            </span>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div className="mt-5 rounded-xl border border-[rgb(var(--border))] p-4">
          <p className="mb-2 text-sm font-bold">{t("site.leaveReviewLabel")}</p>
          <StarRating value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            rows={2}
            placeholder={t("common.descriptionPlaceholder")}
            className="mt-3 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-2 text-sm"
          />
          {formError && <p className="mt-2 text-sm text-red-400">{formError}</p>}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || myRating === 0}
            className="mt-3 rounded-full bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
          >
            {t("common.save")}
          </button>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {data.items.length === 0 ? (
          <p className="text-sm text-[rgb(var(--secondary-text))]">{t("site.noReviewsYet")}</p>
        ) : (
          data.items.map((review) => (
            <div key={review.id} className="border-t border-[rgb(var(--border))] pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between">
                <span className="font-bold">{review.user.username}</span>
                <StarRating value={review.rating} />
              </div>
              {review.comment && <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">{review.comment}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
