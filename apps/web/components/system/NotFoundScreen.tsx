"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BookOpen, Home } from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";

export default function NotFoundScreen() {
  const t = useTranslation();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [path, setPath] = useState("/");

  useEffect(() => {
    setPath(window.location.pathname);
  }, []);

  return (
    <section className="relative mx-auto flex min-h-[70dvh] max-w-5xl flex-col items-center justify-center gap-10 px-4 py-16 text-center md:flex-row md:text-left">
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -12, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-44 shrink-0 sm:w-56"
      >
        <div className="absolute inset-0 -z-10 rounded-full bg-[rgb(var(--primary)/0.25)] blur-3xl" />
        <Image
          src="/robot-head.png"
          alt=""
          width={224}
          height={204}
          priority
          className="h-auto w-full"
        />
        <span className="absolute -right-2 -top-2 rounded-full border-2 border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 font-mono text-sm font-black text-[rgb(var(--primary))]">
          ?
        </span>
      </motion.div>

      <div className="w-full max-w-xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[rgb(var(--primary))]">
          {t("site.notFound.code")}
        </p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-[rgb(var(--text))] sm:text-5xl">
          {t("site.notFound.title")}
        </h1>
        <p className="mt-4 text-base text-[rgb(var(--secondary-text))] sm:text-lg">
          {t("site.notFound.body")}
        </p>

        <pre className="mt-6 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--code-background))] p-4 text-left font-mono text-xs text-[rgb(var(--secondary-text))] sm:text-sm">
          <span className="text-[rgb(var(--primary))]">$</span> cd {path}
          {"\n"}
          <span className="text-[rgb(var(--error-text))]">404</span>: {t("site.notFound.terminal")}
        </pre>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--button))] px-5 py-3 text-sm font-black uppercase tracking-wide text-[rgb(var(--button-text))] transition hover:brightness-110"
          >
            <Home size={16} />
            {t("site.notFound.home")}
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--border))] px-5 py-3 text-sm font-black uppercase tracking-wide text-[rgb(var(--text))] transition hover:border-[rgb(var(--primary)/0.6)]"
          >
            <BookOpen size={16} />
            {t("site.notFound.courses")}
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-[rgb(var(--secondary-text))] transition hover:text-[rgb(var(--text))]"
          >
            <ArrowLeft size={16} />
            {t("site.notFound.back")}
          </button>
        </div>
      </div>
    </section>
  );
}
