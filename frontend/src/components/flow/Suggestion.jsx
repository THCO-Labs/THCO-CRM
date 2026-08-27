// One way of showing a Tier 4 recommendation, used everywhere one appears.
//
// The plan's rule for this tier is that each item "replaces text inside a
// panel that already exists", so this is deliberately a strip rather than a
// card: it sits inside the panel it belongs to and does not compete with it.
//
// Three things it always shows, because a suggestion without them is worse
// than none:
//
//   where it came from   data (checkable records) or model (can be wrong)
//   why                  the reasons, in full, not a score
//   how sure             high / medium / low, and low is worth saying
//
// And one thing it never does: apply itself. `onApply` hands the caller the
// recommendation's `fields`; the caller passes them to whichever ordinary
// endpoint already owns that write. That is what keeps "AI recommends,
// humans decide" true of the code and not just of the copy.

import { useCallback, useEffect, useState } from "react";
import { Check, Info, Loader2, RefreshCw, Sparkles, Database } from "lucide-react";

// Provenance is the most important thing on this strip, so it is carried by
// colour and icon as well as words. Data-backed suggestions are the calmer
// green the app already uses for "the system can see this"; model-backed ones
// are gold, the colour this app reserves for "a person needs to look".
const BASIS = {
  data: {
    icon: Database, label: "from your records",
    chip: "bg-[#1FB58A]/10 text-[#1B4332] border-[#1FB58A]/30",
    accent: "border-l-[#1FB58A]",
  },
  model: {
    icon: Sparkles, label: "drafted by AI",
    chip: "bg-[#C6A15B]/10 text-[#7A6234] border-[#C6A15B]/30",
    accent: "border-l-[#C6A15B]",
  },
  "data+model": {
    icon: Sparkles, label: "your records, written up by AI",
    chip: "bg-[#C6A15B]/10 text-[#7A6234] border-[#C6A15B]/30",
    accent: "border-l-[#C6A15B]",
  },
};

const CONFIDENCE = {
  high: "text-[#1B4332]",
  medium: "text-gray-500",
  low: "text-[#A9834E]",
};

/**
 * @param {function} load        async () => recommendation
 * @param {function} [onApply]   (fields, recommendation) => void — omit for read-only
 * @param {string}   [applyLabel]
 * @param {boolean}  [auto]      fetch on mount; otherwise wait for the button
 * @param {string}   [title]
 */
export default function Suggestion({
  load,
  onApply,
  applyLabel = "Use this",
  auto = true,
  title = "Suggestion",
  testId = "suggestion",
}) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [failed, setFailed] = useState(null);

  const run = useCallback(async () => {
    setBusy(true);
    setFailed(null);
    try {
      setData(await load());
      setApplied(false);
    } catch (e) {
      // A suggestion failing must never read as the panel failing, so this is
      // shown inside the strip and nothing else on the page reacts to it.
      setFailed(e.response?.data?.detail || "Could not fetch a suggestion");
    } finally {
      setBusy(false);
    }
  }, [load]);

  useEffect(() => { if (auto) run(); }, [auto, run]);

  if (!auto && !data && !busy && !failed) {
    return (
      <button
        type="button"
        onClick={run}
        data-testid={`${testId}-trigger`}
        className="inline-flex items-center gap-1.5 text-[11px] text-[#1B4332]
                   hover:underline"
      >
        <Sparkles className="w-3 h-3" /> {title}
      </button>
    );
  }

  if (busy && !data) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-500"
           data-testid={`${testId}-loading`}>
        <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
      </div>
    );
  }

  if (failed) {
    return (
      <div className="px-3 py-2 text-[11px] text-gray-500 flex items-center gap-2">
        <Info className="w-3 h-3" /> {failed}
        <button onClick={run} className="text-[#1B4332] hover:underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  // Not an error state. The layer being off is a normal configuration, and
  // saying so plainly is what stops it reading as something broken.
  if (data.unavailable) {
    return (
      <div className="rounded-lg border border-dashed border-[#EAE7E0] bg-[#F7F6F3]
                      px-3 py-2" data-testid={`${testId}-unavailable`}>
        <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            {data.unavailable}
            {data.rationale?.length > 0 && (
              <span className="block text-gray-400 mt-0.5">{data.rationale[0]}</span>
            )}
          </span>
        </p>
      </div>
    );
  }

  const basis = BASIS[data.basis] || BASIS.data;
  const BasisIcon = basis.icon;

  return (
    <div className={`rounded-lg border border-[#EAE7E0] border-l-2 ${basis.accent}
                     bg-white px-3 py-2.5`} data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5
                              rounded-full border ${basis.chip}`}>
              <BasisIcon className="w-2.5 h-2.5" />
              {basis.label}
            </span>
            <span className={`text-[10px] ${CONFIDENCE[data.confidence] || "text-gray-500"}`}>
              {data.confidence} confidence
            </span>
          </div>

          <p className="text-sm text-gray-900 whitespace-pre-wrap">{data.display}</p>

          {data.rationale?.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {data.rationale.filter(Boolean).map((reason, i) => (
                <li key={i} className="text-[11px] text-gray-500 flex gap-1.5">
                  <span className="text-gray-300">·</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={run}
            disabled={busy}
            title="Ask again"
            className="p-1 text-gray-300 hover:text-gray-600"
            data-testid={`${testId}-refresh`}
          >
            <RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} />
          </button>
          {onApply && Object.keys(data.fields || {}).length > 0 && (
            <button
              onClick={() => { onApply(data.fields, data); setApplied(true); }}
              disabled={busy || applied}
              data-testid={`${testId}-apply`}
              className={`text-[11px] px-2 py-1 rounded-md border whitespace-nowrap ${
                applied
                  ? "border-[#1FB58A]/40 bg-[#1FB58A]/10 text-[#1B4332]"
                  : "border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332]/[0.06]"
              }`}
            >
              {applied ? (<><Check className="w-3 h-3 inline mr-1" />Filled in</>) : applyLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
