import { createContext, useContext } from "react";

// Shared current-user context so any page can read the logged-in user
// and its access rights without re-fetching /auth/me.
const UserContext = createContext(null);

export const UserProvider = ({ user, children }) => (
  <UserContext.Provider value={user}>{children}</UserContext.Provider>
);

export const useUser = () => useContext(UserContext);

// Super admins and HR see everything; everyone else sees only assigned units.
export const hasFullAccess = (user) =>
  user?.role === "super_admin" || Boolean(user?.is_hr);

// Somebody who heads a unit, and so opens projects for it.
export const isUnitHead = (user) => Boolean(user?.headed_units?.length);

// Mirrors permissions.has_unit_access on the server, which is the real gate.
//
// Crowther OS belongs to TSDs and administrators. Being put on a
// project does not open it: a collaborator's work is the task board their
// manager sets up, and the pipeline around it -- stages, value, who else is in
// the running -- is not theirs to see.
// The functions whose job is the delivery pipeline itself. Mirrors
// PIPELINE_FUNCTIONS in backend/services/permissions.py, which is the boundary
// that actually enforces this; hiding the menu entry only avoids offering an
// action the API would refuse.
//
// Engineers, designers and QA are deliberately absent. Being on a project does
// not open the pipeline: it carries stages, value and who else is in the
// running. Their work is the task board.
export const PIPELINE_FUNCTIONS = [
  "senior_partner",
  "commercial",
  "tsd",
  "talent_sd",
  "people_ops",
  "legal",
  "finance",
];

export const canEnterPipeline = (user) => {
  if (hasFullAccess(user)) return true;
  if (isUnitHead(user)) return true;
  if (PIPELINE_FUNCTIONS.includes(user?.function_role)) return true;
  // An architect-capable engineer reaches the projects they architect; row
  // scoping on the API then limits them to those.
  return Boolean(user?.can_architect);
};

export const hasUnitAccess = (user, slug) => {
  if (!slug) return true;
  if (hasFullAccess(user)) return true;
  // Crowther OS is no longer only for unit heads. A TSD owns projects without
  // necessarily heading a unit, and locking them out of the thing they own
  // made the role impossible to hold.
  if (slug === "flow") return canEnterPipeline(user);
  return user?.accessible_units?.includes(slug) || false;
};

export const canManageUsers = (user) =>
  user?.role === "super_admin" || user?.role === "mini_admin" || Boolean(user?.is_hr);

// Who may open a project. The client intake form is the formal entry point to
// the lifecycle, and it is filled in by whoever had the client conversation:
// commercial, a TSD, or an administrator. Staff are added to a project rather
// than creating their own.
//
// The API enforces this; hiding the button only avoids offering an action that
// would be refused.
export const canCreateProjects = (user) =>
  canManageUsers(user) ||
  isUnitHead(user) ||
  ["commercial", "tsd", "senior_partner"].includes(user?.function_role);

// Whether the Business Units section opens at all. Staff who have not been
// put on a project have not been given any of that work yet, so they get
// Dashboard, Tasks and Feedback & IT Support and nothing below them. Their
// unit head adding them to a project is what opens it.
export const canEnterUnits = (user) =>
  canManageUsers(user) ||
  isUnitHead(user) ||
  canEnterPipeline(user) ||
  Boolean(user?.has_projects);

export default UserContext;
