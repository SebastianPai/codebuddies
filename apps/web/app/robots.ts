import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

// Áreas privadas/autenticadas sin valor de indexación.
const PRIVATE = [
  "/admin",
  "/dashboard",
  "/settings",
  "/messages",
  "/notifications",
  "/account",
  "/friends",
  "/referrals",
  "/rewards",
  "/missions",
  "/achievements",
  "/battle-pass",
  "/creator",
  "/learn",
  "/welcome",
  "/dev",
];

// Buscadores y asistentes de IA, nombrados para dejar claro que pueden leer
// las páginas públicas (y /llms.txt). Un grupo con nombre reemplaza al de "*",
// por eso cada uno repite la lista de áreas privadas.
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
