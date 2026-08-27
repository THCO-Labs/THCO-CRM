import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  Copy,
  Check,
  Trash2,
  KeyRound,
  Pencil,
  ShieldCheck,
  Users as UsersIcon,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { toast } from "sonner";
import { usersAPI, unitsAPI } from "../lib/api";
import { useUser } from "../context/UserContext";

// The units offered here come from the database, not from a list in this file.
//
// They used to be hardcoded, which meant Business Units Admin could rename,
// hide or delete a unit and this screen carried on offering it: a deleted
// "Academy & Learning" was still assignable, and granting somebody access to a
// unit that no longer exists is a permission nobody can ever act on.
//
// Kept only as the fallback for the moments before the fetch returns, and if
// the request fails outright -- an empty list would read as "this person has
// no units" rather than "we could not load them".
const FALLBACK_UNITS = [
  { slug: "talent", name: "Talent & Delivery" },
  { slug: "thco-hr", name: "Crowther HR" },
  { slug: "it-tools", name: "IT & Crowther Tools" },
  { slug: "sales", name: "Sales & Business Dev" },
  { slug: "marketing", name: "Marketing & Brand" },
  { slug: "advisory", name: "Advisory & Consulting" },
  { slug: "technology", name: "Technology & Build" },
  { slug: "operations", name: "Operations & Finance" },
  { slug: "client-delivery", name: "Client Delivery" },
];

const ROLE_LABELS = {
  super_admin: "Super Admin",
  mini_admin: "Admin",
  team_member: "Team Member",
};

// What a person does on a delivery project, as opposed to how much of the
// system they may reach. `role` above is the access level; this is the job.
// One person can be a mini_admin and a talent_sd -- the two answer different
// questions, and collapsing them would mean promoting somebody to see their
// own work.
//
// Solution Architect is deliberately absent. It is a hat worn on one project:
// an engineer carries `can_architect`, and the project names one of them.
const FUNCTION_ROLES = [
  { value: "", label: "Not set" },
  { value: "senior_partner", label: "Senior Partner" },
  { value: "commercial", label: "Commercial / Initiator" },
  { value: "tsd", label: "TSD (owns projects)" },
  { value: "engineer", label: "Engineer" },
  { value: "product_designer", label: "Product Designer" },
  { value: "qa", label: "QA / Tester" },
  { value: "talent_sd", label: "TalentSD" },
  { value: "people_ops", label: "People & Operations" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
];

// Only these reach the pipeline. Engineers, designers and QA work on the
// board instead, which is a different router and unaffected.
const PIPELINE_FUNCTIONS = new Set([
  "senior_partner", "commercial", "tsd", "talent_sd", "people_ops", "legal", "finance",
]);

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "team_member",
  accessible_units: [],
  is_hr: false,
  is_engineer: false,
  function_role: "",
  can_architect: false,
  can_start_projects: false,
  is_fulfillment: false,
  // Optionally make this person the head of a unit as they are invited. A
  // unit has one head, so choosing one here replaces whoever holds it.
  head_of_unit: "",
};

