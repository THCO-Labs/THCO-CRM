import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FlowShell from "./FlowShell";
import { useUser, canCreateProjects } from "../../context/UserContext";
import { flowAPI, authAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Loader2, Plus, Building2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import StructuredStageModal from "../../components/flow/StructuredStageModal";
import { STAGES, STAGE_BORDER } from "./stages";

export default function FlowBoard() {
  const user = useUser();
  const canCreate = canCreateProjects(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null); // { project, fromStage }
  const [hoverStage, setHoverStage] = useState(null);
  const [stageModal, setStageModal] = useState(null);   // {project, targetStage}
  const [me, setMe] = useState(null);
  const [moving, setMoving] = useState(false);

  const load = async () => {
    setLoading(true);
    // The stage form applies the same role checks as the project page, so it
    // needs to know who is signed in.
    const [d, u] = await Promise.all([flowAPI.getBoard(), authAPI.getMe()]);
    setData(d);
    setMe(u);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDragStart = (e, project, fromStage) => {
    setDragging({ project, fromStage });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", project.id);
  };

  const onDragOver = (e, stage) => {
    if (!dragging) return;
    // Track boundaries: card can only land in its own track or main
    const fromTrack = dragging.project.track || STAGES[dragging.fromStage]?.track;
    const toTrack = STAGES[stage]?.track;
    if (fromTrack !== "main" && fromTrack !== toTrack) return; // disallow
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoverStage !== stage) setHoverStage(stage);
  };

  const onDragLeave = () => setHoverStage(null);

  // The same transition the project page performs, run from the board so the
  // card lands where it was dropped.
  const submitStructured = async (target, note, payload) => {
    const { project } = stageModal;
    setMoving(true);
    try {
      const res = await flowAPI.transitionStage(project.id, target, note, payload);
      toast.success(
        res.split_done
          ? "Stage 5 complete — split into Proposal and Build records"
          : `${project.name} moved to Stage ${target}`
      );
      setStageModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not move the project");
    } finally {
      setMoving(false);
    }
  };

  const onDrop = async (e, targetStage) => {
    e.preventDefault();
    setHoverStage(null);
    if (!dragging) return;
    const { project, fromStage } = dragging;
    setDragging(null);
    if (fromStage === targetStage) return;

    const fromTrack = project.track || STAGES[fromStage]?.track;
    const toTrack = STAGES[targetStage]?.track;
    if (fromTrack !== "main" && fromTrack !== toTrack) {
      toast.error("Cards can only move within their own track");
      return;
    }

    // Stages 2 and 5 need a name attached before they can advance. Ask for it
    // here rather than sending the whole window to the project page, which
    // threw away the board and everything else on screen to show one form.
    if (targetStage === 2 || targetStage === 5) {
      setStageModal({ project, targetStage });
      return;
    }

    // Optimistic update
    setData(prev => {
      const board = { ...prev.board };
      board[fromStage] = (board[fromStage] || []).filter(p => p.id !== project.id);
      const updated = { ...project, stage: targetStage, track: toTrack };
      board[targetStage] = [updated, ...(board[targetStage] || [])];
      return { ...prev, board };
    });

    setMoving(true);
    try {
      await flowAPI.transitionStage(project.id, targetStage, "Moved via Kanban drag-drop");
      toast.success(`Moved to Stage ${targetStage}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Move failed — reverting");
      load();
    } finally { setMoving(false); }
  };

  if (loading) {
    return <FlowShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div></FlowShell>;
  }
  if (!data) return <FlowShell><p className="text-gray-500">No data.</p></FlowShell>;

  return (
    <FlowShell
      title={`Pipeline (Kanban)${moving ? " — saving…" : ""}`}
      action={
        // Same rule as everywhere else: only a project manager or an
        // administrator opens work.
        canCreate ? (
        <Link to="/flow/projects/new">
          <Button className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="board-new-btn">
            <Plus className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
        </Link>) : null
      }
    >
      <p className="text-xs text-gray-400 mb-3">
        Drag a card into another column to move it. Stages 2 and 5 ask for a name before they advance.
        After Stage 5 a project SPLITS into a Proposal record (6–8) and a Build record (9–10).
      </p>

      {/* Track legend */}
      <div className="flex gap-3 mb-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300"></span>Main (1–5)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-400"></span>Proposal (6–8)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>Build (9–10)</span>
      </div>

      <div className="overflow-x-auto pb-2" data-testid="kanban-board">
        <div className="flex gap-3 min-w-min">
          {data.stages.map((s) => {
            const cards = data.board[s.stage] || [];
            const isHover = hoverStage === s.stage;
            return (
              <div
                key={s.stage}
                onDragOver={(e) => onDragOver(e, s.stage)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, s.stage)}
                className={`min-w-[260px] w-[260px] bg-gray-50 rounded-xl border-t-4 ${STAGE_BORDER[s.stage]} p-3 transition ${
                  isHover ? "ring-2 ring-[#1B4332] bg-[#1B4332]/5" : ""
                }`}
                data-testid={`column-stage-${s.stage}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-mono text-gray-400">STAGE {s.stage} · {s.track.toUpperCase()}</p>
                    <h3 className="text-sm font-semibold text-gray-900">{s.label}</h3>
                  </div>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 font-medium">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      draggable={!moving}
                      onDragStart={(e) => onDragStart(e, c, s.stage)}
                      className={`bg-white rounded-lg p-3 border border-gray-100 hover:border-[#1B4332] hover:shadow-sm transition cursor-move active:opacity-50 ${
                        dragging?.project.id === c.id ? "opacity-40" : ""
                      }`}
                      data-testid={`card-${c.id}`}
                    >
                      <Link to={`/flow/projects/${c.id}`} className="block">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate">{c.client_name_snapshot}</span>
                        </div>
                        {c.project_id_display && (
                          <p className="text-[10px] font-mono text-gray-400 mt-1">{c.project_id_display}</p>
                        )}
                        {c.delivery_owner_name && (
                          <p className="text-[10px] text-gray-500 mt-1">Owner: <span className="font-medium">{c.delivery_owner_name}</span></p>
                        )}
                        {c.parent_project_id && (
                          <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1"><GitBranch className="w-2.5 h-2.5" />split from parent</p>
                        )}
                      </Link>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <p className="text-xs text-gray-300 italic text-center py-4">
                      {isHover ? "Drop here →" : "No projects"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stageModal && (
        <StructuredStageModal
          targetStage={stageModal.targetStage}
          project={stageModal.project}
          me={me}
          transitioning={moving}
          onClose={() => setStageModal(null)}
          onSubmit={submitStructured}
        />
      )}
    </FlowShell>
  );
}
