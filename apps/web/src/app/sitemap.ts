import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Public marketing / product URLs only.
 * Skip auth, account, admin, API, and unbounded destination slugs
 * (thin/duplicate risk + crawl budget).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/about", changeFrequency: "monthly", priority: 0.9 },
    { path: "/pro", changeFrequency: "monthly", priority: 0.85 },
    { path: "/map", changeFrequency: "weekly", priority: 0.7 },
    { path: "/routes", changeFrequency: "weekly", priority: 0.7 },
  ];

  return entries.map((e) => ({
    url: absoluteUrl(e.path),
    lastModified: now,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }));
}
