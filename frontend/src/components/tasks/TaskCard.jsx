import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, AlignLeft, GripVertical, Flag, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import TaskMenu from "./TaskMenu";
import { PRIORITIES } from "./TaskCardEditor";
import { READ_ONLY_PERMISSIONS } from "./permissions";
import { tasksAPI } from "../../lib/api";

/**
 * A single Trello-like task card. Sortable within its board and draggable
 * across boards. Title edits inline (handled here); richer fields open an
 * editor modal via onEdit.
 *
 * `isOverlay` renders a non-sortable, elevated copy used as the drag preview
 * (so the original slot can remain as a placeholder -> no flicker).
 */
export default function TaskCard({ card, boardId, permissions = READ_ONLY_PERMISSIONS, onRename, onEdit, onView, onDelete, isOverlay }) {
  const id = card.card_id;

  const sortable = useSortable({
    id,
    data: { type: "card", cardId: id, boardId },
    disabled: isOverlay || !permissions.moveTasks,
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        transition,
      };

  const due = card.due_date
    ? new Date(card.due_date)
    : null;
  const dueLabel = due
    ? due.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  const overdue = due && due < new Date(new Date().toDateString());
  const priority = PRIORITIES.find((p) => p.value === card.priority) || PRIORITIES[1];
  const lastTouched = timeAgo(card.updated_at || card.created_at);

  // The cover image, fetched once per card and released when the card goes.
  const [coverUrl, setCoverUrl] = useState(null);
  useEffect(() => {
    if (!card.thumbnail_id) { setCoverUrl(null); return; }
    let live = true;
    let made = null;
    tasksAPI
      .openThumbnail(card.thumbnail_id)
      .then((url) => {
        if (!live) { URL.revokeObjectURL(url); return; }
        made = url;
        setCoverUrl(url);
      })
      .catch(() => {});
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [card.thumbnail_id]);

  // The drag handle is the grip icon; the whole card is NOT draggable to
  // avoid hijacking clicks on the title/menu (matches Trello's handle option).
  const handleProps = isOverlay ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={isDragging && !isOverlay ? "opacity-40" : ""}
      data-testid={`task-card-${id}`}
      data-card-id={id}
    >
      {/* The visible card is a layer inside the sortable node rather than the
          node itself. dnd-kit writes `transform` inline while dragging, so a
          hover lift applied here would be overwritten the moment a card moved
          -- and a lift applied out there would fight the drag. Separating them
          lets the card rise under the cursor and still drag cleanly. */}
      <div
        className={`group bg-white rounded-lg border border-gray-100 shadow-sm transition-all duration-200 ease-out
          ${isOverlay
            ? "rotate-2 cursor-grabbing shadow-xl ring-2 ring-[#C6A15B]/30"
            : "hover:border-[#C6A15B]/40 hover:shadow-lg hover:-translate-y-0.5"}`}
      >
      {/* The cover. Loaded as a blob because a plain <img src> would not
          carry this client's Bearer session. */}
      {card.thumbnail_id && (
        <div className="rounded-t-lg overflow-hidden bg-[#F7F6F3] aspect-[16/7]">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
        </div>
      )}

      {/* Labels row */}
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2.5">
          {card.labels.map((label, i) => {
            const isObj = typeof label === "object";
            const name = isObj ? label.name : label;
            const color = isObj ? label.color : "#1B4332";
            return (
              <span
                key={isObj ? label.label_id : i}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide text-white"
                style={{ backgroundColor: color }}
                title={name}
              >
                {name}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-1.5 p-3">
        {/* Drag handle */}
        {!isOverlay && permissions.moveTasks && (
          <button
            type="button"
            aria-label="Drag task"
            className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
            {...handleProps}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onView(card)}
            data-testid={`task-title-${id}`}
            className="block text-left text-sm font-medium text-gray-900 hover:text-[#8F7340] transition-colors break-words"
          >
            {card.title}
          </button>

          {/* Meta row: priority, description indicator, assignees, due date */}
          {(card.description || card.assignees?.length || dueLabel || card.attachment_count > 0 || (card.priority && card.priority !== "medium")) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
              {card.priority && card.priority !== "medium" && (
                <span
                  className="flex items-center gap-1 font-medium"
                  style={{ color: priority.color }}
                  title={`${priority.label} priority`}
                  data-testid={`task-priority-${id}`}
                >
                  <Flag className="w-3 h-3" fill={priority.color} strokeWidth={0} />
                  {priority.label}
                </span>
              )}
              {card.description && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onView(card); }}
                  className="flex items-center gap-1 hover:text-gray-700 cursor-pointer"
                  title="View description"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
              )}
              {card.assignees?.length > 0 && (
                <div className="flex -space-x-1.5" title={card.assignees.map((a) => typeof a === "object" ? a.name : a).join(", ")}>
                  {card.assignees.slice(0, 3).map((a, i) => {
                    const name = typeof a === "object" ? a.name : a;
                    const picture = typeof a === "object" ? a.picture : null;
                    const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <Avatar key={i} className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-[#161B22]">
                        {picture ? <AvatarImage src={picture} /> : null}
                        <AvatarFallback className="bg-[#1B4332] text-white text-[8px] font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {card.assignees.length > 3 && (
                    <span className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-[#161B22] bg-gray-200 dark:bg-[#242A34] text-gray-600 dark:text-[#B0AEA8] text-[8px] font-medium flex items-center justify-center">
                      +{card.assignees.length - 3}
                    </span>
                  )}
                </div>
              )}
              {card.attachment_count > 0 && (
                <span className="flex items-center gap-1" title={`${card.attachment_count} attachment${card.attachment_count === 1 ? "" : "s"}`}>
                  <Paperclip className="w-3 h-3" />
                  {card.attachment_count}
                </span>
              )}
              {dueLabel && (
                <span
                  className={`flex items-center gap-1 ${
                    overdue ? "text-red-600 dark:text-red-400 font-medium" : ""
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  {dueLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Context menu (revealed on hover) */}
        {!isOverlay && (permissions.editTasks || permissions.deleteTasks) && (
          <div className="shrink-0">
            <TaskMenu
              canEdit={permissions.editTasks}
              canDelete={permissions.deleteTasks}
              onEdit={() => onEdit(card)}
              onDelete={() => onDelete(card.card_id)}
            />
          </div>
        )}
      </div>

        {/* When it last moved. A board of undated cards reads as a list that
            nobody has touched in months, whether or not that is true; the one
            thing that makes it look alive is saying when something happened.
            Kept quiet until the card is hovered so it does not compete with
            the title. */}
        {!isOverlay && lastTouched && (
          <div className="px-3 pb-2 -mt-1">
            <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {lastTouched}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** "just now", "12m ago", "3h ago", "5d ago" — or nothing if we cannot tell. */
function timeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
