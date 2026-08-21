import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FlowShell from "./FlowShell";
import { useUser, canCreateProjects } from "../../context/UserContext";
import { flowAPI, authAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Loader2, Plus, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import StructuredStageModal from "../../components/flow/StructuredStageModal";
import { STAGES, PHASES, PHASE_ORDER, PHASE_BORDER, HEALTH } from "./stages";

/**
 * The pipeline board.
 *
 * Seventeen columns is unusable, so the default view is the six phases of the
 * lifecycle and each card carries its own stage. Picking a phase expands it
 * into its stages for anyone who wants that detail.
 *
 * A card moves one stage at a time and the API refuses anything else, so the
 * board offers exactly the moves that exist: drop onto the next phase and the
 * project advances by one stage.
 */
export default function FlowBoard() {
  const user = useUser();
  const canCreate = canCreateProjects(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [hoverKey, setHoverKey] = useState(null);
  const [stageModal, setStageModal] = useState(null);
  const [me, setMe] = useState(null);
  const [moving, setMoving] = useState(false);
  // null shows the six phases; a phase key expands that phase into its stages.
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, u] = await Promise.all([flowAPI.getBoard(), authAPI.getMe()]);
      setData(d);
      setMe(u);
    } catch (e) {
      toast.error("Could not load the pipeline");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const onDragStart = (e, project) => {
    setDragging({ project });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", project.id);
  };

  // A project advances one stage at a time, so the only drop that means
  // anything is the stage immediately after the one it is on. Anywhere else is
  // refused here rather than by a round trip that returns an error.
  const targetStageFor = (columnKey) => {
    if (!dragging) return null;
    const current = dragging.project.stage;
    if (expanded) return Number(columnKey);
    const phaseOfNext = STAGES[current + 1]?.phase;
    return phaseOfNext === columnKey ? current + 1 : null;
  };

  const onDragOver = (e, columnKey) => {
    if (!dragging) return;
    const target = targetStageFor(columnKey);
    if (!target || target === dragging.project.stage) return;
    if (target !== dragging.project.stage + 1) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoverKey !== columnKey) setHoverKey(columnKey);
  };

  const onDragLeave = () => setHoverKey(null);

  const onDrop = (e, columnKey) => {
    e.preventDefault();
    setHoverKey(null);
    const target = targetStageFor(columnKey);
    if (!dragging || !target) return;
    setStageModal({ project: dragging.project, targetStage: target });
    setDragging(null);
  };

  const submitStructured = async (target, note, payload, force = false) => {
    const { project } = stageModal;
    setMoving(true);
    try {
      await flowAPI.transitionStage(project.id, target, note, payload, force);
      toast.success(`${project.name} moved to ${STAGES[target]?.label}`);
      setStageModal(null);
      await load();
    } catch (err) {
      // The API answers an unmet gate with the list of what is missing, which
      // is more use than "could not move".
      const detail = err?.response?.data?.detail;
      if (detail?.blocking) {
        toast.error(`Not yet: ${detail.blocking.join(", ")}`);
      } else {
        toast.error(typeof detail === "string" ? detail : "Could not move the project");
      }
    } finally {
      setMoving(false);
    }
  };

  if (loading) {
    return (
      <FlowShell title="Pipeline">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" />
        </div>
      </FlowShell>
    );
  }
  if (!data) return <FlowShell title="Pipeline"><p className="text-sm text-gray-500">No pipeline data.</p></FlowShell>;

  const columns = expanded
    ? Object.entries(STAGES)
        .filter(([, cfg]) => cfg.phase === expanded)
        .map(([num, cfg]) => ({
          key: num,
          label: cfg.label,
          sub: `STAGE ${num}`,
          border: PHASE_BORDER[cfg.phase],
          cards: data.by_stage?.[num] || [],
        }))
    : PHASE_ORDER.map((key) => ({
        key,
        label: PHASES[key].label,
        sub: `PHASE ${PHASES[key].order} OF 6`,
        border: PHASE_BORDER[key],
        cards: data.by_phase?.[key] || [],
      }));

  return (
    <FlowShell
      title="Pipeline"
      actions={canCreate ? (
        <Link to="/flow/projects/new">
          <Button className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="board-new-btn">
            <Plus className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
        </Link>) : null}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-xs text-gray-500">
          Drag a card to the next column to advance it. A project moves one stage at a time,
          and the gate for that stage has to be satisfied first.
        </p>
        {/* A filter, not tabs. Styled as tabs it read as six places to go
            rather than one control narrowing what is already on screen, so it
            gets a label, a rounded chip set and a way back to everything. */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] uppercase tracking-wide text-gray-400">Show</span>
          <div className="flex items-center gap-1 rounded-full border border-[#EAE7E0] bg-white p-0.5">
            <button
              onClick={() => setExpanded(null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                !expanded
                  ? "bg-[#1B4332] text-white"
                  : "text-gray-600 hover:bg-[#F7F6F3]"
              }`}
              data-testid="board-view-phases"
            >
              All phases
            </button>
            {PHASE_ORDER.map((key) => (
              <button
                key={key}
                onClick={() => setExpanded(expanded === key ? null : key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  expanded === key
                    ? "text-white"
                    : "text-gray-600 hover:bg-[#F7F6F3]"
                }`}
                style={expanded === key ? { backgroundColor: PHASES[key].accent } : undefined}
                data-testid={`board-view-${key}`}
              >
                {PHASES[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.unmigrated?.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-900">
            {data.unmigrated.length} project{data.unmigrated.length === 1 ? " is" : "s are"} not on the
            new lifecycle yet and {data.unmigrated.length === 1 ? "is" : "are"} not shown:{" "}
            <span className="font-medium">{data.unmigrated.map((p) => p.name).join(", ")}</span>.
            Run the migration to bring {data.unmigrated.length === 1 ? "it" : "them"} in.
          </p>
        </div>
      )}

      <div className="overflow-x-auto pb-2" data-testid="kanban-board">
        <div className="flex gap-3 min-w-min">
          {columns.map((col) => {
            const isHover = hoverKey === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => onDragOver(e, col.key)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, col.key)}
                className={`min-w-[264px] w-[264px] bg-gray-50 rounded-xl border-t-4 ${col.border} p-3 transition ${
                  isHover ? "ring-2 ring-[#1B4332] bg-[#1B4332]/5" : ""
                }`}
                data-testid={`column-${col.key}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-mono text-gray-400">{col.sub}</p>
                    <h3 className="text-sm font-semibold text-gray-900">{col.label}</h3>
                  </div>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 font-medium">
                    {col.cards.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[620px] overflow-y-auto">
                  {col.cards.map((c) => {
                    const health = HEALTH[c.health] || HEALTH.GREEN;
                    return (
                      <div
                        key={c.id}
                        draggable={!moving}
                        onDragStart={(e) => onDragStart(e, c)}
                        className={`bg-white rounded-lg p-3 border border-gray-100 hover:border-[#1B4332] hover:shadow-sm transition cursor-move active:opacity-50 ${
                          dragging?.project.id === c.id ? "opacity-40" : ""
                        }`}
                        data-testid={`card-${c.id}`}
                      >
                        <Link to={`/flow/projects/${c.id}`} className="block">
                          <div className="flex items-start gap-2">
                            <span
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${health.dot}`}
                              title={`${health.label}${c.health_reason ? `: ${c.health_reason}` : ""}`}
                            />
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">{c.name}</p>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{c.client_name_snapshot}</span>
                          </div>

                          {/* On the phase view the stage is the detail the
                              column no longer carries, so the card states it. */}
                          {!expanded && (
                            <p className="text-[10px] text-gray-500 mt-1.5">
                              <span className="font-mono text-gray-400">{c.stage}/17</span>{" "}
                              {c.stage_label}
                            </p>
                          )}

                          {c.tsd_name && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              TSD <span className="font-medium">{c.tsd_name}</span>
                            </p>
                          )}
                          {!c.tsd_name && (
                            <p className="text-[10px] text-amber-700 mt-1">No TSD assigned</p>
                          )}
                        </Link>
                      </div>
                    );
                  })}
                  {col.cards.length === 0 && (
                    <p className="text-[11px] text-gray-400 py-4 text-center">Nothing here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stageModal && (
        <StructuredStageModal
          project={stageModal.project}
          targetStage={stageModal.targetStage}
          me={me}
          saving={moving}
          onCancel={() => setStageModal(null)}
          onSubmit={submitStructured}
        />
      )}
    </FlowShell>
  );
}
