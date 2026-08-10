import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { flowAPI } from "../../lib/api";
import { STAGES } from "../../pages/flow/stages";
import { Button } from "../ui/button";

/**
 * The structured input two stages require before a project may advance:
 * stage 2 names a Delivery Owner, stage 5 names an Operations Owner and an
 * Engineer.
 *
 * Lives here rather than inside the project page because the pipeline board
 * needs it too. Dropping a card onto stage 2 used to navigate the whole
 * window to the project, losing the board and everything on screen, purely
 * because the form it needed was defined somewhere else.
 */
const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none";

const Field = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
  </div>
);

const StructuredStageModal = ({ targetStage, project, onClose, onSubmit, transitioning }) => {
  const [note, setNote] = useState("");
  const [deliveryOwnerId, setDeliveryOwnerId] = useState(project.delivery_owner_id || "");
  const [pricingOwnerId, setPricingOwnerId] = useState(project.pricing_owner_id || "");
  const [engineerId, setEngineerId] = useState(project.assigned_engineer_id || "");
  const [deliveryOwners, setDeliveryOwners] = useState([]);
  const [pricingOwners, setPricingOwners] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (targetStage === 2) {
          const list = await flowAPI.usersByRole("is_delivery_owner");
          setDeliveryOwners(list);
        }
        if (targetStage === 5) {
          const [opsRes, engRes] = await Promise.allSettled([
            flowAPI.usersByRole("is_operations_owner"),
            flowAPI.usersByRole("is_engineer"),
          ]);
          setPricingOwners(opsRes.status === "fulfilled" ? opsRes.value : []);
          setEngineers(engRes.status === "fulfilled" ? engRes.value : []);
        }
      } catch { toast.error("Failed to load role members"); }
      finally { setLoading(false); }
    };
    fetch();
  }, [targetStage]);

  // Whoever manages the project advances it. This used to be gated here on
  // is_delivery_coordinator / is_delivery_owner — flags no account has ever
  // held, so the fields were locked and the form unusable for everybody. The
  // real check lives on the server, which asks whether you manage the project.
  const submit = (e) => {
    e.preventDefault();
    if (targetStage === 2) {
      if (!deliveryOwnerId) { toast.error("Select a Delivery Owner"); return; }
      onSubmit(2, note, { delivery_owner_id: deliveryOwnerId });
    }
    if (targetStage === 5) {
      if (!pricingOwnerId) { toast.error("Select an Operations Owner"); return; }
      if (!engineerId) { toast.error("Select an Engineer"); return; }
      onSubmit(5, note, { operations_owner_id: pricingOwnerId, engineer_id: engineerId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="stage-modal">
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Advance to Stage {targetStage}: {STAGES[targetStage].label}</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div>
        ) : (
          <>
            {targetStage === 2 && (
              <>
                <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                  Name the person who owns delivery for this client. They will show on the project and can be changed later.
                </p>
                <Field label="Delivery Owner *">
                  <select value={deliveryOwnerId} onChange={(e) => setDeliveryOwnerId(e.target.value)} className={inputCls} data-testid="modal-owner-select">
                    <option value="">— select Delivery Owner —</option>
                    {deliveryOwners.map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>)}
                  </select>
                  {deliveryOwners.length === 0 && <p className="text-xs text-red-600 mt-1">No active staff to choose from.</p>}
                </Field>
              </>
            )}

            {targetStage === 5 && (
              <>
                <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                  This splits the project into a <strong>Proposal track</strong> (Stage 6) and a <strong>Build track</strong> (Stage 9).
                  Name who leads each.
                </p>
                <Field label="Operations Owner *">
                  <select value={pricingOwnerId} onChange={(e) => setPricingOwnerId(e.target.value)} className={inputCls} data-testid="modal-ops-select">
                    <option value="">— select Operations Owner —</option>
                    {pricingOwners.map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>)}
                  </select>
                  {pricingOwners.length === 0 && <p className="text-xs text-red-600 mt-1">No active staff to choose from.</p>}
                </Field>
                <Field label="Engineer *">
                  <select value={engineerId} onChange={(e) => setEngineerId(e.target.value)} className={inputCls} data-testid="modal-engineer-select">
                    <option value="">— select Engineer —</option>
                    {engineers.map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>)}
                  </select>
                  {engineers.length === 0 && <p className="text-xs text-red-600 mt-1">No active staff to choose from.</p>}
                </Field>
              </>
            )}

            <Field label="Note (optional)">
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls + " resize-none"} placeholder="Context for the audit log..." />
            </Field>

            <div className="flex justify-end gap-2 mt-5">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={transitioning} className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="modal-submit">
                {transitioning ? "Saving..." : targetStage === 5 ? "Split & Advance" : "Advance"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default StructuredStageModal;
