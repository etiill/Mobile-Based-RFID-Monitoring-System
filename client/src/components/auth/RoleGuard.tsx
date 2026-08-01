import { Navigate, Outlet } from "react-router-dom"
import { PATHS } from "../../routes/path"

interface RoleGuardProps {
  allowedRoles: string[]
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const role = user.role || "admin"

  if (!allowedRoles.includes(role)) {
    return <Navigate to={PATHS.APP.DASHBOARD} replace />
  }

  return <Outlet />
}

export default RoleGuard
