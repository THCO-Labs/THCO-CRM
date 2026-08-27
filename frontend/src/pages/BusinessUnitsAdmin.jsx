import { useState, useEffect } from "react";
import {
  Plus, Building2, Users, Trash2, Mail, Layers, Wrench, FolderKanban,
  MessageSquare, UserCog, LayoutDashboard, Send, CheckCircle2, AlertCircle, GripVertical,
  Eye, EyeOff,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../components/ui/dialog";
import { unitsAPI } from "../lib/api";
import { toast } from "sonner";

const ICON_OPTIONS = [
  { value: "layers", label: "Layers" },
  { value: "building-2", label: "Building" },
  { value: "users", label: "Users" },
  { value: "briefcase", label: "Briefcase" },
  { value: "wrench", label: "Wrench" },
  { value: "trending-up", label: "Trending Up" },
  { value: "megaphone", label: "Megaphone" },
  { value: "graduation-cap", label: "Graduation" },
  { value: "code", label: "Code" },
  { value: "truck", label: "Truck" },
  { value: "clipboard-list", label: "Clipboard" },
  { value: "headphones", label: "Headphones" },
  { value: "folder-kanban", label: "Folder" },
  { value: "lightbulb", label: "Lightbulb" },
  { value: "home", label: "Home" },
  { value: "scale", label: "Scale" },
  { value: "dollar-sign", label: "Dollar Sign" },
  { value: "shield-check", label: "Shield" },
];

const SECTION_META = [
  { key: "overview", label: "Overview stats", icon: LayoutDashboard },
  { key: "tools", label: "Tools available", icon: Wrench },
  { key: "team", label: "Team", icon: Users },
  { key: "flow", label: "Crowther OS pipeline", icon: FolderKanban },
  { key: "feedback", label: "Feedback & IT Support", icon: MessageSquare },
];

const emptyForm = {
  name: "", description: "", icon: "layers", accent: "#1FB58A", lead: "",
  sections: { overview: true, tools: true, team: true, flow: true, feedback: true },
  userTasks: [""],
};

const BusinessUnitsAdmin = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [inviteUnit, setInviteUnit] = useState(null); // unit object
  const [emailsText, setEmailsText] = useState("");
  const [sharedPw, setSharedPw] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const [editUnit, setEditUnit] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [reordering, setReordering] = useState(false);

  const load = async () => {
    try {
      const data = await unitsAPI.list();
      setUnits(data || []);
    } catch (e) {
      toast.error("Failed to load business units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };

  const setSection = (key, val) => setForm((f) => ({ ...f, sections: { ...f.sections, [key]: val } }));
  const setTask = (i, val) => setForm((f) => {
    const t = [...f.userTasks]; t[i] = val; return { ...f, userTasks: t };
  });
  const addTask = () => setForm((f) => ({ ...f, userTasks: [...f.userTasks, ""] }));
  const removeTask = (i) => setForm((f) => ({ ...f, userTasks: f.userTasks.filter((_, j) => j !== i) }));

  const saveCreate = async () => {
    if (!form.name.trim()) { toast.error("Unit name is required"); return; }
    setSaving(true);
    try {
      await unitsAPI.create({
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon,
        accent: form.accent,
        lead: form.lead.trim(),
        config: {
          sections: form.sections,
          userTasks: form.userTasks.map((t) => t.trim()).filter(Boolean),
        },
      });
      toast.success("Business unit created");
      setCreateOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create unit");
    } finally {
      setSaving(false);
    }
  };

  const openInvite = (unit) => { setInviteUnit(unit); setEmailsText(""); setSharedPw(""); setInviteResult(null); };

  const sendInvites = async () => {
    const emails = emailsText.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
    if (!emails.length) { toast.error("Enter at least one email"); return; }
    setInviting(true);
    try {
      const res = await unitsAPI.invite(inviteUnit.slug, { emails, password: sharedPw || undefined });
      setInviteResult(res);
      toast.success(`Created ${res.created.length}, updated ${res.updated.length}, emails sent ${res.emails_sent.length}`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to invite members");
    } finally {
      setInviting(false);
    }
  };

  // Dragging a card sets its new position in the on-screen list immediately,
  // then persists every unit's position (not just the ones that moved) so the
  // whole arrangement -- built-in units included -- is explicit afterward
  // rather than left to depend on creation order for anything untouched.
  const handleDrop = async (targetIndex) => {
    const fromIndex = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (fromIndex === null || fromIndex === targetIndex) return;

    const reordered = [...units];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setUnits(reordered);
    setReordering(true);
    try {
      await Promise.all(reordered.map((u, idx) => unitsAPI.update(u.slug, { order: idx + 1 })));
    } catch (e) {
      toast.error("Failed to save the new order");
      load();
    } finally {
      setReordering(false);
    }
  };

  const toggleHidden = async (u) => {
    const next = !u.hidden;
    setUnits((prev) => prev.map((x) => (x.slug === u.slug ? { ...x, hidden: next } : x)));
    try {
      await unitsAPI.update(u.slug, { hidden: next });
      toast.success(next ? "Unit hidden from the sidebar" : "Unit restored to the sidebar");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update");
      load();
    }
  };

  const confirmDelete = async () => {
    try {
      await unitsAPI.remove(deleting.slug);
      toast.success("Unit deleted");
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="lux-eyebrow mb-2">Administration</p>
          <h1 className="font-display text-3xl text-gray-900">Business Units</h1>
          <p className="text-sm text-gray-500 mt-2">
            Create business units, configure what appears on each unit's page, and invite members by email.
            New members get their login details sent automatically.
            Drag a card by its <GripVertical className="w-3.5 h-3.5 inline -mt-0.5" /> handle to change the order units appear in the sidebar,
            or use <EyeOff className="w-3.5 h-3.5 inline -mt-0.5" /> Hide to take a unit off the sidebar without deleting it.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {reordering && <span className="text-xs text-gray-400">Saving order…</span>}
          <Button onClick={openCreate} className="bg-[#1FB58A] hover:bg-[#179C76] text-white rounded-lg">
            <Plus className="w-4 h-4 mr-2" /> New Unit
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-40 bg-[#EFEDE8] rounded-2xl animate-pulse" />
      ) : units.length === 0 ? (
        <div className="lux-card p-10 text-center text-gray-400">
          <Building2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No custom business units yet. Click "New Unit" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {units.map((u, i) => (
            <div
              key={u.unit_id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
              className={`lux-card p-5 transition-opacity ${dragIndex === i ? "opacity-40" : ""} ${overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-[#1FB58A]" : ""} ${u.hidden ? "opacity-60" : ""}`}
              data-testid={`unit-card-${u.slug}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-10 flex items-center justify-center shrink-0 -ml-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                  title="Drag to reorder"
                  data-testid={`unit-drag-handle-${u.slug}`}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${u.accent}1A`, border: `1px solid ${u.accent}55` }}
                >
                  <Building2 className="w-5 h-5" style={{ color: u.accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    {u.name}
                    {u.hidden && (
                      <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-normal uppercase tracking-wide flex items-center gap-1">
                        <EyeOff className="w-2.5 h-2.5" /> Hidden
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-gray-500 line-clamp-2">{u.description || "No description"}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {u.member_count || 0} member{(u.member_count || 0) === 1 ? "" : "s"}
                    {u.lead ? ` · Lead: ${u.lead}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {SECTION_META.filter((s) => u.config?.sections?.[s.key]).map((s) => (
                  <span key={s.key} className="px-2 py-0.5 rounded-full bg-[#F0EEE9] text-[11px] text-gray-600 flex items-center gap-1">
                    <s.icon className="w-3 h-3" /> {s.label}
                  </span>
                ))}
              </div>

              {u.config?.userTasks?.length > 0 && (
                <div className="mt-3 text-[12px] text-gray-600">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400">Member responsibilities</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {u.config.userTasks.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}
                    {u.config.userTasks.length > 3 && <li className="text-gray-400">+{u.config.userTasks.length - 3} more</li>}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F0EEE9]">
                <Button size="sm" variant="outline" onClick={() => openInvite(u)} className="border-[#EAE7E0] text-gray-700 hover:bg-[#FBFAF7] rounded-lg text-[12px]">
                  <Mail className="w-3.5 h-3.5 mr-1.5" /> Invite Members
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditUnit(u)} className="text-gray-500 rounded-lg text-[12px]">Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleHidden(u)}
                  title={u.hidden ? "Show in sidebar" : "Hide from sidebar"}
                  data-testid={`unit-toggle-hidden-${u.slug}`}
                  className="text-gray-500 rounded-lg text-[12px] ml-auto"
                >
                  {u.hidden ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
                  {u.hidden ? "Show" : "Hide"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(u)} className="text-red-500 hover:bg-red-50 rounded-lg text-[12px]">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Unit Dialog */}
      <Dialog open={createOpen || !!editUnit} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditUnit(null); } }}>
        <DialogContent className="max-w-[560px] max-h-[88vh] overflow-y-auto bg-white border-[#EAE7E0] text-gray-900">
          <DialogHeader>
            <DialogTitle>{editUnit ? "Edit Business Unit" : "Create Business Unit"}</DialogTitle>
            <DialogDescription>
              Configure the unit's name, look, what shows on its page, and what members do.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Unit Name</Label>
              <Input
                value={editUnit ? editUnit.name : form.name}
                onChange={(e) => editUnit ? setEditUnit({ ...editUnit, name: e.target.value }) : setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Logistics & Supply"
                className="h-11 bg-white border-[#EAE7E0] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Description</Label>
              <Textarea
                value={editUnit ? editUnit.description : form.description}
                onChange={(e) => editUnit ? setEditUnit({ ...editUnit, description: e.target.value }) : setForm({ ...form, description: e.target.value })}
                placeholder="What this unit does…"
                className="min-h-[70px] bg-white border-[#EAE7E0] rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Icon</Label>
                <select
                  value={editUnit ? editUnit.icon : form.icon}
                  onChange={(e) => editUnit ? setEditUnit({ ...editUnit, icon: e.target.value }) : setForm({ ...form, icon: e.target.value })}
                  className="h-11 w-full bg-white border border-[#EAE7E0] rounded-lg px-3 text-[14px]"
                >
                  {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Accent Color</Label>
                <div className="flex items-center gap-2 h-11 px-3 border border-[#EAE7E0] rounded-lg bg-white">
                  <input
                    type="color"
                    value={editUnit ? editUnit.accent : form.accent}
                    onChange={(e) => editUnit ? setEditUnit({ ...editUnit, accent: e.target.value }) : setForm({ ...form, accent: e.target.value })}
                    className="w-8 h-8 rounded border-0 bg-transparent p-0 cursor-pointer"
                  />
                  <span className="text-[13px] text-gray-500">{(editUnit ? editUnit.accent : form.accent)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Unit Lead</Label>
              <Input
                value={editUnit ? editUnit.lead : form.lead}
                onChange={(e) => editUnit ? setEditUnit({ ...editUnit, lead: e.target.value }) : setForm({ ...form, lead: e.target.value })}
                placeholder="e.g. Kemi"
                className="h-11 bg-white border-[#EAE7E0] rounded-lg"
              />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 mb-2">Page Sections</p>
              <div className="space-y-2">
                {SECTION_META.map((s) => {
                  const cfg = editUnit?.config?.sections || form.sections;
                  return (
                    <div key={s.key} className="flex items-center justify-between py-1.5">
                      <span className="text-[13px] text-gray-700 flex items-center gap-2">
                        <s.icon className="w-4 h-4 text-gray-400" /> {s.label}
                      </span>
                      <Switch
                        checked={!!cfg[s.key]}
                        onCheckedChange={(v) => editUnit
                          ? setEditUnit({ ...editUnit, config: { ...editUnit.config, sections: { ...editUnit.config.sections, [s.key]: v } } })
                          : setSection(s.key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 mb-2">What Members Do</p>
              <div className="space-y-2">
                {(editUnit ? editUnit.config?.userTasks || [""] : form.userTasks).map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={t}
                      onChange={(e) => editUnit
                        ? setEditUnit({ ...editUnit, config: { ...editUnit.config, userTasks: (editUnit.config.userTasks || []).map((x, j) => j === i ? e.target.value : x) } })
                        : setTask(i, e.target.value)}
                      placeholder={`Responsibility ${i + 1}`}
                      className="h-10 bg-white border-[#EAE7E0] rounded-lg"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(i)} className="text-red-500 px-2">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTask} className="border-[#EAE7E0] text-gray-600 rounded-lg">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add responsibility
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setEditUnit(null); }}>Cancel</Button>
            <Button
              onClick={async () => {
                if (editUnit) {
                  try {
                    await unitsAPI.update(editUnit.slug, {
                      name: editUnit.name, description: editUnit.description, icon: editUnit.icon,
                      accent: editUnit.accent, lead: editUnit.lead, config: editUnit.config,
                    });
                    toast.success("Unit updated"); setEditUnit(null); load();
                  } catch (e) { toast.error(e?.response?.data?.detail || "Update failed"); }
                } else {
                  await saveCreate();
                }
              }}
              disabled={saving}
              className="bg-[#1FB58A] hover:bg-[#179C76] text-white rounded-lg"
            >
              {editUnit ? "Save Changes" : saving ? "Creating…" : "Create Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Members Dialog */}
      <Dialog open={!!inviteUnit} onOpenChange={(o) => { if (!o) setInviteUnit(null); }}>
        <DialogContent className="max-w-[520px] bg-white border-[#EAE7E0] text-gray-900">
          <DialogHeader>
            <DialogTitle>Invite Members — {inviteUnit?.name}</DialogTitle>
            <DialogDescription>
              Enter member emails (one per line or comma-separated). Accounts are created with access to this unit + Crowther OS, and login details are emailed to them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Member Emails</Label>
              <Textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder={"member1@company.com\nmember2@company.com"}
                className="min-h-[110px] bg-white border-[#EAE7E0] rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Shared Password (optional — auto-generated if blank)
              </Label>
              <Input
                type="text"
                value={sharedPw}
                onChange={(e) => setSharedPw(e.target.value)}
                placeholder="Min 6 characters"
                className="h-11 bg-white border-[#EAE7E0] rounded-lg"
              />
            </div>

            {inviteResult && (
              <div className="rounded-lg bg-[#F7F6F3] border border-[#EAE7E0] p-3 text-[12px] space-y-1">
                <p className="flex items-center gap-1.5 text-[#179C76]"><CheckCircle2 className="w-4 h-4" /> Created: {inviteResult.created.length} · Updated: {inviteResult.updated.length} · Emailed: {inviteResult.emails_sent.length}</p>
                {inviteResult.errors?.length > 0 && (
                  <p className="flex items-center gap-1.5 text-red-500"><AlertCircle className="w-4 h-4" /> {inviteResult.errors.join("; ")}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteUnit(null)}>Close</Button>
            <Button onClick={sendInvites} disabled={inviting} className="bg-[#1FB58A] hover:bg-[#179C76] text-white rounded-lg">
              {inviting ? "Sending…" : <><Send className="w-4 h-4 mr-2" /> Send Invites</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <DialogContent className="max-w-[420px] bg-white border-[#EAE7E0] text-gray-900">
          <DialogHeader>
            <DialogTitle>Delete unit?</DialogTitle>
            <DialogDescription>
              This permanently removes "{deleting?.name}" and its configuration. Members keep their accounts but lose access to this unit.
              If it's just not needed right now, <button type="button" onClick={() => { toggleHidden(deleting); setDeleting(null); }} className="text-[#1FB58A] underline">hide it instead</button> — that can be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessUnitsAdmin;
