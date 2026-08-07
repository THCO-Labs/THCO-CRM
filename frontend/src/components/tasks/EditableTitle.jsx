import { useEffect, useRef, useState } from "react";

/**
 * Click-to-edit inline text input, Trello-style.
 * Used for both board titles and card titles.
 *
 * - Enter saves · Escape cancels · blur saves (if non-empty)
 * - Autosizes width to content
 * - Visible focus ring
 */
export default function EditableTitle({
  value,
  onCommit,
  className = "",
  inputClassName = "",
  placeholder = "Untitled",
  ariaLabel,
  testId,
  startEditing = false,
}) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  // Keep draft in sync when not editing (external updates)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Autofocus + select-all on edit start (delay for dropdown-menu close)
  useEffect(() => {
    if (editing && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (!next) {
      // revert if empty
      setDraft(value);
      setEditing(false);
      return;
    }
    if (next !== value) onCommit(next);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        aria-label={ariaLabel || placeholder}
        data-testid={testId ? `${testId}-input` : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={`bg-white border border-[#C6A15B] rounded-md px-2 py-0.5 text-sm font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40 max-w-full ${inputClassName}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to rename"
      data-testid={testId}
      className={`text-left rounded-md px-2 py-0.5 hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40 transition-colors truncate ${className}`}
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </button>
  );
}
