// Server-side HTML sanitization for all user-editable website content.
// The WYSIWYG editor produces HTML; this is the trust boundary that strips
// anything dangerous (scripts, event handlers, javascript: URLs) before the
// HTML is ever stored or rendered with dangerouslySetInnerHTML.
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "s", "br", "p", "div", "span",
  "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "blockquote",
];
const ALLOWED_ATTR = ["href", "target", "rel", "style"];

// Only allow safe inline styles (text-align, font-weight, font-style,
// text-decoration) — block anything that could be used for layout hijacking.
export function sanitizeHtml(dirty) {
  if (dirty == null) return "";
  const clean = DOMPurify.sanitize(String(dirty), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
  return clean;
}

// For fields that must stay plain text (never rendered as HTML), strip all tags.
export function stripTags(dirty) {
  if (dirty == null) return "";
  return DOMPurify.sanitize(String(dirty), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
