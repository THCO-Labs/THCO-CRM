import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { flowAPI } from "../../lib/api";
import { HEALTH } from "../../pages/flow/stages";
import { Button } from "../ui/button";

/**
 * Project health, set by the TSD.
 *
 * Anything other than green needs a reason. A red project with no explanation
 * tells the Senior Partner that something is wrong and nothing about what, so
 * the reason is the point rather than a formality; the API refuses it too.
 *
 * Setting red emails and alerts the Senior Partner, which is the whole of what
 * they asked to be told about. That is said on the form rather than discovered
 * afterwards.
 */
export default function HealthControl({ project, canEdit, onChanged }) {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState(project.health || "GREEN");
  const [reason, setReason] = useState(project.health_reason || "");
  const [saving, setSaving] = useState(false);

  const current = HEALTH[project.health] || HEALTH.GREEN;

  const save = async () => {
    if (health !== "GREEN" && !reason.trim()) {
      toast.error("A project that is not green needs a reason");
      return;
    }
    setSaving(true);
    try {
      await flowAPI.setHealth(project.id, health, reason.trim());
      toast.success(`Health set to ${HEALTH[health].label.toLowerCase()}`);
      setOpen(false);
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not set health");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition ${current.ring} ${current.text} ${
          canEdit ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
        }`}
        title={project.health_reason || current.label}
        data-testid="health-pill"
      >
        <span className={`w-2 h-2 rounded-full ${current.dot}`} />
        {current.label}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[#EAE7E0] bg-white p-3 w-72" data-testid="health-editor">
      <div className="flex gap-1 mb-2">
        {Object.entries(HEALTH).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setHealth(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-[11px] font-medium transition ${
              health === key ? `${cfg.ring} bg-gray-50 ${cfg.text}` : "border-[#EAE7E0] text-gray-500"
            }`}
            data-testid={`health-${key}`}
          >
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </button>
        ))}
      </div>

      {health !== "GREEN" && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="What is wrong?"
          className="w-full px-2.5 py-1.5 bg-white text-gray-900 border border-[#EAE7E0] rounded-md text-xs focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none mb-2"
          data-testid="health-reason"
        />
      )}

      {health === "RED" && (
        <p className="text-[10px] text-gray-500 mb-2">
          The Senior Partner is emailed and alerted.
        </p>
      )}

      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={save}
          disabled={saving}
          className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
          data-testid="health-save"
        >
          {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
