import Image from "next/image";
import type { WikipediaSummary } from "@/server/integrations/wikipedia";

type DestinationWikipediaProps = {
  summary: WikipediaSummary;
  title: string;
  linkLabel: string;
};

export function DestinationWikipedia({
  summary,
  title,
  linkLabel,
}: DestinationWikipediaProps) {
  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-on-surface">
        <span className="material-symbols-outlined text-primary">menu_book</span>
        {title}
      </h2>

      <div className="flex flex-col gap-6 md:flex-row">
        {summary.thumbnailUrl ? (
          <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg md:h-36 md:w-36">
            <Image
              src={summary.thumbnailUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 144px"
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1 space-y-4">
          {summary.description ? (
            <p className="text-sm font-medium text-primary">{summary.description}</p>
          ) : null}
          <p className="text-base leading-relaxed text-on-surface-variant">
            {summary.extract}
          </p>
          <a
            href={summary.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-low px-4 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            {linkLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
