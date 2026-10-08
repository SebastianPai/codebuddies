import type { MetadataRoute } from "next";
import { getApiUrl } from "@/config/env";
import { SITE_URL } from "@/config/site";

interface ListItem {
  id: string;
  slug?: string;
  updatedAt?: string;
}

async function fetchList(path: string): Promise<ListItem[]> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as ListItem[]) : [];
  } catch {
    // El sitemap no debe romperse si la API está caída — se sirve solo con
    // las rutas estáticas en ese caso.
    return [];
  }
}

// Solo páginas públicas e indexables (las privadas llevan noindex en su
// layout y están bloqueadas en robots.ts).
const STATIC_PAGES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "courses", changeFrequency: "daily", priority: 0.9 },
  { path: "paths", changeFrequency: "weekly", priority: 0.8 },
  { path: "pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "premium", changeFrequency: "monthly", priority: 0.7 },
  { path: "rankings", changeFrequency: "daily", priority: 0.6 },
  { path: "community", changeFrequency: "daily", priority: 0.6 },
  { path: "marketplace", changeFrequency: "weekly", priority: 0.5 },
  { path: "shop", changeFrequency: "weekly", priority: 0.5 },
  { path: "register", changeFrequency: "yearly", priority: 0.6 },
  { path: "login", changeFrequency: "yearly", priority: 0.4 },
  { path: "terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "cookies", changeFrequency: "yearly", priority: 0.3 },
  { path: "refund-policy", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: page.path ? `${SITE_URL}/${page.path}` : SITE_URL,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const [courses, paths] = await Promise.all([
    fetchList("/courses?lang=es"),
    fetchList("/learning-paths?lang=es"),
  ]);

  const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${SITE_URL}/courses/${course.id}`,
    lastModified: course.updatedAt ? new Date(course.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const pathRoutes: MetadataRoute.Sitemap = paths
    .filter((path) => path.slug)
    .map((path) => ({
      url: `${SITE_URL}/paths/${path.slug}`,
      lastModified: path.updatedAt ? new Date(path.updatedAt) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...courseRoutes, ...pathRoutes];
}
