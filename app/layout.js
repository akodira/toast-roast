import "./globals.css";
import { getContent } from "@/components/SiteChrome";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Toast & Roast — Cafe and Restaurant",
  description: "Toast & Roast cafe and restaurant in Cairo. Grills, feteer, pasta, speciality coffee and more. Order to your table online.",
};

// Simple hex darken, used to derive a hover/deep shade from the admin's
// chosen primary color (mirrors the original --rust vs --rust-deep gap).
function darken(hex, amt) {
  const n = parseInt((hex || "#C0502A").replace("#", ""), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) - amt), g = clamp(((n >> 8) & 0xff) - amt), b = clamp((n & 0xff) - amt);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

export default async function RootLayout({ children }) {
  const content = await getContent();
  const primary = content.theme_primary_color || "#C0502A";
  const fontHeading = content.theme_font_heading || "Playfair Display";
  const fontBody = content.theme_font_body || "Inter";
  const deep = darken(primary, 40);
  const fontsHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontHeading)}&family=${encodeURIComponent(fontBody)}:wght@400;500;600;700&display=swap`;

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href={fontsHref} />
        <style dangerouslySetInnerHTML={{ __html: `:root {
          --rust: ${primary};
          --rust-deep: ${deep};
          --font-display: '${fontHeading}', 'Georgia', serif;
          --font-body: '${fontBody}', system-ui, sans-serif;
        }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
