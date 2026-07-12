import { redirect } from "next/navigation";

// /track was merged into /portal (single unified "My Orders" flow —
// registration + viewing live in one place now). Keep this route around
// so old bookmarks/links still land somewhere useful.
export default function TrackPage() {
  redirect("/portal");
}
