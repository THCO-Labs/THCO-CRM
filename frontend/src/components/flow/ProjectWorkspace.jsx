// The project workspace: four tabs, and everything else behind an icon.
//
// The specification lists fifteen tabs. Fifteen tabs is a filing cabinet, not
// a workspace, so what earns a tab is what several people read often, and the
// rest opens in a drawer over the page: no route change, no second navigation
// tree, no separate workspace to get lost in.
//
// Architecture is the clearest case. It is not a canvas or a component graph;
// it is a list of documents the architect uploaded, and one button. That fits
// in a drawer.

import { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, Check, Contact, FileText, Layers, Loader2,
  MonitorPlay, Plus, Trash2, Upload, Users, X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deliveryAPI, flowAPI } from "@/lib/api";
import FileLink from "./FileLink";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "product", label: "Product" },
  { key: "build", label: "Build" },
  { key: "history", label: "History" },
];

const DRAWERS = [
  { key: "architecture", label: "Architecture", icon: Layers },
  { key: "demos", label: "Demos", icon: MonitorPlay },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "feedback", label: "Client feedback", icon: Users },
  // The client used to have a section of its own down the page. It is a thing
  // you occasionally need rather than something to read every time, so it is
  // an icon like the rest.
  { key: "contacts", label: "Client contacts", icon: Contact },
  { key: "activity", label: "Activity", icon: Activity },
];

const REQUIREMENT_STATUS = {
  proposed: "bg-gray-100 text-gray-700",
  committed: "bg-[#1FB58A]/10 text-[#1B4332]",
  open_question: "bg-amber-100 text-amber-800",
  rejected: "bg-red-50 text-red-700",
};

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined,
  { day: "numeric", month: "short", year: "numeric" }) : "");

