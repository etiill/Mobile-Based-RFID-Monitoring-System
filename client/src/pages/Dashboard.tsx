import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { 
  ChevronLeft, 
  ChevronRight,
  Radio,
  LogOut,
  UserCheck,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  GraduationCap,
  Building2,
  Layers,
  Calendar as CalendarIcon,
  Sun,
  Moon
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import TeacherDashboard from "./TeacherDashboard"
import GuardianDashboard from "./GuardianDashboard"

interface ArrivalActivityItem {
  id: string | number
  time: string
  pupilName: string
  yearSection: string
  rfidTag: string
  status: string
}

interface PickupLogItem {
  id: string | number
  time: string
  pupilName: string
  guardianName: string
  relation: string
  status: string
}

export function AdminDashboard() {
  const [pupilsCount, setPupilsCount] = useState<number>(84)
  const [guardiansCount, setGuardiansCount] = useState<number>(78)
  const [teachersCount, setTeachersCount] = useState<number>(8)
  const [yearLevelsCount, setYearLevelsCount] = useState<number>(5)
  const [sectionsCount, setSectionsCount] = useState<number>(12)

  const [arrivalActivity, setArrivalActivity] = useState<ArrivalActivityItem[]>([
    { id: 1, time: "07:45 AM", pupilName: "Juan Dela Cruz", yearSection: "Kindergarten 1 - St. Francis", rfidTag: "RFID-100293", status: "Checked In" },
    { id: 2, time: "07:42 AM", pupilName: "Maria Santos", yearSection: "Kindergarten 2 - St. Jude", rfidTag: "RFID-100294", status: "Checked In" },
    { id: 3, time: "07:38 AM", pupilName: "Sophia Garcia", yearSection: "Nursery - St. Therese", rfidTag: "RFID-100295", status: "Checked In" },
    { id: 4, time: "07:30 AM", pupilName: "Liam Reyes", yearSection: "Grade 1 - St. Joseph", rfidTag: "RFID-100296", status: "Checked In" },
    { id: 5, time: "07:22 AM", pupilName: "Noah Villanueva", yearSection: "Grade 2 - St. Paul", rfidTag: "RFID-100297", status: "Checked In" },
  ])

  const [pickupLogsList, setPickupLogsList] = useState<PickupLogItem[]>([
    { id: 1, time: "11:45 AM", pupilName: "Noah Villanueva", guardianName: "Robert Villanueva", relation: "Father", status: "Picked Up" },
    { id: 2, time: "11:35 AM", pupilName: "Maria Santos", guardianName: "Ana Santos", relation: "Mother", status: "Picked Up" },
    { id: 3, time: "11:20 AM", pupilName: "Sophia Garcia", guardianName: "Elena Garcia", relation: "Mother", status: "Picked Up" },
    { id: 4, time: "11:10 AM", pupilName: "Liam Reyes", guardianName: "Carlos Reyes", relation: "Father", status: "Picked Up" },
    { id: 5, time: "11:00 AM", pupilName: "Juan Dela Cruz", guardianName: "Maria Dela Cruz", relation: "Mother", status: "Picked Up" },
  ])

  const [arrivalPage, setArrivalPage] = useState<number>(1)
  const [pickupPage, setPickupPage] = useState<number>(1)

  const getTimeBasedInfo = () => {
    const hour = new Date().getHours()
    const isDaytime = hour >= 6 && hour < 18
    let greeting = "Good Evening"
    if (hour < 12) greeting = "Good Morning"
    else if (hour < 18) greeting = "Good Afternoon"
    return { greeting, isDaytime }
  }

  const currentFormattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  })

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // 1. Fetch Students & Guardians count
        const students = await ApiHandler.get<any[]>("/students")
        if (Array.isArray(students) && students.length > 0) {
          setPupilsCount(students.length)
          const guardianIds = new Set()
          students.forEach(s => {
            if (Array.isArray(s.guardians)) {
              s.guardians.forEach((g: any) => {
                if (g.id) guardianIds.add(g.id)
                else if (g.name) guardianIds.add(g.name)
              })
            }
          })
          const totalG = guardianIds.size > 0 ? guardianIds.size : students.reduce((acc, s) => acc + (s.guardians?.length || 0), 0)
          if (totalG > 0) setGuardiansCount(totalG)
        }

        // 2. Fetch Teachers count
        try {
          const teachers = await ApiHandler.get<any[]>("/teachers")
          if (Array.isArray(teachers) && teachers.length > 0) {
            setTeachersCount(teachers.length)
          }
        } catch {}

        // 3. Fetch Sections & Year Levels count
        try {
          const sections = await ApiHandler.get<any[]>("/sections")
          if (Array.isArray(sections) && sections.length > 0) {
            setSectionsCount(sections.length)
            const yearLevels = new Set(sections.map((sec: any) => sec.year_level).filter(Boolean))
            if (yearLevels.size > 0) setYearLevelsCount(yearLevels.size)
          }
        } catch {}

        // 4. Fetch Live Attendance & Pickup Logs
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
          // Sort descending by time
          const sortedAttendances = [...attendances].sort((a, b) => {
            const timeA = a.time_out || a.time_in || ""
            const timeB = b.time_out || b.time_in || ""
            return timeB.localeCompare(timeA)
          })

          // Recent RFID Arrival Activity
          const liveArrivals: ArrivalActivityItem[] = []
          // Recent Pick Up Logs
          const livePickups: PickupLogItem[] = []

          sortedAttendances.forEach((att, idx) => {
            const studentName = att.student?.name || att.student_name || "Pupil"
            const sectionStr = att.student?.section 
              ? `${att.student.section.year_level || ""} - ${att.student.section.section_name || ""}`
              : (att.student?.grade || "Kindergarten")
            const rfidStr = att.student?.rfid ? `RFID-${att.student.rfid}` : "Gate Scanner"

            if (att.time_in) {
              liveArrivals.push({
                id: `arr-${att.id || idx}`,
                time: att.time_in,
                pupilName: studentName,
                yearSection: sectionStr,
                rfidTag: rfidStr,
                status: "Checked In"
              })
            }

            if (att.time_out || att.status === "Checked Out" || att.status === "Picked Up") {
              const guardians = att.student?.guardians || []
              const guardianName = att.verified_by || (guardians.length > 0 ? guardians[0].name : "Authorized Guardian")
              const relation = guardians.length > 0 ? (guardians[0].relation || "Guardian") : "Authorized Pickup"

              livePickups.push({
                id: `pickup-${att.id || idx}`,
                time: att.time_out || att.time_in || "--:--",
                pupilName: studentName,
                guardianName: guardianName,
                relation: relation,
                status: "Picked Up"
              })
            }
          })

          if (liveArrivals.length > 0) setArrivalActivity(liveArrivals)
          if (livePickups.length > 0) setPickupLogsList(livePickups)
        }
      } catch (err) {
        console.error("Failed to load dashboard live metrics:", err)
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
      linkUrl: "/app/pupils",
      icon: Users
    },
    {
      label: "TOTAL GUARDIANS",
      value: guardiansCount,
      badgeColor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      linkText: "View Guardians →",
      linkUrl: "/app/pupils",
      icon: UserCheck
    },
    {
      label: "TOTAL TEACHER",
      value: teachersCount,
      badgeColor: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
      linkText: "View Teachers →",
      linkUrl: "/app/registration",
      icon: GraduationCap
    },
    {
      label: "YEAR LEVEL",
      value: yearLevelsCount,
      badgeColor: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      linkText: "View Levels →",
      linkUrl: "/app/registration",
      icon: Layers
    },
    {
      label: "SECTIONS",
      value: sectionsCount,
      badgeColor: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
      linkText: "View Sections →",
      linkUrl: "/app/registration",
      icon: Building2
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in font-sans text-neutral">
      
      {/* 1. Reference Welcome Banner Header */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative overflow-hidden">
        <div className="space-y-2.5 z-10 max-w-3xl">
          {/* Top Portal Pill Badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50/90 border border-blue-200/80 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              ADMIN PORTAL • FILAMER CHRISTIAN UNIVERSITY
            </span>
          </div>

          {/* Main Greeting Title with Daytime/Evening Sun or Moon Icon */}
          <div className="flex items-center gap-3">
            {getTimeBasedInfo().isDaytime ? (
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 shadow-xs shrink-0">
                <Sun className="h-5 w-5 sm:h-6 sm:w-6 fill-amber-400 text-amber-500" />
              </div>
            ) : (
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-500/30 shadow-xs shrink-0">
                <Moon className="h-5 w-5 sm:h-6 sm:w-6 fill-indigo-400 text-indigo-500 dark:text-indigo-400" />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral flex items-center gap-2">
              {getTimeBasedInfo().greeting}, Administrator <span className="inline-block">👋</span>
            </h1>
          </div>

          {/* Subtitle Description */}
          <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
            Monitoring safety, campus movement, and real-time attendance for Filamer Christian University.
          </p>
        </div>

        {/* Right Action & Info Badges */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-tertiary/40 border border-border/80 px-4 py-2 text-xs font-bold text-neutral">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {currentFormattedDate}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-2 text-xs font-extrabold text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            RFID Gate Sync Active
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Row (5 Columns) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <span className={`p-2 rounded-xl text-xs font-extrabold ${stat.badgeColor}`}>
                  <Icon className="h-4 w-4" />
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
          )
        })}
      </div>

      {/* 3. Dual Live Activity Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* TABLE 1: Recent RFID Arrival Activity */}
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header Bar */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-neutral">Recent RFID Arrival Activity</h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Live RFID school gate check-ins</p>
                </div>
              </div>
              <Link 
                to="/app/attendance" 
                className="text-xs font-bold text-primary hover:underline shrink-0"
              >
                View All
              </Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase bg-tertiary/20">
                    <th className="p-4 pl-6">Time</th>
                    <th className="p-4">Pupil Name</th>
                    <th className="p-4">Year & Section</th>
                    <th className="p-4 pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-semibold text-neutral">
                  {arrivalActivity.slice((arrivalPage - 1) * 5, arrivalPage * 5).map((evt) => (
                    <tr key={evt.id} className="hover:bg-tertiary/10 transition-colors">
                      <td className="p-4 pl-6 font-mono text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {evt.time}
                      </td>
                      <td className="p-4 font-bold text-primary">
                        {evt.pupilName}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {evt.yearSection}
                      </td>
                      <td className="p-4 pr-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer */}
          <div className="p-4 px-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-semibold bg-tertiary/10">
            <span>Showing {Math.min(5, arrivalActivity.length)} of {arrivalActivity.length} arrivals</span>
            
            <div className="flex items-center gap-1">
              <button 
                disabled={arrivalPage === 1}
                onClick={() => setArrivalPage(prev => Math.max(1, prev - 1))}
                className="p-1 rounded-lg border border-border bg-card text-muted-foreground hover:bg-tertiary cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="h-7 w-7 rounded-lg bg-primary text-white font-bold text-xs flex items-center justify-center border-none">
                {arrivalPage}
              </button>
              <button 
                disabled={arrivalPage * 5 >= arrivalActivity.length}
                onClick={() => setArrivalPage(prev => prev + 1)}
                className="p-1 rounded-lg border border-border bg-card text-muted-foreground hover:bg-tertiary cursor-pointer disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* TABLE 2: Recent Pick Up Logs */}
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header Bar */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-neutral">Recent Pick Up Logs</h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Dismissal checkout & guardian pickup records</p>
                </div>
              </div>
              <Link 
                to="/app/pickup_logs" 
                className="text-xs font-bold text-primary hover:underline shrink-0"
              >
                View All
              </Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase bg-tertiary/20">
                    <th className="p-4 pl-6">Time</th>
                    <th className="p-4">Pupil Name</th>
                    <th className="p-4">Authorized Guardian</th>
                    <th className="p-4 pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-semibold text-neutral">
                  {pickupLogsList.slice((pickupPage - 1) * 5, pickupPage * 5).map((log) => (
                    <tr key={log.id} className="hover:bg-tertiary/10 transition-colors">
                      <td className="p-4 pl-6 font-mono text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {log.time}
                      </td>
                      <td className="p-4 font-bold text-primary">
                        {log.pupilName}
                      </td>
                      <td className="p-4 text-neutral">
                        <div className="font-bold">{log.guardianName}</div>
                        <span className="text-[10px] text-muted-foreground font-semibold block">{log.relation}</span>
                      </td>
                      <td className="p-4 pr-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-950/30 dark:border-purple-900/40 dark:text-purple-400">
                          <ShieldCheck className="h-3 w-3" />
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer */}
          <div className="p-4 px-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-semibold bg-tertiary/10">
            <span>Showing {Math.min(5, pickupLogsList.length)} of {pickupLogsList.length} pickups</span>
            
            <div className="flex items-center gap-1">
              <button 
                disabled={pickupPage === 1}
                onClick={() => setPickupPage(prev => Math.max(1, prev - 1))}
                className="p-1 rounded-lg border border-border bg-card text-muted-foreground hover:bg-tertiary cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="h-7 w-7 rounded-lg bg-primary text-white font-bold text-xs flex items-center justify-center border-none">
                {pickupPage}
              </button>
              <button 
                disabled={pickupPage * 5 >= pickupLogsList.length}
                onClick={() => setPickupPage(prev => prev + 1)}
                className="p-1 rounded-lg border border-border bg-card text-muted-foreground hover:bg-tertiary cursor-pointer disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
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

  if (role === "teacher") {
    return <TeacherDashboard />
  }

  return <AdminDashboard />
}

export default Dashboard

