import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { AlignLeft, Tag, Users2, CalendarClock, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import AssigneeSelect from "./AssigneeSelect";
import LabelManager from "./LabelManager";
import DateTimePicker from "./DateTimePicker";
import { FULL_PERMISSIONS } from "./permissions";

export const PRIORITIES = [
  { value: "low", label: "Low", color: "#4C6B5B" },
  { value: "medium", label: "Medium", color: "#C6A15B" },
  { value: "high", label: "High", color: "#A94E5B" },
  { value: "urgent", label: "Urgent", color: "#DC2626" },
];

/**
 * Edit Task modal — redesigned for premium UX and full theming.
 *
 * Theming:
 *   - Light: Linen (#F6F1EA) background, white elevated input surfaces,
 *     Marigold (#C6A15B) reserved for highlights/active controls.
 *   - Dark: Midnight Forest (#161E1B) background, Seafoam secondary surfaces.
 *
 * Backward compatibility:
 *   - Legacy cards store labels/assignees as plain string arrays. On hydrate
 *     we normalize them into the richer object shape; the parent looks up
 *     colors for labels where possible.
 */
export default function TaskCardEditor({ card, open, onClose, onSave, permissions = FULL_PERMISSIONS }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [labels, setLabels] = useState([]); // [{label_id, name, color}]
  const [assignees, setAssignees] = useState([]); // [{user_id, name, email, ...}]
  const [dueDate, setDueDate] = useState(null); // ISO datetime

  // Hydrate from the card whenever it changes / opens
  useEffect(() => {
    if (card) {
      setTitle(card.title || "");
      setDescription(card.description || "");
      setPriority(card.priority || "medium");
      setLabels(normalizeLabels(card.labels));
      setAssignees(normalizeAssignees(card.assignees));
      setDueDate(card.due_date || null);
    }
  }, [card, open]);

  if (!card) return null;

  const save = () => {
    const data = {
      title: title.trim() || card.title,
      description,
      priority,
      labels: labels.map(({ label_id, name, color }) => ({ label_id, name, color })),
      due_date: dueDate,
    };
    // Assignment stays an internal, coordinator-only concept — a public
    // "Editable" share link never sends it (the backend wouldn't accept it
    // either; see SharedCardUpdate in taskboard.py).
    if (permissions.assignTasks) {
      data.assignees = assignees.map(({ user_id, name, email, picture, role }) => ({
        user_id, name, email, picture, role,
      }));
    }
    onSave(card.card_id, data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-[520px] p-0 gap-0 overflow-hidden bg-[#F6F1EA] dark:bg-[#161E1B] border-[#EAE7E0] dark:border-[#2A303B]"
        data-testid="task-editor"
      >
        {/* Header — primary background */}
        <div className="px-6 pt-5 pb-4 border-b border-[#EAE7E0] dark:border-[#2A303B]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#A9834E] dark:text-[#1FB58A] mb-1">
            Edit Task
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="editor-title"
            placeholder="Task title"
            className="w-full bg-transparent font-display text-xl text-gray-900 dark:text-[#F2F0EB] placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {/* Body — secondary surface */}
        <div className="px-6 py-5 space-y-5 bg-white/70 dark:bg-[#1A2622]">
          {/* Description */}
          <Field icon={AlignLeft} label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a more detailed description…"
              data-testid="editor-description"
              className="resize-none bg-white dark:bg-[#10141A] border-[#EAE7E0] dark:border-[#2A303B] text-gray-900 dark:text-[#E6E4DF] placeholder:text-gray-400 focus-visible:ring-[#C6A15B]/40 dark:focus-visible:ring-[#1FB58A]/40 focus-visible:border-[#C6A15B] dark:focus-visible:border-[#1FB58A]"
            />
          </Field>

          {/* Priority */}
          <Field icon={Flag} label="Priority">
            <div className="flex flex-wrap gap-1.5" data-testid="editor-priority">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  data-testid={`editor-priority-${p.value}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    priority === p.value
                      ? "text-white border-transparent"
                      : "bg-white dark:bg-[#10141A] border-[#EAE7E0] dark:border-[#2A303B] text-gray-600 dark:text-[#B0AEA8] hover:border-[#C6A15B] dark:hover:border-[#1FB58A]"
                  }`}
                  style={priority === p.value ? { backgroundColor: p.color } : undefined}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: priority === p.value ? "rgba(255,255,255,0.85)" : p.color }}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Assignees — read-only outside the internal app (assignment stays
              a coordinator-managed concept even on an "Editable" share link) */}
          <Field icon={Users2} label="Assignees">
            {permissions.assignTasks ? (
              <AssigneeSelect assignees={assignees} onChange={setAssignees} />
            ) : assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2" data-testid="editor-assignees-readonly">
                {assignees.map((a) => (
                  <span
                    key={a.user_id}
                    className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.06] text-gray-600 dark:text-[#B0AEA8] text-xs"
                  >
                    <Avatar className="w-4 h-4 rounded-full">
                      {a.picture ? <AvatarImage src={a.picture} /> : null}
                      <AvatarFallback className="bg-[#1B4332] text-white text-[8px]">
                        {(a.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {a.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Unassigned</p>
            )}
          </Field>

          {/* Labels */}
          <Field icon={Tag} label="Labels">
            <LabelManager selected={labels} onChange={setLabels} />
          </Field>

          {/* Due date & time */}
          <Field icon={CalendarClock} label="Due Date & Time">
            <DateTimePicker value={dueDate} onChange={setDueDate} />
          </Field>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-[#EAE7E0] dark:border-[#2A303B] bg-[#F6F1EA] dark:bg-[#161E1B]">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="editor-cancel"
            className="border-[#EAE7E0] dark:border-[#2A303B] bg-white dark:bg-[#1A2622] text-gray-700 dark:text-[#B0AEA8] hover:bg-[#FBFAF7] dark:hover:bg-[#242A34]"
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            data-testid="editor-save"
            className="bg-[#C6A15B] hover:bg-[#8F7340] dark:bg-[#1FB58A] dark:hover:bg-[#1B4332] text-white"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- field wrapper for consistent icon + label layout -----
function Field({ icon: Icon, label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
      <div className="flex items-center gap-2 pt-2 text-xs font-medium text-gray-500 dark:text-[#8E8C87]">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ----- backward-compat normalizers -----
// Legacy labels were plain strings; new ones are { label_id, name, color }.
function normalizeLabels(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((l, i) => {
    if (typeof l === "string") {
      return { label_id: `legacy_${i}`, name: l, color: "#1B4332" };
    }
    return {
      label_id: l.label_id || `legacy_${i}`,
      name: l.name || "Label",
      color: l.color || "#1B4332",
    };
  });
}

// Legacy assignees were plain strings (user_ids or names); new ones are user objects.
function normalizeAssignees(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((a, i) => {
    if (typeof a === "string") {
      return { user_id: a, name: a, email: "", picture: null, role: "" };
    }
    return {
      user_id: a.user_id || `legacy_${i}`,
      name: a.name || a.email || "User",
      email: a.email || "",
      picture: a.picture || null,
      role: a.role || "",
    };
  });
}
