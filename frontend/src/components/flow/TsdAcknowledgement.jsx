// The TSD telling the Senior Partner where they are with a project.
//
// Handing somebody a project and hearing nothing back is the gap this closes.
// Three states, and they are a progression rather than a menu — seeing it,
// having read it, and taking it on are three different commitments:
//
//   Received      it has landed, nothing read yet
//   Acknowledged  read, still deciding
//   Accepted      taking it on. This is the one that clears the stage 3 gate.
//
// Each click tells the Senior Partner, in-app and by email. Only the project's
// own TSD sees the buttons; everybody else sees the state, because "has the
// TSD picked this up yet" is a question the whole project wants answered.

import { useState } from "react";
import { Check, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { deliveryAPI } from "../../lib/api";
import { Button } from "../ui/button";

const STATES = [
  {
    key: "received",
    label: "Received",
    done: "Received",
    hint: "Tell the Senior Partner it has landed.",
  },
  {
    key: "acknowledged",
    label: "Acknowledged",
    done: "Acknowledged",
    hint: "You have read the brief and are considering it.",
  },
  {
    key: "accepted",
    label: "Accept the project",
    done: "Accepted",
    hint: "You are taking it on.",
  },
];

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined,
    { day: "numeric", month: "short", year: "numeric" }) : "";

export default function TsdAcknowledgement({
  project, isTsd, canRecord, onChanged,
  // "tsd" or "architect". The architect is named and then hears nothing,
  // exactly as the TSD used to, so both get the same three buttons.
  role = "tsd",
}) {
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState("");

  const isArchitect = role === "architect";
  const roleLabel = isArchitect ? "Solution Architect" : "TSD";
  const holderName = isArchitect ? project?.architect_name : project?.tsd_name;
  const current = (isArchitect ? project?.architect_acknowledgement : project?.tsd_acknowledgement) || null;
  const currentIndex = current ? STATES.findIndex((s) => s.key === current.status) : -1;

  const send = async (status) => {
    setBusy(status);
    try {
      await deliveryAPI.acknowledgeProject(project.id, status, note.trim(), role);
      toast.success(
        status === "accepted"
          ? "Accepted. The Senior Partner has been told."
          : "The Senior Partner has been told."
      );
      setNote("");
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send that");
    } finally {
      setBusy(null);
    }
  };

  // Nobody who can act, and nothing recorded yet: there is nothing worth
  // taking up space on the page for.
  if (!canRecord && !current) return null;

  return (
    <div className="rounded-xl border border-[#EAE7E0] bg-white p-4"
         data-testid={`${role}-acknowledgement`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-mono text-gray-400">
            {isTsd ? "TELL THE SENIOR PARTNER" : `${roleLabel.toUpperCase()} STATUS`}
          </p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">
            {current
              ? `${holderName || `The ${roleLabel}`} ${
                  current.status === "accepted" ? "has accepted this project"
                  : current.status === "acknowledged" ? "has acknowledged this project"
                  : "has received this project"
                }`
              : "Not picked up yet"}
          </p>
          {current?.note && (
            <p className="text-xs text-gray-600 mt-1 italic">“{current.note}”</p>
          )}
          {current && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {current.by_name} · {fmt(current.at)}
            </p>
          )}
          {!current && !isTsd && (
            <p className="text-xs text-gray-500 mt-1">
              The Senior Partner is told as soon as the {roleLabel} responds.
            </p>
          )}
        </div>
        {current?.status === "accepted" && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-2 py-1
                           rounded-full bg-[#1FB58A]/10 text-[#1B4332] border border-[#1FB58A]/30">
            <Check className="w-3 h-3" /> Accepted
          </span>
        )}
      </div>

      {canRecord && (
        <>
          {/* The three states as a row of steps rather than a dropdown: the
              order is the meaning, and a dropdown would hide that Accept is
              the one that commits. */}
          <div className="flex flex-wrap gap-1.5">
            {STATES.map((s, i) => {
              const isDone = currentIndex >= i;
              const isCurrent = currentIndex === i;
              const isAccept = s.key === "accepted";
              return (
                <Button
                  key={s.key}
                  size="sm"
                  variant="outline"
                  disabled={!!busy || isCurrent}
                  onClick={() => send(s.key)}
                  title={s.hint}
                  data-testid={`ack-${role}-${s.key}`}
                  className={`h-7 text-[11px] ${
                    isCurrent
                      ? "border-[#1FB58A] bg-[#1FB58A]/10 text-[#1B4332]"
                      : isDone
                        ? "border-[#EAE7E0] text-gray-400"
                        : isAccept
                          ? "border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332]/[0.06]"
                          : "border-[#EAE7E0] text-gray-700"
                  }`}
                >
                  {busy === s.key
                    ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    : isDone && <Check className="w-3 h-3 mr-1" />}
                  {isCurrent ? s.done : s.label}
                </Button>
              );
            })}
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything to tell them with it (optional)"
            data-testid="ack-note"
            className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
          />
          <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
            <MailCheck className="w-3 h-3" />
            Each of these tells the Senior Partner straight away.
          </p>
        </>
      )}
    </div>
  );
}
