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
// THCO Flow opens once a person actually has work in it -- staff not yet put
// on a project would otherwise get a pipeline that shows them nothing.
export const hasUnitAccess = (user, slug) => {
  if (!slug) return true;
  if (hasFullAccess(user)) return true;
  if (slug === "flow") return Boolean(user?.has_projects) || isUnitHead(user);
  return user?.accessible_units?.includes(slug) || false;
};

export const canManageUsers = (user) =>
  user?.role === "super_admin" || user?.role === "mini_admin" || Boolean(user?.is_hr);

// Only a unit head opens projects, for the unit they head. Staff are added to
// a project by their head rather than creating their own. The API enforces
// this; hiding the button just avoids offering an action that would be refused.
export const canCreateProjects = (user) => canManageUsers(user) || isUnitHead(user);

// Whether the Business Units section opens at all. Staff who have not been
// put on a project have not been given any of that work yet, so they get
// Dashboard, Tasks and Feedback & IT Support and nothing below them. Their
// unit head adding them to a project is what opens it.
export const canEnterUnits = (user) =>
  canManageUsers(user) || isUnitHead(user) || Boolean(user?.has_projects);

export default UserContext;
