import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Áreas privadas/autenticadas sin valor de indexación.
        disallow: [
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
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
