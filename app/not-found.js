import Link from "next/link";
export default function NotFound() {
  return (
    <main className="section container" style={{ textAlign: "center", paddingTop: "6rem" }}>
      <h1 style={{ fontSize: "3rem", color: "var(--rust-deep)" }}>404</h1>
      <p style={{ margin: "1rem 0 2rem" }}>This page isn't on the menu. Let's get you back to the table.</p>
      <Link href="/" className="btn">Go Home</Link>
    </main>
  );
}
