/**
 * Task board permission sets. Everything in TaskBoard/BoardColumn/TaskCard
 * reads from a `permissions` object instead of a single `canManage` flag, so
 * a third, in-between mode (a public "Editable" share link — task-level
 * actions only, no board management) can exist alongside the original two
 * (Project Coordinator vs. read-only internal viewer) without forking any
 * rendering or drag-and-drop logic.
 */

export const FULL_PERMISSIONS = {
  manageBoards: true,
  createTasks: true,
  editTasks: true,
  moveTasks: true,
  deleteTasks: true,
  assignTasks: true,
};

export const READ_ONLY_PERMISSIONS = {
  manageBoards: false,
  createTasks: false,
  editTasks: false,
  moveTasks: false,
  deleteTasks: false,
  assignTasks: false,
};

// A public "Editable" share link: task info can be created/edited/moved,
// but boards are structural (coordinator-only) and assignment stays an
// internal concept — neither is ever granted to an external link.
export const SHARED_EDIT_PERMISSIONS = {
  manageBoards: false,
  createTasks: true,
  editTasks: true,
  moveTasks: true,
  deleteTasks: false,
  assignTasks: false,
};

// Somebody on the project. The board is where they post progress on work
// they were given, so cards are theirs to add, edit, move and assign — it is
// only the shape of the board, which their unit head decides, that they do
// not change. Unlike a public share link this is a known colleague, so
// deleting and assigning are not withheld.
export const COLLABORATOR_PERMISSIONS = {
  manageBoards: false,
  createTasks: true,
  editTasks: true,
  moveTasks: true,
  deleteTasks: true,
  assignTasks: true,
};

export function permissionsFromCanManage(canManage) {
  return canManage ? FULL_PERMISSIONS : READ_ONLY_PERMISSIONS;
}

/**
 * What this person may do on one project's board.
 *
 * Three levels, matching the server: the project's managers (and
 * administrators) shape the board; collaborators work inside it; everybody
 * else reads.
 *
 * This mirrors can_manage_project in backend/services/permissions.py. It used
 * to grant control to anyone who ran the project's unit, which handed a
 * manager full controls over a colleague's project -- the buttons appeared and
 * then the server refused them.
 */
export function permissionsForProject(user, project) {
  if (!user || !project) return READ_ONLY_PERMISSIONS;

  const manages =
    user.role === "super_admin" ||
    user.role === "mini_admin" ||
    Boolean(user.is_hr) ||
    user.user_id === project.created_by ||
    user.user_id === project.project_manager_id ||
    (project.project_manager_ids || []).includes(user.user_id);

  if (manages) return FULL_PERMISSIONS;
  if ((project.collaborator_ids || []).includes(user.user_id)) return COLLABORATOR_PERMISSIONS;
  return READ_ONLY_PERMISSIONS;
}
