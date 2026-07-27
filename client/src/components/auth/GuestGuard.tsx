import { Navigate, Outlet } from "react-router-dom"
import { PATHS } from "../../routes/path"

/**
 * Guard component that allows only guest (unauthenticated) users to access routes (e.g. Login).
 * Redirects authenticated users to the admin dashboard.
 */
export function GuestGuard() {
  // Replace this with your actual auth hook or state
  const isAuthenticated = !!localStorage.getItem("token") || localStorage.getItem("authenticated") === "true"

  if (isAuthenticated) {
    // Redirect authenticated users to the main dashboard
    return <Navigate to={PATHS.APP.DASHBOARD} replace />
  }

  // Render guest routes (like Login)
  return <Outlet />
}

export default GuestGuard
