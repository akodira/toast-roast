import "./globals.css";

export const metadata = {
  title: "Toast & Roast — Cafe and Restaurant",
  description: "Toast & Roast cafe and restaurant in Cairo. Grills, feteer, pasta, speciality coffee and more. Order to your table online.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
