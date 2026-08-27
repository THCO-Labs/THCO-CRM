import { useState, useMemo } from "react";
import { Plus, X, LayoutGrid, Pencil } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { useInlineCreate } from "./useInlineCreate";
import { READ_ONLY_PERMISSIONS } from "./permissions";

/**
 * "+ Add another board" — opens a dropdown of predefined board titles.
 *
 * Selecting a predefined title instantly creates that board. At the bottom,
 * "+ Add Custom Board" reveals an inline input (autofocus, Enter saves,
 * Esc cancels, trim, dedupe-within-project). Custom titles are added to the
 * dropdown list for reuse within this session.
 *
 * Board management (create/rename/delete) is never available on a public
 * share link, so this is hidden entirely unless permissions.manageBoards.
 */
export const DEFAULT_BOARD_TITLES = [
  "UI/UX Tasks",
  "Dependencies",
  "Backlog",
  "Frontend Todo",
  "Backend Todo",
  "QA Review",
  "Ready For Merge",
  "Done",
];

export default function AddBoard({ onCreate, existingTitles = [], permissions = READ_ONLY_PERMISSIONS, variant = "column" }) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customTitles, setCustomTitles] = useState([]); // session-reusable custom titles
  const f = useInlineCreate({ onSubmit: onCreate });

  const usedLower = useMemo(
    () => new Set(existingTitles.map((t) => t.toLowerCase().trim())),
    [existingTitles]
  );

  if (!permissions.manageBoards) return null;

  const allTemplates = [...DEFAULT_BOARD_TITLES, ...customTitles];

  const handleSelect = async (title) => {
    setOpen(false);
    await onCreate(title);
  };

  const handleCreateCustom = async () => {
    const ok = await f.submit();
    if (ok !== false) {
      const title = f.value.trim();
      if (title && !customTitles.includes(title)) {
        setCustomTitles((prev) => [...prev, title]); // reuse in dropdown
      }
      f.cancel();
      setCustomMode(false);
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setCustomMode(false);
          f.cancel();
        }
      }}
    >
      <PopoverTrigger asChild>
        {variant === "cta" ? (
          <button
            data-testid="add-board-trigger"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C6A15B] hover:bg-[#8F7340] text-white text-sm font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B] focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Add another board
          </button>
        ) : (
          <button
            data-testid="add-board-trigger"
            className="shrink-0 w-[280px] flex items-center gap-2 px-4 py-3 rounded-xl bg-white/60 hover:bg-white border border-dashed border-[#D8D3C7] text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
          >
            <Plus className="w-4 h-4" />
            Add another board
          </button>
        )}
      </PopoverTrigger>

      {/* The template list is taller than the space under the trigger when the
          board strip sits low on the page, and the popover was simply running
          off the bottom of the window -- the last templates and "Add Custom
          Board" could not be reached at all. Radix measures the room it
          actually has and publishes it as --radix-popover-content-available-
          height; bounding the popover by that and scrolling inside keeps every
          option reachable wherever the trigger happens to be. */}
      <PopoverContent
        className="w-72 p-1.5 bg-white border border-[#EAE7E0] shadow-lg flex flex-col overflow-hidden max-h-[var(--radix-popover-content-available-height)]"
        align="start"
        collisionPadding={12}
      >
        {!customMode ? (
          <div className="flex flex-col min-h-0" data-testid="add-board-dropdown">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <LayoutGrid className="w-3 h-3" />
              Board Templates
            </p>

            {/* Internally scrollable, and free to shrink below its preferred
                height when the popover is bounded by the viewport. */}
            <div
              className="flex-1 min-h-0 max-h-64 overflow-y-auto overscroll-contain scroll-smooth pr-0.5 [scrollbar-width:thin] [scrollbar-color:#D8D3C7_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#D8D3C7] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
              data-testid="add-board-template-list"
            >
              {allTemplates.map((title) => {
                const used = usedLower.has(title.toLowerCase().trim());
                return (
                  <button
                    key={title}
                    onClick={() => handleSelect(title)}
                    disabled={used}
                    data-testid={`add-board-template-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm text-gray-700 hover:bg-[#F7F6F3] hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B]" />
                      {title}
                    </span>
                    {used && <span className="text-[10px] text-gray-400">added</span>}
                  </button>
                );
              })}
            </div>

            {/* Add custom — pinned outside the scroll region, so it stays
                reachable however short the list is squeezed. */}
            <div className="shrink-0 border-t border-[#EAE7E0] mt-1 pt-1">
              <button
                onClick={() => setCustomMode(true)}
                data-testid="add-board-custom"
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-medium text-[#C6A15B] hover:bg-[#FBF8F1] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Add Custom Board
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2" data-testid="add-board-form">
            <p className="text-xs font-medium text-gray-500 mb-2">Board Title</p>
            <input
              ref={f.inputRef}
              value={f.value}
              onChange={(e) => f.setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleCreateCustom(); }
                if (e.key === "Escape") { e.preventDefault(); setCustomMode(false); f.cancel(); }
              }}
              placeholder="e.g. Sprint 14"
              aria-label="Board Title"
              data-testid="add-board-input"
              className="w-full px-3 py-2 rounded-lg border border-[#EAE7E0] bg-[#FBFAF7] text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40 focus:border-[#C6A15B]"
            />
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreateCustom}
                disabled={f.busy || !f.value.trim()}
                data-testid="add-board-confirm"
                className="px-3 py-1.5 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              >
                Save
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setCustomMode(false); f.cancel(); }}
                aria-label="Cancel"
                data-testid="add-board-cancel"
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-black/[0.04] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
