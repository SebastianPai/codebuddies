"use client";

import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { buddySvg } from "@codebuddies/world-objects";
import { useTranslation } from "@/i18n/useTranslation";

// Para quien prueba la primera lección sin cuenta: lo hizo bien, pero sin
// cuenta no se guarda ni se gana nada. Las recompensas solo las da el
// servidor a un usuario con sesión (una vez por ejercicio), así que no hay
// nada que reclamar después ni que se pueda duplicar: al entrar, vuelve a
// tocar Comprobar y ahí se acredita. El código queda guardado en el navegador.
export function SignupToSave({ variant = "save" }: { variant?: "save" | "continue" }) {
  const t = useTranslation();
  const here = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/courses";
  return (
    <div className="rounded-2xl border-2 border-emerald-400/60 bg-emerald-400/10 p-5">
      <div className="flex items-center gap-4">
        <div className="shrink-0" dangerouslySetInnerHTML={{ __html: buddySvg("feliz", 64) }} />
        <div>
          <p className="text-lg font-black text-[rgb(var(--text))]">
            {variant === "continue" ? t("site.guestContinueTitle") : t("site.guestSaveTitle")}
          </p>
          <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">
            {variant === "continue" ? t("site.guestContinueBody") : t("site.guestSaveBody")}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-600"
        >
          <UserPlus size={16} /> {t("site.guestRegister")}
        </Link>
        <Link
          href={`/login?redirect=${encodeURIComponent(here)}`}
          className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-5 py-3 text-sm font-bold text-[rgb(var(--text))] hover:bg-[rgb(var(--border)/0.4)]"
        >
          <LogIn size={16} /> {t("site.guestLogin")}
        </Link>
      </div>
    </div>
  );
}
