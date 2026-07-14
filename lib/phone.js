/* Canonical phone matching.
 *
 * The same customer can legitimately type their number several ways:
 *   01001401276      (local, leading zero)
 *   1001401276       (what they type when a "+20" prefix is shown)
 *   +20 100 140 1276 (international)
 *   00201001401276   (international, 00 prefix)
 *
 * Comparing raw strings — or even digits-only — treats these as four
 * different people, which is exactly why "Find My Table" failed for a number
 * that WAS registered. We reduce every form to the same key: the last 9
 * digits (the subscriber part, which is what actually identifies the line).
 *
 * Used on BOTH sides of every comparison, and mirrored in SQL by
 * PHONE_KEY_SQL below so the database matches the same way.
 */
export function phoneKey(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.slice(-9);
}

export function phonesMatch(a, b) {
  const ka = phoneKey(a);
  return ka.length >= 7 && ka === phoneKey(b);
}

/* SQL equivalent of phoneKey() for a column — keep in sync with the above. */
export const PHONE_KEY_SQL = (col) => `RIGHT(regexp_replace(${col}, '\\D', '', 'g'), 9)`;
