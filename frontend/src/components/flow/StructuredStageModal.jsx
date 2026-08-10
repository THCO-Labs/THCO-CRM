import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { flowAPI } from "../../lib/api";
import { STAGES } from "../../pages/flow/stages";

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
const StructuredStageModal = ({ targetStage, project, me, onClose, onSubmit, transitioning }) => {
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

  // Permission helpers
  const isCoordinator = me?.is_delivery_coordinator || me?.role === "super_admin";
  const isDeliveryOwner = me?.is_delivery_owner || me?.role === "super_admin";

  const submit = (e) => {
    e.preventDefault();
    if (targetStage === 2) {
      if (!deliveryOwnerId) { toast.error("Select a Delivery Owner"); return; }
      if (!isCoordinator) { toast.error("Only the Delivery Coordinator can pick the client"); return; }
      onSubmit(2, note, { delivery_owner_id: deliveryOwnerId });
    }
    if (targetStage === 5) {
      if (!pricingOwnerId) { toast.error("Select an Operations Owner"); return; }
      if (!engineerId) { toast.error("Select an Engineer (Coordinator only)"); return; }
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
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  Only the <strong>Delivery Coordinator</strong> can pick a new client and assign the Delivery Owner.
                </p>
                <Field label="Delivery Owner *">
                  <select value={deliveryOwnerId} onChange={(e) => setDeliveryOwnerId(e.target.value)} className={inputCls} data-testid="modal-owner-select" disabled={!isCoordinator}>
                    <option value="">— select Delivery Owner —</option>
                    {deliveryOwners.map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>)}
                  </select>
                  {deliveryOwners.length === 0 && <p className="text-xs text-red-600 mt-1">No users hold the <code>is_delivery_owner</code> role. Ask an admin to assign one at /flow/admin/roles.</p>}
                </Field>
              </>
            )}

            {targetStage === 5 && (
              <>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <strong>Delivery Owner</strong> fills Operations Owner. <strong>Delivery Coordinator</strong> assigns the Engineer.
                  Submitting this will split the project into <strong>Proposal track</strong> (Stage 6, Ops) + <strong>Build track</strong> (Stage 9, Eng).
                </p>
                <Field label="Operations Owner *">
                  <select value={pricingOwnerId} onChange={(e) => setPricingOwnerId(e.target.value)} className={inputCls} data-testid="modal-ops-select" disabled={!(isCoordinator || isDeliveryOwner)}>
                    <option value="">— select Operations Owner —</option>
                    {pricingOwners.map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>)}
                  </select>
                  {pricingOwners.length === 0 && <p className="text-xs text-red-600 mt-1">No users hold the <code>is_operations_owner</code> role.</p>}
                </Field>
                <Field label="Engineer * (only the Delivery Coordinator can assign)">
                  <select value={engineerId} onChange={(e) => setEngineerId(e.target.value)} className={inputCls} data-testid="modal-engineer-select" disabled={!isCoordinator}>
                    <option value="">— select Engineer —</option>
                    {engineers.map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>)}
                  </select>
                  {engineers.length === 0 && <p className="text-xs text-red-600 mt-1">No users hold the <code>is_engineer</code> role.</p>}
                  {!isCoordinator && <p className="text-xs text-amber-600 mt-1">This field is locked — only a Delivery Coordinator can edit it.</p>}
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
