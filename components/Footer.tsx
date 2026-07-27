"use client";

import Link from "next/link";
import {
  Twitter,
  Github,
  Linkedin,
  Heart,
  Terminal,
  MapPin,
} from "lucide-react";
import { useTranslation } from "../src/i18n/useTranslation";

export default function Footer() {
  const t = useTranslation();

  return (
    <footer className="bg-black text-white border-t-4 border-black py-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Efecto de Universo / Partículas recuperado */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      {/* Resplandor sutil en la esquina para dar profundidad */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[rgb(var(--primary))]/10 blur-[100px] rounded-full"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b-2 border-white/10 pb-12">
          {/* Columna 1 - Marca CodeBuddies */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-[rgb(var(--primary))] p-1 border-2 border-white group-hover:rotate-12 transition-transform">
                <Terminal className="text-black h-6 w-6" />
              </div>
              <span className="text-2xl font-black uppercase tracking-tighter italic">
                {t("navbar.brandCode")}<span className="text-[rgb(var(--primary))]">{t("navbar.brandBuddies")}</span>
              </span>
            </Link>
            <p className="font-mono text-sm leading-tight opacity-70 italic whitespace-pre-line">
              {t.footer.brand.description}
            </p>
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-white/20 px-3 py-1 text-[10px] font-mono uppercase tracking-widest">
              {t.footer.brand.status}:{" "}
              <span className="text-green-500 animate-pulse">
                {t.footer.brand.online}
              </span>
            </div>
          </div>

          {/* Columna 2 - Navegación */}
          <div>
            <h4 className="font-black text-[rgb(var(--primary))] uppercase tracking-widest mb-6 flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-[rgb(var(--primary))]"></div>{" "}
              {t.footer.directory.title}
            </h4>
            <ul className="space-y-3 font-mono text-sm">
              {[
                t.footer.directory.modules,
                t.footer.directory.progress,
                t.footer.directory.badges,
                t.footer.directory.ranking,
              ].map((item) => (
                <li key={item}>
                  <Link
                    href={`/${item.toLowerCase().replace(" ", "-")}`}
                    className="hover:text-[rgb(var(--primary))] hover:translate-x-2 transition-all flex items-center gap-2 group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 text-[rgb(var(--primary))] text-xs">
                      &gt;
                    </span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3 - Soporte */}
          <div>
            <h4 className="font-black text-[rgb(var(--primary))] uppercase tracking-widest mb-6 flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-[rgb(var(--primary))]"></div>{" "}
              {t.footer.support.title}
            </h4>
            <ul className="space-y-3 font-mono text-sm">
              {[
                t.footer.support.help,
                t.footer.support.community,
                t.footer.support.blog,
                t.footer.support.contact,
              ].map((item) => (
                <li key={item}>
                  <Link
                    href={`/${item.toLowerCase()}`}
                    className="hover:text-[rgb(var(--primary))] hover:translate-x-2 transition-all flex items-center gap-2 group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 text-[rgb(var(--primary))] text-xs">
                      &gt;
                    </span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 4 - Social y Créditos Locales */}
          <div className="space-y-8">
            <div>
              <h4 className="font-black text-[rgb(var(--primary))] uppercase tracking-widest mb-6 text-sm">
                {t.footer.social.follow}
              </h4>
              <div className="flex gap-4">
                {[Twitter, Github, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="p-3 border-2 border-white/20 hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))] hover:-translate-y-1 transition-all"
                  >
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-[rgb(var(--primary))] p-4 border-2 border-black text-black -rotate-2 hover:rotate-0 transition-transform cursor-help shadow-[4px_4px_0_0_#fff]">
              <p className="font-black text-[10px] uppercase leading-none">
                {t.footer.madeWith.line1}{" "}
                <Heart className="inline h-3 w-3 fill-black " /> <br />
                {t.footer.madeWith.line2}{" "}
                <span>{t.footer.madeWith.country}</span> <br />
                {t.footer.madeWith.line3}
              </p>
            </div>
          </div>
        </div>

        {/* Barra Legal Final */}
        <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-[rgb(var(--primary))]" />
            <p>
              © {new Date().getFullYear()} CODEBUDDIES_OS |{" "}
              {t.footer.legal.location}
            </p>
          </div>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="hover:text-[rgb(var(--primary))]"
            >
              {t.footer.legal.privacy}
            </Link>
            <Link href="/terms" className="hover:text-[rgb(var(--primary))]">
              {t.footer.legal.terms}
            </Link>
            <Link
              href="/refund-policy"
              className="hover:text-[rgb(var(--primary))]"
            >
              {t("navbar.refunds")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
