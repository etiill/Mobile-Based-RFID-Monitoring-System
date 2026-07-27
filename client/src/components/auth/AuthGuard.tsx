import { Navigate, useLocation, Outlet } from "react-router-dom"
import { PATHS } from "../../routes/path"

/**
 * Guard component that allows authenticated users to access protected routes.
 * Redirects unauthenticated users to the Login page.
 */
export function AuthGuard() {
  const location = useLocation()

  // Replace this with your actual auth hook or state (e.g. from context or Redux)
  // For development/Laravel API integration, we check localStorage for a mock token/flag.
  const isAuthenticated = !!localStorage.getItem("token") || localStorage.getItem("authenticated") === "true"

  if (!isAuthenticated) {
    // Redirect to login page, preserving the attempted route in state for post-auth navigation
    return <Navigate to={PATHS.LOGIN} state={{ from: location }} replace />
  }

  // Render child routes if authenticated
  return <Outlet />
}

export default AuthGuard
