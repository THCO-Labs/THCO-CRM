import { Plus } from "lucide-react";

/**
 * "+ Add Task" affordance at the bottom of a board column.
 *
 * This used to expand into an inline textarea that captured a title and
 * nothing else, so every new task had to be reopened to say who it was for,
 * when it was due, or what it actually involved. It now opens the full task
 * form -- the same one that edits a task -- and the column owns that dialog.
 */
export default function AddTask({ onOpen, disabled }) {
  if (disabled) return null;

  return (
    <button
      onClick={onOpen}
      data-testid="add-task-trigger"
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-black/[0.04] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
    >
      <Plus className="w-4 h-4" />
      Add Task
    </button>
  );
}
