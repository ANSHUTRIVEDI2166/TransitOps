import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccess } from "../lib/roles";

export default function RoleRoute({ path, children }) {
  const { user } = useAuth();
  if (!canAccess(user?.role, path)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
