// Renders website-content HTML produced by the WYSIWYG editor. Content is
// sanitized on save (lib/sanitize via the content API), so it's safe to
// render here. `as` picks the wrapper tag; `fallback` shows if empty.
export default function Html({ children, as: Tag = "span", className, fallback = "" }) {
  const html = (children == null || children === "") ? fallback : String(children);
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
