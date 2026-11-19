"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

// Piezas compartidas por las secciones de la portada. Las fuentes llegan como
// variables CSS desde app/(landing)/layout.tsx (next/font, sin dependencias).
export const DISPLAY = "[font-family:var(--font-home-display),system-ui,sans-serif]";
export const PIXEL = "[font-family:var(--font-home-pixel),ui-monospace,monospace]";
export const CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--primary))] ${className}`}>
      {children}
    </p>
  );
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`${DISPLAY} mt-3 text-balance text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-5xl ${className}`}
    >
      {children}
    </h2>
  );
}

const BUTTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-bold transition-[transform,background-color,color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))] active:translate-y-px";

export function PrimaryButton({
  href,
  children,
  external = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
}) {
  const classes = `${BUTTON_BASE} bg-[rgb(var(--primary))] text-[rgb(var(--button-text))] hover:-translate-y-0.5 ${className}`;
  const content = (
    <>
      {children}
      <ArrowRight size={18} aria-hidden="true" />
    </>
  );
  return external ? (
    <a href={href} className={classes}>
      {content}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}

export function SecondaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${BUTTON_BASE} border border-[rgb(var(--border))] text-[rgb(var(--text))] hover:border-[rgb(var(--text)/0.6)] ${className}`}
    >
      {children}
    </Link>
  );
}

// Etiqueta "captura real" que acompaña a las imágenes del producto.
export function RealCaption({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-xs font-medium text-[rgb(var(--secondary-text))] ${className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]" />
      {children}
    </p>
  );
}
