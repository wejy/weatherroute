import type { Metadata } from "next";

/** Shared bits for public page metadata. */
export function publicPageMeta(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: opts.path,
    },
  };
}

/** Account / auth / ops pages — keep out of the index. */
export function noIndexPageMeta(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}
