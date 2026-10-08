"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../utils/api";
import { useTranslation } from "../../src/i18n/useTranslation";

// Cuentas que aceptaron una versión anterior de Términos/Privacidad (o que
// se crearon antes de que se guardara la aceptación): aviso discreto con
// enlace a los cambios. "Entendido" deja registrada la aceptación con fecha
// (prueba de la autorización, Decreto 1377/2013 art. 7).
export default function LegalUpdateNotice() {
  const t = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);

  const outdated =
    isAuthenticated &&
    Boolean(user?.legalCurrentVersion) &&
    user?.legalVersion !== user?.legalCurrentVersion;

  const accept = async () => {
    setSaving(true);
    try {
      await api.post("/identity/legal/accept");
    } catch {
      /* si falla, se vuelve a mostrar en la próxima visita */
    }
    setHidden(true);
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {outdated && !hidden && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed inset-x-3 top-24 z-[90] mx-auto max-w-2xl rounded-2xl border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--card))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:top-28"
        >
          <div className="flex items-start gap-3">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))] sm:flex">
              <ScrollText size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[rgb(var(--text))]">{t("site.legalUpdate.title")}</p>
              <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--secondary-text))]">
                {t("site.legalUpdate.body")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <Link
                  href="/terms"
                  className="rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-center text-xs font-bold text-[rgb(var(--text))] transition hover:border-[rgb(var(--primary)/0.6)]"
                >
                  {t("site.legalUpdate.read")}
                </Link>
                <button
                  type="button"
                  onClick={() => void accept()}
                  disabled={saving}
                  className="rounded-xl bg-[rgb(var(--button))] px-3 py-2 text-xs font-black text-[rgb(var(--button-text))] transition hover:brightness-110 disabled:opacity-60"
                >
                  {t("site.legalUpdate.accept")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
