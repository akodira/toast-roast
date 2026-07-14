/* One icon per CATEGORY (not per dish) — matched on the category name, so a new
   category picks up a sensible icon automatically and there is nothing to
   maintain. A per-item icon would mean sourcing 244 assets; this costs nothing. */
const PATHS = {
  steak:  "M6.4 3.6C9 2 13.6 1.6 16.8 3.2c3.4 1.7 5 5.3 4.3 8.6-.7 3.4-3.6 6.2-7.2 7.4-3 1-6.4.7-8.6-1-2.4-1.9-3.2-5.3-2.3-8.3.6-2.2 1.8-4.6 3.4-6.3Zm4.4 5.1a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z",
  cup:    "M4 4h11v7a5.5 5.5 0 0 1-11 0V4Zm11 1.5h1.8a2.6 2.6 0 0 1 0 5.2H15V5.5ZM3 19h14v1.6H3V19Z",
  bowl:   "M2.6 10.4h18.8a9.4 9.4 0 0 1-9.4 8.6 9.4 9.4 0 0 1-9.4-8.6ZM8 8.4c-.7-1.4.4-2 .4-3.2 0-.8-.5-1.3-.5-1.3s2 .6 2 2.2c0 1.3-1.1 1.6-.6 2.3H8Zm4 0c-.7-1.4.4-2 .4-3.2 0-.8-.5-1.3-.5-1.3s2 .6 2 2.2c0 1.3-1.1 1.6-.6 2.3H12Z",
  fish:   "M2 12c3-4.4 7-6.6 11-6.6 3.3 0 6 1.5 7.6 3.2.5.5.5 1.3 0 1.8-1.6 1.7-4.3 3.2-7.6 3.2-4 0-8-2.2-11-6.6Zm14.4-1.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z",
  pasta:  "M4 10h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8Zm2-7.4.9 5.4H5.3L4.5 2.6H6Zm3 0 .9 5.4H8.3L7.5 2.6H9Zm3 0 .9 5.4h-1.6l-.8-5.4H12Zm3 0 .9 5.4h-1.6l-.8-5.4H15Zm3 0 .9 5.4h-1.6l-.8-5.4H18Z",
  pizza:  "M12 2.2 22 20a1 1 0 0 1-1.1 1.5c-2.9-.7-5.9-1-8.9-1s-6 .3-8.9 1A1 1 0 0 1 2 20L12 2.2Zm0 5.3a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm-3.2 6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm6.4 0a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z",
  burger: "M3 15.5h18a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5Zm0-2.6h18v1.4H3v-1.4ZM12 3.2c4.4 0 8.1 2.3 8.8 5.4.1.6-.3 1.1-.9 1.1H4.1c-.6 0-1-.5-.9-1.1C3.9 5.5 7.6 3.2 12 3.2Z",
  cake:   "M12 2.4c.7.9 1.4 1.8 1.4 2.6a1.4 1.4 0 0 1-2.8 0c0-.8.7-1.7 1.4-2.6ZM5.5 8.4h13a2.5 2.5 0 0 1 2.5 2.5v2.2c-1 0-1.4.9-2.4.9s-1.4-.9-2.4-.9-1.4.9-2.4.9-1.4-.9-2.4-.9-1.4.9-2.4.9-1.4-.9-2.4-.9-1.4.9-2.5.9v-2.2a2.5 2.5 0 0 1 2.5-2.5ZM3 15.6c1 0 1.4-.9 2.4-.9s1.4.9 2.4.9 1.4-.9 2.4-.9 1.4.9 2.4.9 1.4-.9 2.4-.9 1.4.9 2.4.9 1.5-.9 2.5-.9v3.7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.7Z",
  salad:  "M2.6 11.4h18.8a9.4 9.4 0 0 1-9.4 8.6 9.4 9.4 0 0 1-9.4-8.6ZM12 3.2c1.9 0 3.5 1.2 4.1 2.9 1.6.2 2.9 1.4 3.2 3H4.7c.3-1.6 1.6-2.8 3.2-3C8.5 4.4 10.1 3.2 12 3.2Z",
  juice:  "M7 2.4h10l-1 3.2H8L7 2.4Zm.4 4.8h9.2l-1 12.4a2 2 0 0 1-2 1.8h-3.2a2 2 0 0 1-2-1.8L7.4 7.2Zm2 2.4-.4 4.8h6l-.4-4.8h-5.2Z",
  shisha: "M11 2.4h2v6h-2v-6Zm-1 7h4a3 3 0 0 1 3 3v1a5 5 0 0 1-10 0v-1a3 3 0 0 1 3-3Zm-1 9h6v3H9v-3Z",
  dish:   "M12 3.2a8.8 8.8 0 0 1 8.8 8.8H3.2A8.8 8.8 0 0 1 12 3.2Zm-9.6 10h19.2v1.6H2.4v-1.6ZM4 16.4h16v1.4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.4Z",
};

/* Keyword → icon. First match wins, so specific words come before generic ones. */
const RULES = [
  [/beef|steak|fillet|grill|meat|chicken/i, "steak"],
  [/coffee|espresso|latte|v60|chemex|hot drink|chocolate/i, "cup"],
  [/soup|broth/i, "bowl"],
  [/seafood|fish|shrimp|lobster|calamari/i, "fish"],
  [/pasta|penne|spaghetti|alfredo/i, "pasta"],
  [/pizza/i, "pizza"],
  [/burger|sandwich/i, "burger"],
  [/dessert|feteer|cake|sweet/i, "cake"],
  [/salad|appetiz|side/i, "salad"],
  [/juice|smoothie|cold drink|cocktail|drink|sauce/i, "juice"],
  [/shisha/i, "shisha"],
];

export function iconKeyFor(name = "") {
  const hit = RULES.find(([re]) => re.test(name));
  return hit ? hit[1] : "dish";
}

export default function CategoryIcon({ name, size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={PATHS[iconKeyFor(name)]} />
    </svg>
  );
}
