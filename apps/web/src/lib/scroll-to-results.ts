/** Sticky TopNav is `h-16` (4rem); leave a little air under it. */
const RESULTS_ID = "results";

/**
 * Smooth-scroll the Discover `#results` block into view (Paras sää / paywall).
 * Uses CSS `scroll-mt-*` on the target for sticky-nav offset.
 */
export function scrollToDiscoverResults(): void {
  const el = document.getElementById(RESULTS_ID);
  if (!el) return;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  el.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
}

/**
 * After App Router navigation with `scroll: false`, wait briefly so the
 * document isn’t mid-jump, then smooth-scroll to `#results`.
 */
export function scheduleScrollToDiscoverResults(): void {
  window.setTimeout(() => {
    scrollToDiscoverResults();
  }, 80);
}
