import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, X, Loader2, ChevronDown, Users } from "lucide-react";
import { unitsAPI } from "../../lib/api";

/** Two letters for the avatar, from the name where there is one. */
function initials(name, email) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
}

/**
 * Pick the staff who work on a project.
 *
 * Drawn from the people assigned to the project's unit rather than the whole
 * directory: a unit head is staffing their own team, and typing a name by hand
 * invites the one mistake — a typo — that would silently leave somebody off.
 *
 * Rendered as a dropdown that opens on demand: the trigger shows who is already
 * selected, and the searchable list only appears once it is expanded, so the
 * project form stays compact instead of carrying a permanently open staff list.
 */
export default function CollaboratorPicker({ unitSlug, value = [], onChange, disabled }) {
  const [staff, setStaff] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!unitSlug) {
      setStaff([]);
      return;
    }
    let live = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await unitsAPI.listStaff(unitSlug);
        if (live) { setStaff(res?.staff || []); setData(res); }
      } catch (e) {
        if (live) setError(e.response?.data?.detail || "Could not load this unit's staff");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [unitSlug]);

  // Close when the user clicks anywhere outside the picker.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const selected = useMemo(
    () => staff.filter((p) => value.includes(p.user_id)),
    [staff, value]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
    );
  }, [staff, query]);

  const grouped = useMemo(() => {
    const byUnit = new Map();
    for (const p of matches) {
      const label = p.unit_name || "Team";
      if (!byUnit.has(label)) byUnit.set(label, []);
      byUnit.get(label).push(p);
    }
    const order = (data?.units || []).map((u) => u.name);
    return [...byUnit.entries()].sort(
      (a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99)
    );
  }, [matches, data]);

  const toggle = (uid) =>
    onChange(value.includes(uid) ? value.filter((x) => x !== uid) : [...value, uid]);

  // Escape closes it. A dropdown that can only be dismissed by aiming at the
  // page behind it is a dropdown that traps whoever opened it by accident.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!unitSlug) {
    return <p className="text-xs text-gray-400">Choose a unit first to see who you can add.</p>;
  }

  return (
    <div ref={ref} className="relative" data-testid="collaborator-picker">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-[#EAE7E0] rounded-lg text-sm bg-white text-gray-900 hover:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/15 disabled:opacity-50"
        data-testid="collaborator-toggle"
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <Users className="w-4 h-4 text-gray-400 shrink-0" />
          {selected.length > 0 ? (
            // Only the first few by name. A project with a dozen people on it
            // otherwise grows the closed control to several lines and pushes
            // the rest of the form down the page.
            <span className="flex flex-wrap items-center gap-1 min-w-0">
              {selected.slice(0, 3).map((p) => (
                <span key={p.user_id} className="px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-[12px] whitespace-nowrap">
                  {p.name}
                </span>
              ))}
              {selected.length > 3 && (
                <span className="text-[12px] text-gray-500 whitespace-nowrap">
                  +{selected.length - 3} more
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">Select staff…</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-[#EAE7E0] rounded-xl shadow-xl overflow-hidden">
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 border-b border-[#EAE7E0]">
              {selected.map((p) => (
                <span
                  key={p.user_id}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-[12px]"
                >
                  {p.name}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => toggle(p.user_id)}
                      className="hover:bg-[#1B4332]/15 rounded-full p-0.5"
                      aria-label={`Remove ${p.name}`}
                      data-testid={`unpick-${p.user_id}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="relative p-2">
            <Search className="w-3.5 h-3.5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#EAE7E0] rounded-lg text-sm text-gray-900 outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15 disabled:opacity-50"
              data-testid="collaborator-search"
            />
          </div>

          {/* The scrollbar is styled rather than left to the platform: the
              default one rendered as a bare black slab against the white list.
              Sized to show about five people, so the list reads as a list
              rather than a slot to scroll through. */}
          <div className="max-h-[19rem] overflow-y-auto border-t border-[#EAE7E0] [scrollbar-width:thin] [scrollbar-color:#D8D4CC_transparent]">
            {loading && (
              <p className="flex items-center gap-2 px-3 py-3 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading this unit's staff…
              </p>
            )}
            {!loading && error && <p className="px-3 py-3 text-xs text-red-500">{error}</p>}
            {!loading && !error && staff.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-400">
                Nobody is assigned to this unit yet. An administrator assigns staff to a unit in
                Staff Management.
              </p>
            )}
            {!loading && !error && staff.length > 0 && matches.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-400">Nobody matches "{query}"</p>
            )}
            {!loading &&
              grouped.map(([unitName, people]) => (
                <div key={unitName}>
                  {/* #F7F6F3 rather than #FAFAF9: only the former has a
                      dark-mode override, so the old header stayed pale against
                      a dark list. */}
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 bg-[#F7F6F3] border-b border-[#EAE7E0] sticky top-0 z-10">
                    {unitName}
                  </p>
                  {people.map((p) => {
                    const on = value.includes(p.user_id);
                    return (
                      <button
                        key={p.user_id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(p.user_id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                          on ? "bg-[#1B4332]/[0.06]" : "hover:bg-[#F7F6F3]"
                        }`}
                        data-testid={`pick-${p.user_id}`}
                      >
                        {/* A box that fills when chosen. The tick alone, at the
                            far right of a wide row, left no indication at the
                            point the eye actually rests. */}
                        <span
                          className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                            on ? "bg-[#1B4332] border-[#1B4332]" : "border-[#D8D4CC]"
                          }`}
                          aria-hidden="true"
                        >
                          {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>

                        <span className="w-7 h-7 shrink-0 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-[11px] font-semibold flex items-center justify-center">
                          {initials(p.name, p.email)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[13px] text-gray-900 truncate">{p.name || p.email}</span>
                            {p.is_head && (
                              <span className="shrink-0 px-1.5 py-px rounded-full bg-[#C6A15B]/15 text-[#8F7340] text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap">
                                PM
                              </span>
                            )}
                          </span>
                          <span className="block text-[11px] text-gray-400 truncate">{p.email}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
