"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../../../utils/auth";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Terminal, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { getGameUrl } from "../../../../src/config/env";
import { useThemeAsset } from "../../../../hooks/useThemeAsset";
import { ThemeFramedPhoto } from "../../../../components/ThemeFramedPhoto";
import { trackEvent } from "../../../../components/analytics/events";
import {
  AuthField,
  PasswordField,
  SocialButtons,
} from "../../../../components/auth/AuthFields";
import {
  checkEmail,
  normalizeEmail,
} from "../../../../src/shared/utils/auth-validation";

export default function LoginPage() {
  const t = useTranslation();
  const authPhoto = useThemeAsset("AUTH_HERO_PHOTO");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailCheck = checkEmail(email);
  const emailError =
    (submitAttempted || touched.email) && !emailCheck.valid
      ? emailCheck.reason === "empty"
        ? t("auth.validation.emailRequired")
        : t("auth.validation.emailFormat")
      : null;
  const passwordError =
    (submitAttempted || touched.password) && !password
      ? t("auth.validation.passwordRequired")
      : null;
  const router = useRouter();

  const buildGameRedirect = (redirect: string, token: string) => {
    const url = new URL(redirect);
    url.hash = `codebuddies_token=${encodeURIComponent(token)}`;
    return url.toString();
  };

  const isGameRedirect = (redirect: string | null) => {
    if (!redirect) return false;

    try {
      // Compara por origen contra la URL pública real de apps/game
      // (NEXT_PUBLIC_GAME_URL) en vez de un host/puerto de localhost
      // hardcodeado, para que este flujo funcione tanto en desarrollo
      // (http://localhost:3002) como en producción
      // (https://game.codebuddies.tech).
      const redirectUrl = new URL(redirect);
      const gameUrl = new URL(getGameUrl());
      return redirectUrl.origin === gameUrl.origin;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    const token = localStorage.getItem("token")?.trim();
    const userId = localStorage.getItem("userId")?.trim();

    if (isGameRedirect(redirect) && token && userId) {
      window.location.href = buildGameRedirect(redirect!, token);
    }
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitAttempted(true);
    setError(null);
    // En login solo se valida el formato: los correos temporales de cuentas
    // ya existentes tienen que poder entrar igual.
    if ((!emailCheck.valid && emailCheck.reason !== "disposable") || !password) return;
    setSubmitting(true);
    try {
      const authResponse = await login(normalizeEmail(email), password);
      trackEvent("login", { method: "email" });
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      if (isGameRedirect(redirect)) {
        window.location.href = buildGameRedirect(
          redirect!,
          authResponse.access_token,
        );
        return;
      }
      router.push(redirect?.startsWith("/") ? redirect : "/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || t("auth.loginError"));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center p-4 md:p-10 font-sans selection:bg-[rgb(var(--primary))] selection:text-black">
      {/* TARJETA PRINCIPAL CON BORDE BRUTALISTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[rgb(var(--card))] border-4 border-[rgb(var(--border))] rounded-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl flex flex-col md:flex-row overflow-hidden min-h-[700px]"
      >
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="flex-1 p-6 sm:p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-black text-[rgb(var(--text))] tracking-tighter uppercase italic">
              {t("auth.loginTitle")} <br />
              <span className="text-[rgb(var(--primary))]">{t("auth.system")}</span>
            </h1>
            <p className="text-[rgb(var(--secondary-text))] mt-4 font-mono text-sm uppercase tracking-widest">
              {t("auth.loginInit")}
            </p>
          </div>

          <p className="text-xs text-[rgb(var(--secondary-text))] mt-6 leading-relaxed">
            {t("auth.termsIntro")}{" "}
            <Link href="/terms" className="text-[rgb(var(--primary))]">
              {t("auth.terms")}
            </Link>{" "}
            y la{" "}
            <Link href="/privacy" className="text-[rgb(var(--primary))]">
              {t("auth.privacy")}
            </Link>
            .
          </p>

          {/* TOGGLE TIPO PESTAÑA INDUSTRIAL */}
          <div className="flex mb-10 border-b-2 border-[rgb(var(--border))]">
            <span
              aria-current="page"
              className="bg-[rgb(var(--primary))] text-black px-6 sm:px-8 py-3 font-black uppercase text-sm border-t-2 border-l-2 border-r-2 border-[rgb(var(--border))] translate-y-[2px]"
            >
              {t("auth.login")}
            </span>
            <Link
              href="/register"
              className="px-6 sm:px-8 py-3 font-bold text-[rgb(var(--secondary-text))] uppercase text-sm hover:text-[rgb(var(--primary))] transition-colors"
            >
              {t("auth.signup")}
            </Link>
          </div>

          <form noValidate onSubmit={handleLogin} className="space-y-6">
            <AuthField
              label={t("auth.email")}
              icon={Mail}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setTouched((c) => ({ ...c, email: true }))}
              error={emailError}
              hint={
                emailCheck.suggestion ? (
                  <button
                    type="button"
                    onClick={() => setEmail(emailCheck.suggestion!)}
                    className="font-semibold text-[rgb(var(--warning-text))] underline underline-offset-2"
                  >
                    {t("auth.validation.emailSuggestion", { email: emailCheck.suggestion })}
                  </button>
                ) : null
              }
            />

            <PasswordField
              label={t("auth.secret")}
              name="password"
              autoComplete="current-password"
              maxLength={128}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setTouched((c) => ({ ...c, password: true }))}
              error={passwordError}
            />

            {error && (
              <div role="alert" className="bg-[rgb(var(--error))]/10 border-l-4 border-[rgb(var(--error))] p-3">
                <p className="text-[rgb(var(--error))] text-xs font-black uppercase italic">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[rgb(var(--button))] text-[rgb(var(--button-text))] p-5 font-black text-lg sm:text-xl uppercase tracking-tighter hover:brightness-110 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-60 disabled:cursor-wait mt-4 flex items-center justify-center gap-3"
            >
              {submitting ? (
                <>
                  <Loader2 size={22} className="animate-spin" /> {t("auth.submitting")}
                </>
              ) : (
                <>
                  {t("auth.executeLogin")} <ArrowRight size={24} />
                </>
              )}
            </button>
          </form>

          {/* SOCIAL LOGIN */}
          <div className="mt-12">
            <div className="relative flex items-center mb-8">
              <div className="flex-grow border-t border-[rgb(var(--border))]"></div>
              <span className="flex-shrink mx-4 text-[rgb(var(--secondary-text))] font-mono text-[10px] uppercase tracking-[0.3em]">
                {t("auth.externalProviders")}
              </span>
              <div className="flex-grow border-t border-[rgb(var(--border))]"></div>
            </div>
            <SocialButtons />
          </div>
        </div>

        {/* COLUMNA DERECHA: IMPACTO VISUAL INDUSTRIAL */}
        <div className="hidden md:flex flex-1 relative bg-[rgb(var(--primary))] p-12 overflow-hidden border-l-4 border-[rgb(var(--border))]">
          {/* Patrón de fondo tipo Grid de terminal */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          ></div>

          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div className="w-16 h-16 bg-black border-4 border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <Terminal size={32} className="text-[rgb(var(--primary))]" />
              </div>
              <div className="bg-black text-white px-3 py-1 font-mono text-[10px] uppercase font-bold border-2 border-white">
                v2.0.26-prod
              </div>
            </div>

            <div className="text-black">
              <h2 className="text-6xl font-black leading-none mb-6 tracking-tighter uppercase italic">
                {t("auth.heroWord1")} <br />
                <span className="bg-black text-[rgb(var(--primary))] px-2">
                  {t("auth.heroWord2")}
                </span>
                <br />
                {t("auth.heroWord3")} <br />
                {t("auth.heroWord4")}
              </h2>
              <div className="flex items-end gap-6">
                <div className="bg-black p-4 inline-block">
                  <p className="text-[rgb(var(--primary))] font-mono text-sm leading-snug max-w-xs uppercase">
                    &quot;{t("auth.decorativeQuote")}&quot;
                  </p>
                </div>

                {/* Foto administrable (admin/theme-assets, slot
                    AUTH_HERO_PHOTO) — sin ninguna activa no se renderiza
                    nada, así la columna queda igual que siempre. */}
                {authPhoto && (
                  <div className="shrink-0 w-24 bg-white p-1.5 pb-4 border-2 border-black shadow-[6px_6px_0_0_#000] -rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="aspect-square overflow-hidden border-2 border-black bg-zinc-200">
                      <ThemeFramedPhoto
                        asset={authPhoto}
                        alt={t.landing.hero.robotAlt}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-black/60 font-mono text-[10px] font-bold">
              <span>{t("auth.root")}</span>
              <div className="h-1 w-12 bg-black/20"></div>
              <span>{t("auth.onlineStatus")}</span>
            </div>
          </div>

          {/* Elemento decorativo brutalista: Círculos concéntricos de borde duro */}
          <div className="absolute -bottom-10 -right-10 pointer-events-none">
            <div className="w-64 h-64 border-[16px] border-black/10 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-[8px] border-black/5 rounded-full"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
