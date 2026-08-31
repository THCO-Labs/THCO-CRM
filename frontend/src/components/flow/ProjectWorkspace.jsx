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

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity, AlertTriangle, Check, Contact, FileText, Layers, Loader2,
  MonitorPlay, Plus, Trash2, Upload, Users, X, GitBranch, ShieldAlert,
  ClipboardCheck, Briefcase, Ban, Link2, ScrollText, Printer,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { controlTowerAPI, deliveryAPI, flowAPI, intelligenceAPI } from "@/lib/api";
import FileLink from "./FileLink";
import Suggestion from "./Suggestion";
import AttachmentStrip from "./AttachmentStrip";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "product", label: "Product" },
  { key: "build", label: "Build" },
  // Which requirement is which card, and what is covered by neither. It earns
  // a tab rather than a drawer because it is a table you read across, and
  // because it is the one view that answers "are we actually building what we
  // agreed" -- a question asked at every stage from 13 onwards.
  { key: "traceability", label: "Traceability" },
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
  { key: "talent", label: "Talent", icon: Briefcase },
  { key: "scope", label: "Scope changes", icon: GitBranch },
  { key: "risks", label: "Decisions & risks", icon: ShieldAlert },
  // What is holding this project up that is not a task. A task belongs on the
  // board; waiting on a client signature, a third-party API or another project
  // has had nowhere to live until now.
  { key: "blockers", label: "Blockers", icon: Ban },
  { key: "closure", label: "Closure checklist", icon: ClipboardCheck },
  // Everything the project recorded, assembled. At stage 17 this is the
  // closure report the gate asks for.
  { key: "report", label: "Report", icon: ScrollText },
  { key: "activity", label: "Activity", icon: Activity },
];

const BLOCKER_KINDS = [
  { key: "internal", label: "Internal" },
  { key: "client", label: "Waiting on client" },
  { key: "third_party", label: "Third party" },
  { key: "dependency", label: "Dependency" },
];

const BLOCKER_SEVERITY = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-[#C6A15B]/15 text-[#7A6234]",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-700",
};

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
  // Blockers live in the control tower router rather than the workspace call,
  // so they are fetched alongside it. Kept in their own state so a blocker
  // being raised does not refetch the whole workspace.
  const [blockers, setBlockers] = useState([]);

  const load = async () => {
    try {
      const [workspace, blockerRows] = await Promise.all([
        deliveryAPI.workspace(projectId),
        controlTowerAPI.blockers(projectId).catch(() => []),
      ]);
      setData(workspace);
      setBlockers(blockerRows || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load the project workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  // Open straight onto a tab or drawer named in the URL. This is what makes an
  // unmet gate condition clickable: "Add requirements" links to
  // `?tab=product`, "Attach demo materials" to `?drawer=demos`. It also makes
  // those places linkable to a colleague, which they were not before.
  //
  // This keys on the query string, not on `projectId`, and that is the whole
  // point. Every one of those links sits in the next-step panel *on this
  // page*, so clicking one is a same-project navigation: the id does not
  // change, and an effect watching only the id never re-runs. The URL gained
  // its `?drawer=` and nothing opened -- which made every gate link look
  // broken, because it was. It only ever worked on a cold page load.
  //
  // The parameter is cleared through the router rather than
  // `history.replaceState`, so React Router's own view of the location cannot
  // drift out of step with the address bar. Clearing re-runs this effect once
  // more, which returns immediately because there is nothing left to read.
  const [searchParams, setSearchParams] = useSearchParams();

  // Which section a gate link asked for, and when it asked. The timestamp
  // matters: clicking the same link twice must re-open the form the second
  // time, and a bare section name would look unchanged to an effect.
  const [focus, setFocus] = useState(null);

  useEffect(() => {
    const wantTab = searchParams.get("tab");
    const wantDrawer = searchParams.get("drawer");
    const wantFocus = searchParams.get("focus");
    if (!wantTab && !wantDrawer && !wantFocus) return;

    if (wantTab && TABS.some((t) => t.key === wantTab)) setTab(wantTab);
    if (wantDrawer && DRAWERS.some((d) => d.key === wantDrawer)) setDrawer(wantDrawer);
    // Held in state rather than read from the URL further down, because the
    // parameter is cleared immediately and the section still has to act on it.
    if (wantFocus) setFocus({ section: wantFocus, at: Date.now() });

    const rest = new URLSearchParams(searchParams);
    rest.delete("tab");
    rest.delete("drawer");
    rest.delete("focus");
    setSearchParams(rest, { replace: true });
  }, [searchParams, setSearchParams]);

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
    talent: (data.talent_requirements || []).filter((r) => r.status !== "cancelled").length,
    scope: (data.scope_changes || []).filter((s) => s.decision === "pending").length,
    risks: (data.risks || []).filter((r) => r.status === "open").length,
    // Open blockers only. A resolved one is history, and badging it would mean
    // the number never goes back down.
    blockers: blockers.filter((b) => b.status === "open").length,
    closure: (project?.closure_checklist || []).filter((c) => !c.done).length,
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
          <ProductTab projectId={projectId} data={data} can={can} onChanged={refresh}
                      focus={focus} />
        )}
        {tab === "build" && (
          <BuildTab data={data} project={project}
                    canManage={can.manage_board} onChanged={refresh}
                    focus={focus} />
        )}
        {tab === "traceability" && <TraceabilityTab projectId={projectId} />}
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
                            onAdded={(row) => { addTo("feedback", row); onChanged?.(); }}
                            onChanged={onChanged} />
          )}
          {drawer === "contacts" && (
            <ContactsDrawer projectId={projectId}
                            clientName={project?.client_name_snapshot} />
          )}
          {drawer === "talent" && (
            <TalentDrawer projectId={projectId} stage={project?.stage}
                          requirements={data.talent_requirements || []}
                          assignments={data.talent_assignments || []}
                          canManage={can.move_stage} onChanged={refresh} />
          )}
          {drawer === "scope" && (
            <ScopeChangesDrawer projectId={projectId} items={data.scope_changes || []}
                                canDecide={can.move_stage}
                                onAdded={(row) => { addTo("scope_changes", row); onChanged?.(); }}
                                onChanged={refresh} />
          )}
          {drawer === "risks" && (
            <RisksDrawer projectId={projectId} decisions={data.decisions || []} risks={data.risks || []}
                         onChanged={refresh} />
          )}
          {drawer === "blockers" && (
            <BlockersDrawer projectId={projectId} blockers={blockers}
                            onChanged={async () => {
                              // Only the blocker list changed, so only it is
                              // refetched -- the workspace behind the drawer is
                              // untouched and the drawer stays where it is.
                              setBlockers(await controlTowerAPI.blockers(projectId));
                              onChanged?.();
                            }} />
          )}
          {drawer === "closure" && (
            <ClosureDrawer projectId={projectId} checklist={project?.closure_checklist || []}
                           canEdit={can.move_stage} onChanged={refresh} />
          )}
          {drawer === "report" && <ReportDrawer projectId={projectId} />}
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


/**
 * Land on the control, not the page it lives on.
 *
 * A gate condition says "add requirements". Following it used to open the
 * Product tab and leave you to find Requirements among three sections, which
 * is most of the hunt the link exists to remove. Given `focus` naming this
 * section, this scrolls it into view and opens its form.
 *
 * Returns the ref to attach. `open` is called only when the section is the one
 * asked for, so a section nobody linked to is untouched.
 */
