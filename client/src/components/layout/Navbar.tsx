import { Link, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { LogOut, UserRound, Bell, Trash2, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react"
import { PATHS } from "../../routes/path"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../ui/toast"
import { useEffect, useState, useRef } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

export function Navbar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const name = user.name || "Administrator"
  const role = user.role || "admin"
  const teacherId = user.id

  interface NotificationItem {
    id: string
    title: string
    message: string
    timestamp: string
    isRead: boolean
    type: "success" | "warning" | "error" | "info"
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("guardian_notifications") || "[]")
    } catch {
      return []
    }
  })
  
  const [unreadCount, setUnreadCount] = useState(() => {
    try {
      const items = JSON.parse(localStorage.getItem("guardian_notifications") || "[]")
      return items.filter((n: any) => !n.isRead).length
    } catch {
      return 0
    }
  })

  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [child, setChild] = useState<any>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Sync unread count and storage
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length)
    localStorage.setItem("guardian_notifications", JSON.stringify(notifications))
  }, [notifications])

  // Handle click outside for dropdown closing
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Poll status change for guardian child
  useEffect(() => {
    if (role !== "guardian") return

    let isMounted = true
    let pollInterval: any = null

    const loadChildAndStartPolling = async () => {
      let activeChild = null
      try {
        activeChild = await ApiHandler.get<any>("/guardian/child")
      } catch (err) {
        console.error("Navbar failed to fetch child details, falling back:", err)
        if (user.student) {
          activeChild = user.student
        }
      }

      if (!isMounted || !activeChild) return
      setChild(activeChild)

      const checkStatus = async () => {
        try {
          const res = await ApiHandler.get<{ status: string }>(`/v1/dismissal/status/${activeChild.id}`)
          if (!isMounted) return

          let currentStatus = "Idle"
          if (res && res.status) {
            if (res.status === "idle") currentStatus = "Idle"
            else if (res.status === "pending") currentStatus = "Request Sent - Awaiting Teacher Approval"
            else if (res.status === "success") currentStatus = "Dismissal Approved (SUCCESS)"
            else if (res.status === "flagged") currentStatus = "Flagged"
            else if (res.status === "rejected") currentStatus = "Rejected"
            else currentStatus = res.status
          }

          const storedLastStatus = localStorage.getItem("guardian_last_status") || "Idle"

          if (currentStatus !== storedLastStatus) {
            localStorage.setItem("guardian_last_status", currentStatus)

            let title = ""
            let message = ""
            let type: "success" | "warning" | "error" | "info" = "info"

            if (currentStatus === "Dismissal Approved (SUCCESS)") {
              title = "Dismissal Approved"
              message = `Handover completed successfully for ${activeChild.name}.`
              type = "success"
            } else if (currentStatus === "Flagged") {
              title = "Dismissal Flagged"
              message = `Safety alert: handover verification flagged for ${activeChild.name}.`
              type = "warning"
            } else if (currentStatus === "Rejected") {
              title = "Dismissal Rejected"
              message = `Dismissal request rejected by the teacher.`
              type = "error"
            } else if (currentStatus === "Request Sent - Awaiting Teacher Approval") {
              title = "Request Submitted"
              message = `Awaiting teacher verification for ${activeChild.name}.`
              type = "info"
            }

            if (title && message) {
              const newNotif: NotificationItem = {
                id: Date.now().toString(),
                title,
                message,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isRead: false,
                type
              }
              
              setNotifications(prev => [newNotif, ...prev])
              
              toast.add({
                title,
                description: message,
                type
              })
            }
          }
        } catch (err) {
          console.error("Navbar failed to fetch child status:", err)
        }
      }

      checkStatus()
      pollInterval = setInterval(checkStatus, 4000)
    }

    loadChildAndStartPolling()

    return () => {
      isMounted = false
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [role, teacherId])

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const clearAllNotifications = () => {
    setNotifications([])
    localStorage.removeItem("guardian_notifications")
  }

  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  const roleLabel = role === "teacher" ? "Class Teacher" : role === "guardian" ? "Parent/Guardian" : "System Root"

  const handleLogout = async () => {
    try {
      await ApiHandler.post("/logout")
    } catch (error) {
      console.error("Failed to invalidate token on server:", error)
    } finally {
      localStorage.removeItem("authenticated")
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      navigate(PATHS.LOGIN, { replace: true })
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Side: Brand Details */}
        <div className="flex items-center gap-3">
          <img 
            src="/images/Filamer_Logo.png" 
            alt="Filamer Logo" 
            className="h-9 w-9 object-contain select-none"
          />
          <div className="flex flex-col justify-center">
            <Link to="/" className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-primary leading-tight">
                FCU Kindergarten
              </span>
              <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                RFID Monitoring System
              </span>
            </Link>
          </div>
        </div>

        {/* Right Side: User Menu Dropdown */}
        <div className="flex items-center gap-6">
          {/* Notification Bell (Only for Guardian role) */}
          {role === "guardian" && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-muted-foreground hover:text-neutral hover:bg-muted rounded-xl transition-all cursor-pointer border-none bg-transparent outline-none flex items-center justify-center"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden text-neutral animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-tertiary/20">
                    <span className="text-xs font-bold text-primary dark:text-foreground">Notifications</span>
                    {notifications.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-primary hover:underline bg-transparent border-none cursor-pointer p-0"
                        >
                          Mark all read
                        </button>
                        <span className="text-border">|</span>
                        <button
                          onClick={clearAllNotifications}
                          className="text-[10px] font-bold text-destructive hover:underline bg-transparent border-none cursor-pointer p-0"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-border text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground font-semibold">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-3.5 hover:bg-tertiary/10 transition-colors cursor-pointer flex gap-3 items-start ${
                            !n.isRead ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                            {n.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                            {n.type === "error" && <XCircle className="h-4 w-4 text-red-600" />}
                            {n.type === "info" && <Info className="h-4 w-4 text-blue-600" />}
                          </div>
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-neutral truncate">{n.title}</span>
                              <span className="text-[9px] text-muted-foreground font-semibold shrink-0">
                                {n.timestamp}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer outline-none hover:opacity-80 transition-opacity text-left bg-transparent border-0 p-0">
              <Avatar className="h-9 w-9 bg-accent border border-border">
                <AvatarFallback className="text-xs font-semibold text-neutral bg-accent">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col md:flex">
                <span className="text-sm font-semibold text-neutral leading-none">
                  {name}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                  {roleLabel}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mt-1">
              {(role === "admin" || role === "teacher") && (
                <>
                  <DropdownMenuItem
                    onClick={() => navigate(PATHS.APP.PROFILE)}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <UserRound className="h-4 w-4" />
                    <span>Teacher Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Navbar