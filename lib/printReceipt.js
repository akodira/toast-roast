/* Print an 80mm thermal receipt at its true length.
 *
 * A static @page height either wastes paper (page longer than the receipt)
 * or clips it (page shorter). So we measure the rendered receipt and write an
 * exact `@page { size: 80mm <height>mm }` just before printing — the page ends
 * where the content ends, and the auto-cutter fires in the right place.
 *
 * Also: `size: 80mm auto` is INVALID CSS (a length may not be paired with
 * `auto`). Browsers drop it and silently fall back to Legal/A4 — which is
 * exactly what went wrong. Always emit two lengths.
 */
const STYLE_ID = "receipt-page-size";
const PAPER_MM = 80;
const PX_PER_MM = 96 / 25.4;   // CSS px are 96dpi by definition
const TAIL_MM = 8;             // clearance so the blade doesn't cut the last line
const MIN_MM = 60;

export function printReceipt(selector = "#receipt-capture") {
  const el = document.querySelector(selector);
  if (!el) { window.print(); return; }   // fall back to the CSS default

  // getBoundingClientRect includes padding + borders, which the paper needs.
  const heightMm = el.getBoundingClientRect().height / PX_PER_MM + TAIL_MM;
  const pageMm = Math.max(MIN_MM, Math.ceil(heightMm));

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `@media print { @page { size: ${PAPER_MM}mm ${pageMm}mm; margin: 0; } }`;

  // Let the new @page rule land before the print dialog snapshots the page.
  setTimeout(() => window.print(), 60);
}
