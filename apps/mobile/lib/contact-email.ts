/**
 * Contact address assembled only at runtime from code points —
 * never a contiguous `user@host` string in source.
 */
export function resolveContactEmail(): string {
  const local = [105, 110, 102, 111];
  const host = [115, 111, 108, 118, 105, 97, 120, 46, 97, 112, 112];
  return (
    String.fromCharCode(...local) +
    String.fromCharCode(64) +
    String.fromCharCode(...host)
  );
}

export function contactEmailChars(): string[] {
  return resolveContactEmail().split("");
}
