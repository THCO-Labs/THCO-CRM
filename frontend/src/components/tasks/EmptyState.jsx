import AddBoard from "./AddBoard";
import { READ_ONLY_PERMISSIONS } from "./permissions";

/**
 * Empty state shown when a project has no boards yet.
 * `permissions.manageBoards` toggles whether the "create board" CTA is
 * offered; everyone else (including an "Editable" share link, which never
 * grants board management) sees a read-only message. The CTA reuses the
 * AddBoard dropdown (predefined templates + custom) so the flow is
 * identical whether or not the project already has boards.
 */
export default function EmptyState({ onCreateBoard, permissions = READ_ONLY_PERMISSIONS }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-20 px-6 select-none"
      data-testid="tasks-empty-state"
    >
      <div className="w-20 h-20 mb-6 rounded-2xl bg-white border border-[#EAE7E0] shadow-sm flex items-center justify-center">
        {/* Minimal board/column illustration */}
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#C6A15B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="6" height="16" rx="1.5" />
          <rect x="11" y="4" width="6" height="11" rx="1.5" />
          <path d="M6 8h0M6 11h0M14 8h0" />
        </svg>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A9834E] mb-3">
        Task Board
      </p>
      <h3 className="font-display text-2xl text-gray-900 mb-3">No boards have been created yet.</h3>
      {permissions.manageBoards ? (
        <>
          <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-7">
            Click <span className="font-medium text-gray-700">Add another board</span> to begin
            organizing project tasks.
          </p>
          <AddBoard onCreate={onCreateBoard} existingTitles={[]} permissions={permissions} variant="cta" />
        </>
      ) : (
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          This project doesn't have any boards yet. Its TSD or Solution Architect can add them, and they appear automatically once the project reaches Engineering and Build.
        </p>
      )}
    </div>
  );
}
