"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";
import { api } from "../../../../utils/api";
import { useTranslation } from "../../../i18n/useTranslation";

interface ProgramStatus {
  enabled: boolean;
  appliesToCourse: boolean;
}

// NF43: el programa de referidos es una config global única (ver
// referrals.service.ts#getProgramStatus) — esto solo decide si vale la pena
// mostrar el banner en ESTE curso puntual, no implica que cada curso tenga
// su propio programa independiente.
export function ReferralCourseBanner({ courseId }: { courseId: string }) {
  const t = useTranslation();
  const [status, setStatus] = useState<ProgramStatus | null>(null);

  useEffect(() => {
    api
      .get<ProgramStatus>(`/referrals/program-status?courseId=${courseId}`)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [courseId]);

  if (!status?.appliesToCourse) return null;

  return (
    <Link
      href="/referrals"
      className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border-2 border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)] p-4 transition hover:bg-[rgb(var(--primary)/0.18)]"
    >
      <Gift size={18} className="text-[rgb(var(--primary))]" />
      <span className="text-sm font-bold text-[rgb(var(--primary-text))]">
        {t("site.referralCourseBanner")}
      </span>
    </Link>
  );
}
