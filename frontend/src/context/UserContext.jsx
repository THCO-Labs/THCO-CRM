import { createContext, useContext } from "react";

// Shared current-user context so any page can read the logged-in user
// and its access rights without re-fetching /auth/me.
const UserContext = createContext(null);

export const UserProvider = ({ user, children }) => (
  <UserContext.Provider value={user}>{children}</UserContext.Provider>
);

export const useUser = () => useContext(UserContext);

// Super admins and HR see everything; everyone else sees only assigned units.
// THCO Flow is org-wide by design.
export const hasFullAccess = (user) =>
  user?.role === "super_admin" || Boolean(user?.is_hr);

export const hasUnitAccess = (user, slug) => {
  if (!slug) return true;
  if (hasFullAccess(user)) return true;
  if (slug === "flow") return true;
  return user?.accessible_units?.includes(slug) || false;
};

export const canManageUsers = (user) =>
  user?.role === "super_admin" || user?.role === "mini_admin" || Boolean(user?.is_hr);

export default UserContext;
