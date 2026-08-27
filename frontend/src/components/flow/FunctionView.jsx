import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { controlTowerAPI } from "../../lib/api";

/**
 * One delivery function's work, rendered as part of the dashboard.
 *
 * Signing in as a TSD *is* signing in as a TSD, so this carries no heading
 * announcing which function you are looking at — your projects, your client
 * waits and your stalled work are simply your dashboard. The one person who
 * needs to be told is an administrator deliberately looking through somebody
 * else's job, and for them the switcher sits at the top of the page
 * (`FunctionSwitcher`, rendered by the dashboard header) rather than in a
 * heading buried between sections.
 *
 * Two things it deliberately does not do:
 *
 *   - It does not decide who may see what. `/control-tower/functions` says
 *     which views this caller may open and the API refuses the rest, so the
 *     switcher cannot offer something the server would reject. Every row is
 *     already scoped to the caller's own projects.
 *   - It does not know what any function's sections are. The server returns
 *     {title, columns, rows} and this renders it, so adding a function view is
 *     a server change rather than a new screen.
 */

const HEALTH_COLOR = { RED: "#A94E5B", AMBER: "#C6A15B", GREEN: "#2D6A4F" };

/**
 * Loads which function views the caller may open. Lifted out of the panel so
 * the dashboard can put the switcher in its header and the sections further
 * down the page, from one request.
 */
export function useFunctionViews() {
  const [meta, setMeta] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    controlTowerAPI
      .functions()
      .then((m) => {
        if (cancelled) return;
        setMeta(m);
        // Your own function, always, unless you hold none — an administrator
        // with no delivery function gets the first view rather than a blank
        // panel asking them to choose.
        setActive(m.mine || m.available?.[0]?.key || null);
      })
      .catch(() => !cancelled && setMeta({ mine: null, can_switch: false, available: [] }));
    return () => { cancelled = true; };
  }, []);

  return { meta, active, setActive };
}

/** The administrator's control. Renders nothing for everybody else. */
export function FunctionSwitcher({ meta, active, onChange }) {
  const [open, setOpen] = useState(false);
  if (!meta?.can_switch || (meta.available || []).length < 2) return null;

  const current = meta.available.find((o) => o.key === active);

  return (
    <div className="relative" data-testid="function-switcher-wrap">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="function-switcher"
        className="h-11 inline-flex items-center gap-2 px-5 rounded-full border border-[#EAE7E0] bg-white text-sm text-gray-700 hover:border-[#C6A15B] transition-colors"
      >
        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Viewing as</span>
        <span className="font-medium">{current?.label || "Function"}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Click anywhere else to dismiss, without trapping the page. */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 mt-2 z-20 w-60 p-1.5 rounded-xl bg-white border border-[#EAE7E0] shadow-lg">
            {meta.available.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => { onChange(o.key); setOpen(false); }}
                data-testid={`function-option-${o.key}`}
                className={`w-full flex items-center justify-between gap-2 text-left px-2.5 py-2 rounded-md text-sm transition-colors ${
                  o.key === active
                    ? "bg-[#C6A15B]/12 text-[#8F7340] font-medium"
                    : "text-gray-600 hover:bg-[#FBFAF7] hover:text-gray-900"
                }`}
              >
                {o.label}
                {o.key === meta.mine && (
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">yours</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** The sections themselves. No heading: this is the person's own dashboard. */
export default function FunctionView({ functionKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!functionKey) return;
    let cancelled = false;
    setLoading(true);
    controlTowerAPI
      .functionView(functionKey)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [functionKey]);

  if (!functionKey) return null;
  if (loading) return <div className="lux-card h-40 animate-pulse bg-[#EFEDE8]" />;
  if (!data) return null;

  return (
    <div className="space-y-5" data-testid="function-view">
      {data.sections.map((section) => (
        <Section
          key={section.key}
          section={section}
          onOpen={(row) => row.project_id && navigate(`/flow/projects/${row.project_id}`)}
        />
      ))}
    </div>
  );
}

function Section({ section, onOpen }) {
  const { title, columns, rows, empty } = section;

  return (
    <div className="lux-card overflow-hidden" data-testid={`function-section-${section.key}`}>
      <div className="px-6 pt-5 pb-3 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A9834E]">
          {title}
        </p>
        {rows.length > 0 && (
          <span className="text-[11px] text-gray-400 tabular-nums">{rows.length}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-gray-500">{empty}</p>
      ) : (
        // A table is wider than a phone. It scrolls inside its own box so the
        // page itself never scrolls sideways.
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 px-6 py-2 border-b border-[#F0EEE9]"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.project_id}-${i}`}
                  onClick={() => onOpen(row)}
                  className="border-b border-[#F0EEE9] last:border-0 hover:bg-[#FBFAF7] cursor-pointer transition-colors"
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-6 py-3 text-[13px] text-gray-800 align-middle">
                      <Cell column={c} row={row} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** The server tags a column with a `type` when it is more than text. */
function Cell({ column, row }) {
  const value = row[column.key];

  if (column.type === "health") {
    const color = HEALTH_COLOR[value] || HEALTH_COLOR.GREEN;
    return (
      <span className="inline-flex items-center gap-2 text-[12px]" style={{ color }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {value}
      </span>
    );
  }

  if (column.type === "stage" || column.type === "status") {
    if (!value) return <span className="text-gray-400">—</span>;
    return (
      <span className="inline-block px-2 py-1 rounded-md bg-[#F7F6F3] border border-[#EAE7E0] text-[11px] text-gray-600 whitespace-nowrap">
        {value}
      </span>
    );
  }

  if (column.type === "money") {
    if (value === null || value === undefined || value === "") {
      return <span className="text-gray-400">Not recorded</span>;
    }
    const amount = Number(value);
    return (
      <span className="tabular-nums">
        {Number.isFinite(amount)
          ? new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: row.currency || "GBP",
              maximumFractionDigits: 0,
            }).format(amount)
          : value}
      </span>
    );
  }

  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400">—</span>;
  }
  return <span>{value}</span>;
}
