import { Navigate, Outlet } from "react-router-dom"
import { PATHS } from "../../routes/path"

interface RoleGuardProps {
  allowedRoles: string[]
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const rawRole = user.role || user.role_name || (user.roles && user.roles[0]?.name) || "admin"
  const role = typeof rawRole === "string" ? rawRole.toLowerCase().trim() : "admin"
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase().trim())

  if (!normalizedAllowedRoles.includes(role)) {
    return <Navigate to={PATHS.APP.DASHBOARD} replace />
  }

  return <Outlet />
}

export default RoleGuard
