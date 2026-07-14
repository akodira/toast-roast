/* Print an 80mm thermal receipt at its true length.
 *
 * WHY A CLONE, NOT `visibility: hidden`:
 * The receipt lives deep inside a fixed, flex, overflow-scrolling modal. The
 * old approach hid `body *` and re-showed `.receipt` — but un-hiding a deeply
 * nested descendant is fragile: a hidden/positioned/overflowing ancestor can
 * still swallow it, which produced a correctly-sized but BLANK page. Cloning
 * the receipt to a top-level node and `display:none`-ing everything else is
 * deterministic — there is no ancestor left to interfere.
 *
 * PAGE SIZE:
 * `size: 80mm auto` is INVALID CSS (a length may not be paired with `auto`);
 * browsers drop it and silently fall back to Legal/A4. We measure the receipt
 * and emit two real lengths, so the page ends where the content ends and the
 * cutter fires in the right place.
 */
const STYLE_ID = "receipt-print-style";
const ROOT_ID = "receipt-print-root";
const PAPER_MM = 80;
const PX_PER_MM = 96 / 25.4;   // CSS px are 96dpi by definition
const TAIL_MM = 8;             // clearance so the blade doesn't cut the last line
const MIN_MM = 60;

function cleanup() {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
  document.documentElement.classList.remove("printing-receipt");
}

export function printReceipt(selector = "#receipt-capture") {
  const el = document.querySelector(selector);
  if (!el) return;

  cleanup(); // in case a previous run was interrupted

  const heightMm = el.getBoundingClientRect().height / PX_PER_MM + TAIL_MM;
  const pageMm = Math.max(MIN_MM, Math.ceil(heightMm));

  // 1. Lift a copy of the receipt to the top level, clear of the modal.
  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.appendChild(el.cloneNode(true));
  document.body.appendChild(root);

  // 2. Hide everything except that copy, and size the page to it.
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      @page { size: ${PAPER_MM}mm ${pageMm}mm; margin: 0; }
      html.printing-receipt body > *:not(#${ROOT_ID}) { display: none !important; }
      html.printing-receipt, html.printing-receipt body {
        width: ${PAPER_MM}mm !important; margin: 0 !important; padding: 0 !important;
        background: #fff !important;
      }
      #${ROOT_ID} { display: block !important; }
    }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add("printing-receipt");

  const done = () => { cleanup(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);

  // Let layout settle before the dialog snapshots the page.
  setTimeout(() => {
    window.print();
    // Safari/older browsers don't always fire afterprint — belt and braces.
    setTimeout(cleanup, 1000);
  }, 80);
}