function useGateFocus(focus, section, open) {
  const ref = useRef(null);
  useEffect(() => {
    if (focus?.section !== section) return;
    open?.();
    // After paint: the form has to exist before it can be scrolled to, and
    // opening it is what makes the section its final height.
    const t = setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => clearTimeout(t);
    // `focus` carries a timestamp, so clicking the same link twice re-opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, section]);
  return ref;
}

function ProductTab({ projectId, data, can, onChanged, focus }) {
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
                           canWrite={can.move_stage} onChanged={onChanged}
                           focus={focus} />
      <RequirementsSection projectId={projectId} requirements={data.requirements}
                           canEdit={can.edit_requirements} onChanged={onChanged}
                           focus={focus} />
      <JourneysSection projectId={projectId} journeys={data.journeys}
                       canEdit={can.edit_requirements} onChanged={onChanged}
                       focus={focus} />
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

function ProductBriefSection({ projectId, briefs, canWrite, onChanged, focus }) {
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

  // "Write the Product Brief" on an unmet gate opens the editor here.
  const focusRef = useGateFocus(focus, "brief", () => canWrite && startEdit());

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
      innerRef={focusRef}
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

function RequirementsSection({ projectId, requirements, canEdit, onChanged, focus }) {
  const [adding, setAdding] = useState(false);
  // "Add requirements" on an unmet gate opens this form and scrolls here,
  // rather than dropping somebody on the tab to find it.
  const focusRef = useGateFocus(focus, "requirements",
    () => canEdit && setAdding(true));
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
      innerRef={focusRef}
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
function JourneysSection({ projectId, journeys, canEdit, onChanged, focus }) {
  const [adding, setAdding] = useState(false);
  const focusRef = useGateFocus(focus, "journeys",
    () => canEdit && setAdding(true));
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
      innerRef={focusRef}
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


function BuildTab({ data, project, canManage, onChanged, focus }) {
  return (
    <div className="space-y-5">
      <PodSection project={project} onChanged={onChanged} canManage={canManage}
                  focus={focus} />

      <MilestonesSection projectId={project?.id} milestones={data.milestones}
                         canManage={canManage} onChanged={onChanged}
                         focus={focus} />

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
  // The date and time a round was held, per round, before it is recorded.
  const [heldDrafts, setHeldDrafts] = useState({});

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

                    {/* When it happened. Defaulting to "now" was wrong for the
                        ordinary case: a demo is usually recorded after it
                        finishes, often the next morning, and the closure
                        report reads these timestamps. */}
                    {canManage && !d.held_at && d.outcome === "pending" && (
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="text-[11px] text-gray-500">
                          <span className="block mb-0.5">When was it held?</span>
                          <input
                            type="datetime-local"
                            value={heldDrafts[d.demo_id] || ""}
                            onChange={(e) => setHeldDrafts((h) => ({ ...h, [d.demo_id]: e.target.value }))}
                            data-testid={`demo-held-at-${d.round}`}
                            className="px-2 py-1.5 text-xs rounded-lg border border-[#EAE7E0]
                                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
                          />
                        </label>
                        <span className="text-[11px] text-gray-400 pb-2">
                          Leave blank for now
                        </span>
                      </div>
                    )}

                    {/* What happens to the round */}
                    {canManage && d.outcome === "pending" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {!d.held_at && (
                          <Button size="sm" variant="outline" disabled={busy}
                                  data-testid={`demo-held-${d.round}`}
                                  onClick={() => run(
                                    () => deliveryAPI.markDemoHeld(projectId, d.demo_id,
                                      heldDrafts[d.demo_id]
                                        // A datetime-local value carries no zone;
                                        // send it as the browser's local time.
                                        ? { held_at: new Date(heldDrafts[d.demo_id]).toISOString() }
                                        : {}),
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

                    {/* Deleting a round the client has actually seen is refused
                        by the server -- that is history. This is for the round
                        opened by mistake, which otherwise sits in the list
                        forever and miscounts every later round. */}
                    {canManage && !d.held_at && d.outcome === "pending" && (
                      <div className="pt-1 border-t border-[#EAE7E0]">
                        <button
                          type="button"
                          disabled={busy}
                          data-testid={`demo-delete-${d.round}`}
                          onClick={async () => {
                            if (!window.confirm(
                              `Delete round ${d.round}? The remaining rounds are renumbered.`
                            )) return;
                            await run(() => deliveryAPI.deleteDemo(projectId, d.demo_id),
                                      "Round deleted");
                            setOpenRound(null);
                          }}
                          className="mt-2 text-[11px] text-gray-400 hover:text-red-600"
                        >
                          Delete this round
                        </button>
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
  const [addingTranscript, setAddingTranscript] = useState(false);
  const [tab, setTab] = useState("paste");   // paste | file
  const [transcript, setTranscript] = useState({ source_label: "", source_date: "", content: "" });
  const [savingTranscript, setSavingTranscript] = useState(false);

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

  const pasteTranscript = async () => {
    if (!transcript.source_label.trim() || !transcript.content.trim()) {
      toast.error("Where it's from and the transcript text are both required"); return;
    }
    setSavingTranscript(true);
    try {
      const row = await deliveryAPI.addTranscript(projectId, transcript);
      toast.success("Conversation added");
      onAdded(row);
      setTranscript({ source_label: "", source_date: "", content: "" });
      setAddingTranscript(false);
    } catch (e) { toast.error(e.response?.data?.detail || "Could not save it"); }
    finally { setSavingTranscript(false); }
  };

  const uploadTranscriptFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!transcript.source_label.trim()) {
      toast.error("Say where this conversation came from first"); e.target.value = ""; return;
    }
    setSavingTranscript(true);
    try {
      const row = await deliveryAPI.uploadTranscript(projectId, file, transcript.source_label, transcript.source_date);
      toast.success("Transcript uploaded");
      onAdded(row);
      setTranscript({ source_label: "", source_date: "", content: "" });
      setAddingTranscript(false);
    } catch (err) { toast.error(err.response?.data?.detail || "Could not upload it"); }
    finally { setSavingTranscript(false); e.target.value = ""; }
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

      {addingTranscript ? (
        <div className="space-y-2 p-3 rounded-lg border border-[#EAE7E0] bg-[#F7F6F3]">
          <div className="flex gap-2">
            <input placeholder="Where it came from, e.g. Initial call" value={transcript.source_label}
                   onChange={(e) => setTranscript({ ...transcript, source_label: e.target.value })}
                   className="flex-1 text-sm p-2 rounded border border-[#EAE7E0]" />
            <input type="date" value={transcript.source_date}
                   onChange={(e) => setTranscript({ ...transcript, source_date: e.target.value })}
                   className="text-sm p-2 rounded border border-[#EAE7E0]" />
          </div>

          <div className="flex gap-1">
            <button type="button" onClick={() => setTab("paste")}
                    className={`text-xs px-2 py-1 rounded ${tab === "paste" ? "bg-gray-200 text-gray-900" : "text-gray-500"}`}>
              Paste text
            </button>
            <button type="button" onClick={() => setTab("file")}
                    className={`text-xs px-2 py-1 rounded ${tab === "file" ? "bg-gray-200 text-gray-900" : "text-gray-500"}`}>
              Upload a file
            </button>
          </div>

          {tab === "paste" ? (
            <>
              <textarea rows={4} placeholder="Paste the transcript or your notes." value={transcript.content}
                        onChange={(e) => setTranscript({ ...transcript, content: e.target.value })}
                        className="w-full text-sm p-2 rounded border border-[#EAE7E0]" />
              <div className="flex gap-2">
                <Button size="sm" disabled={savingTranscript} onClick={pasteTranscript}>Add this conversation</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingTranscript(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <input type="file" onChange={uploadTranscriptFile} disabled={savingTranscript}
                     accept=".txt,.md,.pdf,.docx,.doc"
                     data-testid="transcript-file-upload"
                     className="block w-full text-sm text-gray-600
                                file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                                file:bg-[#1B4332] file:text-white file:text-sm
                                hover:file:bg-[#14342A]" />
              <p className="text-[11px] text-gray-400">Text is pulled out of the file, same as a pasted one.</p>
            </>
          )}
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAddingTranscript(true)} data-testid="add-transcript">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add a conversation
        </Button>
      )}

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

function FeedbackDrawer({ projectId, items, canCapture, onAdded, onChanged }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  // Files that arrived with the feedback, held per item so the drawer does not
  // reload the whole workspace every time one is attached.
  const [attachments, setAttachments] = useState({});

  const attachmentsFor = (f) => attachments[f.feedback_id] ?? (f.attachments || []);

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
              <p className="text-[11px] text-gray-500 mt-1 mb-1.5">
                {f.captured_by_name} · {fmt(f.created_at)} · {f.classification?.replace("_", " ")}
              </p>
              {/* What the client actually sent, kept with the comment it came
                  with rather than in the general document pile. */}
              <AttachmentStrip
                testId={`feedback-files-${f.feedback_id}`}
                attachments={attachmentsFor(f)}
                label="Attach what they sent"
                onUpload={async (file) => {
                  const a = await deliveryAPI.attachToFeedback(f.feedback_id, file);
                  setAttachments((prev) => ({
                    ...prev, [f.feedback_id]: [...attachmentsFor(f), a],
                  }));
                  onChanged?.();
                  return a;
                }}
                onRemove={async (attachmentId) => {
                  await deliveryAPI.removeFeedbackAttachment(f.feedback_id, attachmentId);
                  setAttachments((prev) => ({
                    ...prev,
                    [f.feedback_id]: attachmentsFor(f).filter((x) => x.attachment_id !== attachmentId),
                  }));
                  onChanged?.();
                }}
              />
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
// Scope changes (§9.4) -- raised once scope is frozen, decided by the TSD.
// ---------------------------------------------------------------------------
function ScopeChangesDrawer({ projectId, items, canDecide, onAdded, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ description: "", impact_timeline: "", impact_effort: "", impact_cost: "", impact_architecture: "" });
  const [reasonDrafts, setReasonDrafts] = useState({});

  const submit = async () => {
    if (!form.description.trim()) { toast.error("Describe the change"); return; }
    setBusy(true);
    try {
      const row = await deliveryAPI.raiseScopeChange(projectId, form);
      onAdded(row);
      setAdding(false);
      setForm({ description: "", impact_timeline: "", impact_effort: "", impact_cost: "", impact_architecture: "" });
      toast.success("Scope change raised");
    } catch (e) { toast.error(e.response?.data?.detail || "Could not raise it"); }
    finally { setBusy(false); }
  };

  const decide = async (sc, decision) => {
    setBusy(true);
    try {
      await deliveryAPI.decideScopeChange(sc.scope_change_id, {
        decision, decision_reason: reasonDrafts[sc.scope_change_id] || "",
      });
      toast.success(`Scope change ${decision}`);
      onChanged();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not decide it"); }
    finally { setBusy(false); }
  };

  const DECISION_CHIP = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-[#1FB58A]/10 text-[#1B4332]",
    rejected: "bg-red-50 text-red-700",
    deferred: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Once scope is frozen, a new or changed requirement is a decision, not an edit --
        the TSD approves, rejects or defers, and an approved change mints a committed requirement.
      </p>

      {adding ? (
        <div className="space-y-2 p-3 rounded-lg border border-[#EAE7E0] bg-[#F7F6F3]">
          <textarea placeholder="What is being asked for" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full text-sm p-2 rounded border border-[#EAE7E0]" rows={2} />
          <input placeholder="Timeline impact (free text)" value={form.impact_timeline}
                 onChange={(e) => setForm({ ...form, impact_timeline: e.target.value })}
                 className="w-full text-sm p-2 rounded border border-[#EAE7E0]" />
          <input placeholder="Cost impact (free text)" value={form.impact_cost}
                 onChange={(e) => setForm({ ...form, impact_cost: e.target.value })}
                 className="w-full text-sm p-2 rounded border border-[#EAE7E0]" />
          <input placeholder="Architecture impact (free text)" value={form.impact_architecture}
                 onChange={(e) => setForm({ ...form, impact_architecture: e.target.value })}
                 className="w-full text-sm p-2 rounded border border-[#EAE7E0]" />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={submit}>Raise it</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Raise a scope change
        </Button>
      )}

      {items.length === 0 ? <Empty>No scope changes yet.</Empty> : (
        <ul className="divide-y divide-gray-100">
          {items.map((sc) => (
            <li key={sc.scope_change_id} className="py-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-800 flex-1">{sc.description}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${DECISION_CHIP[sc.decision]}`}>
                  {sc.decision}
                </span>
              </div>
              {sc.impact_timeline && <p className="text-[11px] text-gray-500">Timeline: {sc.impact_timeline}</p>}
              {sc.impact_cost && <p className="text-[11px] text-gray-500">Cost: {sc.impact_cost}</p>}
              <p className="text-[11px] text-gray-400">Raised by {sc.raised_by_name} · {fmt(sc.created_at)}</p>
              {sc.decision_reason && <p className="text-[11px] text-gray-500 italic">"{sc.decision_reason}"</p>}

              {/* The four impact fields are free text in Tier 1 and the plan's
                  own table says "Generated in Tier 4". This drafts them, plus
                  the two numbers the Senior Partner threshold actually checks
                  -- free text alone can never trip a threshold. Offered only
                  while the change is still undecided: analysing one that has
                  already been approved or rejected changes nothing. */}
              {canDecide && sc.decision === "pending" && (
                <div className="pt-1">
                  <Suggestion
                    testId={`scope-impact-${sc.scope_change_id}`}
                    auto={false}
                    title="Assess the impact"
                    applyLabel="Save this assessment"
                    load={() => intelligenceAPI.analyseScopeChange(sc.scope_change_id)}
                    onApply={async (fields) => {
                      try {
                        await deliveryAPI.updateScopeChange(sc.scope_change_id, fields);
                        toast.success("Impact assessment saved");
                        onChanged();
                      } catch (e) {
                        toast.error(e.response?.data?.detail || "Could not save it");
                      }
                    }}
                  />
                </div>
              )}

              {canDecide && sc.decision === "pending" && (
                <div className="flex items-center gap-2 pt-1">
                  <input placeholder="Reason (optional)" value={reasonDrafts[sc.scope_change_id] || ""}
                         onChange={(e) => setReasonDrafts({ ...reasonDrafts, [sc.scope_change_id]: e.target.value })}
                         className="flex-1 text-xs p-1.5 rounded border border-[#EAE7E0]" />
                  <button disabled={busy} onClick={() => decide(sc, "approved")}
                          className="text-xs text-[#1B4332] hover:underline">Approve</button>
                  <button disabled={busy} onClick={() => decide(sc, "deferred")}
                          className="text-xs text-gray-500 hover:underline">Defer</button>
                  <button disabled={busy} onClick={() => decide(sc, "rejected")}
                          className="text-xs text-red-600 hover:underline">Reject</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decisions & risks -- lightweight logs, no workflow of their own.
// ---------------------------------------------------------------------------
function RisksDrawer({ projectId, decisions, risks, onChanged }) {
  const [section, setSection] = useState("risks");
  const [busy, setBusy] = useState(false);

  const loadRiskSuggestions = useCallback(
    () => intelligenceAPI.suggestRisks(projectId), [projectId]
  );
  const [decisionForm, setDecisionForm] = useState({ title: "", description: "", rationale: "" });
  const [riskForm, setRiskForm] = useState({ title: "", description: "", likelihood: "medium", impact: "medium", mitigation: "" });
  const [addingDecision, setAddingDecision] = useState(false);
  const [addingRisk, setAddingRisk] = useState(false);

  const addDecision = async () => {
    if (!decisionForm.title.trim()) return;
    setBusy(true);
    try {
      await deliveryAPI.addDecision(projectId, decisionForm);
      setDecisionForm({ title: "", description: "", rationale: "" });
      setAddingDecision(false);
      onChanged();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not record it"); }
    finally { setBusy(false); }
  };

  const addRisk = async () => {
    if (!riskForm.title.trim()) return;
    setBusy(true);
    try {
      await deliveryAPI.addRisk(projectId, riskForm);
      setRiskForm({ title: "", description: "", likelihood: "medium", impact: "medium", mitigation: "" });
      setAddingRisk(false);
      onChanged();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not log it"); }
    finally { setBusy(false); }
  };

  const setRiskStatus = async (risk, status) => {
    setBusy(true);
    try {
      await deliveryAPI.updateRisk(risk.risk_id, { status });
      onChanged();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not update it"); }
    finally { setBusy(false); }
  };

  const RISK_CHIP = {
    open: "bg-amber-100 text-amber-800",
    mitigated: "bg-[#1FB58A]/10 text-[#1B4332]",
    closed: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-100 pb-2">
        <button onClick={() => setSection("risks")}
                className={`text-sm px-2 py-1 rounded ${section === "risks" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}>
          Risks ({risks.length})
        </button>
        <button onClick={() => setSection("decisions")}
                className={`text-sm px-2 py-1 rounded ${section === "decisions" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}>
          Decisions ({decisions.length})
        </button>
      </div>

      {section === "risks" ? (
        <>
          {/* Risks this project has not written down yet. Fed the existing
              list so it proposes additions rather than reading the same ones
              back -- the usual and useless failure of this feature. Applying
              one fills the form below; logging it is still a save. */}
          {!addingRisk && (
            <Suggestion
              testId="risk-suggestion"
              auto={false}
              title="Suggest risks we have not logged"
              applyLabel="Draft the first"
              load={loadRiskSuggestions}
              onApply={(_fields, rec) => {
                const first = (rec.options || [])[0];
                if (!first) return;
                setRiskForm({
                  title: first.title || "",
                  description: first.description || "",
                  likelihood: first.likelihood || "medium",
                  impact: first.impact || "medium",
                  mitigation: first.mitigation || "",
                });
                setAddingRisk(true);
              }}
            />
          )}
          {addingRisk ? (
            <div className="space-y-2 p-3 rounded-lg border border-[#EAE7E0] bg-[#F7F6F3]">
              <input placeholder="Risk" value={riskForm.title}
                     onChange={(e) => setRiskForm({ ...riskForm, title: e.target.value })}
                     className="w-full text-sm p-2 rounded border border-[#EAE7E0]" />
              <textarea placeholder="Description (optional)" value={riskForm.description}
                        onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                        className="w-full text-sm p-2 rounded border border-[#EAE7E0]" rows={2} />
              <div className="grid grid-cols-2 gap-2">
                <select value={riskForm.likelihood} onChange={(e) => setRiskForm({ ...riskForm, likelihood: e.target.value })}
                        className="text-sm p-2 rounded border border-[#EAE7E0]">
                  <option value="low">Low likelihood</option>
                  <option value="medium">Medium likelihood</option>
                  <option value="high">High likelihood</option>
                </select>
                <select value={riskForm.impact} onChange={(e) => setRiskForm({ ...riskForm, impact: e.target.value })}
                        className="text-sm p-2 rounded border border-[#EAE7E0]">
                  <option value="low">Low impact</option>
                  <option value="medium">Medium impact</option>
                  <option value="high">High impact</option>
                </select>
              </div>
              <input placeholder="Mitigation (optional)" value={riskForm.mitigation}
                     onChange={(e) => setRiskForm({ ...riskForm, mitigation: e.target.value })}
                     className="w-full text-sm p-2 rounded border border-[#EAE7E0]" />
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={addRisk}>Log risk</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingRisk(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAddingRisk(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Log a risk
            </Button>
          )}

          {risks.length === 0 ? <Empty>No risks logged yet.</Empty> : (
            <ul className="divide-y divide-gray-100">
              {risks.map((r) => (
                <li key={r.risk_id} className="py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 flex-1">{r.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${RISK_CHIP[r.status]}`}>{r.status}</span>
                  </div>
                  {r.description && <p className="text-[11px] text-gray-500">{r.description}</p>}
                  <p className="text-[11px] text-gray-400">{r.likelihood} likelihood · {r.impact} impact</p>
                  {r.mitigation && <p className="text-[11px] text-gray-500 italic">Mitigation: {r.mitigation}</p>}
                  {r.status !== "closed" && (
                    <div className="flex gap-2 pt-0.5">
                      {r.status === "open" && (
                        <button disabled={busy} onClick={() => setRiskStatus(r, "mitigated")}
                                className="text-xs text-[#1B4332] hover:underline">Mark mitigated</button>
                      )}
                      <button disabled={busy} onClick={() => setRiskStatus(r, "closed")}
                              className="text-xs text-gray-500 hover:underline">Close</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          {addingDecision ? (
            <div className="space-y-2 p-3 rounded-lg border border-[#EAE7E0] bg-[#F7F6F3]">
              <input placeholder="Decision" value={decisionForm.title}
                     onChange={(e) => setDecisionForm({ ...decisionForm, title: e.target.value })}
                     className="w-full text-sm p-2 rounded border border-[#EAE7E0]" />
              <textarea placeholder="Description (optional)" value={decisionForm.description}
                        onChange={(e) => setDecisionForm({ ...decisionForm, description: e.target.value })}
                        className="w-full text-sm p-2 rounded border border-[#EAE7E0]" rows={2} />
              <textarea placeholder="Why (optional)" value={decisionForm.rationale}
                        onChange={(e) => setDecisionForm({ ...decisionForm, rationale: e.target.value })}
                        className="w-full text-sm p-2 rounded border border-[#EAE7E0]" rows={2} />
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={addDecision}>Record decision</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingDecision(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAddingDecision(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Record a decision
            </Button>
          )}

          {decisions.length === 0 ? <Empty>No decisions recorded yet.</Empty> : (
            <ul className="divide-y divide-gray-100">
              {decisions.map((d) => (
                <li key={d.decision_id} className="py-3 space-y-1">
                  <p className="text-sm text-gray-800">{d.title}</p>
                  {d.description && <p className="text-[11px] text-gray-500">{d.description}</p>}
                  {d.rationale && <p className="text-[11px] text-gray-500 italic">Why: {d.rationale}</p>}
                  <p className="text-[11px] text-gray-400">{d.decided_by_name} · {fmt(d.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blockers (Tier 3) -- what is holding this project up that is not a task.
// ---------------------------------------------------------------------------
// A task belongs on the board. This is for the rest: waiting on a client
// signature, a third-party API, a contract, or another project entirely. The
// board cannot express the last one at all, since a card belongs to exactly
// one board.
//
// Resolved rather than deleted, because "what held this up" is precisely what
// the closure report needs later.
function BlockersDrawer({ projectId, blockers, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", kind: "internal", severity: "medium", target_date: "",
  });

  const open = blockers.filter((b) => b.status === "open");
  const resolved = blockers.filter((b) => b.status === "resolved");

  const save = async () => {
    if (!form.title.trim()) { toast.error("A blocker needs a title"); return; }
    setBusy(true);
    try {
      await controlTowerAPI.raiseBlocker(projectId, {
        ...form,
        target_date: form.target_date || null,
      });
      toast.success("Blocker raised");
      setForm({ title: "", description: "", kind: "internal", severity: "medium", target_date: "" });
      setAdding(false);
      await onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not raise it");
    } finally { setBusy(false); }
  };

  const resolve = async (blocker) => {
    const resolution = window.prompt(
      `How was "${blocker.title}" resolved?`, ""
    );
    // Cancel returns null; an empty string is somebody choosing not to explain,
    // which is their call and still resolves the blocker.
    if (resolution === null) return;
    setBusy(true);
    try {
      await controlTowerAPI.resolveBlocker(blocker.blocker_id, resolution);
      toast.success("Blocker resolved");
      await onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not resolve it");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4" data-testid="blockers-drawer">
      <p className="text-xs text-gray-500">
        What is stopping this project that is not a task on the board — a client
        who has not come back, a third party, a contract, another project.
      </p>

      {!adding ? (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}
                data-testid="add-blocker-btn">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Raise a blocker
        </Button>
      ) : (
        <div className="rounded-lg border border-[#EAE7E0] bg-[#F7F6F3] p-3 space-y-2">
          <input
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What is blocked?"
            data-testid="blocker-title"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
          />
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What has been tried, and what is being waited on (optional)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 resize-none focus:outline-none focus:border-[#1B4332]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              data-testid="blocker-kind"
              className="px-2 py-2 text-sm rounded-lg border border-[#EAE7E0] bg-white text-gray-900"
            >
              {BLOCKER_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              data-testid="blocker-severity"
              className="px-2 py-2 text-sm rounded-lg border border-[#EAE7E0] bg-white text-gray-900"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical — tells the TSD</option>
            </select>
          </div>
          <input
            type="date"
            value={form.target_date}
            onChange={(e) => setForm({ ...form, target_date: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0]
                       bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy}
                    className="bg-[#1B4332] hover:bg-[#14342A]" data-testid="save-blocker">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Raise it"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {open.length === 0 && resolved.length === 0 && (
        <Empty>Nothing is blocked.</Empty>
      )}

      {open.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-gray-400 mb-1.5">
            OPEN ({open.length})
          </p>
          <ul className="space-y-2">
            {open.map((b) => (
              <li key={b.blocker_id}
                  className="rounded-lg border border-[#EAE7E0] bg-white p-3"
                  data-testid="blocker-row">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{b.title}</p>
                    {b.description && (
                      <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{b.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${BLOCKER_SEVERITY[b.severity]}`}>
                        {b.severity}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {(BLOCKER_KINDS.find((k) => k.key === b.kind) || {}).label || b.kind}
                      </span>
                      {b.blocking_project_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332]">
                          blocked by {b.blocking_project_name}
                        </span>
                      )}
                      {b.target_date && (
                        <span className="text-[11px] text-gray-400">due {fmt(b.target_date)}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {b.raised_by_name} · {fmt(b.created_at)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled={busy}
                          onClick={() => resolve(b)}
                          data-testid={`resolve-blocker-${b.blocker_id}`}
                          className="shrink-0 h-7 text-[11px]">
                    Resolve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resolved.length > 0 && (
        <details>
          <summary className="text-[10px] font-mono text-gray-400 cursor-pointer hover:text-gray-600">
            RESOLVED ({resolved.length})
          </summary>
          <ul className="space-y-1.5 mt-2">
            {resolved.map((b) => (
              <li key={b.blocker_id} className="rounded-lg border border-[#EAE7E0] bg-[#F7F6F3] p-2.5">
                <p className="text-sm text-gray-500 line-through">{b.title}</p>
                {b.resolution && <p className="text-xs text-gray-600 mt-0.5">{b.resolution}</p>}
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {b.resolved_by_name} · {fmt(b.resolved_at)}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The report (Tier 3) -- everything the project recorded, assembled.
// ---------------------------------------------------------------------------
// Nothing here is typed and nothing is generated: every line is a read of a
// record somebody made at the time, which is the whole argument for having
// made them. At stage 17 this is the closure report the gate asks for.
function ReportDrawer({ projectId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadNarrative = useCallback(
    () => intelligenceAPI.reportNarrative(projectId), [projectId]
  );

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await controlTowerAPI.report(projectId);
        if (live) setReport(r);
      } catch (e) {
        if (live) toast.error(e.response?.data?.detail || "Could not build the report");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [projectId]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-4 h-4 animate-spin text-[#1B4332]" /></div>;
  }
  if (!report) return <Empty>No report available.</Empty>;

  const p = report.project;
  const Row = ({ label, children }) => (
    <div className="flex justify-between gap-3 py-1 border-b border-gray-50 last:border-0">
      <span className="text-[11px] text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-900 text-right">{children}</span>
    </div>
  );

  return (
    <div className="space-y-4" data-testid="report-drawer">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-mono text-gray-400">
            {report.is_closure_report ? "CLOSURE REPORT" : "PROJECT REPORT"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Assembled {fmt(report.generated_at)} from what this project recorded.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.print()}
                className="h-7 text-[11px] shrink-0" data-testid="print-report">
          <Printer className="w-3 h-3 mr-1" /> Print
        </Button>
      </div>

      {/* The paragraph a person would otherwise write by hand at closure.
          Safe to generate precisely because every figure it summarises is on
          this same page to check it against. Not fetched on open -- it costs
          a model call, and most opens of this drawer are to read a number. */}
      <Suggestion
        testId="report-narrative"
        auto={false}
        title="Write the summary paragraph"
        load={loadNarrative}
      />

      <Section title="The project">
        <Row label="Client">{p.client_name}</Row>
        <Row label="Reference">{p.ref}</Row>
        <Row label="Stage">{p.stage}. {p.stage_label}</Row>
        <Row label="Health">{p.health}{p.health_reason ? ` — ${p.health_reason}` : ""}</Row>
        <Row label="TSD">{p.tsd_name || "—"}</Row>
        <Row label="Architect">{p.architect_name || "—"}</Row>
        <Row label="Pod">{p.pod_size} people</Row>
        <Row label="Opened">{fmt(p.created_at)}</Row>
        <Row label="Elapsed">{p.elapsed_days} {p.elapsed_days === 1 ? "day" : "days"}</Row>
        {p.scope_frozen && <Row label="Scope froze">{fmt(p.scope_frozen_at)}</Row>}
        {p.completed_at && <Row label="Completed">{fmt(p.completed_at)}</Row>}
      </Section>

      <Section title={`Requirements (${report.requirements.total})`}>
        {Object.entries(report.requirements.by_status).map(([status, n]) => (
          <Row key={status} label={status.replace("_", " ")}>{n}</Row>
        ))}
      </Section>

      <Section title="Validation">
        <Row label="Demo rounds">{report.validation.demo_rounds}</Row>
        <Row label="Client validated">
          {report.validation.validated
            ? `yes, round ${report.validation.validated_round}`
            : "not yet"}
        </Row>
      </Section>

      <Section title={`Scope changes (${report.scope_changes.total})`}>
        <Row label="Approved">{report.scope_changes.approved}</Row>
        <Row label="Rejected">{report.scope_changes.rejected}</Row>
        <Row label="Pending">{report.scope_changes.pending}</Row>
        <Row label="Moved time or money">{report.scope_changes.material}</Row>
      </Section>

      <Section title="Delivery">
        <Row label="Cards on the board">{report.delivery.total_cards}</Row>
        <Row label="Milestones">
          {report.delivery.milestones_delivered} of {report.delivery.milestones.length} delivered
        </Row>
      </Section>

      <Section title="Governance">
        <Row label="Decisions recorded">{report.governance.decisions.length}</Row>
        <Row label="Risks">
          {report.governance.risks_open} open of {report.governance.risks.length}
        </Row>
        <Row label="Blockers">
          {report.governance.blockers_open} open of {report.governance.blockers.length}
        </Row>
        <Row label="Gates forced">{report.governance.forced_gates.length}</Row>
      </Section>

      {report.governance.forced_gates.length > 0 && (
        <div className="rounded-lg border border-[#C6A15B]/30 bg-[#C6A15B]/10 p-3">
          <p className="text-[10px] font-mono text-[#7A6234] mb-1.5">GATES FORCED</p>
          <ul className="space-y-1.5">
            {report.governance.forced_gates.map((f, i) => (
              <li key={i} className="text-xs text-[#6B5730]">
                <span className="font-medium">{f.to_stage_label}</span> — {f.why}
                <span className="block text-[11px] text-[#8F7340]">
                  {f.by_name} · {fmt(f.at)} · unmet: {f.unmet.join(", ") || "not recorded"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title={`Closure (${report.closure.done}/${report.closure.total})`}>
        {report.closure.checklist.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No checklist on this project.</p>
        ) : (
          <ul className="space-y-0.5">
            {report.closure.checklist.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <Check className={`w-3 h-3 shrink-0 ${item.done ? "text-[#1FB58A]" : "text-gray-300"}`} />
                <span className={item.done ? "text-gray-500 line-through" : "text-gray-800"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Timeline (${report.timeline.length} moves)`}>
        <ul className="space-y-1">
          {report.timeline.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="text-gray-400 font-mono text-[10px] shrink-0 mt-0.5 w-12">
                {t.days_held == null ? "—" : `${t.days_held}d`}
              </span>
              <span className="min-w-0">
                <span className={t.forced ? "text-[#A9834E] font-medium" : "text-gray-800"}>
                  {t.to_stage_label}{t.forced ? " (forced)" : ""}
                </span>
                <span className="block text-[11px] text-gray-400">
                  {t.by_name} · {fmt(t.at)}{t.why ? ` · ${t.why}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Traceability (Tier 3) -- which requirement is which card.
// ---------------------------------------------------------------------------
// Two questions nothing else in the product answers: a requirement with no
// card is scope nobody has started, and a card with no requirement is work
// nobody asked for. Both are worth seeing well before a closure conversation.
function TraceabilityTab({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(null);   // card_id being linked
  const [busy, setBusy] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await controlTowerAPI.traceability(projectId));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load traceability");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const link = async (cardId, requirementId) => {
    setBusy(true);
    try {
      await controlTowerAPI.linkCardRequirement(cardId, requirementId);
      toast.success(requirementId ? "Card traced" : "Link cleared");
      setLinking(null);
      await load(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not link it");
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#1B4332]" /></div>;
  }
  if (!data) return null;

  const s = data.summary;
  if (s.requirements === 0) {
    return <Empty>No requirements yet, so there is nothing to trace. They are added on the Product tab.</Empty>;
  }

  return (
    <div className="space-y-5" data-testid="traceability-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Coverage" value={`${s.coverage_pct}%`}
              hint={`${s.covered} of ${s.requirements} have a card`} />
        <Stat label="Delivered" value={s.delivered}
              hint="every card done" />
        <Stat label="Not started" value={s.uncovered} warn={s.uncovered > 0}
              hint="no card exists" />
        <Stat label="Unasked-for" value={s.unlinked_cards} warn={s.unlinked_cards > 0}
              hint="cards with no requirement" />
      </div>

      <Section title="Requirements and the cards that deliver them">
        <ul className="space-y-2">
          {data.requirements.map((r) => (
            <li key={r.requirement_id}
                className="rounded-lg border border-[#EAE7E0] bg-white p-3"
                data-testid="trace-requirement">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-mono text-gray-400 mt-0.5 shrink-0 w-10">
                  {r.req_ref}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{r.description}</p>
                  {r.cards.length === 0 ? (
                    <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Nothing on the board delivers this yet.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1">
                      {r.cards.map((c) => (
                        <li key={c.card_id} className="flex items-center gap-2 text-xs">
                          <Check className={`w-3 h-3 shrink-0 ${c.done ? "text-[#1FB58A]" : "text-gray-300"}`} />
                          <span className={c.done ? "text-gray-500" : "text-gray-800"}>{c.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {c.board_title}
                          </span>
                          <button
                            onClick={() => link(c.card_id, null)}
                            disabled={busy}
                            title="Clear this link"
                            className="text-gray-300 hover:text-red-600 ml-auto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {r.all_done && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1FB58A]/10 text-[#1B4332] shrink-0">
                    delivered
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {data.unlinked_cards.length > 0 && (
        <Section title={`Cards no requirement asked for (${data.unlinked_cards.length})`}>
          <p className="text-xs text-gray-500 mb-2">
            Most of these are chores, spikes and fixes, which is fine — not every card
            traces to a requirement. Link the ones that do.
          </p>
          <ul className="space-y-1.5">
            {data.unlinked_cards.map((c) => (
              <li key={c.card_id}
                  className="rounded-lg border border-[#EAE7E0] bg-white p-2.5"
                  data-testid="trace-unlinked-card">
                <div className="flex items-center gap-2">
                  <Check className={`w-3 h-3 shrink-0 ${c.done ? "text-[#1FB58A]" : "text-gray-300"}`} />
                  <span className="text-sm text-gray-800 min-w-0 truncate">{c.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
                    {c.board_title}
                  </span>
                  <div className="ml-auto shrink-0">
                    {linking === c.card_id ? (
                      <select
                        autoFocus
                        disabled={busy}
                        defaultValue=""
                        onChange={(e) => e.target.value && link(c.card_id, e.target.value)}
                        onBlur={() => setLinking(null)}
                        data-testid="trace-link-select"
                        className="text-xs px-2 py-1 rounded-lg border border-[#EAE7E0] bg-white text-gray-900 max-w-[240px]"
                      >
                        <option value="">Trace to…</option>
                        {data.requirements.map((r) => (
                          <option key={r.requirement_id} value={r.requirement_id}>
                            {r.req_ref} — {r.description.slice(0, 60)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setLinking(c.card_id)}
                        data-testid={`trace-link-${c.card_id}`}
                        className="text-[11px] text-[#1B4332] hover:underline flex items-center gap-1"
                      >
                        <Link2 className="w-3 h-3" /> Trace
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Closure checklist -- seeded on every project, checked off item by item.
// ---------------------------------------------------------------------------
function ClosureDrawer({ projectId, checklist, canEdit, onChanged }) {
  const [busy, setBusy] = useState(false);

  const toggle = async (item, index) => {
    setBusy(true);
    try {
      await deliveryAPI.toggleClosureItem(projectId, index, !item.done);
      onChanged();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not update it"); }
    finally { setBusy(false); }
  };

  if (!checklist?.length) return <Empty>No closure checklist on this project.</Empty>;
  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{done} of {checklist.length} complete. Stage 17 waits for all of them.</p>
      <ul className="space-y-1">
        {checklist.map((item, i) => (
          <li key={i} className="flex items-start gap-2 py-1.5">
            <button onClick={() => canEdit && toggle(item, i)} disabled={!canEdit || busy}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0
                      ${item.done ? "bg-[#1B4332] border-[#1B4332]" : "border-gray-300"}`}>
              {item.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
            <div>
              <p className={`text-sm ${item.done ? "text-gray-400 line-through" : "text-gray-800"}`}>{item.label}</p>
              {item.done && item.done_by && (
                <p className="text-[11px] text-gray-400">{item.done_by} · {fmt(item.done_at)}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Talent requirements and contract staffing (§8) -- stage 12+ only.
// ---------------------------------------------------------------------------
const ASSIGNMENT_CHIP = {
  shortlisted: "bg-gray-100 text-gray-700", interview: "bg-blue-50 text-blue-700",
  selected: "bg-indigo-50 text-indigo-700", offered: "bg-[#C6A15B]/15 text-[#8F7340]",
  accepted: "bg-[#1FB58A]/10 text-[#1B4332]", contracting: "bg-[#1FB58A]/10 text-[#1B4332]",
  contracted: "bg-[#1FB58A]/15 text-[#14342A]", deployed: "bg-[#1B4332] text-white",
  declined: "bg-red-50 text-red-700", withdrawn: "bg-red-50 text-red-700",
  not_signed: "bg-red-50 text-red-700", ended: "bg-gray-100 text-gray-500",
};

function TalentDrawer({ projectId, stage, requirements, assignments, canManage, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ role_title: "", seniority: "", quantity: 1, engagement_type: "contract", justification: "" });

  const eligible = (stage || 0) >= 12;

  const raise = async () => {
    if (!form.role_title.trim() || !form.justification.trim()) {
      toast.error("Role and justification are required"); return;
    }
    setBusy(true);
    try {
      await deliveryAPI.raiseTalentRequirement(projectId, { ...form, skills: [] });
      setForm({ role_title: "", seniority: "", quantity: 1, engagement_type: "contract", justification: "" });
      setAdding(false);
      onChanged();
      toast.success("Talent requirement raised");
    } catch (e) { toast.error(e.response?.data?.detail || "Could not raise it"); }
    finally { setBusy(false); }
  };

  const confirm = async (req) => {
    setBusy(true);
    try { await deliveryAPI.confirmTalentRequirement(req.requirement_id); onChanged(); toast.success("Requirement confirmed"); }
    catch (e) { toast.error(e.response?.data?.detail || "Could not confirm it"); }
    finally { setBusy(false); }
  };

  // One primary next-step action per assignment, matching the state machine
  // in talent_staffing.py, rather than exposing every endpoint as a button.
  const NEXT_ACTION = {
    shortlisted: { label: "Move to interview", run: (a) => deliveryAPI.advanceAssignment(a.assignment_id) },
    interview: { label: "Mark selected", run: (a) => deliveryAPI.advanceAssignment(a.assignment_id) },
    selected: { label: "Send offer", run: (a) => deliveryAPI.offerAssignment(a.assignment_id) },
    offered: { label: "Mark accepted", run: (a) => deliveryAPI.acceptAssignment(a.assignment_id) },
    accepted: { label: "Start contracting", run: (a) => deliveryAPI.contractAssignment(a.assignment_id, {}) },
    contracting: { label: "Mark signed", run: (a) => deliveryAPI.signAssignment(a.assignment_id) },
    contracted: { label: "Deploy to pod", run: (a) => deliveryAPI.deployAssignment(a.assignment_id) },
  };

  const act = async (a) => {
    const action = NEXT_ACTION[a.status];
    if (!action) return;
    setBusy(true);
    try { await action.run(a); onChanged(); }
    catch (e) { toast.error(e.response?.data?.detail || "Could not do that"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!eligible && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/30">
          <AlertTriangle className="w-4 h-4 text-[#8F7340] mt-0.5 shrink-0" />
          <p className="text-xs text-[#6B5730]">
            Talent can only be raised from stage 12, after client validation. Note the need on the
            project for now and raise it once this stage is reached.
          </p>
        </div>
      )}

      {eligible && (adding ? (
        <div className="space-y-2 p-3 rounded-lg border border-[#EAE7E0] bg-[#F7F6F3]">
          <input placeholder="Role title" value={form.role_title}
                 onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                 className="w-full text-sm p-2 rounded border border-[#EAE7E0]" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Seniority" value={form.seniority}
                   onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                   className="text-sm p-2 rounded border border-[#EAE7E0]" />
            <input type="number" min="1" placeholder="Quantity" value={form.quantity}
                   onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                   className="text-sm p-2 rounded border border-[#EAE7E0]" />
          </div>
          <select value={form.engagement_type} onChange={(e) => setForm({ ...form, engagement_type: e.target.value })}
                  className="w-full text-sm p-2 rounded border border-[#EAE7E0]">
            <option value="contract">Contract</option>
            <option value="internal">Internal</option>
          </select>
          <textarea placeholder="Why this project needs it" value={form.justification}
                    onChange={(e) => setForm({ ...form, justification: e.target.value })}
                    className="w-full text-sm p-2 rounded border border-[#EAE7E0]" rows={2} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={raise}>Raise requirement</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Raise a talent requirement
        </Button>
      ))}

      {requirements.length === 0 ? <Empty>No talent requirements yet.</Empty> : (
        <ul className="space-y-3">
          {requirements.map((req) => {
            const reqAssignments = assignments.filter((a) => a.requirement_id === req.requirement_id);
            return (
              <li key={req.requirement_id} className="p-3 rounded-lg border border-[#EAE7E0]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {req.quantity}x {req.role_title} {req.seniority && `· ${req.seniority}`}
                    </p>
                    <p className="text-[11px] text-gray-500">{req.filled_count || 0} of {req.quantity} filled</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">{req.status}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{req.justification}</p>
                {req.status === "draft" && canManage && (
                  <Button size="sm" className="mt-2" disabled={busy} onClick={() => confirm(req)}>Confirm</Button>
                )}
                {reqAssignments.length > 0 && (
                  <ul className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
                    {reqAssignments.map((a) => (
                      <li key={a.assignment_id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-gray-700">{a.talent_name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded-full ${ASSIGNMENT_CHIP[a.status] || "bg-gray-100 text-gray-600"}`}>
                            {a.status.replace(/_/g, " ")}
                          </span>
                          {canManage && NEXT_ACTION[a.status] && (
                            <button disabled={busy} onClick={() => act(a)} className="text-[#1B4332] hover:underline">
                              {NEXT_ACTION[a.status].label}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
function Section({ title, action, children, innerRef }) {
  return (
    <div ref={innerRef} className="scroll-mt-24">
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
function PodSection({ project, canManage, onChanged, focus }) {
  const [editing, setEditing] = useState(false);
  // "Form the pod" on an unmet gate opens the picker here.
  const focusRef = useGateFocus(focus, "pod", () => canManage && setEditing(true));
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
      innerRef={focusRef}
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

// The Build tab listed milestones but had no way to create one -- the API
// (`POST /flow/milestones`) has always existed; nothing in the workspace
// called it. Fields match MilestoneCreate exactly: `milestone_name`, not
// `title` -- the old read-only list quietly read the wrong field and never
// showed a name for anything.
function MilestonesSection({ projectId, milestones, canManage, onChanged, focus }) {
  const [adding, setAdding] = useState(false);
  // "Add a milestone" on an unmet gate opens the form here.
  const focusRef = useGateFocus(focus, "milestones", () => canManage && setAdding(true));
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ milestone_name: "", deliverable: "", target_date: "", payment_percent: "" });
  // Held per milestone so attaching a file does not refetch the whole
  // workspace and collapse the Build tab under the reader.
  const [deliverables, setDeliverables] = useState({});

  const deliverablesFor = (m) => deliverables[m.milestone_id] ?? (m.deliverables || []);

  const submit = async () => {
    if (!form.milestone_name.trim()) { toast.error("Name the milestone"); return; }
    setBusy(true);
    try {
      await flowAPI.createMilestone({
        project_id: projectId,
        milestone_name: form.milestone_name.trim(),
        deliverable: form.deliverable.trim(),
        target_date: form.target_date || null,
        payment_percent: form.payment_percent ? Number(form.payment_percent) : 0,
      });
      toast.success("Milestone added");
      setForm({ milestone_name: "", deliverable: "", target_date: "", payment_percent: "" });
      setAdding(false);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not add it");
    } finally { setBusy(false); }
  };

  const deliver = async (m) => {
    setBusy(true);
    try {
      await flowAPI.deliverMilestone(m.milestone_id);
      toast.success("Marked delivered");
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not update it");
    } finally { setBusy(false); }
  };

  return (
    <Section
      innerRef={focusRef}
      title="Milestones"
      action={canManage && !adding && (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} data-testid="add-milestone-btn">
          <Plus className="w-3.5 h-3.5 mr-1" />Add
        </Button>
      )}
    >
      {adding && (
        <div className="space-y-2 p-3 mb-3 rounded-lg border border-[#EAE7E0] bg-[#F7F6F3]">
          <input placeholder="Milestone name" value={form.milestone_name}
                 onChange={(e) => setForm({ ...form, milestone_name: e.target.value })}
                 data-testid="milestone-name-input"
                 className="w-full text-sm p-2 rounded border border-[#EAE7E0] bg-white" />
          <input placeholder="Deliverable (optional)" value={form.deliverable}
                 onChange={(e) => setForm({ ...form, deliverable: e.target.value })}
                 className="w-full text-sm p-2 rounded border border-[#EAE7E0] bg-white" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.target_date}
                   onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                   className="text-sm p-2 rounded border border-[#EAE7E0] bg-white" />
            <input type="number" min="0" max="100" placeholder="Payment %" value={form.payment_percent}
                   onChange={(e) => setForm({ ...form, payment_percent: e.target.value })}
                   className="text-sm p-2 rounded border border-[#EAE7E0] bg-white" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={submit} data-testid="save-milestone-btn">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {milestones.length === 0
        ? <Empty>No milestones yet.</Empty>
        : (
          <ul className="divide-y divide-gray-100">
            {milestones.map((m) => (
              <li key={m.milestone_id} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className={m.delivered_date ? "text-gray-400 line-through" : "text-gray-800"}>
                      {m.milestone_name}
                    </span>
                    {m.deliverable && <p className="text-[11px] text-gray-500">{m.deliverable}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">{fmt(m.target_date)}</span>
                    {canManage && !m.delivered_date && (
                      <button disabled={busy} onClick={() => deliver(m)}
                              data-testid={`deliver-milestone-${m.milestone_id}`}
                              className="text-xs text-[#1B4332] hover:underline">
                        Mark delivered
                      </button>
                    )}
                  </div>
                </div>
                {/* The deliverable itself, on the milestone it satisfies. The
                    text field above names what is owed; this is the thing. */}
                <div className="mt-1.5">
                  <AttachmentStrip
                    testId={`milestone-files-${m.milestone_id}`}
                    attachments={deliverablesFor(m)}
                    label="Attach the deliverable"
                    disabled={!canManage}
                    onUpload={async (file) => {
                      const a = await deliveryAPI.attachDeliverable(m.milestone_id, file);
                      setDeliverables((prev) => ({
                        ...prev, [m.milestone_id]: [...deliverablesFor(m), a],
                      }));
                      return a;
                    }}
                    onRemove={async (attachmentId) => {
                      await deliveryAPI.removeDeliverable(m.milestone_id, attachmentId);
                      setDeliverables((prev) => ({
                        ...prev,
                        [m.milestone_id]: deliverablesFor(m).filter((x) => x.attachment_id !== attachmentId),
                      }));
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Client contacts
// ---------------------------------------------------------------------------
const BLANK_CONTACT = {
  full_name: "", title: "", email: "", phone: "", whatsapp: "",
  birthday: "", strength: "warm", notes: "",
};

function ContactsDrawer({ projectId, clientName }) {
  const [contacts, setContacts] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(BLANK_CONTACT);

  const load = useCallback(async () => {
    try {
      setContacts(await flowAPI.projectContacts(projectId));
    } catch {
      setContacts([]);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.full_name.trim()) { toast.error("The contact needs a name"); return; }
    setBusy(true);
    try {
      await flowAPI.createContact({
        ...form,
        full_name: form.full_name.trim(),
        // Matched to the client by name, which is how this project finds its
        // contacts in the first place.
        client_name: clientName || "",
        // Recorded so the contact can be traced back to the engagement that
        // produced them.
        project_id: projectId,
      });
      toast.success(`${form.full_name.trim()} added to ${clientName || "this client"}`);
      setForm(BLANK_CONTACT);
      setAdding(false);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not add that contact");
    } finally { setBusy(false); }
  };

  if (contacts === null) {
    return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-[#1B4332]" /></div>;
  }

  const rows = Array.isArray(contacts) ? contacts : (contacts.contacts || []);
  const field = "w-full px-3 py-2 text-sm rounded-lg border border-[#EAE7E0] bg-white text-gray-900 focus:outline-none focus:border-[#1B4332]";

  return (
    <div className="space-y-4" data-testid="contacts-drawer">
      <p className="text-xs text-gray-500">
        The people at {clientName || "this client"}. Contact details are restricted, so
        some fields may not be shown to you.
      </p>

      {/* Added here rather than by sending somebody to the contacts section.
          Leaving the project to record who you just spoke to means losing the
          project, and the client is already known -- there was nothing to go
          and look up. */}
      {!adding ? (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}
                data-testid="add-contact-inline">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add a contact
        </Button>
      ) : (
        <div className="rounded-lg border border-[#EAE7E0] bg-[#F7F6F3] p-3 space-y-2">
          <p className="text-[11px] text-gray-500">
            Recorded against <b>{clientName || "this client"}</b>, so it shows on their
            other projects too.
          </p>
          <input
            autoFocus
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Full name"
            data-testid="contact-name"
            className={field}
          />
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Their role (optional)"
            className={field}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              data-testid="contact-email"
              className={field}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className={field}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              placeholder="Birthday (DD-MM)"
              className={field}
            />
            <select
              value={form.strength}
              onChange={(e) => setForm({ ...form, strength: e.target.value })}
              className={field}
            >
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="strong">Strong</option>
              <option value="champion">Champion</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy}
                    className="bg-[#1B4332] hover:bg-[#14342A]" data-testid="save-contact">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add contact"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy}
                    onClick={() => { setAdding(false); setForm(BLANK_CONTACT); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>Nobody recorded for this client yet.</Empty>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((c) => (
            <li key={c.contact_id || c.id} className="py-3" data-testid="contact-row">
              {/* `full_name` and `title` are what a contact actually stores.
                  This read `name` and `role`, which no contact has ever
                  carried, so every row rendered blank. */}
              <p className="text-sm font-medium text-gray-900">
                {c.full_name || c.name || "Unnamed contact"}
              </p>
              {(c.title || c.role) && (
                <p className="text-[11px] text-gray-500">{c.title || c.role}</p>
              )}
              {c.email && <p className="text-xs text-gray-600">{c.email}</p>}
              {c.phone && <p className="text-xs text-gray-600">{c.phone}</p>}
              {c.birthday && (
                <p className="text-[11px] text-pink-700 mt-0.5">Birthday {c.birthday}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
