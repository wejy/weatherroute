"use client";

/**
 * Contact address assembled only at runtime from code points —
 * never a contiguous `user@host` string in HTML or source text.
 */
export function resolveContactEmail(): string {
  const local = [104, 101, 108, 108, 111];
  const host = [115, 111, 108, 118, 105, 97, 120, 46, 97, 112, 112];
  return (
    String.fromCharCode(...local) +
    String.fromCharCode(64) +
    String.fromCharCode(...host)
  );
}

export function openContactMailto(): void {
  const addr = resolveContactEmail();
  window.location.href = `mailto:${addr}`;
}
