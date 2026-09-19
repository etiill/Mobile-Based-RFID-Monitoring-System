import React, { Suspense } from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { PATHS } from "./path"

// Synchronous core layouts & guards
import AdminLayout from "../components/layout/AdminLayout"
import AuthGuard from "../components/auth/AuthGuard"
import GuestGuard from "../components/auth/GuestGuard"
import RoleGuard from "../components/auth/RoleGuard"
import LoadingScreen from "../components/LoadingScreen"
import RfidScan from "@/pages/RfidScan/RfidScan"
import Pupils from "@/pages/Pupils/Pupils"
import MyStudents from "@/pages/MyStudents/MyStudents"
import Attendance from "@/pages/Attendance/Attendance"
import Report from "@/pages/Report/Report"

/**
 * Lazy loading helper with a configurable minimum loading delay.
 * Prevents "flash of loading states" on fast networks.
 */
export function lazyWithDelay<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  delayMs: number = 600
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    Promise.all([
      importFunc(),
      new Promise((resolve) => setTimeout(resolve, delayMs)),
    ]).then(([moduleExports]) => moduleExports)
  )
}

/**
 * HOC Wrapper that encapsulates lazy-loaded components within Suspense.
 */
export function withSuspense(Component: React.ComponentType<any>) {
  return function SuspenseWrapper(props: any) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Component {...props} />
      </Suspense>
    )
  }
}

// Lazy-loaded pages
const LazyLogin = lazyWithDelay(() => import("../pages/auth/Login"))
const Dashboard = lazyWithDelay(() => import("../pages/Dashboard"))
const Registration = lazyWithDelay(() => import("../pages/Registration/registration"))
const TeacherProfile = lazyWithDelay(() => import("../pages/TeacherProfile/TeacherProfile"))
const LazyCheckoutConfirm = lazyWithDelay(() => import("../pages/CheckoutConfirm/CheckoutConfirm"))

// Suspense-wrapped pages (for guest page)
const Login = withSuspense(LazyLogin)
const CheckoutConfirm = withSuspense(LazyCheckoutConfirm)

/**
 * Main application routes configuration using React Router v7 Data API.
 * Grouped cleanly by accessibility level.
 */
export const router = createBrowserRouter([
  // Public Guardian Checkout Confirmation Route
  {
    path: PATHS.CHECKOUT_CONFIRM,
    element: <CheckoutConfirm />,
  },

  // Guest Routes (Accessible only to unauthenticated users)
  {
    element: <GuestGuard />,
    children: [
      {
        path: PATHS.LOGIN,
        element: <Login />,
      },
    ],
  },

  // Protected Admin Routes (Accessible only to authenticated users)
  {
    element: <AuthGuard />,
    children: [
      {
        path: PATHS.APP.ROOT,
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <Navigate to={PATHS.APP.DASHBOARD} replace />,
          },
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          
          // Admin Only Routes
          {
            element: <RoleGuard allowedRoles={["admin"]} />,
            children: [
              {
                path: "registration",
                element: <Registration />,
              },
              {
                path: "pupils",
                element: <Pupils />,
              },
              {
                path: "rfid_scan",
                element: <RfidScan />,
              },
            ],
          },

          // Teacher & Admin Routes
          {
            element: <RoleGuard allowedRoles={["admin", "teacher"]} />,
            children: [
              {
                path: "my_students",
                element: <MyStudents />,
              },
              {
                path: "attendance",
                element: <Attendance />,
              },
              {
                path: "profile",
                element: <TeacherProfile />,
              },
              {
                path: "reports",
                element: <Report />,
              },
            ],
          },
        ],
      },
    ],
  },

  // Redirection rules
  {
    path: "/",
    element: <Navigate to={PATHS.APP.DASHBOARD} replace />,
  },
  {
    path: "*",
    element: <Navigate to={PATHS.APP.DASHBOARD} replace />,
  },
  {
    path: "/registration",
    element: <Registration />,
  }
])
