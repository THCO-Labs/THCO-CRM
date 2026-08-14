import { useEffect, useState } from "react";
import FlowShell from "./FlowShell";
import { flowAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Loader2, Plus, Search, X, Mail, Phone, MessageCircle, Linkedin, Cake, Star, Pencil, Trash2, MoreVertical, CalendarDays } from "lucide-react";
import { toast } from "sonner";

const STRENGTH_COLORS = {
  cold: "bg-gray-100 text-gray-600",
  warm: "bg-blue-100 text-blue-700",
  strong: "bg-green-100 text-green-700",
  champion: "bg-amber-100 text-amber-700",
};

export default function FlowContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await flowAPI.listContacts(q ? { q } : {});
    setContacts(data);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.full_name}? This also removes their saved events.`)) return;
    try {
      await flowAPI.deleteContact(c.contact_id);
      toast.success("Contact deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not delete the contact");
    }
  };

  return (
    <FlowShell
      title="Contacts directory"
      action={
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-[#1B4332] text-white" data-testid="contacts-new-btn">
          <Plus className="w-4 h-4 mr-1.5" />New Contact
        </Button>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 mb-4 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none" data-testid="contacts-search" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div> :
       contacts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500 mb-3">No contacts yet — start building your relationship memory.</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-[#1B4332] text-white">Add first contact</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="contacts-grid">
          {contacts.map((c) => (
            <div key={c.contact_id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition" data-testid={`contact-${c.contact_id}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{c.full_name}</p>
                  <p className="text-xs text-gray-500">{c.title || "—"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${STRENGTH_COLORS[c.strength] || STRENGTH_COLORS.warm}`}>{c.strength?.toUpperCase()}</span>
                  {c._can_manage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 -mr-1.5 text-gray-400 hover:text-gray-700" aria-label="Contact actions" data-testid={`menu-${c.contact_id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(c); setShowForm(true); }} data-testid={`edit-${c.contact_id}`}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => remove(c)} data-testid={`delete-${c.contact_id}`}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <div className="space-y-1 mt-2 text-xs text-gray-500">
                {c.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</p>}
                {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</p>}
                {c.whatsapp && <p className="flex items-center gap-1.5"><MessageCircle className="w-3 h-3" />{c.whatsapp}</p>}
                {c.linkedin && <p className="flex items-center gap-1.5"><Linkedin className="w-3 h-3" />{c.linkedin}</p>}
                {c.birthday && <p className="flex items-center gap-1.5"><Cake className="w-3 h-3" />Birthday {c.birthday}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <ContactForm contact={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </FlowShell>
  );
}

const ContactForm = ({ contact, onClose, onSaved }) => {
  const [f, setF] = useState({
    full_name: contact?.full_name || "",
    preferred_name: contact?.preferred_name || "",
    title: contact?.title || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    whatsapp: contact?.whatsapp || "",
    linkedin: contact?.linkedin || "",
    birthday: contact?.birthday || "",
    work_anniversary: contact?.work_anniversary || "",
    spouse_name: contact?.spouse_name || "",
    spouse_birthday: contact?.spouse_birthday || "",
    strength: contact?.strength || "warm",
    notes: contact?.notes || "",
    children: contact?.children || [],
    preferences: contact?.preferences || {},
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!f.full_name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      if (contact) {
        await flowAPI.updateContact(contact.contact_id, f);
        toast.success("Contact updated");
      } else {
        await flowAPI.createContact(f);
        toast.success("Contact added");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{contact ? "Edit Contact" : "New Contact"}</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Inp label="Full Name *" v={f.full_name} on={(v) => set("full_name", v)} testid="ct-name" />
          <Inp label="Preferred Name" v={f.preferred_name} on={(v) => set("preferred_name", v)} testid="ct-preferred" />
          <Inp label="Title" v={f.title} on={(v) => set("title", v)} />
          <Inp label="Email" v={f.email} on={(v) => set("email", v)} />
          <Inp label="Phone" v={f.phone} on={(v) => set("phone", v)} />
          <Inp label="WhatsApp" v={f.whatsapp} on={(v) => set("whatsapp", v)} />
          <Inp label="LinkedIn URL" v={f.linkedin} on={(v) => set("linkedin", v)} />
          <DayMonthField label="Birthday" value={f.birthday} onChange={(v) => set("birthday", v)} testid="ct-birthday" />
          <DayMonthField label="Work Anniversary" value={f.work_anniversary} onChange={(v) => set("work_anniversary", v)} testid="ct-work-anniversary" />
          <Inp label="Spouse Name" v={f.spouse_name} on={(v) => set("spouse_name", v)} />
          <DayMonthField label="Spouse Birthday" value={f.spouse_birthday} onChange={(v) => set("spouse_birthday", v)} testid="ct-spouse-birthday" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship strength</label>
            <select value={f.strength} onChange={(e) => set("strength", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="strong">Strong</option>
              <option value="champion">Champion</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white" data-testid="ct-save">{saving ? "Saving..." : contact ? "Save Changes" : "Save Contact"}</Button>
        </div>
      </form>
    </div>
  );
};

const Inp = ({ label, v, on, placeholder, testid }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none" data-testid={testid} />
  </div>
);

// Birthdays/anniversaries are stored as "DD-MM" (day + month, no year), so the
// picker records only the selected day and month while the calendar shows full
// dates for a familiar experience.
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parseDayMonth = (value) => {
  if (!value || typeof value !== "string") return undefined;
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  const d = new Date(2000, month - 1, day); // fixed leap year so 29-02 is valid
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return undefined;
  return d;
};

const toDayMonth = (date) =>
  `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatDayMonth = (value) => {
  const d = parseDayMonth(value);
  return d ? `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}` : value || "";
};

const DayMonthField = ({ label, value, onChange, testid }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid={testid}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-left hover:border-gray-300 focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none"
          >
            <span className={value ? "text-gray-900" : "text-gray-400"}>
              {value ? formatDayMonth(value) : "Select date"}
            </span>
            <CalendarDays className="w-4 h-4 text-gray-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={parseDayMonth(value)}
            onSelect={(d) => { onChange(d ? toDayMonth(d) : ""); setOpen(false); }}
            captionLayout="dropdown-buttons"
            fromYear={1900}
            toYear={new Date().getFullYear()}
            initialFocus
          />
          {value && (
            <div className="px-3 pb-2 border-t border-gray-100">
              <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs text-gray-500 hover:text-red-600">
                Clear date
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
