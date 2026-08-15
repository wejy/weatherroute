"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { preserveDiscoverHref } from "@/lib/discover-query";

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
  const nextHref = preserveDiscoverHref(hrefStr, searchParams);

  return <Link href={nextHref} {...rest} />;
}
