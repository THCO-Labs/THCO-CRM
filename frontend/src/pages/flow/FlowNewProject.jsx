import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FlowShell from "./FlowShell";
import { flowAPI, unitsAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { useUser, canManageUsers } from "../../context/UserContext";
import CollaboratorPicker from "../../components/flow/CollaboratorPicker";

export default function FlowNewProject() {
  const navigate = useNavigate();
  const user = useUser();
  const headed = useMemo(() => user?.headed_units || [], [user]);
  const isAdmin = canManageUsers(user);

  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({
    name: "",
    client_name: "",
    website: "",
    description: "",
    project_type: "new_client",
    source: "",
    notes: "",
    // A project belongs to a unit, and a head may only open one under the
    // unit they head. Somebody who heads exactly one unit never has a
    // decision to make here, so it is filled in for them.
    unit_slug: headed.length === 1 ? headed[0] : "",
    collaborator_ids: [],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setUnits((await unitsAPI.list()) || []);
      } catch {
        /* the slug is what matters; names are a nicety */
      }
    })();
  }, []);

  // Administrators may open a project under any unit; a head is confined to
  // the ones they run.
  const selectableUnits = isAdmin ? units : units.filter((u) => headed.includes(u.slug));

  const set = (k, v) => setForm({ ...form, [k]: v });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Project name required"); return; }
    if (!form.client_name.trim()) { toast.error("Client name required"); return; }
    if (!isAdmin && !form.unit_slug) { toast.error("Choose the unit this project belongs to"); return; }
    setSubmitting(true);
    try {
      const created = await flowAPI.createProject(form);
      toast.success(`Project created — ${created.project_id_display}`);
      navigate(`/flow/projects/${created.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create project");
    } finally { setSubmitting(false); }
  };

  return (
    <FlowShell title="New Project (Stage 1 — Prospect)">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 max-w-2xl space-y-5 shadow-sm">
        <Field label="Project Name" required>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} data-testid="np-name" placeholder="e.g. Acme Q2 Platform Build" />
        </Field>

        <Field label="Client Name" required>
          <input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className={inputCls} data-testid="np-client" placeholder="Free text — type the client" />
        </Field>

        {/* A head opens work under the unit they run, so the project has to
            say which unit it belongs to. Hidden when there is nothing to
            decide -- one unit headed, and it is already filled in. */}
        {(isAdmin || selectableUnits.length > 1) && (
          <Field label="Unit" required={!isAdmin}>
            <select
              value={form.unit_slug}
              onChange={(e) => set("unit_slug", e.target.value)}
              className={inputCls}
              data-testid="np-unit"
            >
              <option value="">{isAdmin ? "— no unit —" : "Choose a unit…"}</option>
              {selectableUnits.map((u) => (
                <option key={u.slug} value={u.slug}>{u.name}</option>
              ))}
            </select>
          </Field>
        )}
        {!isAdmin && selectableUnits.length === 1 && (
          <p className="text-xs text-gray-400" data-testid="np-unit-fixed">
            Unit · <span className="text-gray-600 font-medium">{selectableUnits[0].name}</span>
          </p>
        )}

        {/* Staff no longer open their own work, so putting the team on at
            creation is how they come to have any. Everyone chosen here is
            emailed and notified once the project is saved. */}
        <Field label="Who's working on this? (optional)">
          <CollaboratorPicker
            unitSlug={form.unit_slug}
            value={form.collaborator_ids}
            onChange={(ids) => set("collaborator_ids", ids)}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Project Type">
            <select value={form.project_type} onChange={(e) => set("project_type", e.target.value)} className={inputCls} data-testid="np-type">
              <option value="new_client">New Client Project</option>
              <option value="existing_expansion">Existing Client Expansion</option>
            </select>
          </Field>
          <Field label="Source (who brought it in)">
            <input value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls} data-testid="np-source" placeholder="Network, Outbound, Referral..." />
          </Field>
        </div>

        <Field label="Company Website (optional)">
          <input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls} placeholder="https://example.com" data-testid="np-website" />
        </Field>

        <Field label="Description (optional, 500 chars)">
          <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value.slice(0, 500))} className={inputCls + " resize-none"} data-testid="np-description" />
          <p className="text-xs text-gray-400 mt-1">{form.description.length}/500</p>
        </Field>

        <Field label="Initial Notes (optional)">
          <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls + " resize-none"} data-testid="np-notes" placeholder="Initial intake notes, what we know..." />
        </Field>

        <Button type="submit" disabled={submitting} className="w-full bg-[#1B4332] hover:bg-[#1B4332]/90 text-white py-6 text-base font-semibold" data-testid="np-submit">
          {submitting ? "Creating..." : "Create Project (Stage 1)"}
        </Button>
        <p className="text-xs text-gray-400 text-center">
          Project starts at Stage 1 (Prospect). Qualifiers will be notified by email.
        </p>
      </form>
    </FlowShell>
  );
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none";

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);
