"use client";

import Link from "next/link";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { buddySvg } from "@codebuddies/world-objects";
import { useTranslation } from "@/i18n/useTranslation";

// Para quien prueba la primera lección sin cuenta: lo hizo bien, pero sin
// cuenta no se guarda ni se gana nada. Las recompensas solo las da el
// servidor a un usuario con sesión (una vez por ejercicio), así que no hay
// nada que reclamar después ni que se pueda duplicar: al entrar, vuelve a
// tocar Comprobar y ahí se acredita. El código queda guardado en el navegador.
//
// Con `next`, puede seguir sin cuenta al siguiente ejercicio de la lección (la
// primera lección se hace entera sin sesión); la cuenta se pide al pasar a la
// lección siguiente, que ya está cerrada para visitantes.
export function SignupToSave({
  variant = "save",
  next,
  compact = false,
}: {
  variant?: "save" | "continue";
  next?: { href: string; kind: "exercise" | "lesson" } | null;
  // Celular, debajo del resultado: título + botones, sin tapar la vista previa.
  compact?: boolean;
}) {
  const t = useTranslation();
  const here = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/courses";
  const canGoOn = variant === "save" && next;
  if (compact) {
    const btn = "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-black";
    return (
      <div className="rounded-2xl border-2 border-emerald-400/60 bg-emerald-400/10 p-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0" dangerouslySetInnerHTML={{ __html: buddySvg("feliz", 36) }} />
          <p className="text-sm font-black leading-tight text-[rgb(var(--text))]">
            {canGoOn ? t("site.guestDoneTitle") : t("site.guestSaveTitle")}
          </p>
        </div>
        <div className="mt-2.5 flex gap-2">
          <Link href={`/register?redirect=${encodeURIComponent(here)}`} className={`${btn} bg-emerald-700 text-white`}>
            <UserPlus size={15} /> {t("site.guestRegister")}
          </Link>
          {canGoOn && (
            <Link href={next.href} className={`${btn} border border-[rgb(var(--border))] text-[rgb(var(--text))]`}>
              {next.kind === "exercise" ? t("site.guestNextExercise") : t("site.guestNextLesson")} <ArrowRight size={15} />
            </Link>
          )}
        </div>
        <Link href={`/login?redirect=${encodeURIComponent(here)}`} className="mt-2 block text-center text-xs font-bold text-[rgb(var(--secondary-text))] underline">
          {t("site.guestLogin")}
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-emerald-400/60 bg-emerald-400/10 p-5">
      <div className="flex items-center gap-4">
        <div className="shrink-0" dangerouslySetInnerHTML={{ __html: buddySvg("feliz", 64) }} />
        <div>
          <p className="text-lg font-black text-[rgb(var(--text))]">
            {variant === "continue" ? t("site.guestContinueTitle") : canGoOn ? t("site.guestDoneTitle") : t("site.guestSaveTitle")}
          </p>
          <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">
            {variant === "continue" ? t("site.guestContinueBody") : canGoOn ? t("site.guestDoneBody") : t("site.guestSaveBody")}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {canGoOn && (
          <Link
            href={next.href}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-600"
          >
            {next.kind === "exercise" ? t("site.guestNextExercise") : t("site.guestNextLesson")} <ArrowRight size={16} />
          </Link>
        )}
        <Link
          href={`/register?redirect=${encodeURIComponent(here)}`}
          className={
            canGoOn
              ? "inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-5 py-3 text-sm font-bold text-[rgb(var(--text))] hover:bg-[rgb(var(--border)/0.4)]"
              : "inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-600"
          }
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
