import { cn } from "@/lib/utils";

/** High-visibility subscription status chip (settings / pro). */
export function ActiveSubscriptionBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary/35 bg-primary/15 px-2.5 py-1 text-xs font-bold tracking-wide text-primary uppercase",
        className,
      )}
    >
      {label}
    </span>
  );
}
