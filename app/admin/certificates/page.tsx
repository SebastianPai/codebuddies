"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Pagination } from "../../../src/shared/ui";

interface AdminCertificate {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  revoked: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  user: { username: string; email: string };
  academy: string;
  course: string;
}

interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function AdminCertificatesPage() {
  const t = useTranslation();
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<PaginatedResponse<AdminCertificate>>(
        `/admin/certificates?page=${page}&limit=20`,
      );
      setCertificates(data.items);
      setTotalPages(data.meta.totalPages);
    } catch {
      toast.error(t("admin.certificatesLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const revoke = async (id: string) => {
    const reason = window.prompt(t("admin.certificateRevokeReasonPrompt")) ?? undefined;
    setRevokingId(id);
    try {
      await api.patch(`/admin/certificates/${id}/revoke`, { reason });
      toast.success(t("admin.certificateRevoked"));
      await load();
    } catch {
      toast.error(t("admin.certificateActionError"));
    } finally {
      setRevokingId(null);
    }
  };

  const restore = async (id: string) => {
    setRevokingId(id);
    try {
      await api.patch(`/admin/certificates/${id}/restore`, {});
      toast.success(t("admin.certificateRestored"));
      await load();
    } catch {
      toast.error(t("admin.certificateActionError"));
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-black text-yellow-400">{t("site.certificates")}</h1>
      <p className="mt-3 text-zinc-400">{t("admin.certificatesPageDescription")}</p>

      {loading ? (
        <div className="mt-8 text-zinc-500">{t("common.loading")}</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
          {certificates.map((certificate) => (
            <div
              key={certificate.id}
              className="grid gap-3 border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0 lg:grid-cols-[1fr_1fr_140px_140px] lg:items-center"
            >
              <div>
                <p className="font-black">{certificate.course}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {certificate.user.username} — {certificate.user.email}
                </p>
              </div>
              <div className="text-sm text-zinc-400">
                <p>{certificate.certificateNumber}</p>
                <p className="text-xs text-zinc-600">{new Date(certificate.issuedAt).toLocaleDateString()}</p>
              </div>
              <div>
                {certificate.revoked ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-800 bg-red-950/40 px-2 py-1 text-xs font-bold text-red-300">
                    <ShieldAlert size={12} />
                    {t("admin.statusRevoked")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-800 bg-green-950/40 px-2 py-1 text-xs font-bold text-green-300">
                    <ShieldCheck size={12} />
                    {t("admin.statusActive")}
                  </span>
                )}
              </div>
              <div className="flex justify-end">
                {certificate.revoked ? (
                  <button
                    type="button"
                    disabled={revokingId === certificate.id}
                    onClick={() => void restore(certificate.id)}
                    className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 disabled:opacity-50"
                  >
                    {t("admin.restoreCertificate")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={revokingId === certificate.id}
                    onClick={() => void revoke(certificate.id)}
                    className="rounded-md border border-red-900 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50"
                  >
                    {t("admin.revokeCertificate")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
