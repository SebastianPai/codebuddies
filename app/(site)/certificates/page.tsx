"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { fetcher } from "../../../utils/fetcher";
import { useTranslation } from "../../../src/i18n/useTranslation";

interface Certificate {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  revoked?: boolean;
  academy?: { name: string } | null;
  course?: {
    translations?: Array<{
      title: string;
      language?: { code: string };
    }>;
  };
}

export default function MyCertificatesPage() {
  const t = useTranslation();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        const data = await fetcher("/certificates/me");
        setCertificates(data);
      } catch (err: any) {
        setError(err?.message || t("site.loadCertificatesError"));
      } finally {
        setLoading(false);
      }
    };

    loadCertificates();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[rgb(var(--primary))] font-mono">
        {t("site.loadingCertificates")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--text))] px-4 py-10">
      <main className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="font-mono text-sm uppercase text-[rgb(var(--primary))]">
            {t("site.academy")}
          </p>
          <h1 className="text-4xl md:text-6xl font-black uppercase">
            {t("site.myCertificatesTitle")}
          </h1>
        </header>

        {error && (
          <div className="border-2 border-red-500 bg-red-500/10 p-5 text-red-200">
            {error}
          </div>
        )}

        {!error && certificates.length === 0 && (
          <div className="border-4 border-dashed border-white/15 p-10 text-center">
            <Award className="mx-auto mb-4 text-[rgb(var(--primary))]" size={48} />
            <p className="text-xl font-bold">{t("site.noCertificates")}</p>
            <p className="mt-2 text-[rgb(var(--secondary-text))]">
              {t("site.completeCourseCertificateHint")}
            </p>
          </div>
        )}

        <section className="grid gap-5">
          {certificates.map((certificate) => (
            <article
              key={certificate.id}
              className="rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="flex items-center gap-3 text-2xl font-black uppercase">
                    {getCourseTitle(certificate, t("site.courseWithoutTitleFallback"))}
                    {certificate.revoked && (
                      <span className="rounded-full border-2 border-red-500 bg-red-500/10 px-2 py-0.5 text-xs font-black text-red-400">
                        {t("site.certificateRevokedBadge")}
                      </span>
                    )}
                  </h2>
                  <p className="mt-2 font-mono text-sm text-[rgb(var(--secondary-text))]">
                    {certificate.academy?.name ?? "CodeBuddies"} ·{" "}
                    {formatDate(certificate.issuedAt)}
                  </p>
                  <p className="mt-2 font-mono text-xs text-[rgb(var(--secondary-text))]">
                    {t("site.certificateNumberPrefix", { number: certificate.certificateNumber })}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <CertificateLink href={`/certificates/${certificate.id}`}>
                    {t("site.viewCertificateLink")} <ExternalLink size={16} />
                  </CertificateLink>
                  <CertificateLink href={`/certificates/${certificate.id}?print=1`}>
                    {t("site.downloadPdf")} <Download size={16} />
                  </CertificateLink>
                  <CertificateLink
                    href={`/certificates/${certificate.verificationCode}`}
                  >
                    {t("site.verifyLink")} <ShieldCheck size={16} />
                  </CertificateLink>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

function CertificateLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[rgb(var(--primary))] px-4 py-3 text-sm font-black uppercase text-[rgb(var(--primary))] transition hover:bg-[rgb(var(--primary))] hover:text-black"
    >
      {children}
    </Link>
  );
}

function getCourseTitle(certificate: Certificate, fallback: string) {
  const translations = certificate.course?.translations ?? [];
  return (
    translations.find((translation) => translation.language?.code === "es")
      ?.title ??
    translations[0]?.title ??
    fallback
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
