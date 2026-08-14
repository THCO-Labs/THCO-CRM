import { useState, useEffect } from "react";
import { MessageSquare, Send, CheckCircle2, Clock, CircleDot, Wrench, Inbox } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { feedbackAPI, unitsAPI } from "../lib/api";
import { toast } from "sonner";

const STATUS_META = {
  sent: { label: "Sent", color: "bg-gray-100 text-gray-600 border-gray-200", icon: Send },
  in_review: { label: "In Review", color: "bg-amber-50 text-amber-700 border-amber-200", icon: CircleDot },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Wrench },
  done: { label: "Done & Fixed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

const CATEGORIES = [
  { value: "bug", label: "Bug / Error" },
  { value: "feature", label: "Feature Request" },
  { value: "complaint", label: "Complaint" },
  { value: "general", label: "General" },
];

const Feedback = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("bug");
  const [unit, setUnit] = useState("");
  const [units, setUnits] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMine = async () => {
    try {
      const data = await feedbackAPI.getMine();
      setMine(data || []);
    } catch (e) {
      toast.error("Failed to load your feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMine(); }, []);

  useEffect(() => {
    unitsAPI.list()
      .then((data) => setUnits(data || []))
      .catch(() => toast.error("Failed to load business units"));
  }, []);

  const submit = async () => {
    console.log("SUBMIT_CLICKED subject=", subject, "msg=", message);
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setSubmitting(true);
    try {
      await feedbackAPI.create({
        subject: subject.trim(),
        message: message.trim(),
        category,
        unit: unit || null,
      });
      toast.success("Feedback sent to the IT team");
      setSubject("");
      setMessage("");
      setCategory("bug");
      setUnit("");
      loadMine();
    } catch (e) {
      console.error("FEEDBACK_SUBMIT_ERROR", e?.response?.status, e?.response?.data, e?.message);
      toast.error(e?.response?.data?.detail || "Failed to send feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return ""; }
  };

  return (
    <div className="max-w-[860px] mx-auto space-y-6">
      <div>
        <p className="lux-eyebrow mb-2">Support</p>
        <h1 className="font-display text-3xl text-gray-900">Feedback &amp; IT Support</h1>
        <p className="text-sm text-gray-500 mt-2">Send a request or complaint to the IT team. You'll see its status change as they work on it.</p>
      </div>

      {/* Compose */}
      <div className="lux-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#A9834E]" />
          <h2 className="font-display text-lg text-gray-900">New Feedback</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full bg-white border border-[#EAE7E0] text-gray-900 rounded-lg px-3 text-[14px] focus:border-[#C6A15B] outline-none"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Related Unit (optional)</Label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-11 w-full bg-white border border-[#EAE7E0] text-gray-900 rounded-lg px-3 text-[14px] focus:border-[#C6A15B] outline-none"
            >
              <option value="">No related unit</option>
              {units.map((u) => (
                <option key={u.slug} value={u.slug}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary of the issue"
            className="h-11 bg-white border-[#EAE7E0] text-gray-900 rounded-lg text-[14px]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the problem or request in detail…"
            className="min-h-[120px] bg-white border-[#EAE7E0] text-gray-900 rounded-lg text-[14px]"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting} className="bg-[#1FB58A] hover:bg-[#179C76] text-white rounded-lg px-6">
            {submitting ? "Sending…" : "Send Feedback"}
          </Button>
        </div>
      </div>

      {/* My feedback */}
      <div className="space-y-4">
        <h2 className="font-display text-xl text-gray-900">Your Feedback</h2>
        {loading ? (
          <div className="h-24 bg-[#EFEDE8] rounded-2xl animate-pulse" />
        ) : mine.length === 0 ? (
          <div className="lux-card p-8 text-center text-gray-400">
            <Inbox className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">You haven't sent any feedback yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((fb) => {
              const meta = STATUS_META[fb.status] || STATUS_META.sent;
              const Icon = meta.icon;
              return (
                <div key={fb.feedback_id} className="lux-card p-5" data-testid={`my-feedback-${fb.feedback_id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">{fb.subject}</p>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>
                          <Icon className="w-3 h-3" /> {meta.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-600 leading-relaxed">{fb.message}</p>
                      <p className="text-[11px] text-gray-400 mt-2">{fmt(fb.created_at)}</p>

                      {fb.it_reply && (
                        <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                          <p className="text-[11px] uppercase tracking-[0.15em] text-emerald-700 mb-1">IT Response</p>
                          <p className="text-[13px] text-emerald-900">{fb.it_reply}</p>
                          {fb.it_reply_at && <p className="text-[11px] text-emerald-600 mt-1">Replied {fmt(fb.it_reply_at)}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
