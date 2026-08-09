"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../../../utils/auth";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Github,
  Chrome,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { getGameUrl } from "../../../../src/config/env";

export default function LoginPage() {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
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

  const handleLogin = async () => {
    setError(false);
    try {
      const authResponse = await login(email, password);
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      if (isGameRedirect(redirect)) {
        window.location.href = buildGameRedirect(
          redirect!,
          authResponse.access_token,
        );
        return;
      }
      router.push(redirect?.startsWith("/") ? redirect : "/dashboard");
    } catch {
      setError(true);
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
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-10">
            <h1 className="text-5xl font-black text-[rgb(var(--text))] tracking-tighter uppercase italic">
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
            <button className="bg-[rgb(var(--primary))] text-black px-8 py-3 font-black uppercase text-sm border-t-2 border-l-2 border-r-2 border-[rgb(var(--border))] translate-y-[2px]">
              {t("auth.login")}
            </button>
            <Link
              href="/register"
              className="px-8 py-3 font-bold text-[rgb(var(--secondary-text))] uppercase text-sm hover:text-[rgb(var(--primary))] transition-colors"
            >
              {t("auth.signup")}
            </Link>
          </div>

          <div className="space-y-6">
            {/* INPUT EMAIL */}
            <div className="relative group">
              <label className="block text-[rgb(var(--primary))] text-xs font-black uppercase mb-2 ml-1">
                {t("auth.email")}
              </label>
              <div className="absolute left-4 top-[42px] text-[rgb(var(--secondary-text))] group-focus-within:text-[rgb(var(--primary))] transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[rgb(var(--code-background))] border-2 border-[rgb(var(--border))] focus:border-[rgb(var(--primary))] p-4 pl-12 text-[rgb(var(--text))] outline-none transition-all font-mono"
              />
            </div>

            {/* INPUT PASSWORD */}
            <div className="relative group">
              <label className="block text-[rgb(var(--primary))] text-xs font-black uppercase mb-2 ml-1">
                {t("auth.secret")}
              </label>
              <div className="absolute left-4 top-[42px] text-[rgb(var(--secondary-text))] group-focus-within:text-[rgb(var(--primary))] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[rgb(var(--code-background))] border-2 border-[rgb(var(--border))] focus:border-[rgb(var(--primary))] p-4 pl-12 text-[rgb(var(--text))] outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? t("auth.hidePasswordLabel")
                    : t("auth.showPasswordLabel")
                }
                className="absolute right-4 top-[42px] text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--primary))]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="bg-[rgb(var(--error))]/10 border-l-4 border-[rgb(var(--error))] p-3">
                <p className="text-[rgb(var(--error))] text-xs font-black uppercase italic">
                  {t("auth.loginError")}
                </p>
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full bg-[rgb(var(--button))] text-[rgb(var(--button-text))] p-5 font-black text-xl uppercase tracking-tighter hover:bg-white transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none mt-4 flex items-center justify-center gap-3"
            >
              {t("auth.executeLogin")} <ArrowRight size={24} />
            </button>
          </div>

          {/* SOCIAL LOGIN */}
          <div className="mt-12">
            <div className="relative flex items-center mb-8">
              <div className="flex-grow border-t border-[rgb(var(--border))]"></div>
              <span className="flex-shrink mx-4 text-[rgb(var(--secondary-text))] font-mono text-[10px] uppercase tracking-[0.3em]">
                {t("auth.externalProviders")}
              </span>
              <div className="flex-grow border-t border-[rgb(var(--border))]"></div>
            </div>
            <div className="flex gap-4">
              <button className="flex-1 border-2 border-[rgb(var(--border))] py-3 text-[rgb(var(--text))] flex items-center justify-center gap-2 hover:bg-[rgb(var(--secondary-button))] transition-colors font-black text-xs uppercase italic">
                <Chrome size={16} /> Google
              </button>
              <button className="flex-1 border-2 border-[rgb(var(--border))] py-3 text-[rgb(var(--text))] flex items-center justify-center gap-2 hover:bg-[rgb(var(--secondary-button))] transition-colors font-black text-xs uppercase italic">
                <Github size={16} /> GitHub
              </button>
            </div>
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
              <div className="bg-black p-4 inline-block">
                <p className="text-[rgb(var(--primary))] font-mono text-sm leading-snug max-w-xs uppercase">
                  &quot;{t("auth.decorativeQuote")}&quot;
                </p>
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
