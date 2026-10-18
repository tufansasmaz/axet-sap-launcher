// Akış mesaj kutusunda `@` ile ajan seçimi (spec 2026-10-18 ajanlar-yeniden §2).

export interface Mention {
  /** `@` işaretinin yeri. */
  start: number;
  query: string;
}

/** İmleçten hemen önceki `@sözcük`; `@` satır başında ya da boşluktan sonra olmalı. */
export function mentionAt(value: string, caret: number): Mention | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, caret));
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}

const fold = (s: string) => s.toLocaleLowerCase("tr");

/** Önce adı sorguyla başlayanlar, sonra içerenler; sıra korunuyor. */
export function matchAgents<T extends { name: string }>(agents: readonly T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return [...agents];
  const starts = agents.filter((a) => fold(a.name).startsWith(q));
  const contains = agents.filter((a) => !fold(a.name).startsWith(q) && fold(a.name).includes(q));
  return [...starts, ...contains];
}

/** Seçilen ajanın `@sözcüğü` metinden çıkıyor (ardındaki boşluk da). */
export function removeMention(value: string, mention: Mention): string {
  const end = mention.start + 1 + mention.query.length;
  return value.slice(0, mention.start) + value.slice(end).replace(/^\s+/, "");
}
