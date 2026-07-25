"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

const DISCOVER_PATHS = new Set(["/", "/map"]);

/**
 * Link that carries discover query params (origin, lat, lon, weatherGoal, …)
 * when moving between `/` and `/map`.
 */
export function DiscoverQueryLink({
  href,
  ...rest
}: ComponentProps<typeof Link>) {
  const searchParams = useSearchParams();
  const hrefStr = typeof href === "string" ? href : href.pathname || "/";
  const [path, hash = ""] = hrefStr.split("#");
  const base = path || "/";

  let nextHref = href;
  if (DISCOVER_PATHS.has(base)) {
    const qs = searchParams.toString();
    nextHref = qs
      ? `${base}?${qs}${hash ? `#${hash}` : ""}`
      : `${base}${hash ? `#${hash}` : ""}`;
  }

  return <Link href={nextHref} {...rest} />;
}
