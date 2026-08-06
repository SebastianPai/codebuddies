import type { MetadataRoute } from "next";

const SITE_URL = "https://codebuddies.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Áreas privadas/autenticadas sin valor de indexación.
        disallow: [
          "/admin",
          "/admin/*",
          "/dashboard",
          "/settings",
          "/messages",
          "/notifications",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
