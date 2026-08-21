import { useEffect, useState } from "react";
import { X, Loader2, Check, AlertTriangle, HelpCircle } from "lucide-react";
import { flowAPI } from "../../lib/api";
import { STAGES, FUNCTION_LABELS } from "../../pages/flow/stages";
import { Button } from "../ui/button";

/**
 * The dialog that advances a project one stage.
 *
 * It shows the gate: what the stage needs before it may be left, which of
 * those the system can already see is done, and which are a judgement call
 * somebody has to make. Nothing here decides anything -- the API refuses an
 * unmet gate on its own -- but a person should be able to see why before they
 * are told no, rather than after.
 *
 * Stage 2 additionally names the TSD, because a project cannot be received by
 * somebody until somebody is chosen.
 *
 * Lives here rather than inside the project page because the pipeline board
 * needs it too. Dropping a card onto a stage used to navigate the whole window
 * to the project, losing the board and everything on screen, purely because
 * the form it needed was defined somewhere else.
 */

// bg-white/text-gray-900 are named so the dark-mode overrides (which key on
// `input.bg-white`) reach these fields; without them the input keeps a white
// background while its text follows the theme to near-white.
const inputCls =
  "w-full px-3 py-2 bg-white text-gray-900 border border-[#EAE7E0] rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none";

const Field = ({ label, hint, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
  </div>
);

const ConditionRow = ({ condition }) => {
  const { satisfied, label } = condition;
  const icon =
    satisfied === true ? <Check className="w-3.5 h-3.5 text-[#1FB58A]" />
    : satisfied === false ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
    : <HelpCircle className="w-3.5 h-3.5 text-gray-400" />;
  return (
    <li className="flex items-start gap-2 py-1">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className={`text-xs ${satisfied === false ? "text-red-700" : "text-gray-700"}`}>
        {label}
        {satisfied === null && (
          <span className="text-gray-400"> · your judgement</span>
        )}
      </span>
    </li>
  );
};

const StructuredStageModal = ({ targetStage, project, me, saving, onCancel, onSubmit }) => {
  const [note, setNote] = useState("");
  const [force, setForce] = useState(false);
  const [gate, setGate] = useState(null);
  const [tsdId, setTsdId] = useState(project.tsd_id || "");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const stage = STAGES[targetStage];
  const needsTsd = targetStage === 2;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [g, list] = await Promise.all([
          flowAPI.getGate(project.id),
          needsTsd ? flowAPI.usersByFunction("tsd") : Promise.resolve([]),
        ]);
        setGate(g);
        setPeople(list);
      } catch {
        // A gate we cannot read should not stop somebody moving a project the
        // API would allow. The dialog degrades to a note field.
        setGate(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [project.id, needsTsd]);

  const blocking = gate?.blocking || [];
  const isBlocked = blocking.length > 0;
  const canForce = gate?.can_move !== false;
  // Who is reading decides how the forced-gate warning is worded.
  const isSeniorPartner =
    me?.function_role === "senior_partner"
    || ["super_admin", "mini_admin"].includes(me?.role);
  const noteRequired = isBlocked && force;
  const submitDisabled =
    saving ||
    (isBlocked && !force) ||
    (noteRequired && !note.trim()) ||
    (needsTsd && !tsdId);

  const handleSubmit = () => {
    const payload = {};
    if (needsTsd) payload.tsd_id = tsdId;
    onSubmit(targetStage, note.trim(), payload, force);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* bg-background is dark in light mode here, so the surface names its
          own colours. Every other dialog in this app does the same. */}
      <div className="w-full max-w-lg bg-white border border-[#EAE7E0] text-gray-900 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-[#EAE7E0]">
          <div>
            <p className="text-[10px] font-mono text-gray-400">
              STAGE {targetStage} OF 17
            </p>
            <h3 className="text-base font-semibold text-gray-900">{stage?.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {project.name}
              {stage?.owner && (
                <> · owned by {FUNCTION_LABELS[stage.owner] || stage.owner}</>
              )}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#1B4332]" />
            </div>
          ) : (
            <>
              {gate?.playbook?.next && (
                <div className="mb-4 rounded-lg bg-[#F7F6F3] px-3 py-2.5">
                  <p className="text-[10px] font-mono text-gray-400 mb-0.5">WHAT HAPPENS NEXT</p>
                  <p className="text-xs text-gray-700">{gate.playbook.next}</p>
                </div>
              )}

              {gate?.conditions?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-medium text-gray-700 mb-1">
                    Before leaving {gate.stage_label}
                  </p>
                  <ul className="rounded-lg border border-[#EAE7E0] px-3 py-2">
                    {gate.conditions.map((c) => (
                      <ConditionRow key={c.label} condition={c} />
                    ))}
                  </ul>
                </div>
              )}

              {needsTsd && (
                <Field
                  label="TSD"
                  hint="Whoever takes this owns the client, the project state and every stage from here."
                >
                  <select
                    value={tsdId}
                    onChange={(e) => setTsdId(e.target.value)}
                    className={inputCls}
                    data-testid="stage-tsd-select"
                  >
                    <option value="">Choose a TSD…</option>
                    {people.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.name}
                        {p.holds_function ? "" : " (not a TSD)"}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {isBlocked && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-red-800 mb-1">
                    This stage is not finished
                  </p>
                  <p className="text-[11px] text-red-700 mb-2">
                    {blocking.join(", ")}.
                  </p>
                  {canForce ? (
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={force}
                        onChange={(e) => setForce(e.target.checked)}
                        className="mt-0.5"
                        data-testid="stage-force"
                      />
                      {/* The Senior Partner reading their own account should
                          not be told they will be emailed about something they
                          are doing. Same rule, told to the person it applies
                          to. */}
                      <span className="text-[11px] text-red-800">
                        {isSeniorPartner
                          ? "Advance anyway. The reason is kept in the stage history and this is recorded as a forced gate."
                          : "Advance anyway. The Senior Partner is emailed and alerted, and the reason is kept in the stage history."}
                      </span>
                    </label>
                  ) : (
                    <p className="text-[11px] text-red-700">
                      Only this project's TSD can advance past an unmet gate.
                    </p>
                  )}
                </div>
              )}

              <Field
                label={noteRequired ? "Reason (required)" : "Note (optional)"}
                hint="Kept in the stage history, which is the only durable record of why this project is where it is."
              >
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder={
                    noteRequired
                      ? "Why is this moving before the stage is finished?"
                      : "Anything worth knowing later"
                  }
                  data-testid="stage-note"
                />
              </Field>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#EAE7E0]">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
            data-testid="stage-submit"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {isBlocked && force ? "Advance anyway" : `Move to ${stage?.label}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StructuredStageModal;