export default function UserManagement() {
  const currentUser = useUser();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState({});

  // Create-user modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [copied, setCopied] = useState(false);

  // Edit drawer
  const [editUser, setEditUser] = useState(null);
  const [editUnits, setEditUnits] = useState([]);
  const [editRole, setEditRole] = useState("team_member");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFunctionRole, setEditFunctionRole] = useState("");
  const [editCanArchitect, setEditCanArchitect] = useState(false);
  const [editCanStartProjects, setEditCanStartProjects] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Password reset
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data || []);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  // Units carry their head, so they are loaded alongside the staff list.
  const fetchUnits = useCallback(async () => {
    try {
      setUnits((await unitsAPI.list()) || []);
    } catch {
      /* the page is still usable without the head column */
    }
  }, []);

  // What the unit-access pickers offer. Live units, hidden ones excluded --
  // a hidden unit is one an administrator has taken out of circulation, and
  // offering it here would put people into something they cannot reach.
  // Falls back to the built-in list only while loading or if the fetch fails,
  // so an empty picker never reads as "this person has no units".
  const ALL_UNITS = useMemo(() => {
    const live = (units || []).filter((u) => !u.hidden);
    return live.length
      ? live.map((u) => ({ slug: u.slug, name: u.name || u.slug }))
      : FALLBACK_UNITS;
  }, [units]);

  useEffect(() => {
    fetchUsers();
    fetchUnits();
  }, [fetchUsers, fetchUnits]);

  // Arriving from "Add Staff" elsewhere in the app opens the invite form
  // directly, rather than landing here and having to find the button.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("invite") === "1") {
      setCreateOpen(true);
    }
  }, []);

  const unitName = (slug) =>
    units.find((u) => u.slug === slug)?.name ||
    ALL_UNITS.find((u) => u.slug === slug)?.name ||
    slug;

  const headOf = (slug) => units.find((u) => u.slug === slug)?.head_name || null;

  // Which unit, if any, this person currently heads.
  // Every unit this person manages projects in. Two sources, because there
  // are two ways to hold it: the grant carried on the person, which is how
  // most units run with every member a manager, and being named on the unit
  // itself, which is how Technology & Build runs with one. Reading only the
  // second showed a single manager across the whole company.
  const unitsManaged = (u) => {
    const named = units.filter((x) => x.head_user_id === u.user_id).map((x) => x.slug);
    const granted = u.headed_units || [];
    return Array.from(new Set([...named, ...granted]))
      .filter((s) => s !== "flow")
      .map((s) => unitName(s))
      .sort();
  };

  const unitHeaded = (userId) => units.find((u) => u.head_user_id === userId) || null;

  // Grant or take back the project-manager role for one person in one unit.
  // Held on the person, so several people can manage the same unit -- which
  // is how most units run.
  const togglePM = async (slug, person, isCurrently) => {
    const key = `pm_${slug}_${person.user_id}`;
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      const current = new Set(person.headed_units || []);
      isCurrently ? current.delete(slug) : current.add(slug);
      const next = Array.from(current).sort();
      await usersAPI.update(person.user_id, { headed_units: next });

      // A person named on the unit itself keeps the role through that route,
      // so removing the grant alone would leave them still managing it.
      if (isCurrently && units.find((x) => x.slug === slug)?.head_user_id === person.user_id) {
        await unitsAPI.setHead(slug, null);
        await fetchUnits();
      }

      setUsers((prev) =>
        prev.map((x) => (x.user_id === person.user_id ? { ...x, headed_units: next } : x))
      );
      toast.success(
        isCurrently
          ? `${person.name} no longer manages projects in ${unitName(slug)}`
          : `${person.name} can now manage projects in ${unitName(slug)}`
      );
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not change the TSD");
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const changeHead = async (slug, userId) => {
    setSaving((s) => ({ ...s, [`head_${slug}`]: true }));
    try {
      const res = await unitsAPI.setHead(slug, userId);
      await fetchUnits();
      toast.success(
        userId
          ? `${res.head_name} now heads ${unitName(slug)}` +
              (res.previous_head_name ? ` (replacing ${res.previous_head_name})` : "")
          : `${unitName(slug)} now has no head`
      );
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not change the TSD");
    } finally {
      setSaving((s) => ({ ...s, [`head_${slug}`]: false }));
    }
  };

  // HR / mini admins may not manage super admins
  const canEditTarget = (u) => isSuperAdmin || u.role !== "super_admin";

  const toggleField = async (u, field) => {
    if (!canEditTarget(u)) return toast.error("Only super admins can modify super admins");
    setSaving((s) => ({ ...s, [u.user_id + field]: true }));
    try {
      await usersAPI.update(u.user_id, { [field]: !u[field] });
      setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? { ...x, [field]: !u[field] } : x)));
      toast.success("Updated");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update");
    } finally {
      setSaving((s) => ({ ...s, [u.user_id + field]: false }));
    }
  };

  const toggleStatus = async (u) => {
    if (!canEditTarget(u)) return toast.error("Only super admins can modify super admins");
    const next = u.status === "active" ? "disabled" : "active";
    setSaving((s) => ({ ...s, [u.user_id + "status"]: true }));
    try {
      await usersAPI.update(u.user_id, { status: next });
      setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? { ...x, status: next } : x)));
      toast.success(next === "active" ? "Account activated" : "Account disabled");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update status");
    } finally {
      setSaving((s) => ({ ...s, [u.user_id + "status"]: false }));
    }
  };

  const updateCapacity = async (userId, value) => {
    try {
      await usersAPI.update(userId, { engineer_capacity_override: value ? parseInt(value) : null });
      toast.success("Capacity updated");
    } catch {
      toast.error("Failed to update capacity");
    }
  };

  // ---- Create user ----
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    const arr = new Uint32Array(10);
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < 10; i++) pw += chars[arr[i] % chars.length];
    setForm((f) => ({ ...f, password: pw }));
    setShowPassword(true);
  };

  const submitCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) return toast.error("Name and email are required");
    // "__pick__" means unit head was chosen but no unit picked yet.
    if (form.head_of_unit === "__pick__") return toast.error("Choose which unit they will manage");
    if (form.password && form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setCreating(true);
    try {
      const res = await usersAPI.create({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password || undefined,
        role: form.role,
        accessible_units: form.accessible_units,
        is_hr: form.is_hr,
        is_engineer: form.is_engineer,
        is_fulfillment: form.is_fulfillment,
        head_of_unit: form.head_of_unit || undefined,
        // Empty means not set, which is a real state: somebody who has not
        // been given a delivery function yet sees only what they are put on.
        function_role: form.function_role || undefined,
        can_architect: form.function_role === "engineer" ? form.can_architect : undefined,
        // Only meaningful for a TSD: everyone else either already has it
        // (Senior Partner, admins) or should not.
        can_start_projects: form.function_role === "tsd" ? form.can_start_projects : undefined,
      });
      setCreatedCreds({ email: res.email, password: res.temp_password, emailSent: res.email_sent });
      toast.success(
        form.head_of_unit
          ? `${res.name} added and made head of ${unitName(form.head_of_unit)}`
          : `${res.name} added to the portal`
      );
      fetchUsers();
      fetchUnits();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setForm(emptyForm);
    setCreatedCreds(null);
    setShowPassword(false);
    setCopied(false);
  };

  const copyCreds = () => {
    navigator.clipboard.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- Edit access ----
  const openEdit = (u) => {
    if (!canEditTarget(u)) return toast.error("Only super admins can modify super admins");
    setEditUser(u);
    setEditUnits(u.accessible_units || []);
    setEditRole(u.role);
    // Name and email are correctable too: an invitation sent to a mistyped
    // address reaches nobody, and previously nothing in the interface could
    // fix it.
    setEditName(u.name || "");
    setEditEmail(u.email || "");
    // What this person does on a delivery project, and the two grants that
    // hang off it. These could only be set while creating an account, which
    // is why no existing account had a function role at all: there was no way
    // to give one. That in turn made the TSD picker read "not a TSD" against
    // every name, and left one lone engineer as the only possible architect.
    setEditFunctionRole(u.function_role || "");
    setEditCanArchitect(!!u.can_architect);
    setEditCanStartProjects(!!u.can_start_projects);
  };

  const saveEdit = async () => {
    const name = editName.trim();
    const email = editEmail.trim().toLowerCase();
    if (!name) return toast.error("Name cannot be empty");
    if (!email) return toast.error("Email cannot be empty");

    setSavingEdit(true);
    try {
      const payload = { accessible_units: editUnits };
      if (editRole !== editUser.role) payload.role = editRole;
      if (name !== editUser.name) payload.name = name;
      if (email !== (editUser.email || "").toLowerCase()) payload.email = email;

      // Sent only when changed. `function_role` uses null rather than "" to
      // clear, because empty string is not a valid role and the server
      // validates against the list.
      if (editFunctionRole !== (editUser.function_role || "")) {
        payload.function_role = editFunctionRole || null;
      }
      if (editCanArchitect !== !!editUser.can_architect) {
        payload.can_architect = editCanArchitect;
      }
      if (editCanStartProjects !== !!editUser.can_start_projects) {
        payload.can_start_projects = editCanStartProjects;
      }

      await usersAPI.update(editUser.user_id, payload);
      setUsers((prev) =>
        prev.map((x) =>
          x.user_id === editUser.user_id
            ? {
                ...x, accessible_units: editUnits, role: editRole, name, email,
                function_role: editFunctionRole || null,
                can_architect: editCanArchitect,
                can_start_projects: editCanStartProjects,
              }
            : x
        )
      );
      const fixedLogin = payload.email !== undefined;
      toast.success(
        fixedLogin
          ? `Saved — ${name} now signs in with ${email}`
          : "Saved"
      );
      setEditUser(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save the changes");
    } finally {
      setSavingEdit(false);
    }
  };

  // ---- Reset password ----
  const submitReset = async () => {
    if (resetPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setResetting(true);
    try {
      await usersAPI.update(resetTarget.user_id, { password: resetPassword });
      toast.success(`Password reset for ${resetTarget.name}`);
      setResetTarget(null);
      setResetPassword("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  // ---- Delete ----
  const submitDelete = async () => {
    setDeleting(true);
    try {
      await usersAPI.delete(deleteTarget.user_id);
      setUsers((prev) => prev.filter((x) => x.user_id !== deleteTarget.user_id));
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          !search ||
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );

  const counts = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === "super_admin" || u.role === "mini_admin").length,
      hr: users.filter((u) => u.is_hr).length,
      active: users.filter((u) => u.status !== "disabled").length,
    }),
    [users]
  );

  const UnitChips = ({ u }) => {
    const units = u.accessible_units || [];
    const isAllAccess = u.role === "super_admin" || u.is_hr;
    if (isAllAccess)
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#A9834E]">
          <ShieldCheck className="w-3.5 h-3.5" /> Full access
        </span>
      );
    if (units.length === 0) return <span className="text-[11px] text-gray-400">No units assigned</span>;
    return (
      <div className="flex flex-wrap gap-1 max-w-[220px]">
        {units.slice(0, 3).map((slug) => (
          <span key={slug} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F6F3] border border-[#EAE7E0] text-gray-600">
            {ALL_UNITS.find((x) => x.slug === slug)?.name.split(" ")[0] || slug}
          </span>
        ))}
        {units.length > 3 && <span className="text-[10px] text-gray-400 py-0.5">+{units.length - 3}</span>}
      </div>
    );
  };

  const FlagToggle = ({ u, field, label, activeClass }) => (
    <button
      onClick={() => toggleField(u, field)}
      disabled={saving[u.user_id + field]}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
        u[field]
          ? activeClass
          : "bg-white text-gray-400 border-[#EAE7E0] hover:border-gray-300 hover:text-gray-600"
      }`}
      data-testid={`toggle-${field}-${u.user_id}`}
    >
      {saving[u.user_id + field] ? "…" : label}
    </button>
  );

  const unitToggle = (slug, list, setList) =>
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8" data-testid="user-management-page">
      {/* Header */}
      <div className="pt-2">
        <p className="lux-eyebrow mb-3">Administration</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-gray-900 leading-tight">Staff Management</h1>
            <p className="text-sm text-gray-500 mt-2">
              Add staff to the portal, assign their role and units, and appoint TSDs.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-full px-6 h-11 gap-2"
            data-testid="add-user-btn"
          >
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        </div>
        <div className="lux-divider mt-8" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total People", value: counts.total, icon: UsersIcon },
          { label: "Administrators", value: counts.admins, icon: ShieldCheck },
          { label: "HR Access", value: counts.hr, icon: KeyRound },
          { label: "Active Accounts", value: counts.active, icon: Check },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="lux-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-[#E5D9C3] bg-[#FBF8F1] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[#A9834E]" strokeWidth={1.7} />
            </div>
            <div>
              <p className="font-display text-[26px] leading-none text-gray-900">{value}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Who manages projects, per unit. Most units run with every member a
          manager; Technology & Build runs with one. Both are shown, because
          listing only the single named manager made nine of ten units look
          leaderless while their members were managing projects daily. */}
      <div className="lux-card p-6" data-testid="unit-heads-panel">
        <div>
          <h2 className="font-display text-xl text-gray-900">TSDs</h2>
          <p className="text-sm text-gray-500 mt-1">
            A TSD opens projects for their unit, staffs them and runs their
            boards. Tick anyone to grant it; untick to take it back.
          </p>
        </div>
        <div className="lux-divider my-5" />
        <div className="space-y-4">
          {ALL_UNITS.map((unit) => {
            const members = users.filter(
              (p) => p.status !== "disabled" && (p.accessible_units || []).includes(unit.slug)
            );
            const named = units.find((x) => x.slug === unit.slug);
            const isPM = (p) =>
              (p.headed_units || []).includes(unit.slug) || named?.head_user_id === p.user_id;
            const managers = members.filter(isPM);
            return (
              <div
                key={unit.slug}
                className="border border-[#EAE7E0] rounded-xl px-4 py-3"
                data-testid={`unit-head-row-${unit.slug}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className="text-[13px] font-medium text-gray-900">{unit.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {members.length === 0
                      ? "nobody assigned to this unit"
                      : `${managers.length} of ${members.length} manage projects`}
                  </p>
                </div>
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((p) => {
                      const on = isPM(p);
                      const busy = saving[`pm_${unit.slug}_${p.user_id}`];
                      return (
                        <button
                          key={p.user_id}
                          type="button"
                          disabled={busy}
                          onClick={() => togglePM(unit.slug, p, on)}
                          className={`px-2.5 py-1 rounded-full border text-[11px] transition-all disabled:opacity-50 ${
                            on
                              ? "border-[#BFE7DA] bg-[#EAF8F3] text-[#12795C] font-medium"
                              : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                          }`}
                          title={on ? `Remove ${p.name} as a TSD here` : `Make ${p.name} a TSD here`}
                          data-testid={`pm-toggle-${unit.slug}-${p.user_id}`}
                        >
                          {busy ? "…" : p.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#EAE7E0] rounded-full text-[13px] outline-none focus:border-[#C6A15B] focus:ring-2 focus:ring-[#C6A15B]/15 transition-all"
          data-testid="user-search"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading directory…
        </div>
      ) : (
        <div className="lux-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]" data-testid="users-table">
              <thead>
                <tr className="border-b border-[#F0EEE9]">
                  {["Person", "Role", "Unit Access", "Flags", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-6 py-4 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F5F0]">
                {filtered.map((u) => (
                  <tr key={u.user_id} className="hover:bg-[#FBFAF7] transition-colors" data-testid={`user-row-${u.user_id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#14181D] flex items-center justify-center text-[#D6BC8A] text-xs font-semibold shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[13px] text-gray-900 truncate">
                            {u.name}
                            {u.user_id === currentUser?.user_id && (
                              <span className="ml-2 text-[10px] text-[#A9834E]">(you)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role and, separately, whether they manage projects.
                        Stacked and never wrapped mid-phrase: side by side in a
                        narrow column these broke across lines and read as
                        fragments ("Admin" over "TSD · Crowther HR"). */}
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                            u.role === "super_admin"
                              ? "bg-[#14181D] text-[#D6BC8A]"
                              : u.role === "mini_admin"
                              ? "bg-[#FBF8F1] text-[#A9834E] border border-[#E5D9C3]"
                              : "bg-[#F7F6F3] text-gray-500 border border-[#EAE7E0]"
                          }`}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                        {/* Running projects is what lets somebody open them,
                            so it belongs beside the role. Named on one unit or
                            granted across several -- both make you a TSD, and
                            reading only the first left most of them
                            unlabelled. The role is TSD now; there are no
                            project managers. */}
                        {unitsManaged(u).length > 0 && (
                          <span
                            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#EAF8F3] text-[#12795C] border border-[#BFE7DA] whitespace-nowrap max-w-full truncate"
                            title={`TSD — ${unitsManaged(u).join(", ")}`}
                            data-testid={`pm-badge-${u.user_id}`}
                          >
                            {unitsManaged(u).length === 1
                              ? `TSD · ${unitsManaged(u)[0]}`
                              : `TSD · ${unitsManaged(u).length} units`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-left group"
                        title="Edit name, email, role and units"
                        data-testid={`edit-access-${u.user_id}`}
                      >
                        <UnitChips u={u} />
                        <span className="block text-[10px] text-[#A9834E] opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                          Edit →
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <FlagToggle u={u} field="is_hr" label="HR" activeClass="bg-emerald-50 text-emerald-700 border-emerald-200" />
                        <FlagToggle u={u} field="is_engineer" label="Eng" activeClass="bg-blue-50 text-blue-700 border-blue-200" />
                        <FlagToggle u={u} field="is_fulfillment" label="Ops" activeClass="bg-emerald-50 text-emerald-700 border-emerald-200" />
                        {u.is_engineer && (
                          <input
                            type="number"
                            min="1"
                            max="10"
                            defaultValue={u.engineer_capacity_override || ""}
                            placeholder="cap"
                            onBlur={(e) => updateCapacity(u.user_id, e.target.value)}
                            className="w-12 px-1.5 py-1 border border-[#EAE7E0] rounded-full text-[11px] text-center outline-none focus:border-[#C6A15B]"
                            data-testid={`capacity-${u.user_id}`}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(u)}
                        disabled={saving[u.user_id + "status"] || u.user_id === currentUser?.user_id}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                          u.status !== "disabled"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        } ${u.user_id === currentUser?.user_id ? "opacity-60 cursor-not-allowed" : "hover:opacity-80"}`}
                        data-testid={`status-toggle-${u.user_id}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status !== "disabled" ? "bg-emerald-500" : "bg-red-500"}`} />
                        {saving[u.user_id + "status"] ? "…" : u.status !== "disabled" ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* An explicit action rather than only a click on the
                            units cell -- correcting a mistyped name or email
                            is not something to have to discover. */}
                        {canEditTarget(u) && (
                          <button
                            onClick={() => openEdit(u)}
                            className="p-2 text-gray-300 hover:text-[#A9834E] transition-colors"
                            title="Edit name, email, role and units"
                            data-testid={`edit-staff-${u.user_id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canEditTarget(u) && (
                          <button
                            onClick={() => setResetTarget(u)}
                            className="p-2 text-gray-300 hover:text-[#A9834E] transition-colors"
                            title="Reset password"
                            data-testid={`reset-password-${u.user_id}`}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        {/* Whoever can invite can remove: HR handles both ends
                            of a departure without needing a super admin. Only
                            a super admin may remove another super admin. */}
                        {canEditTarget(u) && u.user_id !== currentUser?.user_id && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            title={
                              unitHeaded(u.user_id)
                                ? `Remove staff — leaves ${unitHeaded(u.user_id).name} without a head`
                                : "Remove staff"
                            }
                            data-testid={`delete-user-${u.user_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-sm text-gray-400">
                      No users match "{search}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ CREATE USER MODAL ============ */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && closeCreate()}>
        <DialogContent className="bg-white border-[#EAE7E0] max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          {!createdCreds ? (
            <>
              <DialogHeader>
                <p className="lux-eyebrow mb-1">New Staff</p>
                <DialogTitle className="font-display text-2xl text-gray-900">Invite a staff member</DialogTitle>
                <DialogDescription className="text-gray-500 text-[13px]">
                  Say whether they're staff or a TSD, then set their access and send the invite.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">Full name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Rebecca Ade"
                      className="w-full px-4 py-2.5 border border-[#EAE7E0] rounded-xl text-[13px] outline-none focus:border-[#C6A15B] focus:ring-2 focus:ring-[#C6A15B]/15"
                      data-testid="create-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="name@thcohq.com"
                      className="w-full px-4 py-2.5 border border-[#EAE7E0] rounded-xl text-[13px] outline-none focus:border-[#C6A15B] focus:ring-2 focus:ring-[#C6A15B]/15"
                      data-testid="create-email-input"
                    />
                  </div>
                </div>

                {/* Staff or unit head, decided before the password is generated.
                    The super admin decides who heads a unit; HR applies that
                    decision here as the invitation goes out. */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">
                    Are they staff or a TSD?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, head_of_unit: "" })}
                      className={`text-left px-4 py-3 rounded-xl border transition-all ${
                        !form.head_of_unit
                          ? "border-[#14181D] bg-[#14181D] text-white"
                          : "border-[#EAE7E0] hover:border-gray-300"
                      }`}
                      data-testid="create-kind-staff"
                    >
                      <p className="text-[13px] font-medium">Staff</p>
                      <p className={`text-[11px] mt-0.5 ${!form.head_of_unit ? "text-gray-300" : "text-gray-400"}`}>
                        Works on the projects they're added to
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, head_of_unit: form.head_of_unit || "__pick__" })
                      }
                      className={`text-left px-4 py-3 rounded-xl border transition-all ${
                        form.head_of_unit
                          ? "border-[#1FB58A] bg-[#EAF8F3]"
                          : "border-[#EAE7E0] hover:border-gray-300"
                      }`}
                      data-testid="create-kind-head"
                    >
                      <p className={`text-[13px] font-medium ${form.head_of_unit ? "text-[#12795C]" : "text-gray-900"}`}>
                        TSD
                      </p>
                      <p className="text-[11px] mt-0.5 text-gray-400">
                        Opens projects for a unit and adds staff to them
                      </p>
                    </button>
                  </div>

                  {form.head_of_unit && (
                    <div className="mt-3">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">
                        Which unit do they manage?
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_UNITS.map((u) => {
                          const on = form.head_of_unit === u.slug;
                          const current = headOf(u.slug);
                          return (
                            <button
                              key={u.slug}
                              type="button"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  head_of_unit: u.slug,
                                  // Heading a unit you cannot open is a dead end.
                                  accessible_units: Array.from(
                                    new Set([...form.accessible_units, u.slug])
                                  ),
                                })
                              }
                              title={current ? `Currently headed by ${current}` : "No head yet"}
                              className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                                on
                                  ? "border-[#1FB58A] bg-[#EAF8F3] text-[#12795C] font-medium"
                                  : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                              }`}
                              data-testid={`create-head-${u.slug}`}
                            >
                              {on && <Check className="w-3 h-3 inline mr-1 -mt-px" />}
                              {u.name}
                              {current && <span className="text-gray-400 ml-1">· {current.split(" ")[0]}</span>}
                            </button>
                          );
                        })}
                      </div>
                      {form.head_of_unit === "__pick__" ? (
                        <p className="text-[11px] text-amber-600 mt-2">Choose which unit they will manage.</p>
                      ) : (
                        headOf(form.head_of_unit) && (
                          <p className="text-[11px] text-amber-600 mt-2">
                            {unitName(form.head_of_unit)} is currently headed by {headOf(form.head_of_unit)} — inviting
                            this person replaces them.
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">
                    Password <span className="normal-case font-normal tracking-normal">(leave blank to auto-generate)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 pr-10 border border-[#EAE7E0] rounded-xl text-[13px] outline-none focus:border-[#C6A15B] focus:ring-2 focus:ring-[#C6A15B]/15"
                        data-testid="create-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <Button type="button" variant="outline" onClick={generatePassword} className="rounded-xl border-[#EAE7E0] text-[12px] text-gray-600">
                      Generate
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["team_member", "mini_admin", ...(isSuperAdmin ? ["super_admin"] : [])].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm({ ...form, role: r })}
                        className={`px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-all ${
                          form.role === r
                            ? "border-[#C6A15B] bg-[#FBF8F1] text-[#8F7340]"
                            : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                        }`}
                        data-testid={`create-role-${r}`}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">Unit access</label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          accessible_units:
                            form.accessible_units.length === ALL_UNITS.length ? [] : ALL_UNITS.map((u) => u.slug),
                        })
                      }
                      className="text-[11px] text-[#A9834E] hover:underline"
                    >
                      {form.accessible_units.length === ALL_UNITS.length ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_UNITS.map((u) => {
                      const on = form.accessible_units.includes(u.slug);
                      return (
                        <button
                          key={u.slug}
                          type="button"
                          onClick={() => unitToggle(u.slug, form.accessible_units, (v) => setForm({ ...form, accessible_units: v }))}
                          className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                            on
                              ? "border-[#C6A15B] bg-[#FBF8F1] text-[#8F7340] font-medium"
                              : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                          }`}
                          data-testid={`create-unit-${u.slug}`}
                        >
                          {on && <Check className="w-3 h-3 inline mr-1 -mt-px" />}
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">Crowther OS is org-wide — every member sees it automatically.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">
                    Delivery function
                  </label>
                  <select
                    value={form.function_role}
                    onChange={(e) => setForm({ ...form, function_role: e.target.value })}
                    data-testid="create-function-role"
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE7E0] bg-white text-gray-900 text-sm"
                  >
                    {FUNCTION_ROLES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {PIPELINE_FUNCTIONS.has(form.function_role)
                      ? "Reaches Crowther OS."
                      : form.function_role
                        ? "Works on the task board, not the pipeline."
                        : "Without one, this person only sees what they are put on."}
                  </p>

                  {form.function_role === "engineer" && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, can_architect: !form.can_architect })}
                      data-testid="create-can-architect"
                      className={`mt-2 px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                        form.can_architect
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                          : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      Can be named Solution Architect
                    </button>
                  )}

                  {/* Opening a project is the Senior Partner's. This hands it
                      to one named TSD for when he is not around, and can be
                      taken back the same way. */}
                  {form.function_role === "tsd" && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, can_start_projects: !form.can_start_projects })}
                      data-testid="create-can-start-projects"
                      className={`mt-2 px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                        form.can_start_projects
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                          : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      Can start new projects
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">Special flags</label>
                  <div className="flex gap-2">
                    {[
                      { key: "is_hr", label: "HR (full visibility + can manage users)" },
                      { key: "is_engineer", label: "Engineer" },
                      { key: "is_fulfillment", label: "Fulfillment" },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, [key]: !form[key] })}
                        className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                          form[key]
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                            : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                        }`}
                        data-testid={`create-flag-${key}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#F0EEE9]">
                <Button variant="ghost" onClick={closeCreate} className="rounded-full text-gray-500">
                  Cancel
                </Button>
                <Button
                  onClick={submitCreate}
                  disabled={creating}
                  className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-full px-7 gap-2"
                  data-testid="create-submit-btn"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Invite Staff
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <DialogTitle className="font-display text-2xl text-gray-900">Account created</DialogTitle>
                <DialogDescription className="text-gray-500 text-[13px]">
                  Share these credentials securely — this is the only time the password is shown.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-[#F7F6F3] border border-[#EAE7E0] rounded-xl p-5 mt-2 space-y-2 font-mono text-[13px]">
                <p><span className="text-gray-400">Email:</span> <span className="text-gray-900">{createdCreds.email}</span></p>
                <p><span className="text-gray-400">Password:</span> <span className="text-gray-900">{createdCreds.password}</span></p>
              </div>
              <p className={`text-[12px] mt-3 flex items-center gap-1.5 ${createdCreds.emailSent ? "text-emerald-600" : "text-amber-600"}`}>
                {createdCreds.emailSent
                  ? <><Check className="w-3.5 h-3.5" /> Login details and the platform link were emailed to {createdCreds.email}.</>
                  : <>Email could not be sent automatically — please share these credentials manually.</>}
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={copyCreds} className="rounded-full border-[#EAE7E0] gap-2" data-testid="copy-creds-btn">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button onClick={closeCreate} className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-full px-7">
                  Done
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ EDIT ACCESS MODAL ============ */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="bg-white border-[#EAE7E0] max-w-lg rounded-2xl">
          <DialogHeader>
            <p className="lux-eyebrow mb-1">Edit Staff</p>
            <DialogTitle className="font-display text-2xl text-gray-900">{editUser?.name}</DialogTitle>
            <DialogDescription className="text-gray-500 text-[13px]">
              Correct their details, role and unit access. Everything here can be changed
              after the invitation has gone out.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Details, correctable after the invite. A mistyped address means
                the invitation reached nobody and the account cannot be signed
                into, and nothing here could previously fix it. */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">Full name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#EAE7E0] rounded-xl text-[13px] outline-none focus:border-[#C6A15B] focus:ring-2 focus:ring-[#C6A15B]/15"
                  data-testid="edit-name-input"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#EAE7E0] rounded-xl text-[13px] outline-none focus:border-[#C6A15B] focus:ring-2 focus:ring-[#C6A15B]/15"
                  data-testid="edit-email-input"
                />
              </div>
            </div>
            {editEmail.trim().toLowerCase() !== (editUser?.email || "").toLowerCase() && (
              <p className="text-[11px] text-amber-600 -mt-2" data-testid="edit-email-warning">
                This changes the address they sign in with. They will need to be told, and the
                original invitation will no longer work.
              </p>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {["team_member", "mini_admin", ...(isSuperAdmin ? ["super_admin"] : [])].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditRole(r)}
                    disabled={editUser?.user_id === currentUser?.user_id && r !== "super_admin" && currentUser?.role === "super_admin"}
                    className={`px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-all disabled:opacity-40 ${
                      editRole === r
                        ? "border-[#C6A15B] bg-[#FBF8F1] text-[#8F7340]"
                        : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                    }`}
                    data-testid={`edit-role-${r}`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">Unit access</label>
                <button
                  type="button"
                  onClick={() => setEditUnits(editUnits.length === ALL_UNITS.length ? [] : ALL_UNITS.map((u) => u.slug))}
                  className="text-[11px] text-[#A9834E] hover:underline"
                >
                  {editUnits.length === ALL_UNITS.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_UNITS.map((u) => {
                  const on = editUnits.includes(u.slug);
                  return (
                    <button
                      key={u.slug}
                      type="button"
                      onClick={() => unitToggle(u.slug, editUnits, setEditUnits)}
                      className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                        on
                          ? "border-[#C6A15B] bg-[#FBF8F1] text-[#8F7340] font-medium"
                          : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                      }`}
                      data-testid={`edit-unit-${u.slug}`}
                    >
                      {on && <Check className="w-3 h-3 inline mr-1 -mt-px" />}
                      {u.name}
                    </button>
                  );
                })}
              </div>
              {(editRole === "super_admin" || editUser?.is_hr) && (
                <p className="text-[11px] text-[#A9834E] mt-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {editRole === "super_admin" ? "Super admins" : "HR members"} see every unit regardless of this list.
                </p>
              )}
            </div>

            {/* What this person does on a delivery project. Separate from the
                access role above: `role` is how much of the system they may
                reach, this is the job they hold on a project. Both grants
                below hang off it. */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">
                Delivery role
              </label>
              <select
                value={editFunctionRole}
                onChange={(e) => setEditFunctionRole(e.target.value)}
                data-testid="edit-function-role"
                className="w-full h-11 px-3 bg-white border border-[#EAE7E0] rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#14181D]"
              >
                <option value="">— none —</option>
                {FUNCTION_ROLES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                {editFunctionRole === "tsd"
                  ? "Can be named TSD on a project, and appears first in the TSD picker."
                  : editFunctionRole
                    ? "Decides which delivery notifications reach them."
                    : "Without one they only see what they are put on, and never appear as a suggested owner."}
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                {/* An engineer who may be named Solution Architect. Until this
                    can be granted here, one lone account carried it and every
                    architect suggestion could only ever name that person. */}
                {editFunctionRole === "engineer" && (
                  <button
                    type="button"
                    onClick={() => setEditCanArchitect(!editCanArchitect)}
                    data-testid="edit-can-architect"
                    className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                      editCanArchitect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                        : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {editCanArchitect && <Check className="w-3 h-3 inline mr-1 -mt-px" />}
                    Can be named Solution Architect
                  </button>
                )}

                {/* Opening a project is the Senior Partner's. This hands it to
                    one named TSD for when he is unavailable. */}
                {editFunctionRole === "tsd" && (
                  <button
                    type="button"
                    onClick={() => setEditCanStartProjects(!editCanStartProjects)}
                    data-testid="edit-can-start-projects"
                    className={`px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                      editCanStartProjects
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                        : "border-[#EAE7E0] text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {editCanStartProjects && <Check className="w-3 h-3 inline mr-1 -mt-px" />}
                    Can start new projects
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#F0EEE9]">
            <Button variant="ghost" onClick={() => setEditUser(null)} className="rounded-full text-gray-500">
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit}
              className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-full px-7 gap-2"
              data-testid="edit-save-btn"
            >
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ RESET PASSWORD MODAL ============ */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="bg-white border-[#EAE7E0] max-w-md rounded-2xl">
          <DialogHeader>
            <p className="lux-eyebrow mb-1">Security</p>
            <DialogTitle className="font-display text-2xl text-gray-900">Reset password</DialogTitle>
            <DialogDescription className="text-gray-500 text-[13px]">
              Set a new password for <span className="font-medium text-gray-800">{resetTarget?.name}</span>. They'll use it on their next sign-in.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="New password (min. 6 characters)"
            className="w-full px-4 py-2.5 border border-[#EAE7E0] rounded-xl text-[13px] outline-none focus:border-[#C6A15B] focus:ring-2 focus:ring-[#C6A15B]/15 mt-2"
            data-testid="reset-password-input"
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setResetTarget(null)} className="rounded-full text-gray-500">
              Cancel
            </Button>
            <Button
              onClick={submitReset}
              disabled={resetting}
              className="bg-[#14181D] hover:bg-[#252b33] text-white rounded-full px-7 gap-2"
              data-testid="reset-submit-btn"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRM MODAL ============ */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="bg-white border-[#EAE7E0] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              Remove {deleteTarget?.name}?
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-[13px] pt-2 leading-relaxed">
              This permanently deletes their account and signs them out everywhere. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="rounded-full text-gray-500">
              Cancel
            </Button>
            <Button
              onClick={submitDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-7 gap-2"
              data-testid="delete-confirm-btn"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
