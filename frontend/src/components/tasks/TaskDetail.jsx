import { X, AlignLeft, Calendar, Flag, Tag, Users, Paperclip, Image as ImageIcon } from "lucide-react";
import CardAttachments from "./CardAttachments";
import CardComments from "./CardComments";
import ThumbnailPicker from "./ThumbnailPicker";

/**
 * The back of a task card, in the Trello sense: everything recorded about
 * one task, on one surface.
 *
 * The previous version showed a title and a wall of unformatted description
 * in a narrow column, which made a long update hard to read and left out
 * everything else the card knows -- who it is assigned to, when it is due,
 * how urgent it is, which list it sits in. Those are what make a task
 * actionable rather than merely legible.
 */

const PRIORITIES = {
  low: { label: "Low", className: "bg-gray-100 text-gray-600 border-gray-200" },
  medium: { label: "Medium", className: "bg-blue-50 text-blue-700 border-blue-200" },
  high: { label: "High", className: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { label: "Urgent", className: "bg-red-50 text-red-700 border-red-200" },
};

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function formatDue(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const days = Math.round((day - today) / 86400000);
  const text = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  if (days < 0) return { text, note: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, overdue: true };
  if (days === 0) return { text, note: "due today", soon: true };
  if (days <= 3) return { text, note: `in ${days} day${days === 1 ? "" : "s"}`, soon: true };
  return { text, note: null };
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">{title}</h3>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

export default function TaskDetail({ card, boardTitle, onClose, canEdit = false, onThumbnailChange }) {
  if (!card) return null;

  const priority = PRIORITIES[card.priority] || PRIORITIES.medium;
  const due = formatDue(card.due_date);
  const labels = card.labels || [];
  const assignees = card.assignees || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-[8vh]"
      onClick={onClose}
      data-testid="task-detail-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        data-testid="task-detail"
      >
        {/* Header — the title, and where the task lives */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="font-display text-xl text-gray-900 leading-snug break-words">{card.title}</h2>
            {boardTitle && (
              <p className="text-xs text-gray-400 mt-1">
                in list <span className="text-gray-600">{boardTitle}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
            data-testid="task-detail-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* At-a-glance row. Only rendered when there is something to say --
            an empty strip of placeholders reads as broken. */}
        {(card.priority || due || labels.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-[#FAFAF9] border-b border-gray-100">
            {card.priority && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${priority.className}`}>
                <Flag className="w-3 h-3" />
                {priority.label}
              </span>
            )}
            {due && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                  due.overdue
                    ? "bg-red-50 text-red-700 border-red-200"
                    : due.soon
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                <Calendar className="w-3 h-3" />
                {due.text}
                {due.note && <span className="opacity-75">· {due.note}</span>}
              </span>
            )}
            {labels.map((l, i) => (
              <span
                key={l.label_id || i}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: l.color || "#1B4332" }}
              >
                <Tag className="w-3 h-3" />
                {l.name}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          {assignees.length > 0 && (
            <Section icon={Users} title="Assigned to">
              <div className="flex flex-wrap gap-2">
                {assignees.map((a) => (
                  <span
                    key={a.user_id}
                    className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#F7F6F3] border border-[#EAE7E0]"
                  >
                    {a.picture ? (
                      <img src={a.picture} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-[#1B4332] text-white text-[10px] font-semibold flex items-center justify-center">
                        {initials(a.name)}
                      </span>
                    )}
                    <span className="text-[13px] text-gray-700">{a.name}</span>
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Section icon={AlignLeft} title="Description">
            {card.description ? (
              // Preserves the writer's line breaks and keeps a long update to
              // a readable measure, rather than running it edge to edge.
              <div className="text-[14px] text-gray-700 whitespace-pre-wrap leading-[1.7] break-words max-w-[62ch]">
                {card.description}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400 italic">
                Nothing written yet — open the task to add detail.
              </p>
            )}
          </Section>

          <Section icon={ImageIcon} title="Picture">
            <ThumbnailPicker
              cardId={card.card_id}
              currentThumbnailId={card.thumbnail_id}
              canEdit={canEdit}
              onChange={onThumbnailChange}
            />
          </Section>

          <Section icon={Paperclip} title="Attachments">
            <CardAttachments cardId={card.card_id} canEdit={canEdit} />
          </Section>

          {/* Anybody on the project can comment -- the person doing the work
              is usually not the person who wrote the card, and progress and
              blockers were previously said somewhere the project cannot see.
              Last, because it is the part that grows. */}
          <div className="pt-1">
            <CardComments cardId={card.card_id} canEdit={canEdit} />
          </div>
        </div>
      </div>
    </div>
  );
}
