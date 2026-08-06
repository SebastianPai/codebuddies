"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Award, Loader2 } from "lucide-react";
import { useTranslation } from "../../../../../src/i18n/useTranslation";
import { api } from "../../../../../utils/api";
import { useAuth } from "../../../../../hooks/useAuth";

interface CourseSummary {
  id: string;
  title: string | null;
}

interface PurchaseCertificateResponse {
  alreadyPurchased: boolean;
  order: { id: string; amount: string; currency: string };
  checkout?: { checkoutUrl: string };
}

export default function CertificatePurchasePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const t = useTranslation();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);

  useEffect(() => {
    api
      .get<CourseSummary>(`/courses/${courseId}?lang=es`)
      .then(setCourse)
      .catch(() => {
        /* el curso puede no cargar sin romper la compra */
      });
  }, [courseId]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/certificates/buy/${courseId}`);
      return;
    }

    setCheckingOut(true);
    setError(null);
    try {
      const res = await api.post<PurchaseCertificateResponse>(
        "/payments/certificate-orders",
        { courseId },
      );

      if (res.alreadyPurchased) {
        setAlreadyPurchased(true);
        setCheckingOut(false);
        return;
      }

      const checkoutUrl = res.checkout?.checkoutUrl;
      if (!checkoutUrl) throw new Error("missing checkoutUrl");
      window.location.href = checkoutUrl;
    } catch {
      setError(t("site.buyCertificateError"));
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))] px-4 text-[rgb(var(--text))]">
      <main className="max-w-xl rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center">
        <Award className="mx-auto text-[rgb(var(--primary))]" size={40} />
        <h1 className="mt-4 text-3xl font-black uppercase text-[rgb(var(--primary))]">
          {t("site.buyCertificateTitle")}
        </h1>
        <p className="mt-4 text-[rgb(var(--secondary-text))]">
          {t("site.buyCertificateDescription")}
        </p>
        {course?.title && (
          <p className="mt-4 font-bold text-[rgb(var(--text))]">{course.title}</p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {alreadyPurchased ? (
          <div className="mt-8 rounded-lg border border-[rgb(var(--primary))]/40 bg-[rgb(var(--primary))]/10 p-4">
            <p className="font-bold text-[rgb(var(--primary))]">
              {t("site.certificateAlreadyPurchased")}
            </p>
            <Link
              href={`/courses/${courseId}`}
              className="mt-3 inline-flex rounded-lg bg-[rgb(var(--primary))] px-5 py-2 font-black uppercase text-black"
            >
              {t("site.backToCourse")}
            </Link>
          </div>
        ) : (
          <button
            onClick={handlePurchase}
            disabled={checkingOut}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[rgb(var(--primary))] px-6 py-3 font-black uppercase text-black disabled:opacity-60"
          >
            {checkingOut && <Loader2 className="animate-spin" size={18} />}
            {t("site.buyCertificateCta")}
          </button>
        )}

        <Link
          href={`/courses/${courseId}`}
          className="mt-4 inline-flex text-sm text-[rgb(var(--secondary-text))] underline"
        >
          {t("site.backToCourse")}
        </Link>
      </main>
    </div>
  );
}
