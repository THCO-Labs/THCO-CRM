import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Loader2, Check, AlertTriangle, HelpCircle, ArrowRight } from "lucide-react";
import { flowAPI, intelligenceAPI } from "../../lib/api";
import { STAGES, FUNCTION_LABELS } from "../../pages/flow/stages";
import { Button } from "../ui/button";
import Suggestion from "./Suggestion";
import { fixFor, fixHref } from "./gateFixes";

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

const ConditionRow = ({ condition, project, onNavigateAway }) => {
  const { satisfied, label } = condition;
  const icon =
    satisfied === true ? <Check className="w-3.5 h-3.5 text-[#1FB58A]" />
    : satisfied === false ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
    : <HelpCircle className="w-3.5 h-3.5 text-gray-400" />;

  // An unmet condition that has somewhere to be fixed becomes a link there.
  // Being told what is missing and left to find where to put it is the part
  // that wastes people's time.
  //
  // Following one closes this dialog. The link opens a drawer or a tab on the
  // page underneath, so leaving the dialog up means landing on the thing you
  // asked for with a modal sitting over it -- which reads as the link having
  // half-worked.
  const fix = project ? fixFor(condition) : null;
  const href = fix && !fix.blockedByOther ? fixHref(project.id, fix) : null;

  return (
    <li className="flex items-start gap-2 py-1">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className={`text-xs ${satisfied === false ? "text-red-700" : "text-gray-700"}`}>
        {label}
        {satisfied === null && (
          <span className="text-gray-400"> &middot; your judgement</span>
        )}
        {fix && (
          <span className="block mt-0.5">
            {href ? (
              <Link
                to={href}
                onClick={onNavigateAway}
                className="text-[11px] text-[#1B4332] underline underline-offset-2
                           hover:text-[#14342A] inline-flex items-center gap-1"
                data-testid={`fix-${condition.auto}`}
              >
                {fix.action}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <span className="text-[11px] text-gray-500">{fix.action}</span>
            )}
            <span className="block text-[11px] text-gray-400">{fix.hint}</span>
          </span>
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

  const loadTsdSuggestion = useCallback(
    () => intelligenceAPI.recommendTsd(project.id), [project.id]
  );

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

  // Moving a project *back* is a correction, not an advance, and the gate has
  // nothing to say about it — the server skips the conditions entirely on a
  // backward move. Showing them anyway made going 10→9 look identical to going
  // 10→11, which is exactly the confusion this removes.
  const goingBack = targetStage < (project.stage ?? 1);
  // The demo loop is the design rather than a correction, so it alone needs no
  // written reason. Every other backward move does, and the server enforces it.
  const isDemoLoop = (project.stage ?? 1) === 10 && targetStage === 9;
  const reasonRequiredToGoBack = goingBack && !isDemoLoop;

  const blocking = goingBack ? [] : (gate?.blocking || []);
  const isBlocked = blocking.length > 0;
  const canForce = gate?.can_move !== false;
  // Who is reading decides how the forced-gate warning is worded.
  const isSeniorPartner =
    me?.function_role === "senior_partner"
    || ["super_admin", "mini_admin"].includes(me?.role);
  const noteRequired = (isBlocked && force) || reasonRequiredToGoBack;
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
              {/* Going back: the gate is not shown at all, because it does not
                  apply and showing it made a backward move look like a forward
                  one. What replaces it is what this move actually does. */}
              {goingBack ? (
                <div className={`mb-4 rounded-lg px-3 py-2.5 border ${
                  isDemoLoop
                    ? "bg-[#1FB58A]/[0.07] border-[#1FB58A]/30"
                    : "bg-[#C6A15B]/10 border-[#C6A15B]/30"
                }`}>
                  <p className="text-[10px] font-mono text-gray-500 mb-0.5">
                    {isDemoLoop ? "ANOTHER DEMO ROUND" : "MOVING THIS PROJECT BACK"}
                  </p>
                  <p className="text-xs text-gray-700">
                    {isDemoLoop
                      ? "Going back for another round is how the demo loop is meant to work, so this needs no written reason. The project returns to Mockup and Demo and a new round can be created."
                      : <>This returns the project from <b>{STAGES[project.stage]?.label}</b> to{" "}
                         <b>{stage?.label}</b>. Nothing already recorded is deleted. The gate
                         conditions do not apply to a backward move &mdash; but the reason does,
                         and it is kept in the stage history.</>}
                  </p>
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
                          <ConditionRow
                            key={c.label}
                            condition={c}
                            project={project}
                            onNavigateAway={onCancel}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </>
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
                  {/* Ranks the same people the dropdown lists, on who has run
                      this client before and who is already loaded. It selects
                      the dropdown; the move still has to be submitted. */}
                  <div className="mt-2">
                    <Suggestion
                      testId="tsd-suggestion"
                      load={loadTsdSuggestion}
                      applyLabel="Choose them"
                      onApply={(fields) => setTsdId(fields.tsd_id)}
                    />
                  </div>
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
