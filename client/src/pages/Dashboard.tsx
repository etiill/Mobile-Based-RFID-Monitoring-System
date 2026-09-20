import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { 
  Plus, 
  Check, 
  User, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  ArrowRight
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import TeacherDashboard from "./TeacherDashboard"
import GuardianDashboard from "./GuardianDashboard"

interface EventItem {
  id: string
  time: string
  name: string
  eventType: string
  location: string
  status: "In Gate" | "In Progress" | "Picked Up"
}

export function AdminDashboard() {
  const [pupilsCount, setPupilsCount] = useState<number>(84)
  const [guardiansCount, setGuardiansCount] = useState<number>(78)
  const [teachersCount, setTeachersCount] = useState<number>(8)
  const [rfidCount, setRfidCount] = useState<number>(84)

  const [events, setEvents] = useState<EventItem[]>([
    { id: "1", time: "11:42 AM", name: "Juan Dela Cruz", eventType: "Check-in (RFID Scan)", location: "Main Gate", status: "In Gate" },
    { id: "2", time: "11:35 AM", name: "Maria Santos", eventType: "Check-in (RFID Scan)", location: "Main Gate", status: "In Gate" },
    { id: "3", time: "10:58 AM", name: "Liam Reyes", eventType: "Move to Library", location: "Library Door 2", status: "In Progress" },
    { id: "4", time: "10:47 AM", name: "Sophia Garcia", eventType: "Check-in (RFID Scan)", location: "Main Gate", status: "In Gate" },
    { id: "5", time: "10:32 AM", name: "Noah Villanueva", eventType: "Check-Out (Pickup)", location: "Main Gate", status: "Picked Up" },
    { id: "6", time: "10:15 AM", name: "Ava Lopez", eventType: "Cafeteria Check-in", location: "Cafeteria Reader", status: "In Gate" }
  ])

  const [currentPage, setCurrentPage] = useState<number>(1)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const students = await ApiHandler.get<any[]>("/students")
        if (Array.isArray(students) && students.length > 0) {
          setPupilsCount(students.length)
          setRfidCount(students.length)
          let totalG = 0
          students.forEach(s => {
            if (s.guardians) totalG += s.guardians.length
          })
          if (totalG > 0) setGuardiansCount(totalG)
        }

        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const localToday = `${year}-${month}-${day}`
        let attendances = await ApiHandler.get<any[]>(`/attendance?date=${localToday}`)
        if (!Array.isArray(attendances) || attendances.length === 0) {
          attendances = await ApiHandler.get<any[]>(`/attendance`)
        }

        if (Array.isArray(attendances) && attendances.length > 0) {
          const liveEvents: EventItem[] = []
          attendances.forEach(att => {
            const studentName = att.student?.name || att.student_name || "Pupil"
            if (att.time_out) {
              liveEvents.push({
                id: `out-${att.id}`,
                time: att.time_out,
                name: studentName,
                eventType: "Check-Out (Pickup)",
                location: "Main Gate",
                status: "Picked Up"
              })
            }
            if (att.time_in) {
              liveEvents.push({
                id: `in-${att.id}`,
                time: att.time_in,
                name: studentName,
                eventType: "Check-in (RFID Scan)",
                location: "Main Gate",
                status: "In Gate"
              })
            }
          })
          if (liveEvents.length > 0) {
            setEvents(liveEvents)
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard live data:", err)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 4000)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("rfid_attendance_sync")
      bc.onmessage = () => fetchMetrics()
    } catch {}

    return () => {
      clearInterval(interval)
      if (bc) bc.close()
    }
  }, [])

  const stats = [
    {
      label: "TOTAL PUPILS",
      value: pupilsCount,
      badgeColor: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
      linkText: "View Pupils →",
      linkUrl: "/app/pupils"
    },
    {
      label: "REGISTERED GUARDIANS",
      value: guardiansCount,
      badgeColor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      linkText: "View Guardians →",
      linkUrl: "/app/pupils"
    },
    {
      label: "TEACHERS",
      value: teachersCount,
      badgeColor: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
      linkText: "View Teachers →",
      linkUrl: "/app/profile"
    },
    {
      label: "RFID TAGS ASSIGNED",
      value: rfidCount,
      badgeColor: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      linkText: "View RFID Assignments →",
      linkUrl: "/app/rfid_scan"
    },
  ]

  const notifications = [
    {
      id: "1",
      icon: Plus,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
      title: "New pickup record added for Sophia Garcia...",
      subtitle: "10:58 AM • Pickup Gate A"
    },
    {
      id: "2",
      icon: Check,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
      title: "Guardian verification approved for Liam Reyes...",
      subtitle: "10:40 AM • Approved by Admin"
    },
    {
      id: "3",
      icon: User,
      iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
      title: 'New user "Teacher" was added',
      subtitle: "09:22 AM • System"
    },
    {
      id: "4",
      icon: RefreshCw,
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
      title: "System backup completed successfully...",
      subtitle: "08:15 AM • Automated Cloud Sync"
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in font-sans text-neutral">
      
      {/* 1. System Primary Hero Welcome Banner */}
      <div className="rounded-3xl bg-primary text-primary-foreground p-7 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden border border-primary/20">
        <div className="space-y-1.5 z-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-foreground">Welcome, Admin!</h1>
          <p className="text-xs text-primary-foreground/80 font-medium">
            FCU Kindergarten RFID Monitoring System — Real-time Pupil Safety & Pickup Tracking.
          </p>
        </div>

        <div className="z-10 shrink-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-2 text-xs font-bold text-primary-foreground backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            All Gates Synced
          </span>
        </div>
      </div>

      {/* 2. Top Metric Cards Row (4 Columns) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${stat.badgeColor}`}>
                {stat.value}
              </span>
            </div>

            <div>
              <span className="text-3xl font-extrabold tracking-tight text-neutral block">
                {stat.value}
              </span>
            </div>

            <Link 
              to={stat.linkUrl} 
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 transition-all"
            >
              <span>{stat.linkText}</span>
            </Link>
          </div>
        ))}
      </div>

      {/* 3. Main Grid Layout (Left: Monitoring Events Table | Right: Notifications Sidebar) */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Recent Monitoring Events Table (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
          
          <div>
            {/* Table Header Bar */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-neutral">Recent Monitoring Events</h2>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Live RFID gate activity & interior checkpoints</p>
              </div>
              <Link 
                to="/app/attendance" 
                className="text-xs font-bold text-primary hover:underline"
              >
                View All
              </Link>
            </div>

            {/* Events Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase bg-tertiary/20">
                    <th className="p-4 pl-6">Time</th>
                    <th className="p-4">Pupil Name</th>
                    <th className="p-4">Event Type</th>
                    <th className="p-4">Location</th>
                    <th className="p-4 pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-semibold text-neutral">
                  {events.slice(0, 6).map((evt) => (
                    <tr key={evt.id} className="hover:bg-tertiary/10 transition-colors">
                      <td className="p-4 pl-6 font-mono text-muted-foreground font-semibold">
                        {evt.time}
                      </td>
                      <td className="p-4 font-bold text-primary">
                        {evt.name}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {evt.eventType}
                      </td>
                      <td className="p-4 text-neutral">
                        {evt.location}
                      </td>
                      <td className="p-4 pr-6">
                        {evt.status === "In Gate" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-400">
                            In Gate
                          </span>
                        )}
                        {evt.status === "In Progress" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-400">
                            In Progress
                          </span>
                        )}
                        {evt.status === "Picked Up" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-950/30 dark:border-purple-900/40 dark:text-purple-400">
                            Picked Up
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Pagination Footer */}
          <div className="p-4 px-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-semibold bg-tertiary/10">
            <span>Showing {Math.min(6, events.length)} of {events.length > 6 ? events.length : 84} events</span>
            
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1 rounded-lg border border-border bg-card text-muted-foreground hover:bg-tertiary cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="h-7 w-7 rounded-lg bg-primary text-white font-bold text-xs flex items-center justify-center border-none">
                1
              </button>
              <button className="h-7 w-7 rounded-lg bg-card border border-border text-muted-foreground font-bold text-xs flex items-center justify-center hover:bg-tertiary cursor-pointer">
                2
              </button>
              <button className="h-7 w-7 rounded-lg bg-card border border-border text-muted-foreground font-bold text-xs flex items-center justify-center hover:bg-tertiary cursor-pointer">
                3
              </button>
              <button 
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1 rounded-lg border border-border bg-card text-muted-foreground hover:bg-tertiary cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Recent Notifications Sidebar (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-6">
          
          <div className="space-y-5">
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-extrabold text-neutral">Recent Notifications</h2>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Critical safety alerts & logs</p>
              </div>
              <button className="text-xs font-bold text-primary hover:underline border-none bg-transparent cursor-pointer">
                View All
              </button>
            </div>

            {/* Notification Items List */}
            <div className="space-y-3.5">
              {notifications.map((item) => {
                const Icon = item.icon
                return (
                  <div 
                    key={item.id} 
                    className="p-3.5 border border-border/80 rounded-2xl bg-tertiary/20 hover:bg-tertiary/40 transition-colors flex items-center gap-3.5"
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 ${item.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-neutral truncate">{item.title}</h4>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">{item.subtitle}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Note Item */}
          <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span className="truncate">RFID tag assigned to <strong>Noah Villanueva</strong></span>
            <span className="text-[10px] shrink-0 font-bold ml-2">Yesterday</span>
          </div>

        </div>

      </div>

    </div>
  )
}

export function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const role = user.role || "admin"

  if (role === "guardian") {
    return <GuardianDashboard />
  }

  // Teacher and Admin both receive the rich classroom dashboard
  return <TeacherDashboard />
}

export default Dashboard

