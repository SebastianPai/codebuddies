"use client";

import { use, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../../../../utils/api";
import { useTranslation } from "../../../../src/i18n/useTranslation";

type Verification = {
  certificateNumber: string;
  name: string;
  course: string;
  academy: string;
  issuedAt: string;
  valid: boolean;
};

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ verificationCode: string }>;
}) {
  const { verificationCode } = use(params);
  const [verification, setVerification] = useState<Verification | null>(null);
  const t = useTranslation();

  useEffect(() => {
    api
      .get<Verification>(`/certificates/verify/${verificationCode}`)
      .then(setVerification)
      .catch(() => setVerification(null));
  }, [verificationCode]);

  return (
    <div className="mx-auto max-w-3xl py-16">
      <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8">
        <ShieldCheck className="mb-4 text-[rgb(var(--primary))]" size={42} />
        <h1 className="text-4xl font-black">{t("site.certificateVerification")}</h1>
        {!verification ? (
          <p className="mt-6 text-[rgb(var(--secondary-text))]">
            {t("site.certificateNotFoundOrInvalid")}
          </p>
        ) : (
          <dl className="mt-8 grid gap-4">
            <Row label={t("site.studentName")} value={verification.name} />
            <Row label={t("site.courseName")} value={verification.course} />
            <Row label={t("site.certificateNumber")} value={verification.certificateNumber} />
            <Row label={t("site.academy")} value={verification.academy} />
            <Row label={t("site.issueDate")} value={new Date(verification.issuedAt).toLocaleDateString()} />
            <Row label={t("site.verificationStatus")} value={verification.valid ? t("common.valid") : t("common.invalid")} />
          </dl>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[rgb(var(--border))] pb-3">
      <dt className="text-sm text-[rgb(var(--secondary-text))]">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
