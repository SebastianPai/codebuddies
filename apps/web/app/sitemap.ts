import type { MetadataRoute } from "next";
import { getApiUrl } from "@/config/env";

const SITE_URL = "https://codebuddies.app";

interface CourseListItem {
  id: string;
}

async function fetchCourseIds(): Promise<string[]> {
  try {
    const res = await fetch(`${getApiUrl()}/courses`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const courses = (await res.json()) as CourseListItem[];
    return courses.map((course) => course.id);
  } catch {
    // El sitemap no debe romperse si la API está caída — se sirve solo con
    // las rutas estáticas en ese caso.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "courses",
    "pricing",
    "premium",
    "rankings",
    "certificates",
    "login",
    "register",
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: path ? `${SITE_URL}/${path}` : SITE_URL,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
  }));

  const courseIds = await fetchCourseIds();
  const courseRoutes: MetadataRoute.Sitemap = courseIds.map((id) => ({
    url: `${SITE_URL}/courses/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
  }));

  return [...staticRoutes, ...courseRoutes];
}
