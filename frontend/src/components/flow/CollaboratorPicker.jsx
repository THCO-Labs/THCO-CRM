import { useEffect, useMemo, useState } from "react";
import { Search, Check, X, Loader2 } from "lucide-react";
import { unitsAPI } from "../../lib/api";

/**
 * Pick the staff who work on a project.
 *
 * Drawn from the people assigned to the project's unit rather than the whole
 * directory: a unit head is staffing their own team, and typing a name by hand
 * invites the one mistake — a typo — that would silently leave somebody off.
 *
 * Searchable because a unit can hold more people than fits on screen, and
 * scrolling for a colleague you already know the name of is the slower path.
 * Matching runs over name and email, so either works.
 */
export default function CollaboratorPicker({ unitSlug, value = [], onChange, disabled }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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
        const data = await unitsAPI.listStaff(unitSlug);
        if (live) setStaff(data?.staff || []);
      } catch (e) {
        if (live) setError(e.response?.data?.detail || "Could not load this unit's staff");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [unitSlug]);

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

  const toggle = (uid) =>
    onChange(value.includes(uid) ? value.filter((x) => x !== uid) : [...value, uid]);

  if (!unitSlug) {
    return <p className="text-xs text-gray-400">Choose a unit first to see who you can add.</p>;
  }

  return (
    <div data-testid="collaborator-picker">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
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

      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B4332] disabled:opacity-50"
          data-testid="collaborator-search"
        />
      </div>

      <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
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
          matches.map((p) => {
            const on = value.includes(p.user_id);
            return (
              <button
                key={p.user_id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(p.user_id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                  on ? "bg-[#1B4332]/5" : "hover:bg-gray-50"
                }`}
                data-testid={`pick-${p.user_id}`}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] text-gray-900 truncate">
                    {p.name}
                    {p.is_head && <span className="ml-1.5 text-[10px] text-[#8F7340]">project manager</span>}
                  </span>
                  <span className="block text-[11px] text-gray-400 truncate">{p.email}</span>
                </span>
                {on && <Check className="w-4 h-4 text-[#1B4332] shrink-0" />}
              </button>
            );
          })}
      </div>
    </div>
  );
}
