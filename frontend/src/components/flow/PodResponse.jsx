// What somebody put on a project can say back about it.
//
// The TSD staffs a project and then hears nothing. Being added was treated as
// agreeing, which it is not: people are on leave, already at capacity, or the
// wrong discipline for the work. The project found out when the work did not
// happen.
//
// Declining needs a reason. "No" on its own leaves the TSD exactly where they
// started, and the reason is the whole value of asking. Declining does **not**
// take the person off the pod — that is the TSD's call to make with the reason
// in front of them.
//
// Everybody on the project sees the responses, not just the TSD, because
// "who has actually confirmed" is a question the whole pod has.

import { useState } from "react";
import { Check, Loader2, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";

import { flowAPI } from "../../lib/api";
import { Button } from "../ui/button";

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined,
    { day: "numeric", month: "short", year: "numeric" }) : "";

const CHIP = {
  accepted: "bg-[#1FB58A]/10 text-[#1B4332] border-[#1FB58A]/30",
  declined: "bg-red-50 text-red-700 border-red-200",
  acknowledged: "bg-[#C6A15B]/10 text-[#7A6234] border-[#C6A15B]/30",
};

export default function PodResponse({ project, me, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState("");
  const [declining, setDeclining] = useState(false);

  const responses = project?.pod_responses || [];
  const uid = me?.user_id;
  const onProject =
    uid && ((project?.pod_member_ids || []).includes(uid)
            || (project?.collaborator_ids || []).includes(uid));
  const mine = responses.find((r) => r.user_id === uid) || null;

  // The TSD and the architect are asked separately, in their own panel, about
  // owning the project. Asking them again as pod members would be two
  // questions about the same thing.
  const isOwner = uid === project?.tsd_id || uid === project?.architect_id;
  const canRespond = onProject && !isOwner;

  const send = async (status) => {
    if (status === "declined" && !note.trim()) {
      toast.error("Say why — the TSD has to re-staff around it");
      return;
    }
    setBusy(status);
    try {
      await flowAPI.respondToPod(project.id, status, note.trim());
      toast.success(
        status === "declined"
          ? "The TSD has been told, with your reason."
          : "The TSD has been told."
      );
      setNote("");
      setDeclining(false);
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send that");
    } finally { setBusy(null); }
  };

  if (!canRespond && responses.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#EAE7E0] bg-white p-4" data-testid="pod-response">
      <p className="text-[10px] font-mono text-gray-400">
        {canRespond ? "YOU ARE ON THIS PROJECT" : "WHO HAS CONFIRMED"}
      </p>

      {canRespond && (
        <>
          <p className="text-sm text-gray-900 mt-0.5 mb-2">
            {mine
              ? `You ${mine.status === "declined" ? "declined" : mine.status} this placement.`
              : "Can you take this on?"}
          </p>

          {mine?.note && (
            <p className="text-xs text-gray-600 italic mb-2">“{mine.note}”</p>
          )}

          {declining ? (
            <div className="space-y-2 mb-2">
              <input
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why can you not take it? (required)"
                data-testid="pod-decline-reason"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-red-200
                           bg-white text-gray-900 focus:outline-none focus:border-red-400"
              />
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" disabled={!!busy}
                        onClick={() => send("declined")}
                        data-testid="pod-decline-confirm"
                        className="h-7 text-[11px] border-red-300 text-red-700 hover:bg-red-50">
                  {busy === "declined"
                    ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    : <X className="w-3 h-3 mr-1" />}
                  Send my reason
                </Button>
                <Button size="sm" variant="outline" disabled={!!busy}
                        onClick={() => { setDeclining(false); setNote(""); }}
                        className="h-7 text-[11px]">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Button size="sm" variant="outline" disabled={!!busy || mine?.status === "accepted"}
                      onClick={() => send("accepted")}
                      data-testid="pod-accept"
                      className="h-7 text-[11px] border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332]/[0.06]">
                {busy === "accepted"
                  ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  : <ThumbsUp className="w-3 h-3 mr-1" />}
                {mine?.status === "accepted" ? "Accepted" : "I can take it"}
              </Button>
              <Button size="sm" variant="outline" disabled={!!busy}
                      onClick={() => setDeclining(true)}
                      data-testid="pod-decline"
                      className="h-7 text-[11px] text-red-700 hover:bg-red-50">
                I cannot
              </Button>
              {!mine && (
                <Button size="sm" variant="outline" disabled={!!busy}
                        onClick={() => send("acknowledged")}
                        data-testid="pod-acknowledge"
                        className="h-7 text-[11px]">
                  Seen it, deciding
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {responses.length > 0 && (
        <ul className="space-y-1 mt-1">
          {responses.map((r) => (
            <li key={r.user_id} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full border
                                ${CHIP[r.status] || CHIP.acknowledged}`}>
                {r.status}
              </span>
              <span className="min-w-0">
                <span className="text-gray-800">{r.user_name}</span>
                {r.note && <span className="block text-gray-500 italic">“{r.note}”</span>}
                <span className="block text-[11px] text-gray-400">{fmt(r.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {canRespond && !mine && (
        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <Check className="w-3 h-3" />
          The TSD is told either way. Declining needs a reason so they can re-staff.
        </p>
      )}
    </div>
  );
}
