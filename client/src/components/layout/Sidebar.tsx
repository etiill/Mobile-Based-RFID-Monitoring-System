import { useState } from "react"
import { NavLink } from "react-router-dom"
import { 
  LayoutGrid, 
  CreditCard, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  Bell, 
  ScanLine,
  UserRound,
  Users
} from "lucide-react"
import { cn } from "../../lib/utils"
import { PATHS } from "../../routes/path"

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
}

export const ADMIN_ROUTES = [
  {
    label: "Dashboard",
    path: PATHS.APP.DASHBOARD,
    icon: LayoutGrid,
  },
  {
    label: "Registration",
    path: PATHS.APP.ADMIN.REGISTRATION,
    icon: CreditCard,
  },
  {
    label: "Pupils",
    path: PATHS.APP.ADMIN.PUPILS,
    icon: UserRound,
  },
  {
    label: "RFID Scan",
    path: PATHS.APP.TEACHER.RFID_SCAN,
    icon: ScanLine,
  },
]

export const TEACHER_ROUTES = [
  {
    label: "Dashboard",
    path: PATHS.APP.DASHBOARD,
    icon: LayoutGrid,
  },
  {
    label: "My Students",
    path: PATHS.APP.TEACHER.MY_STUDENTS,
    icon: Users,
  },
  {
    label: "Attendance",
    path: PATHS.APP.TEACHER.ATTENDANCE,
    icon: UserRound,
  },
  {
    label: "RFID Scan",
    path: PATHS.APP.TEACHER.RFID_SCAN,
    icon: ScanLine,
  },
  {
    label: "Report",
    path: PATHS.APP.TEACHER.REPORTS,
    icon: UserRound,
  },
]

export const GUARDIAN_ROUTES = [
  {
    label: "Dashboard",
    path: PATHS.APP.GUARDIAN.DASHBOARD,
    icon: LayoutGrid,
  },
]

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const role = user.role || "admin"

  const filteredRoutes = 
    role === "admin" ? ADMIN_ROUTES :
    role === "teacher" ? TEACHER_ROUTES :
    role === "guardian" ? GUARDIAN_ROUTES :
    GUARDIAN_ROUTES;

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleMobileMenu}
        className="fixed top-3.5 left-4 z-50 p-2 bg-primary rounded-lg shadow-md md:hidden border border-white/10 cursor-pointer"
        aria-label="Toggle mobile menu"
      >
        {isMobileMenuOpen ? (
          <X size={18} className="text-white" />
        ) : (
          <Menu size={18} className="text-white" />
        )}
      </button>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 left-0 md:top-auto md:left-auto md:relative z-40 h-screen md:h-full bg-primary text-white transition-all duration-300 ease-in-out shadow-xl flex flex-col shrink-0",
          isCollapsed ? "w-20" : "w-64",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header/Logo Section */}
        <div className="relative flex items-center justify-between h-32 px-6 border-b border-white/10 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-3.5 overflow-hidden whitespace-nowrap">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                <CreditCard size={22} className="text-secondary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-wider leading-none">FCU</span>
                <span className="text-base font-extrabold tracking-tight mt-1 leading-none text-white">
                  Kindergarten
                </span>
                <span className="text-[9px] tracking-widest text-secondary font-bold uppercase mt-1.5 leading-none">
                  RFID Monitor
                </span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                <CreditCard size={20} className="text-secondary" />
              </div>
            </div>
          )}
          
          {/* Desktop Sidebar Collapse Toggle Arrow */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 rounded-lg bg-yellow-400 text-blue-900 hover:bg-yellow-400/30 dark:bg-white dark:text-black dark:hover:bg-white/15 hover:text-white/70 transition-colors absolute -right-3 top-16 border border-white/10 shadow-lg z-50 cursor-pointer ease-in-out"
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col flex-1 justify-between overflow-y-auto">
          <nav className="p-4 space-y-1">
            <p
              className={cn(
                "text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 px-2",
                isCollapsed && "text-center"
              )}
            >
              {isCollapsed ? "---" : "Main Menu"}
            </p>
            {filteredRoutes.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 group relative cursor-pointer",
                    isActive
                      ? "bg-white/10 text-white shadow-sm font-bold"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <item.icon
                  size={18}
                  className="shrink-0 transition-transform group-hover:scale-110"
                />
                {!isCollapsed && (
                  <span className="font-semibold text-sm whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-neutral text-white text-[11px] font-semibold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                    {item.label}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom System Alert Trigger */}
          <div className="p-4 border-t border-white/10 shrink-0">
            <button
              title="System Alert"
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border border-secondary/30 bg-white/5 py-2.5 text-xs font-semibold text-secondary hover:bg-white/10 transition-all duration-200 w-full cursor-pointer",
                isCollapsed ? "h-12 w-12 mx-auto p-0 border border-secondary/30" : "px-4"
              )}
            >
              <Bell className="h-4 w-4 shrink-0 fill-secondary/20 animate-pulse text-secondary" />
              {!isCollapsed && <span>System Alert</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
