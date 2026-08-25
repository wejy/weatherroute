import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Account / Sign in control shared by TopNav + map/routes mobile headers
 * so the right-side cluster stays the same width across pages.
 */
export function MobileChromeAuth({
  signedIn,
  loginNext,
  settingsLabel,
  signInLabel,
  displayName,
  signedInAsTitle,
  settingsActive,
}: {
  signedIn: boolean;
  /** Path after login, e.g. `/map` or `/settings`. */
  loginNext: string;
  settingsLabel: string;
  signInLabel: string;
  displayName?: string;
  signedInAsTitle?: string;
  settingsActive?: boolean;
}) {
  if (signedIn) {
    return (
      <Link
        href="/settings"
        aria-label={settingsLabel}
        title={signedInAsTitle}
        aria-current={settingsActive ? "page" : undefined}
        data-testid="nav-account"
        className={cn(
          "flex h-11 max-w-[12rem] items-center gap-2 rounded-full border px-2.5 shadow-sm transition-colors sm:px-3",
          settingsActive
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-primary/25 bg-primary/5 text-on-surface hover:bg-primary/10 hover:text-primary",
        )}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span
            className="material-symbols-outlined fill-icon text-[28px] text-primary"
            aria-hidden="true"
          >
            account_circle
          </span>
          <span
            className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-secondary"
            aria-hidden="true"
          />
        </span>
        {displayName ? (
          <span className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="truncate text-xs font-semibold text-on-surface">
              {displayName}
            </span>
            <span className="text-[10px] font-medium text-secondary">
              {settingsLabel}
            </span>
          </span>
        ) : null}
        <span
          className="material-symbols-outlined hidden text-[20px] text-on-surface-variant sm:inline"
          aria-hidden="true"
        >
          settings
        </span>
      </Link>
    );
  }

  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;
  return (
    <Link
      href={loginHref}
      data-testid="nav-sign-in"
      className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
    >
      {signInLabel}
    </Link>
  );
}
