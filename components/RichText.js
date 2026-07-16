"use client";
import { useRef, useEffect, useState } from "react";

/* Lightweight WYSIWYG editor on contentEditable — no external library.
 * Emits sanitized-ish HTML (final trusted sanitization happens server-side
 * on save via lib/sanitize + the content API). The toolbar covers the
 * formatting a restaurant site actually needs: bold/italic/underline,
 * headings, lists, alignment, links, and clear-formatting.
 *
 * value: current HTML string. onChange: (html) => void. simple: hide block
 * controls (headings/lists/align) for short one-line fields like labels. */
export default function RichText({ value, onChange, simple = false, placeholder = "" }) {
  const ref = useRef(null);
  const [active, setActive] = useState({});

  // Load incoming value once / when it changes externally (not on every keystroke).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    emit();
    refreshActive();
  };

  const emit = () => { if (ref.current) onChange(ref.current.innerHTML); };

  const refreshActive = () => {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      ul: document.queryCommandState("insertUnorderedList"),
      ol: document.queryCommandState("insertOrderedList"),
      left: document.queryCommandState("justifyLeft"),
      center: document.queryCommandState("justifyCenter"),
      right: document.queryCommandState("justifyRight"),
    });
  };

  const addLink = () => {
    const url = prompt("Link URL (https://…):");
    if (url) exec("createLink", url);
  };

  // Paste as plain text so we don't inherit messy markup from Word/web.
  const onPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  };

  const Btn = ({ cmd, arg, on, label, children }) => (
    <button
      type="button"
      className={`rt-btn${on ? " on" : ""}`}
      onMouseDown={e => { e.preventDefault(); }}
      onClick={() => (cmd === "link" ? addLink() : exec(cmd, arg))}
      title={label}
      aria-label={label}
    >{children}</button>
  );

  return (
    <div className="rt-wrap">
      <div className="rt-toolbar">
        <Btn cmd="bold" on={active.bold} label="Bold"><b>B</b></Btn>
        <Btn cmd="italic" on={active.italic} label="Italic"><i>I</i></Btn>
        <Btn cmd="underline" on={active.underline} label="Underline"><u>U</u></Btn>
        {!simple && (
          <>
            <span className="rt-sep" />
            <Btn cmd="formatBlock" arg="<h2>" label="Heading">H</Btn>
            <Btn cmd="formatBlock" arg="<p>" label="Normal text">¶</Btn>
            <span className="rt-sep" />
            <Btn cmd="insertUnorderedList" on={active.ul} label="Bullet list">•</Btn>
            <Btn cmd="insertOrderedList" on={active.ol} label="Numbered list">1.</Btn>
            <span className="rt-sep" />
            <Btn cmd="justifyLeft" on={active.left} label="Align left">⬅</Btn>
            <Btn cmd="justifyCenter" on={active.center} label="Align center">↔</Btn>
            <Btn cmd="justifyRight" on={active.right} label="Align right">➡</Btn>
          </>
        )}
        <span className="rt-sep" />
        <Btn cmd="link" label="Add link">🔗</Btn>
        <Btn cmd="removeFormat" label="Clear formatting">✕</Btn>
      </div>
      <div
        ref={ref}
        className="rt-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onPaste={onPaste}
        data-placeholder={placeholder}
      />
    </div>
  );
}
