/**
 * APG-style radiogroup keyboard: arrows move selection; Home/End jump ends.
 * Pair with roving tabindex (selected → 0, others → -1).
 */

export function radiogroupNavIndex(
  key: string,
  currentIndex: number,
  length: number,
): number | null {
  if (length <= 0) return null;
  const last = length - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return currentIndex >= last ? 0 : currentIndex + 1;
    case "ArrowLeft":
    case "ArrowUp":
      return currentIndex <= 0 ? last : currentIndex - 1;
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}