export default function ProjectWorkspace({ projectId, project, onChanged }) {
  const [tab, setTab] = useState("overview");
  const [drawer, setDrawer] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setData(await deliveryAPI.workspace(projectId));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load the project workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  // Patch one list in place. An upload used to refetch the whole workspace,
  // which closed the drawer and lost the reader's place for a change only one
  // list cared about.
  const patch = (key, updater) =>
    setData((d) => (d ? { ...d, [key]: updater(d[key] || []) } : d));

  const addTo = (key, row) => patch(key, (rows) => [row, ...rows]);

  // Only for changes the header or the gate can see: a stage move, a new
  // requirement that satisfies a condition, a demo outcome.
  const refresh = () => { load(); onChanged?.(); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-[#1B4332]" />
      </div>
    );
  }
  if (!data) return null;

  const can = data.can || {};

  // Legal and Finance write contracts, not software. The server sends them a
  // narrower object rather than the whole project with fields hidden, so the
  // page renders what it was given instead of deciding what to conceal.
  if (data.commercial_slice) {
    return <CommercialSlice data={data} />;
  }

  const counts = {
    architecture: data.architecture?.length || 0,
    demos: data.demos?.length || 0,
    documents: data.documents?.length || 0,
    feedback: data.feedback?.length || 0,
    activity: data.activity?.length || 0,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" data-testid="project-workspace">
      {/* Icon rail. Everything that does not earn a tab lives behind one of
          these, and opens over the page rather than navigating away. */}
      <div className="flex items-center gap-1 px-4 pt-4">
        {DRAWERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setDrawer(key)}
            title={label}
            data-testid={`drawer-${key}`}
            className="relative flex items-center justify-center w-10 h-10 rounded-lg
                       bg-[#1B4332]/[0.08] border border-[#1B4332]/20 text-[#1B4332]
                       hover:bg-[#1B4332]/[0.14] transition-colors"
          >
            <Icon className="w-4 h-4" />
            {counts[key] > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full
                               bg-[#1B4332] text-white text-[10px] font-semibold
                               flex items-center justify-center">
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 px-4 pt-4 border-b border-gray-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`tab-${t.key}`}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? "text-[#1B4332] border-b-2 border-[#1B4332] -mb-px"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "overview" && <OverviewTab data={data} project={project} />}
        {tab === "product" && (
          <ProductTab projectId={projectId} data={data} can={can} onChanged={refresh} />
        )}
        {tab === "build" && (
          <BuildTab data={data} project={project}
                    canManage={can.manage_board} onChanged={refresh} />
        )}
        {tab === "history" && <HistoryTab data={data} project={project} />}
      </div>

      {drawer && (
        <Drawer title={DRAWERS.find((d) => d.key === drawer).label} onClose={() => setDrawer(null)}>
          {drawer === "architecture" && (
            <ArchitectureDrawer projectId={projectId} items={data.architecture}
                                canUpload={can.upload_architecture}
                                onAdded={(row) => { addTo("architecture", row); onChanged?.(); }} />
          )}
          {drawer === "demos" && (
            <DemosDrawer projectId={projectId} demos={data.demos}
                         canManage={can.move_stage} onChanged={refresh} />
          )}
          {drawer === "documents" && (
            <DocumentsDrawer projectId={projectId} documents={data.documents}
                             onAdded={(row) => { addTo("documents", row); onChanged?.(); }} />
          )}
          {drawer === "feedback" && (
            <FeedbackDrawer projectId={projectId} items={data.feedback}
                            canCapture={can.move_stage}
                            onAdded={(row) => { addTo("feedback", row); onChanged?.(); }} />
          )}
          {drawer === "contacts" && (
            <ContactsDrawer projectId={projectId}
                            clientName={project?.client_name_snapshot} />
          )}
          {drawer === "activity" && <ActivityDrawer items={data.activity} />}
        </Drawer>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
function OverviewTab({ data, project }) {
  const committed = data.requirements.filter((r) => r.status === "committed").length;
  const open = data.requirements.filter((r) => r.status === "open_question").length;
  const brief = data.product_briefs?.[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Requirements" value={data.requirements.length} hint={`${committed} committed`} />
        <Stat label="Open questions" value={open} warn={open > 0} />
        <Stat label="Demo rounds" value={data.demos.length} />
        <Stat label="Architecture" value={data.architecture.length}
              hint={data.architecture.length ? `v${data.architecture[0].version}` : "none yet"} />
      </div>

      {project?.desired_outcome && (
        <Section title="What the client asked for">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.desired_outcome}</p>
        </Section>
      )}

      {brief ? (
        <Section title={`Product Brief, version ${brief.version}`}>
          <Field label="Problem">{brief.problem}</Field>
          {brief.outcomes && <Field label="Outcomes">{brief.outcomes}</Field>}
          {brief.success_metrics && <Field label="Success metrics">{brief.success_metrics}</Field>}
        </Section>
      ) : (
        <Empty>No Product Brief yet. It is written on the Product tab, and stage 5 waits for it.</Empty>
      )}
    </div>
  );
}

function ProductTab({ projectId, data, can, onChanged }) {
  return (
    <div className="space-y-6">
      {!can.edit_requirements && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/30">
          <AlertTriangle className="w-4 h-4 text-[#8F7340] mt-0.5 shrink-0" />
          <p className="text-xs text-[#6B5730]">
            Scope is frozen. The client has validated this direction, so a new or changed
            requirement is a scope change with a decision behind it, not an edit.
          </p>
        </div>
      )}

      <ProductBriefSection projectId={projectId} briefs={data.product_briefs}
                           canWrite={can.move_stage} onChanged={onChanged} />
      <RequirementsSection projectId={projectId} requirements={data.requirements}
                           canEdit={can.edit_requirements} onChanged={onChanged} />
      <JourneysSection projectId={projectId} journeys={data.journeys}
                       canEdit={can.edit_requirements} onChanged={onChanged} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The Product Brief
// ---------------------------------------------------------------------------
// Versioned, never overwritten. The Overview used to say the brief was written
// on this tab while this tab had no way to write one, which is the sharpest
// version of "how do we do requirements".
const BRIEF_FIELDS = [
  { key: "problem", label: "The problem", required: true,
    hint: "What is wrong today, in the client's terms." },
  { key: "outcomes", label: "Outcomes",
    hint: "What is different once this exists." },
  { key: "success_metrics", label: "Success metrics",
    hint: "How we will know it worked." },
  { key: "in_scope", label: "In scope" },
  { key: "out_of_scope", label: "Out of scope",
    hint: "Worth more than the in-scope list. This is what stops an argument later." },
  { key: "assumptions", label: "Assumptions" },
];

function ProductBriefSection({ projectId, briefs, canWrite, onChanged }) {
  const latest = briefs?.[0];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() =>
    Object.fromEntries(BRIEF_FIELDS.map((f) => [f.key, latest?.[f.key] || ""])));

  const startEdit = () => {
    // A new version starts from the last one. Retyping an unchanged brief to
    // correct one line is how versions stop being written at all.
    setForm(Object.fromEntries(BRIEF_FIELDS.map((f) => [f.key, latest?.[f.key] || ""])));
    setEditing(true);
  };

  const save = async () => {
    if (!form.problem.trim()) {
      toast.error("The brief needs a problem statement");
      return;
    }
    setSaving(true);
    try {
      await deliveryAPI.addProductBrief(projectId, form);
      toast.success(latest ? `Product Brief v${latest.version + 1} saved` : "Product Brief saved");
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save the brief");
    } finally { setSaving(false); }
  };

  return (
    <Section
      title="Product Brief"
      action={canWrite && !editing && (
        <Button size="sm" variant="outline" onClick={startEdit} data-testid="edit-brief-btn">
          {latest ? `New version (v${latest.version + 1})` : "Write the brief"}
        </Button>
      )}
    >
      {editing ? (
        <div className="space-y-3">
          {BRIEF_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">
                {f.label}{f.required && <span className="text-red-500"> *</span>}
              </label>
              <textarea
                rows={f.key === "problem" ? 3 : 2}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                data-testid={`brief-${f.key}`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                           bg-white text-gray-900 resize-none
                           focus:outline-none focus:border-[#1B4332]"
              />
              {f.hint && <p className="text-[11px] text-gray-400 mt-0.5">{f.hint}</p>}
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}
                    className="bg-[#1B4332] hover:bg-[#14342A]" data-testid="save-brief-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save this version"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : latest ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1FB58A]/10 text-[#1B4332]">
              v{latest.version}
            </span>
            <span className="text-[11px] text-gray-500">
              {latest.author_name} · {fmt(latest.created_at)}
            </span>
            {briefs.length > 1 && (
              <span className="text-[11px] text-gray-400">
                {briefs.length} versions
              </span>
            )}
          </div>
          {BRIEF_FIELDS.filter((f) => latest[f.key]).map((f) => (
            <Field key={f.key} label={f.label}>{latest[f.key]}</Field>
          ))}
        </div>
      ) : (
        <Empty>
          No Product Brief yet. Stage 5 waits for one, and it is what Legal reads to
          write the contract.
        </Empty>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------
// The unit of scope. "Committed" means agreed with the client and inside
// scope: it is the set the freeze locks and the set Legal reads. Nothing could
// reach that state before, which is why a project could show requirements and
// "0 committed" with no way forward.
const STATUS_OPTIONS = [
  { value: "proposed", label: "Proposed" },
  { value: "committed", label: "Committed" },
  { value: "open_question", label: "Open question" },
  { value: "rejected", label: "Rejected" },
];

function RequirementsSection({ projectId, requirements, canEdit, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const proposed = requirements.filter((r) => r.status === "proposed").length;

  const run = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      if (message) toast.success(message);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "That did not work");
    } finally { setBusy(false); }
  };

  const add = async () => {
    if (!description.trim()) return;
    await run(() => deliveryAPI.addRequirement(projectId, { description: description.trim() }));
    setDescription("");
    setAdding(false);
  };

  const saveEdit = async (r) => {
    if (!draft.trim()) return;
    await run(() => deliveryAPI.updateRequirement(projectId, r.requirement_id,
                                                 { description: draft.trim() }));
    setEditingId(null);
  };

  const setStatus = (r, status) =>
    run(() => deliveryAPI.updateRequirement(projectId, r.requirement_id, { status }));

  const commitAll = () =>
    run(async () => {
      for (const r of requirements.filter((x) => x.status === "proposed")) {
        await deliveryAPI.updateRequirement(projectId, r.requirement_id, { status: "committed" });
      }
    }, `${proposed} requirements committed`);

  return (
    <Section
      title="Requirements"
      action={
        <div className="flex items-center gap-2">
          {proposed > 0 && (
            <Button size="sm" variant="outline" onClick={commitAll} disabled={busy}
                    data-testid="commit-all-btn"
                    title="Mark every proposed requirement as agreed with the client">
              <Check className="w-3.5 h-3.5 mr-1" />Commit all {proposed}
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}
                    data-testid="add-requirement-btn">
              <Plus className="w-3.5 h-3.5 mr-1" />Add
            </Button>
          )}
        </div>
      }
    >
      {adding && (
        <div className="mb-3 flex gap-2">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="What does the client need?"
            autoFocus
            data-testid="requirement-input"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
          />
          <Button size="sm" onClick={add} disabled={busy}
                  className="bg-[#1B4332] hover:bg-[#14342A]">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}

      {requirements.length === 0 ? (
        <Empty>
          No requirements yet. Discovery cannot close without at least three, which is
          the gate out of stage 4.
        </Empty>
      ) : (
        <ul className="divide-y divide-gray-100">
          {requirements.map((r) => (
            <li key={r.requirement_id} className="py-2.5 flex items-start gap-3 group">
              <span className="text-[11px] font-mono text-gray-400 pt-1.5 shrink-0 w-10">
                {r.req_ref}
              </span>

              {editingId === r.requirement_id ? (
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(r);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => saveEdit(r)}
                  autoFocus
                  data-testid="requirement-edit-input"
                  className="flex-1 px-2 py-1 text-sm rounded border border-[#1B4332]
                             bg-white text-gray-900 focus:outline-none"
                />
              ) : (
                <span
                  className={`flex-1 text-sm text-gray-800 ${canEdit ? "cursor-text" : ""}`}
                  onClick={() => {
                    if (!canEdit) return;
                    setDraft(r.description);
                    setEditingId(r.requirement_id);
                  }}
                  title={canEdit ? "Click to edit" : undefined}
                >
                  {r.description}
                </span>
              )}

              {/* The status is always changeable, frozen or not: closing a
                  requirement out is not a scope change, it is the record
                  catching up with what was decided. */}
              <select
                value={r.status}
                disabled={busy}
                onChange={(e) => setStatus(r, e.target.value)}
                data-testid={`requirement-status-${r.req_ref}`}
                className={`shrink-0 text-[10px] rounded-full px-2 py-1 border-0 cursor-pointer
                            ${REQUIREMENT_STATUS[r.status] || REQUIREMENT_STATUS.proposed}`}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {canEdit && (
                <button
                  onClick={() => run(() => deliveryAPI.deleteRequirement(projectId, r.requirement_id))}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 pt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// User journeys
// ---------------------------------------------------------------------------
function JourneysSection({ projectId, journeys, canEdit, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", persona: "", steps: "" });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); onChanged(); }
    catch (e) { toast.error(e.response?.data?.detail || "That did not work"); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("A journey needs a title"); return; }
    if (editingId) {
      await run(() => deliveryAPI.updateJourney(projectId, editingId, form));
      setEditingId(null);
    } else {
      await run(() => deliveryAPI.addJourney(projectId, form));
    }
    setForm({ title: "", persona: "", steps: "" });
    setAdding(false);
  };

  const startEdit = (j) => {
    setForm({ title: j.title, persona: j.persona || "", steps: j.steps || "" });
    setEditingId(j.journey_id);
    setAdding(true);
  };

  return (
    <Section
      title="User journeys"
      action={canEdit && !adding && (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}
                data-testid="add-journey-btn">
          <Plus className="w-3.5 h-3.5 mr-1" />Add
        </Button>
      )}
    >
      {adding && (
        <div className="mb-3 space-y-2 p-3 rounded-lg border border-[#EAE7E0] bg-[#F7F6F3]">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What are they trying to do?"
            autoFocus
            data-testid="journey-title"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
          />
          <input
            value={form.persona}
            onChange={(e) => setForm({ ...form, persona: e.target.value })}
            placeholder="Who is doing it, e.g. Operations staff"
            data-testid="journey-persona"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
          />
          <textarea
            rows={2}
            value={form.steps}
            onChange={(e) => setForm({ ...form, steps: e.target.value })}
            placeholder="The steps, e.g. Search, review the answer, open the source"
            data-testid="journey-steps"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 resize-none focus:outline-none focus:border-[#1B4332]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy}
                    className="bg-[#1B4332] hover:bg-[#14342A]" data-testid="save-journey-btn">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingId ? "Save" : "Add"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy}
                    onClick={() => { setAdding(false); setEditingId(null);
                                     setForm({ title: "", persona: "", steps: "" }); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {journeys.length === 0 ? (
        <Empty>No journeys yet. Stage 7 waits for at least one.</Empty>
      ) : (
        <ul className="divide-y divide-gray-100">
          {journeys.map((j) => (
            <li key={j.journey_id} className="py-2.5 flex items-start gap-3 group">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {j.title}
                  {j.persona && <span className="font-normal text-gray-500"> · {j.persona}</span>}
                </p>
                {j.steps && <p className="text-xs text-gray-600 mt-0.5">{j.steps}</p>}
              </div>
              {canEdit && (
                <div className="opacity-0 group-hover:opacity-100 flex gap-2 pt-0.5">
                  <button onClick={() => startEdit(j)}
                          data-testid={`edit-journey-${j.journey_id}`}
                          className="text-gray-400 hover:text-[#1B4332] text-xs">
                    Edit
                  </button>
                  <button onClick={() => run(() => deliveryAPI.deleteJourney(projectId, j.journey_id))}
                          className="text-gray-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}


function BuildTab({ data, project, canManage, onChanged }) {
  return (
    <div className="space-y-5">
      <PodSection project={project} onChanged={onChanged} canManage={canManage} />

      <Section title="Milestones">
        {data.milestones.length === 0
          ? <Empty>No milestones yet.</Empty>
          : (
            <ul className="divide-y divide-gray-100">
              {data.milestones.map((m) => (
                <li key={m.milestone_id || m.title} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-gray-800">{m.title}</span>
                  <span className="text-xs text-gray-500">{fmt(m.due_date || m.target_date)}</span>
                </li>
              ))}
            </ul>
          )}
      </Section>

      <Section title="The board">
        <p className="text-sm text-gray-600">
          Build work is tracked on the project board, where QA Review is a column rather
          than a separate workspace. The Solution Architect owns its shape.
        </p>
        <a href={`/tasks?project=${project?.id}`}
           className="inline-block mt-2 text-sm text-[#1B4332] hover:underline">
          Open the board
        </a>
      </Section>
    </div>
  );
}

function HistoryTab({ data, project }) {
  const history = [...(project?.stage_history || [])].reverse();
  return (
    <div className="space-y-5">
      <Section title="Stage history">
        {history.length === 0 ? <Empty>Nothing recorded yet.</Empty> : (
          <ul className="space-y-3">
            {history.map((h, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">{fmt(h.at)}</span>
                <div className="flex-1">
                  <p className="text-gray-900">
                    {h.from_stage ? `Stage ${h.from_stage} to ${h.to_stage}` : `Opened at stage ${h.to_stage}`}
                    {h.forced && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        forced
                      </span>
                    )}
                  </p>
                  {h.why && <p className="text-xs text-gray-600 mt-0.5">{h.why}</p>}
                  {h.by_name && <p className="text-[11px] text-gray-400 mt-0.5">{h.by_name}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawers
// ---------------------------------------------------------------------------
function Drawer({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-white border-l border-[#EAE7E0]
                      shadow-xl overflow-y-auto" data-testid="drawer">
        <div className="sticky top-0 bg-white border-b border-[#EAE7E0] px-5 py-4
                        flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"
                  data-testid="drawer-close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ArchitectureDrawer({ projectId, items, canUpload, onAdded }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const row = await deliveryAPI.uploadArchitecture(projectId, file);
      toast.success(`Architecture uploaded as v${row.version}`);
      onAdded(row);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not upload it");
    } finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        The architecture is submitted as a document, not drawn in the app. Markdown reads
        best; a PDF or an image is fine.
      </p>

      {canUpload ? (
        <label className="block">
          <span className="sr-only">Upload architecture document</span>
          <input type="file" onChange={upload} disabled={uploading}
                 data-testid="architecture-upload"
                 accept=".md,.markdown,.txt,.pdf,.png,.jpg,.jpeg,.svg,.drawio"
                 className="block w-full text-sm text-gray-600
                            file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                            file:bg-[#1B4332] file:text-white file:text-sm
                            hover:file:bg-[#14342A]" />
        </label>
      ) : (
        <p className="text-xs text-gray-500 italic">
          Only this project&apos;s Solution Architect uploads its architecture.
        </p>
      )}

      {uploading && <p className="text-xs text-gray-500">Uploading…</p>}

      {items.length === 0 ? (
        <Empty>Nothing uploaded yet. Stage 8 waits for it.</Empty>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((a) => (
            <li key={a.architecture_id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <FileLink
                  fileUrl={a.file_url}
                  name={a.original_filename || a.title}
                  className="flex-1 min-w-0"
                />
                <span className="text-[11px] text-gray-400 shrink-0 pt-0.5">v{a.version}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {a.uploaded_by_name} · {fmt(a.uploaded_at)}
              </p>
              {a.note && <p className="text-xs text-gray-600 mt-1">{a.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Demo rounds.
//
// Several rounds before the client validates is normal and expected, so this
// is a collection rather than a field, and each round carries its own
// materials, its own feedback and its own outcome.
//
// "Iterate" is gone. It never explained itself, and what it means is that the
// client wants changes and there will be another round -- so that is what it
// now says.
const DEMO_OUTCOMES = {
  pending: { label: "Not decided yet", chip: "bg-gray-100 text-gray-600" },
  iterate: { label: "Needs another round", chip: "bg-[#C6A15B]/15 text-[#8F7340]" },
  validated: { label: "Client validated", chip: "bg-[#1FB58A]/15 text-[#1B4332]" },
  declined: { label: "Client declined", chip: "bg-red-50 text-red-700" },
};

function DemosDrawer({ projectId, demos, canManage, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [openRound, setOpenRound] = useState(demos?.[demos.length - 1]?.demo_id || null);
  const [materials, setMaterials] = useState({});
  const [linkDraft, setLinkDraft] = useState("");

  // Materials are loaded per round, on demand, so opening the drawer does not
  // fetch files for rounds nobody is looking at.
  const loadMaterials = async (demoId) => {
    if (materials[demoId]) return;
    try {
      const rows = await deliveryAPI.demoMaterials(projectId, demoId);
      setMaterials((m) => ({ ...m, [demoId]: rows }));
    } catch { /* the list simply stays empty */ }
  };

  useEffect(() => {
    if (openRound) loadMaterials(openRound);
    /* eslint-disable-next-line */
  }, [openRound]);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      const result = await fn();
      if (message) toast.success(message);
      onChanged();
      return result;
    } catch (e) {
      toast.error(e.response?.data?.detail || "That did not work");
    } finally { setBusy(false); }
  };

  const addRound = async () => {
    const created = await run(() => deliveryAPI.addDemo(projectId, {}),
                              "Demo round opened");
    // Open the new round straight away. Creating one and then having to find
    // it again is most of what made this flow tiring.
    if (created?.demo_id) setOpenRound(created.demo_id);
  };

  const uploadMaterial = async (demoId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const row = await deliveryAPI.uploadDemoMaterial(projectId, demoId, file);
      setMaterials((m) => ({ ...m, [demoId]: [row, ...(m[demoId] || [])] }));
      toast.success("Material attached");
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not attach that");
    } finally { setBusy(false); e.target.value = ""; }
  };

  const saveLink = (demo) =>
    run(() => deliveryAPI.updateDemo(projectId, demo.demo_id, { materials_url: linkDraft.trim() }),
        "Link saved");

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Attach what the client will be shown: wireframes, a deck, a recording, or a link
        to a prototype. Stage 9 needs a round with materials and a date it was held.
      </p>

      {canManage && (
        <Button size="sm" variant="outline" disabled={busy} onClick={addRound}
                data-testid="add-demo-btn">
          <Plus className="w-3.5 h-3.5 mr-1" />New demo round
        </Button>
      )}

      {demos.length === 0 ? <Empty>No demo rounds yet.</Empty> : (
        <ul className="space-y-2">
          {demos.map((d) => {
            const open = openRound === d.demo_id;
            const outcome = DEMO_OUTCOMES[d.outcome] || DEMO_OUTCOMES.pending;
            const files = materials[d.demo_id] || [];
            const hasMaterials = files.length > 0 || !!d.materials_url;

            return (
              <li key={d.demo_id} className="rounded-lg border border-[#EAE7E0] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenRound(open ? null : d.demo_id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F7F6F3]"
                  data-testid={`demo-round-${d.round}`}
                >
                  <span className="text-sm font-medium text-gray-900">Round {d.round}</span>
                  <span className="flex items-center gap-2">
                    {d.held_at && (
                      <span className="text-[11px] text-gray-500">Held {fmt(d.held_at)}</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${outcome.chip}`}>
                      {outcome.label}
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="px-3 pb-3 space-y-3 border-t border-[#EAE7E0] pt-3">
                    {/* Materials */}
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
                        Materials
                      </p>

                      {d.materials_url && (
                        <a href={d.materials_url} target="_blank" rel="noreferrer"
                           className="block text-sm text-[#1B4332] hover:underline mb-1 truncate">
                          {d.materials_url}
                        </a>
                      )}

                      {files.map((f) => (
                        <FileLink key={f.document_id} fileUrl={f.file_url}
                                  name={f.original_filename || f.title} className="mb-1" />
                      ))}

                      {!hasMaterials && (
                        <p className="text-xs text-gray-400 italic mb-1">
                          Nothing attached yet. Stage 9 waits for this.
                        </p>
                      )}

                      {canManage && (
                        <div className="space-y-2 mt-2">
                          <label className="block">
                            <span className="sr-only">Attach a file</span>
                            <input type="file" onChange={(e) => uploadMaterial(d.demo_id, e)}
                                   disabled={busy}
                                   data-testid={`demo-material-upload-${d.round}`}
                                   className="block w-full text-xs text-gray-600
                                              file:mr-2 file:py-1.5 file:px-3 file:rounded-lg
                                              file:border-0 file:bg-[#1B4332] file:text-white
                                              file:text-xs hover:file:bg-[#14342A]" />
                          </label>
                          <div className="flex gap-2">
                            <input
                              defaultValue={d.materials_url || ""}
                              onChange={(e) => setLinkDraft(e.target.value)}
                              placeholder="Or a link to the prototype"
                              data-testid={`demo-link-${d.round}`}
                              className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-[#EAE7E0]
                                         bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
                            />
                            <Button size="sm" variant="outline" disabled={busy}
                                    onClick={() => saveLink(d)}>
                              Save link
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* What happens to the round */}
                    {canManage && d.outcome === "pending" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {!d.held_at && (
                          <Button size="sm" variant="outline" disabled={busy}
                                  data-testid={`demo-held-${d.round}`}
                                  onClick={() => run(
                                    () => deliveryAPI.markDemoHeld(projectId, d.demo_id),
                                    "Recorded as held")}>
                            Mark held
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={busy}
                                data-testid={`demo-iterate-${d.round}`}
                                onClick={async () => {
                                  await run(() => deliveryAPI.setDemoOutcome(
                                    projectId, d.demo_id, "iterate"), "Another round it is");
                                  await addRound();
                                }}>
                          Needs another round
                        </Button>
                        <Button size="sm" disabled={busy}
                                className="bg-[#1B4332] hover:bg-[#14342A]"
                                data-testid={`validate-demo-${d.round}`}
                                onClick={() => run(
                                  () => deliveryAPI.setDemoOutcome(projectId, d.demo_id, "validated"),
                                  "Client validated")}>
                          <Check className="w-3.5 h-3.5 mr-1" />Client validated
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy}
                                className="text-red-700 hover:text-red-800"
                                onClick={() => run(
                                  () => deliveryAPI.setDemoOutcome(projectId, d.demo_id, "declined"),
                                  "Recorded as declined")}>
                          Client declined
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


function DocumentsDrawer({ projectId, documents, onAdded }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const row = await deliveryAPI.uploadDocument(projectId, file);
      toast.success("Uploaded");
      onAdded(row);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not upload it");
    } finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">Upload a document</span>
        <input type="file" onChange={upload} disabled={uploading}
               data-testid="document-upload"
               className="block w-full text-sm text-gray-600
                          file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                          file:bg-[#1B4332] file:text-white file:text-sm
                          hover:file:bg-[#14342A]" />
      </label>

      {documents.length === 0 ? <Empty>Nothing here yet.</Empty> : (
        <ul className="divide-y divide-gray-100">
          {documents.map((d) => (
            <li key={d.document_id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                {d.file_url
                  ? <FileLink fileUrl={d.file_url} name={d.original_filename || d.title}
                              className="flex-1 min-w-0" />
                  : <span className="text-sm text-gray-900 flex-1">{d.title}</span>}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                  {d.doc_type}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {d.author_name} · {fmt(d.created_at)}
                {d.source_label && ` · ${d.source_label}`}
              </p>
              {d.content && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">
                  {d.content}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackDrawer({ projectId, items, canCapture, onAdded }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const row = await deliveryAPI.addFeedback(projectId, { raw_text: text.trim() });
      setText("");
      onAdded(row);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save it");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        The TSD is the single channel for client information. Whatever arrives by call,
        email or WhatsApp lands here, so one place knows what was asked for.
      </p>

      {canCapture && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="What did the client say?"
            data-testid="feedback-input"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
          />
          <Button size="sm" onClick={save} disabled={saving || !text.trim()}
                  className="bg-[#1B4332] hover:bg-[#14342A]">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Capture"}
          </Button>
        </div>
      )}

      {items.length === 0 ? <Empty>Nothing captured yet.</Empty> : (
        <ul className="divide-y divide-gray-100">
          {items.map((f) => (
            <li key={f.feedback_id} className="py-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{f.raw_text}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                {f.captured_by_name} · {fmt(f.created_at)} · {f.classification?.replace("_", " ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityDrawer({ items }) {
  if (!items?.length) return <Empty>Nothing recorded yet.</Empty>;
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.log_id} className="flex gap-3 text-sm">
          <span className="text-[11px] text-gray-400 w-20 shrink-0 pt-0.5">{fmt(a.timestamp)}</span>
          <div>
            {/* The server writes the sentence, so every reader shows the same
                one. "created" on its own told nobody what was created. */}
            <p className="text-gray-800">{a.summary || a.action.replace(/_/g, " ")}</p>
            <p className="text-[11px] text-gray-400">{a.user_name}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// The commercial slice: what Legal and Finance get
// ---------------------------------------------------------------------------
function CommercialSlice({ data }) {
  const brief = data.product_briefs?.[0];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5"
         data-testid="commercial-slice">
      <p className="text-xs text-gray-500">
        You are seeing the definition of the work and the conversations behind it. The
        architecture, the board and QA are not part of contract drafting.
      </p>

      {brief && (
        <Section title={`Product Brief, version ${brief.version}`}>
          <Field label="Problem">{brief.problem}</Field>
          {brief.in_scope && <Field label="In scope">{brief.in_scope}</Field>}
          {brief.out_of_scope && <Field label="Out of scope">{brief.out_of_scope}</Field>}
        </Section>
      )}

      <Section title="Requirements">
        {data.requirements.length === 0 ? <Empty>None yet.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {data.requirements.map((r) => (
              <li key={r.requirement_id} className="py-2 flex gap-3 text-sm">
                <span className="text-[11px] font-mono text-gray-400 pt-0.5">{r.req_ref}</span>
                <span className="text-gray-800">{r.description}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Documents and transcripts">
        {data.documents.length === 0 ? <Empty>None yet.</Empty> : (
          <ul className="divide-y divide-gray-100">
            {data.documents.map((d) => (
              <li key={d.document_id} className="py-2">
                {d.file_url
                  ? <FileLink fileUrl={d.file_url} name={d.original_filename || d.title} />
                  : <span className="text-sm text-gray-900">{d.title}</span>}
                <p className="text-[11px] text-gray-500">{d.doc_type} · {fmt(d.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------
function Section({ title, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function Stat({ label, value, hint, warn }) {
  return (
    <div className={`p-3 rounded-lg border ${warn ? "border-[#C6A15B]/40 bg-[#C6A15B]/[0.06]" : "border-[#EAE7E0] bg-[#F7F6F3]"}`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-gray-500 italic">{children}</p>;
}

// ---------------------------------------------------------------------------
// The pod
// ---------------------------------------------------------------------------
// Everybody working on this project. There used to be two lists saying this:
// a "project team" in the page header and a pod in the delivery record. Two
// names for one set of people is how they drift apart, so there is one now,
// and it lives here with the rest of what the project knows about itself.
function PodSection({ project, canManage, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const members = project?.pod || [];

  const open = async () => {
    setSelected((project?.pod_member_ids || []).slice());
    setEditing(true);
    if (staff.length) return;
    try {
      const res = await flowAPI.staff();
      setStaff(res?.staff || []);
    } catch { /* the picker simply stays empty */ }
  };

  const save = async () => {
    setSaving(true);
    try {
      await flowAPI.setPod(project.id, selected);
      toast.success("Pod updated");
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not update the pod");
    } finally { setSaving(false); }
  };

  const toggle = (uid) =>
    setSelected((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));

  return (
    <Section
      title="Pod"
      action={canManage && !editing && (
        <Button size="sm" variant="outline" onClick={open} data-testid="manage-pod-btn">
          <Users className="w-3.5 h-3.5 mr-1" />Add or remove
        </Button>
      )}
    >
      {editing ? (
        <div className="space-y-3">
          <div className="max-h-64 overflow-y-auto rounded-lg border border-[#EAE7E0] divide-y divide-gray-100">
            {staff.length === 0 ? (
              <p className="p-3 text-xs text-gray-500">Loading people…</p>
            ) : staff.map((s) => (
              <label key={s.user_id}
                     className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#F7F6F3]">
                <input
                  type="checkbox"
                  checked={selected.includes(s.user_id)}
                  onChange={() => toggle(s.user_id)}
                  data-testid={`pod-pick-${s.user_id}`}
                />
                <span className="text-sm text-gray-900">{s.name}</span>
                {s.function_role && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {s.function_role.replace(/_/g, " ")}
                  </span>
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}
                    className="bg-[#1B4332] hover:bg-[#14342A]" data-testid="save-pod-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save the pod"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
          <p className="text-[11px] text-gray-400">
            People newly added are told. People already on it are not told again.
          </p>
        </div>
      ) : members.length === 0 ? (
        <Empty>
          Nobody on the pod yet. A pod mixes people from across the capability teams,
          and it is what gives them the board.
        </Empty>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <span key={m.user_id}
                  className="px-2.5 py-1 rounded-full bg-white border border-[#EAE7E0] text-[12px] text-gray-700">
              {m.name}
            </span>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Client contacts
// ---------------------------------------------------------------------------
function ContactsDrawer({ projectId, clientName }) {
  const [contacts, setContacts] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setContacts(await flowAPI.projectContacts(projectId));
      } catch {
        setContacts([]);
      }
    })();
  }, [projectId]);

  if (contacts === null) {
    return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-[#1B4332]" /></div>;
  }

  const rows = Array.isArray(contacts) ? contacts : (contacts.contacts || []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        The people at {clientName || "this client"}. Contact details are restricted, so
        some fields may not be shown to you.
      </p>

      {rows.length === 0 ? (
        <Empty>Nobody recorded for this client yet.</Empty>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((c) => (
            <li key={c.contact_id || c.id} className="py-3">
              <p className="text-sm font-medium text-gray-900">{c.name}</p>
              {c.role && <p className="text-[11px] text-gray-500">{c.role}</p>}
              {c.email && <p className="text-xs text-gray-600">{c.email}</p>}
              {c.phone && <p className="text-xs text-gray-600">{c.phone}</p>}
            </li>
          ))}
        </ul>
      )}

      <a href="/flow/contacts"
         className="inline-block text-sm text-[#1B4332] hover:underline">
        Manage contacts
      </a>
    </div>
  );
}
