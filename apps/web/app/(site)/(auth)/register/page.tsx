"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../../../utils/auth";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Github,
  Chrome,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "../../../../src/i18n/useTranslation";

// Sub-componente para inputs limpios y consistentes
type BrutalInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
};

const BrutalInput = ({ icon: Icon, label, ...props }: BrutalInputProps) => (
  <div className="relative group">
    <label className="block text-[rgb(var(--primary))] text-xs font-black uppercase mb-2 ml-1">
      {label}_
    </label>
    <div className="absolute left-4 top-[42px] text-[rgb(var(--secondary-text))] group-focus-within:text-[rgb(var(--primary))] transition-colors">
      <Icon size={18} />
    </div>
    <input
      {...props}
      className="w-full bg-[rgb(var(--code-background))] border-2 border-[rgb(var(--border))] focus:border-[rgb(var(--primary))] p-4 pl-12 text-[rgb(var(--text))] outline-none transition-all font-mono text-sm"
    />
  </div>
);

export default function RegisterPage() {
  const t = useTranslation();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    referralCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) {
        setFormData((current) => ({ ...current, referralCode: ref }));
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    setError(null);
    try {
      await register(
        formData.username,
        formData.email,
        formData.password,
        formData.referralCode || undefined,
      );
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || t("auth.registerError"));
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
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-10">
            <h1 className="text-5xl font-black text-[rgb(var(--text))] tracking-tighter uppercase italic">
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
              className="px-8 py-3 font-bold text-[rgb(var(--secondary-text))] uppercase text-sm hover:text-[rgb(var(--primary))] transition-colors"
            >
              {t("auth.login")}
            </Link>
            <button className="bg-[rgb(var(--primary))] text-black px-8 py-3 font-black uppercase text-sm border-t-2 border-l-2 border-r-2 border-[rgb(var(--border))] translate-y-[2px]">
              {t("auth.signup")}
            </button>
          </div>

          <div className="space-y-5">
            <BrutalInput
              label={t("auth.username")}
              icon={User}
              name="username"
              placeholder={t("auth.usernamePlaceholder")}
              onChange={handleChange}
            />
            <BrutalInput
              label={t("auth.email")}
              icon={Mail}
              name="email"
              type="email"
              placeholder={t("auth.networkEmailPlaceholder")}
              onChange={handleChange}
            />
            <BrutalInput
              label={t("auth.access")}
              icon={Lock}
              name="password"
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              onChange={handleChange}
            />

            <BrutalInput
              label={t("auth.referral")}
              icon={ShieldCheck}
              name="referralCode"
              placeholder={t("auth.optional")}
              value={formData.referralCode}
              onChange={handleChange}
            />

            {error && (
              <div className="bg-[rgb(var(--error))]/10 border-l-4 border-[rgb(var(--error))] p-3">
                <p className="text-[rgb(var(--error))] text-xs font-black uppercase italic">
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={handleRegister}
              className="w-full bg-[rgb(var(--button))] text-[rgb(var(--button-text))] p-5 font-black text-xl uppercase tracking-tighter hover:bg-white transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none mt-4 flex items-center justify-center gap-3"
            >
              {t("auth.createAccount")} <ArrowRight size={24} />
            </button>
          </div>

          {/* SOCIAL REGISTER */}
          <div className="mt-10">
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
              <div className="bg-black p-4 inline-block">
                <p className="text-[rgb(var(--primary))] font-mono text-sm leading-snug max-w-xs uppercase">
                  &quot;{t("auth.registerDecorativeQuote")}&quot;
                </p>
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
