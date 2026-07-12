export const ROLES = {
  admin: "admin",
  fleet_manager: "fleet_manager",
  dispatcher: "dispatcher",
  safety_officer: "safety_officer",
  financial_analyst: "financial_analyst",
};

/** Nav items and which roles can see them */
export const NAV_ACCESS = {
  "/": ["admin", "fleet_manager", "dispatcher", "safety_officer", "financial_analyst"],
  "/vehicles": ["admin", "fleet_manager", "dispatcher"],
  "/drivers": ["admin", "fleet_manager", "safety_officer", "dispatcher"],
  "/trips": ["admin", "fleet_manager", "dispatcher"],
  "/maintenance": ["admin", "fleet_manager"],
  "/expenses": ["admin", "fleet_manager", "financial_analyst"],
  "/reports": ["admin", "fleet_manager", "financial_analyst"],
  "/users": ["admin"],
  "/settings": ["admin", "fleet_manager", "dispatcher", "safety_officer", "financial_analyst"],
};

export function canAccess(role, path) {
  if (!role) return false;
  if (role === "admin") return true;
  const allowed = NAV_ACCESS[path];
  return allowed ? allowed.includes(role) : false;
}

export function filterNav(links, role) {
  return links.filter((link) => canAccess(role, link.to));
}

export const INSIGHTS_ROLES = ["admin", "fleet_manager", "financial_analyst"];
export const FINANCE_ROLES = ["admin", "fleet_manager", "financial_analyst"];
export const FLEET_ROLES = ["admin", "fleet_manager"];
export const DISPATCH_ROLES = ["admin", "fleet_manager", "dispatcher"];
export const SAFETY_ROLES = ["admin", "fleet_manager", "safety_officer"];

export function hasRole(userRole, allowed) {
  if (!userRole) return false;
  if (userRole === "admin") return true;
  return allowed.includes(userRole);
}
