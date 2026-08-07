import { X, AlignLeft } from "lucide-react";

/**
 * Trello-style task detail popup — shows title + description in a clean,
 * moderate-sized overlay. Separate from the full editor.
 */
export default function TaskDetail({ card, onClose }) {
  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/30"
      onClick={onClose}
      data-testid="task-detail-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] mx-4 max-h-[70vh] flex flex-col overflow-hidden"
        data-testid="task-detail"
      >
        {/* Title bar */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 leading-snug pr-4">{card.title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 mt-0.5 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description — scrollable */}
        <div className="px-5 pb-5 overflow-y-auto flex-1">
          <div className="flex items-center gap-1.5 mb-2">
            <AlignLeft className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</span>
          </div>
          {card.description ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{card.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
