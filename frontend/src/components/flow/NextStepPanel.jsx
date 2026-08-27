import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, AlertTriangle, HelpCircle, Loader2, ArrowRight, Lock, Undo2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { flowAPI, intelligenceAPI } from "../../lib/api";
import { FUNCTION_LABELS, LAST_STAGE, VALIDATION_STAGE } from "../../pages/flow/stages";
import { Button } from "../ui/button";
import Suggestion from "./Suggestion";
import { fixFor, fixHref } from "./gateFixes";

/**
 * What happens next on this project, and what stands in the way.
 *
 * There is no model behind this. The specification already wrote down, for
 * every stage, what goes in, what to do and what comes out, and what has to be
 * true before the stage may be left. That is a checklist, so it is rendered as
 * one. When the intelligence layer arrives it replaces the text inside this
 * panel and the panel does not move.
 *
 * A condition is one of three things:
 *   satisfied true   the system can see it is done
 *   satisfied false  the system can see it is not, and it blocks
 *   satisfied null   nobody can tell from the data; a person judges it
 */

const ConditionRow = ({ condition, project }) => {
  const { satisfied, label } = condition;
  const icon =
    satisfied === true ? <Check className="w-3.5 h-3.5 text-[#1FB58A]" />
    : satisfied === false ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
    : <HelpCircle className="w-3.5 h-3.5 text-gray-400" />;

  // A red condition becomes a link to wherever it is fixed. This panel is
  // where most people first meet a blocked gate, so it is the place that
  // most needed it.
  const fix = project ? fixFor(condition) : null;
  const href = fix && !fix.blockedByOther ? fixHref(project.id, fix) : null;

  return (
    <li className="flex items-start gap-2 py-1">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className={`text-xs ${satisfied === false ? "text-red-700" : "text-gray-700"}`}>
        {label}
        {satisfied === null && <span className="text-gray-400"> · your judgement</span>}
        {fix && (
          <span className="block mt-0.5">
            {href ? (
              <Link
                to={href}
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

export default function NextStepPanel({ project, onAdvance, refreshKey, me, onChanged }) {
  const [gate, setGate] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadNextStep = useCallback(
    () => intelligenceAPI.nextStep(project.id), [project.id]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const g = await flowAPI.getGate(project.id);
        if (!cancelled) setGate(g);
      } catch {
        if (!cancelled) setGate(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [project.id, refreshKey]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#EAE7E0] bg-white p-5 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-[#1B4332]" />
      </div>
    );
  }
  if (!gate) return null;

  const { playbook = {}, conditions = [], blocking = [], can_move, owner_function } = gate;
  const atEnd = project.stage >= LAST_STAGE;
  const isBlocked = blocking.length > 0;

  return (
    <div className="rounded-xl border border-[#EAE7E0] bg-white overflow-hidden" data-testid="next-step-panel">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-gray-400 mb-1">
              {atEnd ? "COMPLETE" : "WHAT HAPPENS NEXT"}
            </p>
            <p className="text-sm font-medium text-gray-900">
              {atEnd ? "This project is closed." : playbook.next}
            </p>
            {/* The line above is the stage playbook: correct, and identical on
                every project at this stage. This narrows it to *this* project
                -- what its gate is still missing, who owns that, and how long
                it has been waiting. Read-only: there is nothing to apply, the
                next action is the panel's own Advance button. */}
            {!atEnd && (
              <div className="mt-2">
                <Suggestion
                  testId="next-step-suggestion"
                  auto={false}
                  title="What does this project need?"
                  load={loadNextStep}
                />
              </div>
            )}
            {owner_function && !atEnd && (
              <p className="text-xs text-gray-500 mt-1">
                Owned by {FUNCTION_LABELS[owner_function] || owner_function}
                {owner_function === "tsd" && project.tsd_name && <> · {project.tsd_name}</>}
                {owner_function === "solution_architect" && project.architect_name && <> · {project.architect_name}</>}
                {owner_function === "solution_architect" && !project.architect_name && (
                  <span className="text-amber-700"> · nobody named yet</span>
                )}
              </p>
            )}
          </div>

          {!atEnd && (
            <Button
              size="sm"
              onClick={() => onAdvance(project.stage + 1)}
              disabled={!can_move}
              className={
                isBlocked
                  ? "shrink-0 bg-white text-gray-700 border border-[#EAE7E0] hover:bg-gray-50"
                  : "shrink-0 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
              }
              data-testid="advance-btn"
              title={can_move ? undefined : "This project's TSD moves it through the pipeline, and its architect advances the stages they own"}
            >
              {can_move ? null : <Lock className="w-3 h-3 mr-1.5" />}
              {gate.next_stage_label}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Stage 6 is the one place the Senior Partner sits on the critical path,
          and it blocks. All three endpoints existed and nothing called them, so
          the stage could be reached and never left. */}
      {project.stage === ARCHITECT_STAGE && !project.architect_id && (
        <ArchitectStep project={project} me={me} onChanged={onChanged} />
      )}

      {/* Going back for another demo round is the design rather than a
          correction, which is why it needs no written reason. It had no button. */}
      {project.stage === FEEDBACK_STAGE && can_move && (
        <div className="px-5 pb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAdvance(DEMO_STAGE)}
            data-testid="another-demo-round-btn"
          >
            <Undo2 className="w-3.5 h-3.5 mr-1.5" />
            Back for another demo round
          </Button>
        </div>
      )}

      {conditions.length > 0 && !atEnd && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-mono text-gray-400 mb-1">
            BEFORE LEAVING {gate.stage_label?.toUpperCase()}
          </p>
          <ul>
            {conditions.map((c) => <ConditionRow key={c.label} condition={c} project={project} />)}
          </ul>
        </div>
      )}

      {/* Passing client validation freezes scope. Saying so before it happens
          is more use than explaining it afterwards. */}
      {project.stage === VALIDATION_STAGE && !project.scope_frozen && (
        <div className="px-5 py-2.5 bg-[#C6A15B]/10 border-t border-[#C6A15B]/30">
          <p className="text-[11px] text-[#7A6234]">
            Validating freezes scope. After this, a new or changed requirement becomes a
            scope change with a decision behind it.
          </p>
        </div>
      )}

      {playbook.activities?.length > 0 && !atEnd && (
        <details className="border-t border-[#EAE7E0]">
          <summary className="px-5 py-2.5 text-[11px] text-gray-500 cursor-pointer hover:bg-gray-50 select-none">
            What this stage involves
          </summary>
          <div className="px-5 pb-4 pt-1 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-mono text-gray-400 mb-1">ACTIVITIES</p>
              <ul className="space-y-0.5">
                {playbook.activities.map((a) => (
                  <li key={a} className="text-xs text-gray-600">· {a}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-mono text-gray-400 mb-1">PRODUCES</p>
              <ul className="space-y-0.5">
                {(playbook.outputs || []).map((o) => (
                  <li key={o} className="text-xs text-gray-600">· {o}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

// Stage numbers this panel reacts to. Named rather than written inline so the
// reason each one matters is readable.
const ARCHITECT_STAGE = 6;
const DEMO_STAGE = 9;
const FEEDBACK_STAGE = 10;

/**
 * Requesting and choosing the Solution Architect.
 *
 * Three people see three different things, because three different people are
 * waiting on three different things:
 *
 *   the TSD asks for one, then waits
 *   the Senior Partner picks one, and only they can
 *   everybody else is told who it is waiting on
 *
 * Selecting advances the stage immediately. Stage 6 should be a gate, not a
 * room people sit in: the wait is worth showing precisely because it blocks,
 * and it should end the moment the block clears.
 */
function ArchitectStep({ project, me, onChanged }) {
  const [candidates, setCandidates] = useState([]);
  const [busy, setBusy] = useState(false);
  // Which candidate the records point at, so the Senior Partner sees the
  // suggestion beside the actual list rather than instead of it.
  const [suggestedId, setSuggestedId] = useState(null);

  const loadArchitectSuggestion = useCallback(
    () => intelligenceAPI.recommendArchitect(project.id), [project.id]
  );

  const isTsd = me?.user_id && me.user_id === project.tsd_id;
  const isPartner = me?.function_role === "senior_partner"
    || ["super_admin", "mini_admin"].includes(me?.role);
  const requested = !!project.architect_requested_at;

  useEffect(() => {
    if (!isPartner) return;
    let live = true;
    (async () => {
      try {
        const rows = await flowAPI.architectCandidates();
        if (live) setCandidates(rows || []);
      } catch { /* the list simply stays empty */ }
    })();
    return () => { live = false; };
  }, [isPartner]);

  const request = async () => {
    setBusy(true);
    try {
      await flowAPI.requestArchitect(project.id);
      toast.success("The Senior Partner has been asked");
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send the request");
    } finally { setBusy(false); }
  };

  const select = async (userId, name) => {
    setBusy(true);
    try {
      // `select-architect` only names them -- it never moved the stage, so
      // stage 6 kept a project sitting on a satisfied gate until somebody
      // separately clicked Advance. That's exactly the "room people sit in"
      // this component's own comment says stage 6 must not be, so the move
      // to stage 7 happens right here, in the same action.
      await flowAPI.selectArchitect(project.id, userId);
      await flowAPI.transitionStage(project.id, ARCHITECT_STAGE + 1);
      toast.success(`${name} is the Solution Architect`);
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not select them");
    } finally { setBusy(false); }
  };

  return (
    <div className="px-5 pb-4 pt-1" data-testid="architect-step">
      {isPartner ? (
        <>
          <p className="text-[10px] font-mono text-gray-400 mb-2">
            CHOOSE THE SOLUTION ARCHITECT
          </p>
          {/* Ranks the same people the list below shows, on who holds the
              role, who has architected for this client before, and who is
              already loaded. It highlights a row; the Senior Partner still
              clicks Select, which is the one decision §13 keeps with them. */}
          <div className="mb-2">
            <Suggestion
              testId="architect-suggestion"
              load={loadArchitectSuggestion}
              applyLabel="Highlight"
              onApply={(fields) => setSuggestedId(fields.architect_id)}
            />
          </div>
          {candidates.length === 0 ? (
            <p className="text-xs text-gray-500 italic">
              Nobody is marked as able to architect yet. An administrator grants that on
              an engineer&apos;s account.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {candidates.map((c) => (
                <li key={c.user_id}
                    className={`flex items-center justify-between gap-3 px-3 py-2
                               rounded-lg border ${
                                 c.user_id === suggestedId
                                   ? "border-[#1FB58A] bg-[#1FB58A]/[0.07]"
                                   : "border-[#EAE7E0] bg-[#F7F6F3]"
                               }`}>
                  <span className="min-w-0">
                    <span className="text-sm text-gray-900">{c.name}</span>
                    {c.user_id === suggestedId && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full
                                       bg-[#1FB58A]/15 text-[#1B4332]">suggested</span>
                    )}
                    <span className="block text-[11px] text-gray-500 truncate">{c.email}</span>
                  </span>
                  <Button size="sm" disabled={busy}
                          className="bg-[#1B4332] hover:bg-[#14342A] shrink-0"
                          data-testid={`select-architect-${c.user_id}`}
                          onClick={() => select(c.user_id, c.name)}>
                    Select
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : requested ? (
        <p className="text-xs text-gray-600">
          Waiting for the Senior Partner to choose an architect. Asked{" "}
          {new Date(project.architect_requested_at).toLocaleDateString(undefined,
            { day: "numeric", month: "short" })}.
        </p>
      ) : isTsd ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={request}
                data-testid="request-architect-btn">
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Request an architect
        </Button>
      ) : (
        <p className="text-xs text-gray-500 italic">
          The TSD has not asked for an architect yet.
        </p>
      )}
    </div>
  );
}
