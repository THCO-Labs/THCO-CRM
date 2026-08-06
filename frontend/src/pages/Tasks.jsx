import { useMemo, useState } from "react";
import { ArrowLeft, Share2 } from "lucide-react";
import ProjectsWorkspace from "../components/tasks/ProjectsWorkspace";
import TaskBoard from "../components/tasks/TaskBoard";
import ShareModal from "../components/tasks/ShareModal";
import { useUser } from "../context/UserContext";
import { tasksAPI } from "../lib/api";
import { permissionsForProject } from "../components/tasks/permissions";

/**
 * Tasks page — project-centric Trello-style workspace.
 *
 * Flow:
 *   Task page → Projects Workspace → select a project → project's Task Board
 *
 * The project list reuses the existing (Flow) projects data source. Selecting
 * a project loads ONLY that project's boards (data isolation). Only a Project
 * Coordinator (is_delivery_coordinator / super_admin) can mutate boards/tasks,
 * and only a coordinator can generate/manage that project's public share link.
 */
export default function Tasks() {
  const user = useUser();
  const [selected, setSelected] = useState(null); // project object or null
  const [shareOpen, setShareOpen] = useState(false);

  // What this person may do depends on the project, not on their account
  // alone: a unit head shapes their own unit's boards, collaborators work
  // inside the boards of projects they are on, everybody else reads.
  const permissions = permissionsForProject(user, selected);
  const canManage = permissions.manageBoards;

  const projectId = selected?.id;
  const api = useMemo(
    () => ({
      load: () => tasksAPI.listBoards(projectId),
      createBoard: (title) => tasksAPI.createBoard(projectId, title),
      renameBoard: (boardId, title) => tasksAPI.updateBoard(boardId, { title }),
      deleteBoard: (boardId) => tasksAPI.deleteBoard(boardId),
      createCard: (boardId, data) => tasksAPI.createCard(boardId, data),
      editCard: (cardId, data) => tasksAPI.updateCard(cardId, data),
      deleteCard: (cardId) => tasksAPI.deleteCard(cardId),
      reorder: (boardOrder, cards) => tasksAPI.reorder(boardOrder, cards),
    }),
    [projectId]
  );

  return (
    <div className="space-y-5" data-testid="tasks-page">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-gray-100 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A9834E] mb-1.5">
            Task Board
          </p>
          <h1 className="font-display text-2xl text-gray-900">
            {selected ? selected.name : "Tasks"}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {selected
              ? "Project workspace — boards and tasks are scoped to this project."
              : "Select a project to open its task board workspace."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Share — coordinator manages this project's public link */}
          {selected && canManage && (
            <button
              onClick={() => setShareOpen(true)}
              data-testid="share-board-trigger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-[#F0EEE9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}

          {/* Back to Projects action when a project is open */}
          {selected && (
            <button
              onClick={() => setSelected(null)}
              data-testid="back-to-projects"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-[#F0EEE9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>
          )}
        </div>
      </div>

      {/* Body: either the projects grid or the project's task board */}
      <div className="flex-1" data-testid="tasks-canvas">
        {selected ? (
          <TaskBoard key={projectId} permissions={permissions} api={api} />
        ) : (
          <ProjectsWorkspace onSelect={setSelected} />
        )}
      </div>

      {selected && canManage && (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={projectId}
        />
      )}
    </div>
  );
}
