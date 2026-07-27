"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Award, Download, ShieldCheck } from "lucide-react";
import { fetcher } from "../../../../utils/fetcher";
import { useTranslation } from "../../../../src/i18n/useTranslation";

interface PublicCertificate {
  certificateId: string;
  certificateNumber: string;
  verificationCode: string;
  name: string;
  course: string;
  academy: string;
  issuedAt: string;
  valid: boolean;
}

export default function PublicCertificatePage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [certificate, setCertificate] = useState<PublicCertificate | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslation();

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        const data = await fetcher(`/certificates/verify/${certificateId}`);
        setCertificate(data);

        const params = new URLSearchParams(window.location.search);
        if (params.get("print") === "1") {
          setTimeout(() => window.print(), 400);
        }
      } catch (err: any) {
        setError(err?.message || t("site.certificateNotFoundError"));
      } finally {
        setLoading(false);
      }
    };

    if (certificateId) loadCertificate();
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-[rgb(var(--primary))]">
        {t("site.verifyingCertificate")}
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))] px-4 text-center">
        <div className="max-w-lg border-4 border-red-500 bg-red-500/10 p-8">
          <h1 className="text-3xl font-black uppercase text-red-200">
            {t("site.invalidCertificateTitle")}
          </h1>
          <p className="mt-3 text-red-100">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] px-4 py-8 text-black print:bg-white print:p-0">
      <main className="mx-auto max-w-5xl border-8 border-black bg-white p-8 shadow-2xl print:border-4 print:shadow-none">
        <div className="border-2 border-black p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.35em]">
                {t("site.certificateBrandLabel")}
              </p>
              <h1 className="mt-4 text-4xl md:text-6xl font-black uppercase">
                {t("site.certificateHeading")}
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 self-start border-2 border-green-700 bg-green-50 px-4 py-2 font-black uppercase text-green-700">
              <ShieldCheck size={18} /> {certificate.valid ? t("common.valid") : t("common.invalid")}
            </div>
          </div>

          <section className="my-12 text-center">
            <Award className="mx-auto mb-6" size={72} />
            <p className="font-mono uppercase tracking-widest text-gray-600">
              {t("site.grantedTo")}
            </p>
            <h2 className="mt-4 text-4xl md:text-7xl font-black">
              {certificate.name}
            </h2>
            <p className="mt-8 font-mono uppercase tracking-widest text-gray-600">
              {t("site.forCompleting")}
            </p>
            <h3 className="mt-4 text-3xl md:text-5xl font-black">
              {certificate.course}
            </h3>
          </section>

          <dl className="grid gap-4 border-t-2 border-b-2 border-black py-6 md:grid-cols-2">
            <CertificateField label={t("site.academy")} value={certificate.academy} />
            <CertificateField
              label={t("site.issueDate")}
              value={formatDate(certificate.issuedAt)}
            />
            <CertificateField
              label={t("site.certificateNumber")}
              value={certificate.certificateNumber}
            />
            <CertificateField label={t("site.certificateCode")} value={certificate.verificationCode} />
          </dl>

          <div className="mt-8 flex flex-col gap-3 print:hidden sm:flex-row sm:justify-center">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 bg-black px-6 py-3 font-black uppercase text-white"
            >
              {t("site.downloadPdf")} <Download size={16} />
            </button>
            <Link
              href="/certificates"
              className="inline-flex items-center justify-center gap-2 border-2 border-black px-6 py-3 font-black uppercase"
            >
              {t("site.myCertificates")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function CertificateField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-widest text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 break-words font-bold">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
