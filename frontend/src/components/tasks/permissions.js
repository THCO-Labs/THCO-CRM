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
 * Three levels, mirroring `can_manage_boards` and `can_use_board` in
 * `backend/services/permissions.py`:
 *
 *   shape the board   the project's TSD, its Solution Architect, administrators
 *   work inside it    anybody on the project -- pod members and collaborators
 *   read it           everybody else
 *
 * This checked `project_manager_id` and `project_manager_ids` only -- the
 * legacy fields from before the role was renamed. A project carries `tsd_id`
 * now, so **the TSD of a project got a read-only board**: the server would
 * have allowed them to add a column, and the interface never offered it.
 * The architect was missed the same way, and pod members were missed at the
 * collaborator level because only `collaborator_ids` was read.
 *
 * The legacy fields are still checked, for rows the migration has not
 * rewritten. They grant; they are no longer required.
 */
export function permissionsForProject(user, project) {
  if (!user || !project) return READ_ONLY_PERMISSIONS;

  const uid = user.user_id;
  const manages =
    user.role === "super_admin" ||
    user.role === "mini_admin" ||
    Boolean(user.is_hr) ||
    // The two people accountable for the project.
    uid === project.tsd_id ||
    uid === project.architect_id ||
    uid === project.created_by ||
    // Legacy, still honoured until the migration has run everywhere.
    uid === project.project_manager_id ||
    (project.project_manager_ids || []).includes(uid);

  if (manages) return FULL_PERMISSIONS;

  // Anybody placed on the project works inside the board. `pod_member_ids` is
  // how people are placed now; `collaborator_ids` is the older field.
  const onProject =
    (project.pod_member_ids || []).includes(uid) ||
    (project.collaborator_ids || []).includes(uid);

  return onProject ? COLLABORATOR_PERMISSIONS : READ_ONLY_PERMISSIONS;
}
