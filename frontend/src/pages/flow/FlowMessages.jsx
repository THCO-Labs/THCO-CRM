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
import { Loader2, Plus, X, MessageSquare, Mail, Send, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  drafted: "bg-gray-100 text-gray-600",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};
const CHANNEL_ICON = { whatsapp: MessageSquare, email: Mail, sms: MessageSquare };

export default function FlowMessages() {
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const [m, c] = await Promise.all([flowAPI.listMessages(filter ? { status: filter } : {}), flowAPI.listContacts()]);
    setMessages(m); setContacts(c);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const act = async (id, action) => {
    try {
      const res = await flowAPI.messageAction(id, action);
      if (action === "send" && res.status === "failed") {
        toast.error(res.send_error || "Message failed to send");
      } else {
        const label = action === "approve" ? "approved" : action === "reject" ? "rejected" : "sent";
        toast.success(`Message ${label}`);
      }
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const del = async (m) => {
    if (!window.confirm("Delete this message? This cannot be undone.")) return;
    try {
      await flowAPI.deleteMessage(m.message_id);
      toast.success("Message deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not delete the message");
    }
  };

  return (
    <FlowShell
      title="Messages — relationship touches"
      action={
        <Button onClick={() => setShowForm(true)} className="bg-[#1B4332] text-white" data-testid="messages-new-btn">
          <Plus className="w-4 h-4 mr-1.5" />Draft Message
        </Button>
      }
    >
      <div className="mb-4 flex gap-2 flex-wrap">
        {["", "drafted", "pending_approval", "approved", "sent", "rejected", "failed"].map(s => (
          <button key={s || "all"} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1 rounded-full ${filter === s ? "bg-[#1B4332] text-white" : "bg-gray-100 text-gray-600"}`}
            data-testid={`msg-filter-${s || "all"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div> :
        messages.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 text-gray-500">
            No messages yet. Drafts go through approval before sending.
          </div>
        ) : (
          <div className="space-y-3" data-testid="messages-list">
            {messages.map((m) => {
              const Icon = CHANNEL_ICON[m.channel] || MessageSquare;
              const contact = contacts.find(c => c.contact_id === m.contact_id);
              return (
                <div key={m.message_id} className="bg-white rounded-xl border border-gray-100 p-4" data-testid={`msg-${m.message_id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-sm text-gray-900">{contact?.full_name || "Unknown contact"}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-100 rounded">Tier {m.tier}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-100 rounded capitalize">{m.message_type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status]}`}>{m.status.toUpperCase()}</span>
                      {m._can_manage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" aria-label="Message actions" data-testid={`msg-menu-${m.message_id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600" onClick={() => del(m)} data-testid={`msg-delete-${m.message_id}`}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{m.final_content || m.draft_content}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Drafted by {m.drafted_by_name}</span>
                    {m.approved_by_name && <span>· Approved by {m.approved_by_name}</span>}
                    {m.sent_by_name && <span>· Sent by {m.sent_by_name}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {m.status === "pending_approval" && (
                      <>
                        <Button size="sm" onClick={() => act(m.message_id, "approve")} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid={`approve-${m.message_id}`}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => act(m.message_id, "reject")} className="text-red-600">Reject</Button>
                      </>
                    )}
                    {m.status === "approved" && (
                      <Button size="sm" onClick={() => act(m.message_id, "send")} className="bg-green-600 hover:bg-green-700 text-white" data-testid={`send-${m.message_id}`}>
                        <Send className="w-3 h-3 mr-1" />Send
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {showForm && <DraftForm contacts={contacts} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </FlowShell>
  );
}

const DraftForm = ({ contacts, onClose, onSaved }) => {
  const [f, setF] = useState({ contact_id: "", message_type: "checkin", draft_content: "", tier: 2, channel: "whatsapp", content_sid: "" });
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!f.contact_id || !f.draft_content.trim()) { toast.error("Contact + content required"); return; }
    setSaving(true);
    try { await flowAPI.createMessage({ ...f, content_sid: f.channel === "whatsapp" ? f.content_sid.trim() : "" }); toast.success("Drafted"); onSaved(); }
    catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Draft Message</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact *</label>
          <select value={f.contact_id} onChange={(e) => setF({...f, contact_id: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="msg-contact">
            <option value="">— select contact —</option>
            {contacts.map(c => <option key={c.contact_id} value={c.contact_id}>{c.full_name} ({c.title || "—"})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <select value={f.message_type} onChange={(e) => setF({...f, message_type: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {["birthday","anniversary","checkin","insight","celebration"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tier</label>
            <select value={f.tier} onChange={(e) => setF({...f, tier: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value={1}>1 (needs approval)</option><option value={2}>2 (auto-approved)</option><option value={3}>3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel</label>
            <select value={f.channel} onChange={(e) => setF({...f, channel: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Draft *</label>
          <textarea rows={5} value={f.draft_content} onChange={(e) => setF({...f, draft_content: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" data-testid="msg-content" />
        </div>
        {f.channel === "whatsapp" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp template SID (optional)</label>
            <input
              value={f.content_sid}
              onChange={(e) => setF({...f, content_sid: e.target.value})}
              placeholder="HX… — Twilio Content Template SID"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              data-testid="msg-content-sid"
            />
            <p className="text-xs text-gray-400 mt-1">
              Trial Twilio accounts can't send free-form WhatsApp — provide a pre-approved template SID to send. Leave blank for free-form text (upgraded accounts only).
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-[#1B4332] text-white" data-testid="msg-save">Save Draft</Button>
        </div>
      </form>
    </div>
  );
};
