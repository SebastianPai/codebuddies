"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../../../utils/auth";
import { motion } from "framer-motion";
import { User, Mail, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { useThemeAsset } from "../../../../hooks/useThemeAsset";
import { ThemeFramedPhoto } from "../../../../components/ThemeFramedPhoto";
import { trackEvent } from "../../../../components/analytics/events";
import {
  AuthField,
  PasswordField,
  PasswordStrength,
  SocialButtons,
} from "../../../../components/auth/AuthFields";
import {
  checkEmail,
  isCommonOrPersonalPassword,
  isPasswordValid,
  normalizeEmail,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_REGEX,
} from "../../../../src/shared/utils/auth-validation";

export default function RegisterPage() {
  const t = useTranslation();
  const authPhoto = useThemeAsset("AUTH_HERO_PHOTO");
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Validación en vivo: cada campo muestra su error recién cuando el
  // usuario sale de él (o al intentar enviar), no mientras escribe.
  const show = (field: string) => submitAttempted || touched[field];
  const usernameValid = USERNAME_REGEX.test(formData.username.trim());
  const emailCheck = checkEmail(formData.email);
  const passwordContext = { username: formData.username, email: formData.email };
  const passwordOk = isPasswordValid(formData.password, passwordContext);
  const passwordIsCommon =
    formData.password.length >= PASSWORD_MIN &&
    isCommonOrPersonalPassword(formData.password, passwordContext);
  const confirmOk =
    formData.confirmPassword.length > 0 &&
    formData.confirmPassword === formData.password;

  const usernameError =
    show("username") && !usernameValid ? t("auth.validation.usernameRule") : null;
  const emailError =
    show("email") && !emailCheck.valid
      ? emailCheck.reason === "empty"
        ? t("auth.validation.emailRequired")
        : emailCheck.reason === "disposable"
          ? t("auth.validation.emailDisposable")
          : t("auth.validation.emailFormat")
      : null;
  const passwordError =
    submitAttempted && !passwordOk ? t("auth.validation.passwordWeakSubmit") : null;
  const confirmError =
    show("confirmPassword") && !confirmOk ? t("auth.validation.passwordMismatch") : null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) {
        setFormData((current) => ({ ...current, referralCode: ref }));
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched((current) => ({ ...current, [e.target.name]: true }));
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitAttempted(true);
    setError(null);
    if (!usernameValid || !emailCheck.valid || !passwordOk || !confirmOk) {
      setError(t("auth.validation.fixErrors"));
      return;
    }
    setSubmitting(true);
    try {
      await register(
        formData.username.trim(),
        normalizeEmail(formData.email),
        formData.password,
        formData.referralCode.trim() || undefined,
      );
      trackEvent("sign_up", {
        method: "email",
        referred: Boolean(formData.referralCode.trim()),
      });
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || t("auth.registerError"));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center p-4 md:p-10 font-sans selection:bg-[rgb(var(--primary))] selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[rgb(var(--card))] border-4 border-[rgb(var(--border))] rounded-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl flex flex-col md:flex-row overflow-hidden min-h-[700px]"
      >
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="flex-1 p-6 sm:p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-black text-[rgb(var(--text))] tracking-tighter uppercase italic">
              {t("auth.registerTitle")} <br />
              <span className="text-[rgb(var(--primary))]">{t("auth.signup")}</span>
            </h1>
            <p className="text-[rgb(var(--secondary-text))] mt-4 font-mono text-sm uppercase tracking-widest">
              {t("auth.registerInit")}
            </p>
          </div>

          <p className="text-xs text-[rgb(var(--secondary-text))] mt-6 leading-relaxed">
            {t("auth.registerIntro")}{" "}
            <Link href="/terms" className="text-[rgb(var(--primary))]">
              {t("auth.terms")}
            </Link>
            , la{" "}
            <Link href="/privacy" className="text-[rgb(var(--primary))]">
              {t("auth.privacy")}
            </Link>{" "}
            y la{" "}
            <Link href="/refund-policy" className="text-[rgb(var(--primary))]">
              {t("auth.refunds")}
            </Link>
            .
          </p>

          {/* TOGGLE PESTAÑA */}
          <div className="flex mb-10 border-b-2 border-[rgb(var(--border))]">
            <Link
              href="/login"
              className="px-6 sm:px-8 py-3 font-bold text-[rgb(var(--secondary-text))] uppercase text-sm hover:text-[rgb(var(--primary))] transition-colors"
            >
              {t("auth.login")}
            </Link>
            <span
              aria-current="page"
              className="bg-[rgb(var(--primary))] text-black px-6 sm:px-8 py-3 font-black uppercase text-sm border-t-2 border-l-2 border-r-2 border-[rgb(var(--border))] translate-y-[2px]"
            >
              {t("auth.signup")}
            </span>
          </div>

          <form noValidate onSubmit={handleRegister} className="space-y-5">
            <AuthField
              label={t("auth.username")}
              icon={User}
              name="username"
              autoComplete="username"
              maxLength={20}
              placeholder={t("auth.usernamePlaceholder")}
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              error={usernameError}
            />
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
              placeholder={t("auth.networkEmailPlaceholder")}
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={emailError}
              hint={
                emailCheck.suggestion ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        email: emailCheck.suggestion!,
                      }))
                    }
                    className="font-semibold text-[rgb(var(--warning-text))] underline underline-offset-2"
                  >
                    {t("auth.validation.emailSuggestion", {
                      email: emailCheck.suggestion,
                    })}
                  </button>
                ) : null
              }
            />
            <div>
              <PasswordField
                label={t("auth.access")}
                name="password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
                placeholder={t("auth.passwordPlaceholder")}
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={passwordError}
              />
              {(formData.password || submitAttempted) && (
                <PasswordStrength
                  password={formData.password}
                  context={passwordContext}
                  showCommonWarning={passwordIsCommon}
                />
              )}
            </div>
            <PasswordField
              label={t("auth.confirmPassword")}
              name="confirmPassword"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              placeholder={t("auth.passwordPlaceholder")}
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={confirmError}
            />

            <AuthField
              label={t("auth.referral")}
              icon={ShieldCheck}
              name="referralCode"
              maxLength={64}
              autoCapitalize="none"
              placeholder={t("auth.optional")}
              value={formData.referralCode}
              onChange={handleChange}
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
                  {t("auth.createAccount")} <ArrowRight size={24} />
                </>
              )}
            </button>
          </form>

          {/* SOCIAL REGISTER */}
          <div className="mt-10">
            <SocialButtons />
          </div>
        </div>

        {/* COLUMNA DERECHA: IMPACTO VISUAL (IGUAL AL LOGIN) */}
        <div className="hidden md:flex flex-1 relative bg-[rgb(var(--primary))] p-12 overflow-hidden border-l-4 border-[rgb(var(--border))]">
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
                <ShieldCheck size={32} className="text-[rgb(var(--primary))]" />
              </div>
              <div className="bg-black text-white px-3 py-1 font-mono text-[10px] uppercase font-bold border-2 border-white">
                AUTH_MODULE_V2
              </div>
            </div>

            <div className="text-black">
              <h2 className="text-6xl font-black leading-none mb-6 tracking-tighter uppercase italic">
                {t("auth.registerHeroWord1")} <br />
                <span className="bg-black text-[rgb(var(--primary))] px-2 text-5xl">
                  {t("auth.registerHeroWord2")}
                </span>
                <br />
                {t("auth.registerHeroWord3")} <br />
                {t("auth.registerHeroWord4")}
              </h2>
              <div className="flex items-end gap-6">
                <div className="bg-black p-4 inline-block">
                  <p className="text-[rgb(var(--primary))] font-mono text-sm leading-snug max-w-xs uppercase">
                    &quot;{t("auth.registerDecorativeQuote")}&quot;
                  </p>
                </div>

                {/* Foto administrable (admin/theme-assets, slot
                    AUTH_HERO_PHOTO) — mismo slot que login, sin ninguna
                    activa no se renderiza nada. */}
                {authPhoto && (
                  <div className="shrink-0 w-24 bg-white p-1.5 pb-4 border-2 border-black shadow-[6px_6px_0_0_#000] -rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="aspect-square overflow-hidden border-2 border-black bg-zinc-200">
                      <ThemeFramedPhoto
                        asset={authPhoto}
                        alt={t("auth.registerHeroWord1")}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-black/60 font-mono text-[10px] font-bold">
              <span>{t("auth.userIdLabel")} {t("auth.pending")}</span>
              <div className="h-1 w-12 bg-black/20"></div>
              <span>{t("auth.waiting")}</span>
            </div>
          </div>

          {/* Decoración circular brutalista */}
          <div className="absolute -bottom-10 -right-10 pointer-events-none">
            <div className="w-80 h-80 border-[20px] border-black/10 rounded-full"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
