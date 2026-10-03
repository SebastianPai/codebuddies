"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Compass, Gamepad2, Gift, PlayCircle, Sparkles, Trophy } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { SpotlightTour, type TourStep } from "@/shared/ui/spotlight-tour";
import { useAuth } from "../../../hooks/useAuth";

// Onboarding guiado de la web: la primera vez que alguien entra al
// dashboard le mostramos, sobre los elementos reales, qué es cada cosa. Se
// puede repetir desde el menú de usuario ("Ver tutorial").

const SEEN_KEY = "cb-onboarding-web-v1";
export const START_WEB_ONBOARDING = "cb:onboarding:start";

function seen() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // sin storage no insistimos
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Sin storage: volverá a salir, no pasa nada.
  }
}

export function WebOnboarding() {
  const t = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);

  // Primera vez en el dashboard, con sesión.
  useEffect(() => {
    if (loading || !isAuthenticated || pathname !== "/dashboard" || seen()) return;
    const timer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [loading, isAuthenticated, pathname]);

  // Repetir desde el menú de usuario.
  useEffect(() => {
    const start = () => setOpen(true);
    window.addEventListener(START_WEB_ONBOARDING, start);
    return () => window.removeEventListener(START_WEB_ONBOARDING, start);
  }, []);

  const steps = useMemo<TourStep[]>(
    () => [
      { title: t("site.onboarding.welcome.title"), text: t("site.onboarding.welcome.text"), icon: <Sparkles size={20} /> },
      { target: '[data-tour="nav-links"]', title: t("site.onboarding.nav.title"), text: t("site.onboarding.nav.text"), icon: <Compass size={20} /> },
      { target: '[data-tour="nav-stats"]', title: t("site.onboarding.stats.title"), text: t("site.onboarding.stats.text"), icon: <Trophy size={20} /> },
      { target: '[data-tour="nav-play"]', title: t("site.onboarding.play.title"), text: t("site.onboarding.play.text"), icon: <Gamepad2 size={20} /> },
      { target: '[data-tour="rewards-launcher"]', title: t("site.onboarding.rewards.title"), text: t("site.onboarding.rewards.text"), icon: <Gift size={20} /> },
      { target: '[data-tour="continue-learning"]', title: t("site.onboarding.learn.title"), text: t("site.onboarding.learn.text"), icon: <BookOpen size={20} /> },
      { title: t("site.onboarding.end.title"), text: t("site.onboarding.end.text"), icon: <PlayCircle size={20} /> },
    ],
    [t],
  );

  if (!open) return null;

  return (
    <SpotlightTour
      steps={steps}
      labels={{
        next: t("site.onboarding.next"),
        back: t("site.onboarding.back"),
        skip: t("site.onboarding.skip"),
        done: t("site.onboarding.done"),
        progress: (step, total) => t("site.onboarding.progress", { step, total }),
      }}
      onClose={() => {
        markSeen();
        setOpen(false);
      }}
      finalAction={{ label: t("site.onboarding.end.cta"), onClick: () => router.push("/courses") }}
    />
  );
}
