import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import FlowShell from "./FlowShell";
import { flowAPI, authAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  Loader2, ArrowLeft, ChevronRight, Building2, Globe, User, ArrowRight,
  History, GitBranch, MessageCircle, X, Hammer, FileText, CheckCircle2, Pencil
} from "lucide-react";
import { STAGES, BUILD_STATUS_LABELS } from "./stages";

export default function FlowProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [showStageModal, setShowStageModal] = useState(null); // {targetStage, payload?}
  // Correcting details after creation. A mistyped project name was previously
  // permanent, since nothing in the interface could change it.
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState({});

  const openEdit = () => {
    setForm({
      name: project?.name || "",
      client_name: project?.client_name_snapshot || "",
      website: project?.website || "",
      description: project?.description || "",
      notes: project?.notes || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!form.name?.trim()) { toast.error("Project name cannot be empty"); return; }
    setSavingEdit(true);
    try {
      const res = await flowAPI.updateProject(id, form);
      toast.success(res.changed?.length ? `Updated ${res.changed.join(", ")}` : "No changes");
      setEditing(false);
      await load();
    } catch (err) {
      // 403 here means the project belongs to someone else; the server is the
      // authority on that, not this screen.
      toast.error(err.response?.data?.detail || "Could not save changes");
    } finally { setSavingEdit(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([flowAPI.getProject(id), authAPI.getMe()]);
      setProject(p); setMe(u);
    } catch { toast.error("Project not found"); navigate("/flow/projects"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Arriving from the projects list's edit action opens the form directly,
  // rather than landing on the page and having to find the button.
  useEffect(() => {
    if (project && searchParams.get("edit") === "1" && !editing) openEdit();
    /* eslint-disable-next-line */
  }, [project]);

  const handleAdvance = (target) => {
    // Stages requiring structured input → open modal
    if (target === 2 || target === 5) {
      setShowStageModal({ targetStage: target });
      return;
    }
    const note = window.prompt(`Move to Stage ${target} (${STAGES[target].label}). Add a note (optional):`) || "";
    runTransition(target, note, {});
  };

  const runTransition = async (target, note, payload) => {
    setTransitioning(true);
    try {
      const result = await flowAPI.transitionStage(id, target, note, payload);
      if (result.split_done) {
        toast.success("Stage 5 complete — split into Proposal + Build tracks");
      } else {
        toast.success(`Moved to Stage ${target}: ${STAGES[target].label}`);
      }
      setShowStageModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Transition failed");
    } finally { setTransitioning(false); }
  };

  if (loading) return <FlowShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div></FlowShell>;
  if (!project) return null;

  const stage = project.stage;
  const track = project.track || "main";
  const isLost = project.status === "lost";
  const isMain = track === "main";
  const isProposal = track === "proposal";
  const isBuild = track === "build";
  const canAdvance = !isLost && !transitioning && stage < 10;

  return (
    <FlowShell
      action={
        <Link to="/flow/projects">
          <Button variant="ghost" size="sm" data-testid="back-btn"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        </Link>
      }
    >
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" data-testid="project-detail">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[11px] font-mono text-gray-400">{project.project_id_display}</p>
              <TrackBadge track={track} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{project.client_name_snapshot}</span>
              {project.website && <a href={project.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#1B4332] hover:underline"><Globe className="w-3.5 h-3.5" />{project.website}</a>}
              {project.delivery_owner_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />Owner: {project.delivery_owner_name}</span>}
              {project.pricing_owner_name && <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Ops: {project.pricing_owner_name}</span>}
              {project.assigned_engineer_name && <span className="flex items-center gap-1"><Hammer className="w-3.5 h-3.5" />Eng: {project.assigned_engineer_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
              data-testid="edit-project-btn"
              className="text-gray-600 hover:text-gray-900"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit details
            </Button>
            {isLost ? (
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">LOST</span>
            ) : (
              <span className="px-3 py-1 bg-[#1B4332] text-white text-xs font-semibold rounded-full" data-testid="current-stage">Stage {stage} — {STAGES[stage]?.label}</span>
            )}
          </div>
        </div>

        {/* Correcting details. Stage and ownership are not here on purpose --
            those move through the pipeline actions below, which record who
            changed them. */}
        {editing && (
          <div className="mb-5 p-5 bg-[#F7F6F3] border border-[#EAE7E0] rounded-xl" data-testid="edit-project-form">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Edit project details</h3>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "name", label: "Project name", required: true },
                { key: "client_name", label: "Client" },
                { key: "website", label: "Website" },
              ].map(({ key, label, required }) => (
                <div key={key} className={key === "name" ? "md:col-span-2" : ""}>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    {label}{required && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    value={form[key] || ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    data-testid={`edit-${key}`}
                    className="w-full h-10 px-3 bg-white border border-[#EAE7E0] rounded-lg text-sm focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              ))}
              {[
                { key: "description", label: "Description" },
                { key: "notes", label: "Notes" },
              ].map(({ key, label }) => (
                <div key={key} className="md:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
                  <textarea
                    rows={2}
                    value={form[key] || ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    data-testid={`edit-${key}`}
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-lg text-sm focus:outline-none focus:border-[#1B4332] resize-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={savingEdit} className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="save-project-edit">
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </div>
        )}

        {project.description && <p className="text-sm text-gray-600 my-4 leading-relaxed">{project.description}</p>}

        {/* Sibling banner */}
        {project.sibling_project_id && (
          <Link
            to={`/flow/projects/${project.sibling_project_id}`}
            className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 hover:bg-amber-100 transition"
            data-testid="sibling-link"
          >
            <GitBranch className="w-4 h-4" />
            <span>Sister record: <strong>{isBuild ? "Proposal track" : isProposal ? "Build track" : "Main"}</strong> — open</span>
            <ChevronRight className="w-3 h-3 ml-auto" />
          </Link>
        )}

        {/* Stage progression — show only stages in this project's track + main */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs uppercase text-gray-400 mb-3 font-semibold tracking-widest">Stage progression</p>
          <div className="flex items-center gap-1 flex-wrap">
            {Object.entries(STAGES).filter(([k, s]) => {
              const sk = parseInt(k);
              if (isMain) return sk <= 5;
              if (isProposal) return sk >= 6 && sk <= 8;
              if (isBuild) return sk >= 9 && sk <= 10;
              return true;
            }).map(([k, s]) => {
              const sk = parseInt(k);
              const done = sk < stage;
              const cur = sk === stage;
              return (
                <div key={k} className="flex items-center">
                  <button
                    disabled={transitioning || isLost || cur || sk < stage}
                    onClick={() => handleAdvance(sk)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                      cur ? "bg-[#1B4332] text-white" :
                      done ? "bg-green-100 text-green-800" :
                      "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    } ${transitioning || isLost || sk < stage ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    data-testid={`stage-btn-${sk}`}
                    title={s.label}
                  >
                    <span className="font-mono">{sk}</span>
                    <span className="hidden md:inline">{s.label}</span>
                  </button>
                  {sk < Math.max(...Object.keys(STAGES).map(Number).filter(x => {
                    if (isMain) return x <= 5;
                    if (isProposal) return x >= 6 && x <= 8;
                    if (isBuild) return x >= 9 && x <= 10;
                    return true;
                  })) && <ChevronRight className="w-3 h-3 text-gray-300 mx-0.5" />}
                </div>
              );
            })}
          </div>
          {canAdvance && stage < 10 && (
            <Button onClick={() => handleAdvance(stage + 1)} disabled={transitioning} className="mt-4 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="advance-btn">
              {transitioning ? "Moving..." : <>Advance to Stage {stage + 1} <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          )}
        </div>
      </div>

      {/* BUILD-TRACK PANEL */}
      {isBuild && <BuildPanel project={project} onChange={load} />}

      {/* PROPOSAL-TRACK PANEL */}
      {isProposal && <ProposalPanel project={project} stage={stage} />}

      {/* BIRTHDAY TICKER — only renders if there's a birthday in next 14 days for any contact on this client */}
      <BirthdayTicker projectId={project.id} contactId={project.id} />

      {/* CLIENT PROFILE — contacts + birthdays scoped to this project's client */}
      <ClientProfileSection projectId={project.id} clientName={project.client_name_snapshot} />

      {/* STAGE HISTORY */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><History className="w-4 h-4" />Stage history</h3>
        {(project.stage_history || []).length === 0 ? (
          <p className="text-sm text-gray-400">No transitions yet.</p>
        ) : (
          <ol className="space-y-2">
            {project.stage_history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 text-sm" data-testid={`history-${i}`}>
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">Stage {h.stage}</span>
                <span className="text-gray-700">{h.by_name}</span>
                <span className="text-xs text-gray-400">{new Date(h.at).toLocaleString()}</span>
                {h.note && <span className="text-gray-500 italic">— {h.note}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>

      {showStageModal && (
        <StructuredStageModal
          targetStage={showStageModal.targetStage}
          project={project}
          me={me}
          onClose={() => setShowStageModal(null)}
          onSubmit={runTransition}
          transitioning={transitioning}
        />
      )}
    </FlowShell>
  );
}

const TrackBadge = ({ track }) => {
  const cfg = {
    main:     { label: "Main",     color: "bg-gray-200 text-gray-700" },
    proposal: { label: "Proposal", color: "bg-indigo-200 text-indigo-800" },
    build:    { label: "Build",    color: "bg-emerald-200 text-emerald-800" },
  }[track] || { label: track, color: "bg-gray-200 text-gray-700" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.color}`}>{cfg.label.toUpperCase()}</span>;
};

// ---------------------------------------------------------------------------
// STRUCTURED STAGE MODAL — Stage 2 (assign Delivery Owner) + Stage 5 (assign Ops + Engineer)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// BUILD PANEL — status indicator + comment thread + EOD reminder (shown on build-track projects)
// ---------------------------------------------------------------------------
const BuildPanel = ({ project, onChange }) => {
  const [status, setStatus] = useState(project.build_status || "planning");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e?.preventDefault();
    if (!comment.trim() && status === project.build_status) {
      toast.error("Add a comment or change status");
      return;
    }
    setSaving(true);
    try {
      await flowAPI.buildUpdate(project.id, status, comment.trim() || null);
      toast.success("Build update saved");
      setComment("");
      onChange();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-4" data-testid="build-panel">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Hammer className="w-4 h-4" />Build status</h3>

      <div className="flex flex-wrap gap-2 mb-4" data-testid="build-status-selector">
        {Object.entries(BUILD_STATUS_LABELS).map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatus(k)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              status === k ? "ring-2 ring-[#1B4332] ring-offset-1 " + v.color : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
            data-testid={`build-status-${k}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="space-y-3">
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you ship today? Any blockers? (sent at EOD to delivery owner)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none resize-none"
          data-testid="build-comment-input"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">EOD reminder fires daily 17:00 UTC if no update is logged.</p>
          <Button type="submit" disabled={saving} className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" size="sm" data-testid="build-submit">
            {saving ? "Saving..." : "Post update"}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <h4 className="text-xs uppercase font-semibold text-gray-500 tracking-widest mb-2 flex items-center gap-1.5">
          <MessageCircle className="w-3 h-3" />Comments ({(project.build_comments || []).length})
        </h4>
        {(project.build_comments || []).length === 0 ? (
          <p className="text-sm text-gray-400 italic">No build comments yet.</p>
        ) : (
          <ul className="space-y-3" data-testid="build-comments">
            {[...project.build_comments].reverse().map((c, i) => (
              <li key={i} className="border-l-2 border-emerald-200 pl-3 py-1">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.text}</p>
                <p className="text-[10px] text-gray-400 mt-1">{c.by_name} · {new Date(c.at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PROPOSAL PANEL — shown on proposal-track projects
// ---------------------------------------------------------------------------
const ProposalPanel = ({ project, stage }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-4" data-testid="proposal-panel">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" />Proposal workspace</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <StatusPill icon={FileText} label="Drafted" done={stage >= 6} />
        <StatusPill icon={CheckCircle2} label="Exec Approved" done={stage >= 7} />
        <StatusPill icon={ArrowRight} label="Sent to Client" done={stage >= 8} />
      </div>

      <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        🚧 LLM proposal generation + e-signature are <strong>Phase B</strong> features.
        For now, attach proposal documents externally and advance the stage manually.
      </div>
    </div>
  );
};

const StatusPill = ({ icon: Icon, label, done }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${done ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
    <Icon className="w-4 h-4" />
    <span className="font-medium">{label}</span>
  </div>
);

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none";

const Field = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// CLIENT PROFILE — contacts + birthdays scoped to this project's client
// ---------------------------------------------------------------------------
const ClientProfileSection = ({ projectId, clientName }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await flowAPI.projectContacts(projectId);
      setData(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const contacts = data?.contacts || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-4" data-testid="client-profile">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-4 h-4" />Client profile <span className="text-xs text-gray-400 font-normal">— {clientName}</span>
        </h3>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="add-contact-btn">
          <X className="w-3 h-3 mr-1 rotate-45" /> Add Contact
        </Button>
      </div>

      {loading ? (
        <div className="py-4 text-sm text-gray-400">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
          <p className="text-amber-900 mb-2">No contacts on file for <strong>{clientName}</strong> yet.</p>
          <p className="text-amber-700 text-xs">Add the primary contact + their birthday so the Relationship Owner can plan touches. Saved birthdays automatically show up on the Calendar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="contact-list">
          {contacts.map((c) => (
            <div key={c.contact_id} className="border border-gray-100 rounded-lg p-3" data-testid={`contact-${c.contact_id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.full_name}</p>
                  <p className="text-xs text-gray-500">{c.title || "—"}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{(c.strength || "warm").toUpperCase()}</span>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                {c.email && <p>📧 {c.email}</p>}
                {c.phone && <p>📞 {c.phone}</p>}
                {c.birthday && <p className="text-pink-700 font-medium">🎂 Birthday {c.birthday}</p>}
                {c.work_anniversary && <p>🎉 Work anniversary {c.work_anniversary}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <QuickContactModal clientName={clientName} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
};

const QuickContactModal = ({ clientName, onClose, onSaved }) => {
  const [f, setF] = useState({
    client_name: clientName || "",
    full_name: "", title: "", email: "", phone: "", whatsapp: "",
    birthday: "", work_anniversary: "", spouse_name: "", spouse_birthday: "",
    strength: "warm", notes: "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!f.full_name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await flowAPI.createContact(f);
      toast.success("Contact added");
      onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto" data-testid="quick-contact-modal">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Add contact for <span className="text-[#1B4332]">{clientName}</span></h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Inp label="Full Name *" v={f.full_name} on={(v) => set("full_name", v)} testid="qc-name" />
          <Inp label="Title" v={f.title} on={(v) => set("title", v)} />
          <Inp label="Email" v={f.email} on={(v) => set("email", v)} />
          <Inp label="Phone" v={f.phone} on={(v) => set("phone", v)} />
          <Inp label="WhatsApp" v={f.whatsapp} on={(v) => set("whatsapp", v)} />
          <Inp label="Birthday (DD-MM)" v={f.birthday} on={(v) => set("birthday", v)} placeholder="e.g. 15-04" testid="qc-birthday" />
          <Inp label="Work Anniversary (DD-MM)" v={f.work_anniversary} on={(v) => set("work_anniversary", v)} />
          <Inp label="Spouse Name" v={f.spouse_name} on={(v) => set("spouse_name", v)} />
          <Inp label="Spouse Birthday (DD-MM)" v={f.spouse_birthday} on={(v) => set("spouse_birthday", v)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship strength</label>
            <select value={f.strength} onChange={(e) => set("strength", e.target.value)} className={inputCls}>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="strong">Strong</option>
              <option value="champion">Champion</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="qc-save">
            {saving ? "Saving..." : "Save Contact"}
          </Button>
        </div>
      </form>
    </div>
  );
};

const Inp = ({ label, v, on, placeholder, testid }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className={inputCls} data-testid={testid} />
  </div>
);

// ---------------------------------------------------------------------------
// BIRTHDAY TICKER — shows at top of project when any client contact has a
// birthday/anniversary in the next 14 days
// ---------------------------------------------------------------------------
const BirthdayTicker = ({ projectId }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    flowAPI.projectContacts(projectId)
      .then((d) => setItems(d.upcoming_birthdays || []))
      .catch(() => {});
  }, [projectId]);

  if (items.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-pink-50 to-amber-50 border border-pink-200 rounded-xl p-4 mt-4 flex items-start gap-3" data-testid="birthday-ticker">
      <span className="text-2xl">🎂</span>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 text-sm">
          {items.length === 1 ? "Upcoming birthday on this client" : `${items.length} upcoming events on this client (next 14 days)`}
        </p>
        <ul className="mt-1.5 space-y-1">
          {items.map((it, i) => (
            <li key={i} className="text-sm flex items-center gap-2" data-testid={`ticker-item-${i}`}>
              <span className="text-pink-700 font-medium min-w-[60px]">
                {it.days_until === 0 ? "Today" : `${it.days_until}d`}
              </span>
              <span className="text-gray-700">{it.label}</span>
              <span className="text-xs text-gray-400">· {it.kind.replace("_", " ")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
