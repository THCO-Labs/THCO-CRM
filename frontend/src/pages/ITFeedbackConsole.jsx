import { useState, useEffect } from "react";
import { Wrench, Send, CheckCircle2, CircleDot, Clock, ShieldCheck, Filter } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { feedbackAPI } from "../lib/api";
import { toast } from "sonner";

const STATUS_ORDER = ["sent", "in_review", "in_progress", "done"];
const STATUS_META = {
  sent: { label: "Sent", color: "bg-gray-100 text-gray-600 border-gray-200", icon: Send },
  in_review: { label: "In Review", color: "bg-amber-50 text-amber-700 border-amber-200", icon: CircleDot },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Wrench },
  done: { label: "Done & Fixed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

const ITFeedbackConsole = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState(null); // feedback_id being replied to
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await feedbackAPI.getAll();
      setItems(data || []);
    } catch (e) {
      toast.error("Failed to load feedback queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    setBusy(true);
    try {
      await feedbackAPI.update(id, { status });
      toast.success(`Marked ${STATUS_META[status].label}`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (id) => {
    if (!reply.trim()) return toast.error("Write a reply first");
    setBusy(true);
    try {
      await feedbackAPI.update(id, { it_reply: reply.trim(), status: "done" });
      toast.success("Reply sent — marked Done & Fixed");
      setReply("");
      setActive(null);
      load();
    } catch (e) {
      toast.error("Failed to send reply");
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return ""; }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const counts = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: items.filter((i) => i.status === s).length }), {});

  return (
    <div className="max-w-[980px] mx-auto space-y-6">
      <div>
        <p className="lux-eyebrow mb-2">IT Team</p>
        <h1 className="font-display text-3xl text-gray-900">Feedback Console</h1>
        <p className="text-sm text-gray-500 mt-2">All feedback and complaints from every unit. Open, work through, and reply to close the loop.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-gray-400 flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filter:</span>
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-full text-[12px] border ${filter === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-[#EAE7E0]"}`}>All ({items.length})</button>
        {STATUS_ORDER.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-[12px] border ${filter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-[#EAE7E0]"}`}>
            {STATUS_META[s].label} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 bg-[#EFEDE8] rounded-2xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="lux-card p-8 text-center text-gray-400">
          <ShieldCheck className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No feedback in this view. Queue is clear 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb) => {
            const meta = STATUS_META[fb.status] || STATUS_META.sent;
            const Icon = meta.icon;
            const isOpen = active === fb.feedback_id;
            return (
              <div key={fb.feedback_id} className="lux-card p-5" data-testid={`it-feedback-${fb.feedback_id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-gray-900">{fb.subject}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1FB58A]/10 text-[#179C76] border border-[#1FB58A]/20 uppercase tracking-wide">{fb.category}</span>
                    </div>
                    <p className="text-[13px] text-gray-600 leading-relaxed">{fb.message}</p>
                    <p className="text-[11px] text-gray-400 mt-2">
                      From <span className="text-gray-600 font-medium">{fb.user_name}</span> ({fb.user_email}) · {fmt(fb.created_at)}
                      {fb.unit && <> · Unit: <span className="text-gray-600">{fb.unit}</span></>}
                      {fb.assigned_to && <> · Assigned: {fb.assigned_to}</>}
                    </p>

                    {fb.it_reply && (
                      <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-emerald-700 mb-1">IT Response</p>
                        <p className="text-[13px] text-emerald-900">{fb.it_reply}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action bar */}
                <div className="mt-4 pt-4 border-t border-[#F0EEE9] flex flex-wrap items-center gap-2">
                  {STATUS_ORDER.filter((s) => s !== fb.status).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setStatus(fb.feedback_id, s)}
                      className="border-[#EAE7E0] text-gray-700 hover:bg-[#FBFAF7] rounded-lg text-[12px]"
                    >
                      Mark {STATUS_META[s].label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setActive(isOpen ? null : fb.feedback_id)}
                    className="border-[#1FB58A]/30 text-[#179C76] hover:bg-[#1FB58A]/5 rounded-lg text-[12px]"
                  >
                    {isOpen ? "Cancel" : "Reply & Close"}
                  </Button>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write the fix / response to send back to the reporter…"
                      className="min-h-[90px] bg-white border-[#EAE7E0] text-gray-900 rounded-lg text-[14px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setActive(null)} className="text-gray-500 rounded-lg">Cancel</Button>
                      <Button onClick={() => sendReply(fb.feedback_id)} disabled={busy} className="bg-[#1FB58A] hover:bg-[#179C76] text-white rounded-lg px-5">
                        Send Reply & Mark Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ITFeedbackConsole;
