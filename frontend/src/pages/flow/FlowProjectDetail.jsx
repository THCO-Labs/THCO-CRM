import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import FlowShell from "./FlowShell";
import { flowAPI, authAPI } from "../../lib/api";
import CollaboratorPicker from "../../components/flow/CollaboratorPicker";
import StructuredStageModal from "../../components/flow/StructuredStageModal";
import { Button } from "../../components/ui/button";
import {
  Loader2, ArrowLeft, ChevronRight, Building2, Globe, User, ArrowRight,
  GitBranch, MessageCircle, X, Hammer, FileText, CheckCircle2, Pencil
} from "lucide-react";
import { STAGES, PHASES, PHASE_ORDER, BUILD_STATUS_LABELS, LAST_STAGE, stageSummary } from "./stages";
import HealthControl from "../../components/flow/HealthControl";
import ProjectWorkspace from "../../components/flow/ProjectWorkspace";
import LifecycleLine from "../../components/flow/LifecycleLine";
import TsdAcknowledgement from "../../components/flow/TsdAcknowledgement";
import PodResponse from "../../components/flow/PodResponse";

export default function FlowProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [gate, setGate] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [showStageModal, setShowStageModal] = useState(null); // {targetStage, payload?}
  // Correcting details after creation. A mistyped project name was previously
  // permanent, since nothing in the interface could change it.
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState({});
  const editRef = useRef(null);
  // Project team
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamIds, setTeamIds] = useState([]);
  const [savingTeam, setSavingTeam] = useState(false);
  const [staff, setStaff] = useState([]);
  const [savingManager, setSavingManager] = useState(false);
  const [managerIds, setManagerIds] = useState([]);

  const openEdit = () => {
    setForm({
      name: project?.name || "",
      client_name: project?.client_name_snapshot || "",
      website: project?.website || "",
      description: project?.description || "",
      notes: project?.notes || "",
    });
    setEditing(true);
    // The form opens below the team panel, off the bottom of most screens, so
    // pressing Edit details looked like it did nothing at all. Bring it into
    // view and put the cursor in the first field, so the button visibly does
    // something and you can start typing.
    requestAnimationFrame(() => {
      editRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      editRef.current?.querySelector("input")?.focus();
    });
  };

  const saveEdit = async () => {
    if (!form.name?.trim()) { toast.error("Project name cannot be empty"); return; }
    setSavingEdit(true);
    try {
      const res = await flowAPI.updateProject(id, form);
      toast.success(res.changed?.length ? `Updated ${res.changed.join(", ")}` : "No changes");
      setEditing(false);
      await load({ silent: true });
    } catch (err) {
      // 403 here means the project belongs to someone else; the server is the
      // authority on that, not this screen.
      toast.error(err.response?.data?.detail || "Could not save changes");
    } finally { setSavingEdit(false); }
  };

  // `silent` refreshes project/gate state in place without flipping the
  // page-level `loading` flag. That flag gates whether ProjectWorkspace (and
  // its own local state -- which drawer is open, which tab is active) is
  // mounted at all, so every non-silent call was unmounting and remounting
  // the whole workspace on each background refresh: a drawer opened, an item
  // checked inside it, and the drawer that item lived in was gone. Only the
  // very first load (a real navigation) should show the full-page spinner.
  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [p, u] = await Promise.all([flowAPI.getProject(id), authAPI.getMe()]);
      setProject(p); setMe(u);
      // The lifecycle line and the next-step panel both want this, so it is
      // fetched once here rather than twice below.
      flowAPI.getGate(p.id).then(setGate).catch(() => setGate(null));
    } catch { toast.error("Project not found"); navigate("/flow/projects"); }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Arriving from the projects list's edit action opens the form directly,
  // rather than landing on the page and having to find the button.
  useEffect(() => {
    if (project && searchParams.get("edit") === "1" && !editing) openEdit();
    /* eslint-disable-next-line */
  }, [project]);

  // Who works on this project. A unit head (or an administrator) adds and
  // removes people at any time; everybody else sees the list read-only.
  // The pod is the TSD's to staff, with the architect alongside because they
  // decide what the build needs. Heading a unit no longer comes into it: a
  // project does not belong to a unit any more.
  const canManageTeam =
    me &&
    (["super_admin", "mini_admin"].includes(me.role) ||
      me.is_hr ||
      me.user_id === project?.tsd_id ||
      me.user_id === project?.architect_id);

  const isAdmin =
    me && (["super_admin", "mini_admin"].includes(me.role) || me.is_hr);

  // Everybody active, for both the TSD picker and the pod editor. A pod is
  // drawn from across the capability teams, so this is not scoped to a unit.
  useEffect(() => {
    if (!canManageTeam || staff.length) return;
    (async () => {
      try {
        const data = await flowAPI.staff();
        setStaff(data?.staff || []);
      } catch {
        /* the picker simply stays empty */
      }
    })();
  }, [canManageTeam, staff.length]);

  const changeManager = async (userId) => {
    setSavingManager(true);
    try {
      const res = await flowAPI.setProjectManager(id, userId);
      toast.success(
        res.tsd_name
          ? `${res.tsd_name} is now the TSD for this project`
          : "TSD cleared"
      );
      // Write it straight into the project on screen so the header, the card
      // and the toast agree immediately, then refetch for everything else the
      // change touches, such as the gate on stage 2.
      setProject((prev) => (prev
        ? { ...prev, tsd_id: res.tsd_id || null, tsd_name: res.tsd_name || null }
        : prev));
      load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not change the TSD");
    } finally {
      setSavingManager(false);
    }
  };

  const openTeam = () => {
    setTeamIds((project?.collaborator_ids || []).slice());
    setManagerIds((project?.project_manager_ids || []).slice());
    setTeamOpen(true);
  };

  // A co-manager runs the project alongside whoever else manages it; an
  // engineer on the same project does the work but does not staff it.
  const toggleManager = (uid) =>
    setManagerIds((ids) => (ids.includes(uid) ? ids.filter((x) => x !== uid) : [...ids, uid]));

  const saveTeam = async () => {
    setSavingTeam(true);
    try {
      const res = await flowAPI.setCollaborators(id, teamIds, managerIds);
      const added = res.added || 0;
      const removed = res.removed || 0;
      toast.success(
        added || removed
          ? `Team updated — ${added} added, ${removed} removed`
          : "No change to the team"
      );
      setTeamOpen(false);
      load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not update the team");
    } finally {
      setSavingTeam(false);
    }
  };

  // Every move opens the dialog, because the dialog is where the gate is
  // shown: what this stage still needs, what the system can already see is
  // done, and what is a judgement somebody has to make. A prompt box could ask
  // for a note but could not answer "why not".
  const handleAdvance = (target) => setShowStageModal({ targetStage: target });

  const runTransition = async (target, note, payload, force = false) => {
    setTransitioning(true);
    try {
      await flowAPI.transitionStage(id, target, note, payload, force);
      toast.success(`Moved to ${STAGES[target].label}`);
      setShowStageModal(null);
      load({ silent: true });
    } catch (e) {
      // An unmet gate comes back with the list of what is missing, which is
      // more use than "transition failed".
      const detail = e.response?.data?.detail;
      if (detail?.blocking) {
        toast.error(`Not yet: ${detail.blocking.join(", ")}`);
      } else {
        toast.error(typeof detail === "string" ? detail : "Could not move the project");
      }
    } finally { setTransitioning(false); }
  };

  if (loading) return <FlowShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div></FlowShell>;
  if (!project) return null;

  const stage = project.stage;
  const isLost = project.status === "lost";
  // The split-track model is retired: one project, one record, one lifecycle.
  // These three asked which sibling record you were looking at; what the page
  // needs now is simply how far the project has got.
  const isBuild = stage >= 13;
  const isMain = !isBuild;
  const canAdvance = !isLost && !transitioning && stage < LAST_STAGE;
  // Whoever owns the client owns the project state, so the controls that
  // change it are theirs.
  const isProjectTsd = me?.user_id && me.user_id === project.tsd_id;
  const isProjectArchitect = me?.user_id && me.user_id === project.architect_id;
  const canRunProject = isProjectTsd || me?.role === "super_admin" || me?.role === "mini_admin";

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
              <span className="text-[11px] text-gray-500">{stageSummary(stage)}</span>
              <HealthControl project={project} canEdit={canRunProject} onChanged={() => load({ silent: true })} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{project.client_name_snapshot}</span>
              {project.website && <a href={project.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#1B4332] hover:underline"><Globe className="w-3.5 h-3.5" />{project.website}</a>}
              {project.tsd_name
                ? <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />TSD: {project.tsd_name}</span>
                : <span className="flex items-center gap-1 text-amber-700"><User className="w-3.5 h-3.5" />No TSD assigned</span>}
              {project.architect_name && <span className="flex items-center gap-1"><Hammer className="w-3.5 h-3.5" />Architect: {project.architect_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (editing ? setEditing(false) : openEdit())}
              data-testid="edit-project-btn"
              className={editing ? "border-[#1B4332] text-[#1B4332] bg-[#1B4332]/5" : "text-gray-600 hover:text-gray-900"}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              {editing ? "Close editor" : "Edit details"}
            </Button>
            {isLost ? (
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">LOST</span>
            ) : (
              <span className="px-3 py-1 bg-[#1B4332] text-white text-xs font-semibold rounded-full" data-testid="current-stage">Stage {stage} — {STAGES[stage]?.label}</span>
            )}
          </div>
        </div>

        {/* The lifecycle, directly under the project name and its people.
            One line: six phases, a marker per stage inside them, and the
            advance control beside it. Everything about the current stage --
            what happens next, what it involves, what is blocking -- appears on
            hovering a marker and goes away again, so the page is not carrying
            seventeen stages of explanation nobody asked for. */}
        <div className="mt-5">
          <LifecycleLine
            project={project}
            gate={gate}
            onAdvance={handleAdvance}
            canAdvance={!isLost && !transitioning && stage < LAST_STAGE && gate?.can_move}
            me={me}
            onChanged={() => load({ silent: true })}
          />
        </div>
        </div>

        {/* The TSD saying where they are with a project they were handed.
          Directly under the header because "has the TSD picked this up" is the
          first question anybody opening an early-stage project has, and until
          now nothing on the page answered it. Hidden once the project is well
          past intake -- it is an intake question, not a permanent panel. */}
      {stage <= 4 && (
        <div className="mb-5">
          <TsdAcknowledgement
            project={project}
            role="tsd"
            isTsd={isProjectTsd}
            canRecord={isProjectTsd || isAdmin}
            onChanged={() => load({ silent: true })}
          />
        </div>
      )}

      {/* The architect gets the same three buttons, for the same reason: being
          named and then hearing nothing is the gap, and it was the same gap
          for both roles. Shown from the moment one is named until the build
          is under way. */}
      {project.architect_id && stage >= 6 && stage <= 9 && (
        <div className="mb-5">
          <TsdAcknowledgement
            project={project}
            role="architect"
            isTsd={isProjectArchitect}
            canRecord={isProjectArchitect || isAdmin}
            onChanged={() => load({ silent: true })}
          />
        </div>
      )}

      {/* Everybody else placed on the project. Being added was treated as
          agreeing, which it is not -- people are on leave or at capacity,
          and the project found out when the work did not happen. */}
      <div className="mb-5">
        <PodResponse
          project={project}
          me={me}
          onChanged={() => load({ silent: true })}
        />
      </div>

      {/* Who runs this project. A unit's manager runs everything in it,
            which is the right default and the wrong fit when one project
            belongs to somebody else -- so an administrator can hand a single
            project over without making that person run the whole unit. */}
        {isAdmin && (
          <div className="mb-5 p-4 bg-[#F7F6F3] border border-[#EAE7E0] rounded-xl" data-testid="project-manager">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">TSD</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {project.tsd_name
                    ? `${project.tsd_name} runs this project.`
                    : "Nobody owns this project yet."}
                </p>
              </div>
              <select
                value={project.tsd_id || ""}
                disabled={savingManager}
                onChange={(e) => changeManager(e.target.value || null)}
                className="shrink-0 max-w-[210px] text-[12px] border border-[#EAE7E0] rounded-lg px-2.5 py-1.5 bg-white text-gray-900 outline-none focus:border-[#C6A15B] disabled:opacity-50"
                data-testid="project-manager-select"
              >
                {/* Resting value is "nobody", not the first name in the list.
                    Defaulting to a name showed an owner nobody had chosen
                    while the header still said none was assigned. */}
                <option value="">— not assigned —</option>
                {staff.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {editing && (
          <div ref={editRef} className="mb-5 p-5 bg-[#F7F6F3] border border-[#EAE7E0] rounded-xl" data-testid="edit-project-form">
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
        {/* The split-track sibling link lived here. One project is now one
            record for its whole life, so there is no sibling to cross to. */}

      {/* THE WORKSPACE
          Four tabs and six drawers over one project. What a project produces
          as it moves lives here: requirements, the Product Brief, the uploaded
          architecture, demo rounds, client feedback, documents and history.

          The architect is handed no briefing package. They read this, the same
          as everyone else, from the moment they are named. */}
      <div className="mt-4">
        <ProjectWorkspace projectId={project.id} project={project} onChanged={() => load({ silent: true })} />
      </div>

      {/* BUILD STATUS - the board carries the work; this is the summary line */}
      {isBuild && <BuildPanel project={project} onChange={() => load({ silent: true })} />}

      {showStageModal && (
        <StructuredStageModal
          targetStage={showStageModal.targetStage}
          project={project}
          me={me}
          onCancel={() => setShowStageModal(null)}
          onSubmit={runTransition}
          saving={transitioning}
        />
      )}
    </FlowShell>
  );
}

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
const StatusPill = ({ icon: Icon, label, done }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${done ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
    <Icon className="w-4 h-4" />
    <span className="font-medium">{label}</span>
  </div>
);

// bg-white/text-gray-900 are named so the dark-mode overrides reach these
// fields -- see NewProjectForm for the same fix and the reason.
const inputCls = "w-full px-3 py-2 bg-white text-gray-900 border border-[#EAE7E0] rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none";

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
                {c.whatsapp && <p>💬 {c.whatsapp}</p>}
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
