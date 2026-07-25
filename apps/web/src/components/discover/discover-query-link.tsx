"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import {
  DISCOVER_PARAM_KEYS,
  LOCATION_PARAM_KEYS,
  pickParams,
  withQuery,
} from "@/lib/discover-query";

const DISCOVER_PATHS = new Set(["/", "/map"]);

/**
 * Link that carries discover/location query params across pages
 * (`/`, `/map`, `/routes`, `/destinations/...`).
 */
export function DiscoverQueryLink({
  href,
  ...rest
}: ComponentProps<typeof Link>) {
  const searchParams = useSearchParams();
  const hrefStr = typeof href === "string" ? href : href.pathname || "/";
  const [pathWithQuery, hashPart] = hrefStr.split("#");
  const [path, existingQs = ""] = (pathWithQuery || "/").split("?");
  const base = path || "/";
  const hash = hashPart ? `#${hashPart}` : "";
  const hrefParams = new URLSearchParams(existingQs);

  let nextHref = href;

  if (DISCOVER_PATHS.has(base)) {
    const discover = pickParams(searchParams, DISCOVER_PARAM_KEYS);
    nextHref = withQuery(`${base}${hash}`, discover);
  } else if (base === "/routes") {
    const location = pickParams(searchParams, LOCATION_PARAM_KEYS);
    const from =
      hrefParams.get("from") ||
      location.origin ||
      searchParams.get("from") ||
      undefined;
    const to = hrefParams.get("to") || searchParams.get("to") || undefined;
    nextHref = withQuery(`${base}${hash}`, {
      from: from || undefined,
      to: to || undefined,
      origin: location.origin || from || undefined,
      lat: location.lat,
      lon: location.lon,
    });
  } else if (base.startsWith("/destinations/")) {
    const location = pickParams(searchParams, LOCATION_PARAM_KEYS);
    nextHref = withQuery(hrefStr, location);
  }

  return <Link href={nextHref} {...rest} />;
}
