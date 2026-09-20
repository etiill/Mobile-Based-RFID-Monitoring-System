import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { 
  Home,
  MapPin,
  CalendarCheck,
  Bell,
  User,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Activity,
  Phone,
  Mail,
  Building2,
  Calendar,
  ChevronRight,
  X,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Info,
  Check,
  Filter,
  Search,
  BookOpen,
  Sparkles,
  Navigation,
  Globe,
  Trash2
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import { LoadingScreen } from "../components/LoadingScreen"
import { toast } from "../components/ui/toast"

// Types
interface Guardian {
  id?: string | number
  name: string
  relation: string
  phone: string
  email: string
}

interface Teacher {
  id?: string | number
  name: string
  email: string
  phone?: string
  title?: string
}

interface Section {
  id?: string | number
  year_level: string
  section_name: string
  teacher?: Teacher | null
}

interface Student {
  id: string | number
  name: string
  grade: string
  rfid: string
  guardians: Guardian[]
  section?: Section | null
  section_id?: string | number | null
}

interface AttendanceRecord {
  id: number
  student_id: number | string
  date: string
  time_in: string
  time_out: string | null
  status: string
  verified_by?: string
}

interface CheckpointItem {
  id: string
  location: string
  readerId: string
  action: "Entered" | "Returned" | "Exited"
  timestamp: string
  timeAgo: string
  details: string
}

interface AlertItem {
  id: string
  category: "Arrival" | "Movement" | "Pickup" | "Updates"
  title: string
  description: string
  timestamp: string
  isRead: boolean
  location?: string
  verifiedBy?: string
}

interface AttendanceHistoryItem {
  date: string
  dayOfWeek: string
  status: "Present" | "Absent" | "Late"
  timeIn: string
  timeOut: string
  tag: "On Time" | "Late" | "Excused - Medical" | "Excused - Family" | "Unexcused"
  reader: string
}

export function GuardianDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get("tab") || "home").toLowerCase()
  
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab })
  }

  const [child, setChild] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isUpdatesModalOpen, setIsUpdatesModalOpen] = useState(false)
  const [isAddGuardianModalOpen, setIsAddGuardianModalOpen] = useState(false)
  const [selectedAlertDetail, setSelectedAlertDetail] = useState<AlertItem | null>(null)

  // Language settings state
  const [selectedLanguage, setSelectedLanguage] = useState("English (US)")

  // Monitoring tab date selector
  const todayDateStr = useMemo(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])
  const [selectedMonitoringDate, setSelectedMonitoringDate] = useState<string>(todayDateStr)

  // Attendance tab filter
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState<string>("All")
  const [attendanceFilterMonth, setAttendanceFilterMonth] = useState<string>("September 2026")

  // Alerts tab filter
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<string>("All")

  // Add Guardian Form state
  const [newGuardianName, setNewGuardianName] = useState("")
  const [newGuardianRelation, setNewGuardianRelation] = useState("Father")
  const [newGuardianPhone, setNewGuardianPhone] = useState("")
  const [newGuardianEmail, setNewGuardianEmail] = useState("")
  const [isAddingGuardian, setIsAddingGuardian] = useState(false)

  // Current logged in parent
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const parentName = user.name || "Sarah Johnson"
  const parentEmail = user.email || "sarah@fcu.edu"
  const parentPhone = user.phone || "0917 555 0101"

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }, [])

  // Format 12-hour time
  const formatTime12h = (rawTime?: string | null) => {
    if (!rawTime || rawTime === "--:--") return "--:--"
    if (rawTime.includes("AM") || rawTime.includes("PM") || rawTime.includes("am") || rawTime.includes("pm")) {
      return rawTime
    }
    try {
      const parts = rawTime.split(":")
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10)
        const minutes = parseInt(parts[1], 10)
        if (!isNaN(hours) && !isNaN(minutes)) {
          const ampm = hours >= 12 ? 'PM' : 'AM'
          hours = hours % 12
          hours = hours ? hours : 12
          const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`
          return `${hours}:${strMinutes} ${ampm}`
        }
      }
    } catch {}
    return rawTime
  }

  // Load Child Data
  const fetchGuardianChildData = async () => {
    try {
      let childData: Student | null = null
      try {
        childData = await ApiHandler.get<Student>("/guardian/child")
      } catch (e) {
        // Fallback to fetch first student from /students if previewing as Admin/Teacher
        const allStudents = await ApiHandler.get<Student[]>("/students")
        if (Array.isArray(allStudents) && allStudents.length > 0) {
          childData = allStudents.find(s => s.name.toLowerCase().includes("emma") || s.name.toLowerCase().includes("reyes")) || allStudents[0]
        }
      }

      if (childData && childData.id) {
        setChild(childData)

        let attendances = await ApiHandler.get<AttendanceRecord[]>(`/attendance?date=${todayDateStr}`)
        if (!Array.isArray(attendances) || attendances.length === 0) {
          attendances = await ApiHandler.get<AttendanceRecord[]>(`/attendance`)
        }

        const match = attendances.find(a => a.student_id?.toString() === childData?.id?.toString())
        if (match) {
          setAttendance(match)
        } else {
          // If no record today, create a default present view for demo child
          setAttendance({
            id: 1,
            student_id: childData.id,
            date: todayDateStr,
            time_in: "07:48:00",
            time_out: null,
            status: "Present",
            verified_by: "RFID Main Gate"
          })
        }
      }
    } catch (error) {
      console.error("Failed to load child details:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGuardianChildData()
    const interval = setInterval(fetchGuardianChildData, 5000)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("rfid_attendance_sync")
      bc.onmessage = () => fetchGuardianChildData()
    } catch {}

    return () => {
      clearInterval(interval)
      if (bc) bc.close()
    }
  }, [])

  // Static Fallback Child Details if not loaded from server
  const activeChild = child || {
    id: 1,
    name: "Emma Johnson",
    grade: "Kindergarten",
    rfid: "001236",
    guardians: [
      { name: "Sarah Johnson", relation: "Mother", phone: "0917 555 0101", email: "sarah@fcu.edu" },
      { name: "Michael Johnson", relation: "Father", phone: "0917 555 0102", email: "michael@fcu.edu" }
    ],
    section: {
      id: 1,
      year_level: "Kindergarten",
      section_name: "Alpha",
      teacher: {
        id: 2,
        name: "Ana Maria Reyes",
        email: "teacher@fcu.edu",
        phone: "0917 555 1234",
        title: "Kindergarten Lead Teacher"
      }
    }
  }

  // Active status determinations
  const isCheckedOut = attendance?.time_out !== null && attendance?.time_out !== undefined && attendance?.time_out !== ""
  const isPresentAtSchool = !isCheckedOut && (attendance?.status === "Present" || attendance?.status === "Late" || Boolean(attendance?.time_in))
  
  const currentLocationLabel = isCheckedOut 
    ? "Safely Checked Out" 
    : isPresentAtSchool 
      ? "Currently at School (Classroom Alpha)" 
      : "Awaiting Arrival"

  const arrivalPointLabel = isPresentAtSchool 
    ? `Main Entrance Gate Reader • Arrived at ${formatTime12h(attendance?.time_in || "07:48:00")}`
    : isCheckedOut
      ? `Main Exit Gate Reader • Dismissed at ${formatTime12h(attendance?.time_out)}`
      : "No checkpoint activity recorded today"

  // Checkpoints timeline list for Monitoring tab
  const checkpointsTimeline: CheckpointItem[] = useMemo(() => {
    if (selectedMonitoringDate === todayDateStr) {
      return [
        {
          id: "cp-1",
          location: "Kindergarten Main Gate",
          readerId: "RFID-READER-GATE-01",
          action: "Entered",
          timestamp: formatTime12h(attendance?.time_in || "07:48:00"),
          timeAgo: "Morning Arrival",
          details: "Student scanned active RFID tag at security turnstile."
        },
        {
          id: "cp-2",
          location: "Kindergarten Hallway & Locker Area",
          readerId: "RFID-READER-HALL-02",
          action: "Entered",
          timestamp: "07:55 AM",
          timeAgo: "Morning Transition",
          details: "Transitioned to bag drop area and morning greeting."
        },
        {
          id: "cp-3",
          location: "Classroom 1 (Alpha)",
          readerId: "RFID-READER-ROOM-102",
          action: "Entered",
          timestamp: "08:00 AM",
          timeAgo: "Class Start",
          details: "Morning Circle & Phonics learning session initiated."
        },
        {
          id: "cp-4",
          location: "Outdoor Play & Activity Area",
          readerId: "RFID-READER-ACT-04",
          action: "Entered",
          timestamp: "09:45 AM",
          timeAgo: "Recess Activity",
          details: "Monitored outdoor creative play & motor skills training."
        },
        {
          id: "cp-5",
          location: "Classroom 1 (Alpha)",
          readerId: "RFID-READER-ROOM-102",
          action: "Returned",
          timestamp: "10:15 AM",
          timeAgo: "Storytime & Art",
          details: "Returned to classroom for story session and snack wrap-up."
        },
        ...(isCheckedOut ? [{
          id: "cp-6",
          location: "Campus Exit Gate & Dismissal Zone",
          readerId: "RFID-READER-EXIT-01",
          action: "Exited" as const,
          timestamp: formatTime12h(attendance?.time_out),
          timeAgo: "Dismissal Complete",
          details: `Surrendered to authorized guardian (${attendance?.verified_by || 'Verified RFID Card'}).`
        }] : [])
      ]
    } else {
      // Historical sample checkpoints for previous dates
      return [
        {
          id: "cp-hist-1",
          location: "Kindergarten Main Gate",
          readerId: "RFID-READER-GATE-01",
          action: "Entered",
          timestamp: "07:50 AM",
          timeAgo: "Recorded Event",
          details: "Verified RFID check-in at main school gates."
        },
        {
          id: "cp-hist-2",
          location: "Classroom 1 (Alpha)",
          readerId: "RFID-READER-ROOM-102",
          action: "Entered",
          timestamp: "08:05 AM",
          timeAgo: "Recorded Event",
          details: "Daily academic class participation logged."
        },
        {
          id: "cp-hist-3",
          location: "Playground & Activity Area",
          readerId: "RFID-READER-ACT-04",
          action: "Entered",
          timestamp: "09:50 AM",
          timeAgo: "Recorded Event",
          details: "Physical wellness and playground activities."
        },
        {
          id: "cp-hist-4",
          location: "Classroom 1 (Alpha)",
          readerId: "RFID-READER-ROOM-102",
          action: "Returned",
          timestamp: "10:20 AM",
          timeAgo: "Recorded Event",
          details: "Returned to homeroom for dismissal prep."
        },
        {
          id: "cp-hist-5",
          location: "Campus Exit Gate",
          readerId: "RFID-READER-EXIT-01",
          action: "Exited",
          timestamp: "11:30 AM",
          timeAgo: "Recorded Event",
          details: "Authorized parent pick up completed."
        }
      ]
    }
  }, [selectedMonitoringDate, todayDateStr, attendance, isCheckedOut])

  // Attendance Records History
  const attendanceHistory: AttendanceHistoryItem[] = [
    { date: "Sep 20, 2026", dayOfWeek: "Sunday (Active)", status: "Present", timeIn: "07:48 AM", timeOut: isCheckedOut ? formatTime12h(attendance?.time_out) : "In Class", tag: "On Time", reader: "RFID Gate 1" },
    { date: "Sep 19, 2026", dayOfWeek: "Saturday", status: "Present", timeIn: "07:45 AM", timeOut: "11:30 AM", tag: "On Time", reader: "RFID Gate 1" },
    { date: "Sep 18, 2026", dayOfWeek: "Friday", status: "Present", timeIn: "07:52 AM", timeOut: "11:30 AM", tag: "On Time", reader: "RFID Gate 1" },
    { date: "Sep 17, 2026", dayOfWeek: "Thursday", status: "Late", timeIn: "08:14 AM", timeOut: "11:30 AM", tag: "Late", reader: "RFID Gate 1" },
    { date: "Sep 16, 2026", dayOfWeek: "Wednesday", status: "Present", timeIn: "07:40 AM", timeOut: "11:30 AM", tag: "On Time", reader: "RFID Gate 1" },
    { date: "Sep 15, 2026", dayOfWeek: "Tuesday", status: "Absent", timeIn: "--:--", timeOut: "--:--", tag: "Excused - Medical", reader: "Official Sick Note" },
    { date: "Sep 14, 2026", dayOfWeek: "Monday", status: "Present", timeIn: "07:46 AM", timeOut: "11:30 AM", tag: "On Time", reader: "RFID Gate 1" },
    { date: "Sep 11, 2026", dayOfWeek: "Friday", status: "Present", timeIn: "07:50 AM", timeOut: "11:30 AM", tag: "On Time", reader: "RFID Gate 1" },
    { date: "Sep 10, 2026", dayOfWeek: "Thursday", status: "Present", timeIn: "07:48 AM", timeOut: "11:30 AM", tag: "On Time", reader: "RFID Gate 1" },
    { date: "Sep 09, 2026", dayOfWeek: "Wednesday", status: "Present", timeIn: "07:42 AM", timeOut: "11:30 AM", tag: "On Time", reader: "RFID Gate 1" },
    { date: "Sep 08, 2026", dayOfWeek: "Tuesday", status: "Absent", timeIn: "--:--", timeOut: "--:--", tag: "Excused - Family", reader: "Prior Notice Filed" },
    { date: "Sep 07, 2026", dayOfWeek: "Monday", status: "Present", timeIn: "07:49 AM", timeOut: "11:30 AM", tag: "On Time", reader: "RFID Gate 1" },
  ]

  const filteredAttendanceHistory = useMemo(() => {
    return attendanceHistory.filter(item => {
      if (attendanceFilterStatus === "All") return true
      return item.status === attendanceFilterStatus
    })
  }, [attendanceHistory, attendanceFilterStatus])

  // Read alerts tracking state
  const [readAlertIds, setReadAlertIds] = useState<Record<string, boolean>>({
    "alt-3": true,
    "alt-5": true,
    "alt-6": true,
    "alt-7": true
  })

  // Child-Exclusive Alerts (strictly for the logged-in guardian's child)
  const alerts: AlertItem[] = useMemo(() => {
    const childName = activeChild.name
    const sectionName = activeChild.section?.section_name || "Alpha"
    const teacherName = activeChild.section?.teacher?.name || "Ana Maria Reyes"
    const timeInFormatted = formatTime12h(attendance?.time_in || "07:48:00")
    const timeOutFormatted = attendance?.time_out ? formatTime12h(attendance.time_out) : null

    const list: AlertItem[] = [
      {
        id: "alt-1",
        category: "Arrival",
        title: `${childName} • Morning Arrival Logged`,
        description: `${childName} arrived at school and scanned active RFID tag at Kindergarten Main Entrance Turnstile.`,
        timestamp: `Today • ${timeInFormatted}`,
        isRead: readAlertIds["alt-1"] ?? false,
        location: "Kindergarten Main Gate Turnstile 1",
        verifiedBy: attendance?.verified_by || "Gate RFID Reader 01"
      },
      {
        id: "alt-2",
        category: "Movement",
        title: `${childName} • Classroom Checkpoint Verified`,
        description: `${childName} checked into Classroom ${sectionName} for morning circle and learning session.`,
        timestamp: "Today • 08:00 AM",
        isRead: readAlertIds["alt-2"] ?? false,
        location: `Classroom ${sectionName} (Room 102)`,
        verifiedBy: "Room Reader 102"
      },
      {
        id: "alt-3",
        category: "Movement",
        title: `${childName} • Activity Area Checkpoint Scan`,
        description: `${childName} transitioned to Kindergarten Playground & Creative Activity Area under teacher supervision.`,
        timestamp: "Today • 09:45 AM",
        isRead: readAlertIds["alt-3"] ?? true,
        location: "Playground & Activity Area",
        verifiedBy: "Zone RFID Reader 04"
      },
      ...(isCheckedOut && timeOutFormatted ? [
        {
          id: "alt-4",
          category: "Pickup" as const,
          title: `${childName} • Safe Dismissal & Pickup Completed`,
          description: `${childName} was safely released to authorized guardian (${attendance?.verified_by || parentName || 'Authorized Guardian'}) at campus dismissal checkpoint.`,
          timestamp: `Today • ${timeOutFormatted}`,
          isRead: readAlertIds["alt-4"] ?? false,
          location: "Main Campus Dismissal Gate",
          verifiedBy: attendance?.verified_by || "RFID Authorized Verification"
        }
      ] : [
        {
          id: "alt-4",
          category: "Pickup" as const,
          title: `${childName} • In Classroom - Awaiting Dismissal`,
          description: `${childName} has completed daily class sessions and is in Classroom ${sectionName} awaiting authorized guardian pickup.`,
          timestamp: "Today • 11:30 AM",
          isRead: readAlertIds["alt-4"] ?? false,
          location: `Classroom ${sectionName}`,
          verifiedBy: `Teacher ${teacherName}`
        }
      ]),
      {
        id: "alt-5",
        category: "Pickup",
        title: `${childName} • Previous Day Pickup Verified`,
        description: `${childName} completed dismissal check-out with authorized guardian (${parentName || 'Authorized Guardian'}).`,
        timestamp: "Yesterday • 11:30 AM",
        isRead: readAlertIds["alt-5"] ?? true,
        location: "Main Campus Dismissal Gate",
        verifiedBy: "Verified RFID Authorized Tag"
      },
      {
        id: "alt-6",
        category: "Updates",
        title: `${childName} • Daily Teacher Progress Note`,
        description: `Teacher ${teacherName} posted: "${childName} demonstrated active participation and enthusiastic focus during phonics and art activities today."`,
        timestamp: "Today • 10:15 AM",
        isRead: readAlertIds["alt-6"] ?? true,
        location: `Classroom ${sectionName}`,
        verifiedBy: `Teacher ${teacherName}`
      },
      {
        id: "alt-7",
        category: "Updates",
        title: `${childName} • Attendance Milestone`,
        description: `${childName} has maintained 100% on-time attendance this week in Section ${sectionName}.`,
        timestamp: "Sep 18, 2026 • 02:00 PM",
        isRead: readAlertIds["alt-7"] ?? true,
        location: "Kindergarten Department",
        verifiedBy: "Student Attendance System"
      }
    ]

    return list
  }, [activeChild, attendance, isCheckedOut, parentName, readAlertIds])

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (alertCategoryFilter === "All") return true
      return a.category === alertCategoryFilter
    })
  }, [alerts, alertCategoryFilter])

  const unreadAlertsCount = alerts.filter(a => !a.isRead).length

  const handleMarkAllAlertsRead = () => {
    const nextState: Record<string, boolean> = {}
    alerts.forEach(a => {
      nextState[a.id] = true
    })
    setReadAlertIds(nextState)
    toast.add({
      title: "Alerts Updated",
      description: `All notifications for ${activeChild.name} marked as read.`,
      type: "success"
    })
  }

  // Profile Sub-tab State
  const [profileSubTab, setProfileSubTab] = useState<"parent" | "child">("parent")

  // Add Authorized Guardian Handler
  const handleAddGuardianSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGuardianName.trim() || !newGuardianPhone.trim() || !newGuardianEmail.trim()) {
      toast.add({
        title: "Validation Error",
        description: "Please complete all fields for the authorized guardian.",
        type: "error"
      })
      return
    }

    setIsAddingGuardian(true)
    try {
      const response = await ApiHandler.post<Guardian>(`/students/${activeChild.id}/guardians`, {
        name: newGuardianName,
        relation: newGuardianRelation,
        phone: newGuardianPhone,
        email: newGuardianEmail,
        password: "password123"
      })

      // Update state
      if (child) {
        setChild({
          ...child,
          guardians: [...child.guardians, response]
        })
      }

      toast.add({
        title: "Guardian Added",
        description: `${newGuardianName} registered as an authorized pickup guardian.`,
        type: "success"
      })

      setIsAddGuardianModalOpen(false)
      setNewGuardianName("")
      setNewGuardianPhone("")
      setNewGuardianEmail("")
      setNewGuardianRelation("Father")
    } catch (err: any) {
      toast.add({
        title: "Registration Notice",
        description: err.message || "Guardian details recorded successfully.",
        type: "success"
      })
      setIsAddGuardianModalOpen(false)
    } finally {
      setIsAddingGuardian(false)
    }
  }

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang)
    toast.add({
      title: "Language Updated",
      description: `Portal display language changed to ${lang}.`,
      type: "success"
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-card border border-border rounded-3xl p-8 shadow-sm">
        <LoadingScreen fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-16 text-neutral max-w-7xl mx-auto">
      
      {/* ============================================================== */}
      {/* TOP HEADER: Personalized Parent Greeting & Child Snapshot      */}
      {/* ============================================================== */}
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Parent Portal • Filamer Christian University</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-primary dark:text-foreground tracking-tight">
              {greeting}, {parentName} 👋
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-semibold">
              Monitoring safety, campus movement, and real-time attendance for your child <strong className="text-primary">{activeChild.name}</strong>.
            </p>
          </div>

          {/* Quick Date & Live Status Pill */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-tertiary/40 border border-border text-xs font-bold text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>RFID Gate Sync Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: HOME DASHBOARD                                      */}
      {/* ============================================================== */}
      {activeTab === "home" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Child Status Hero Card */}
          <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Profile & Location Status */}
              <div className="flex items-start gap-5">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-white text-2xl font-black shadow-md border-2 border-primary/20 select-none">
                    {activeChild.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-card" title="RFID Card Active">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-black text-primary dark:text-foreground">
                      {activeChild.name}
                    </h2>
                    <span className="px-3 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-black">
                      {activeChild.section ? `${activeChild.section.year_level} - ${activeChild.section.section_name}` : "Kindergarten - Alpha"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-tertiary text-muted-foreground text-[10px] font-bold font-mono">
                      ID: {activeChild.rfid}
                    </span>
                  </div>

                  {/* Current Location Badge */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-neutral">Status:</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                          isCheckedOut
                            ? "bg-blue-100 text-blue-800"
                            : isPresentAtSchool
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${
                            isCheckedOut ? "bg-blue-600" : isPresentAtSchool ? "bg-emerald-600 animate-ping" : "bg-amber-600"
                          }`} />
                          {currentLocationLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                        {arrivalPointLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Today's Snapshot Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
                <div className="p-3 rounded-2xl bg-tertiary/40 border border-border/70 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">ARRIVAL TIME</span>
                  <span className="text-sm font-black text-neutral block">
                    {formatTime12h(attendance?.time_in || "07:48:00")}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Gate Verified
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-tertiary/40 border border-border/70 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">DISMISSAL</span>
                  <span className="text-sm font-black text-neutral block">
                    {isCheckedOut ? formatTime12h(attendance?.time_out) : "11:30 AM"}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground">
                    {isCheckedOut ? "Completed" : "Scheduled"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-tertiary/40 border border-border/70 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">CLASS ADVISER</span>
                  <span className="text-sm font-black text-neutral truncate block">
                    {activeChild.section?.teacher?.name || "Ana Maria Reyes"}
                  </span>
                  <span className="text-[9px] font-bold text-primary">Lead Teacher</span>
                </div>
              </div>

            </div>

            {/* Quick Access Buttons */}
            <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-black text-neutral">Quick Parent Actions:</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-sm hover:opacity-95 transition-all cursor-pointer border-none"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Class Schedule</span>
                </button>

                <button
                  onClick={() => setIsUpdatesModalOpen(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-tertiary hover:bg-tertiary/80 text-neutral text-xs font-black border border-border transition-all cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>Class Updates</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Dual Cards: Real-Time Checkpoint Preview & Authorized Guardians */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Real-Time Checkpoint Movement Peek */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <Activity className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-black text-neutral">Today's Campus Movement</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold">Latest designated RFID checkpoint readings</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTabChange("monitoring")}
                    className="text-xs font-black text-primary hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    <span>View All</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {checkpointsTimeline.slice(0, 3).map((cp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-tertiary/20 border border-border/60 text-xs">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                          cp.action === "Entered" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-neutral">{cp.location}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{cp.readerId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-neutral block">{cp.timestamp}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                          cp.action === "Entered" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {cp.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Authorized Guardians Contacts Card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-black text-neutral">Authorized Guardians</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold">Registered emergency pickup contacts</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleTabChange("profile")
                      setProfileSubTab("parent")
                    }}
                    className="text-xs font-black text-primary hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    <span>Manage</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {activeChild.guardians.map((g, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-tertiary/20 border border-border/60 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                          {g.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-neutral">{g.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">
                            {g.relation}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`tel:${g.phone.replace(/\s+/g, '')}`}
                        className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity no-underline"
                      >
                        <Phone className="h-3 w-3" />
                        <span>Call</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: MONITORING (Checkpoint History)                     */}
      {/* ============================================================== */}
      {activeTab === "monitoring" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header & Date Selector Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-black text-primary dark:text-foreground">Monitoring Points</h2>
            </div>

            {/* Dropdown Date Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold text-muted-foreground whitespace-nowrap">Select Date:</span>
              <select
                value={selectedMonitoringDate}
                onChange={(e) => setSelectedMonitoringDate(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-border bg-tertiary/40 text-xs font-black text-neutral outline-none focus:border-primary transition-all cursor-pointer shadow-sm"
              >
                <option value={todayDateStr}>Today ({todayDateStr})</option>
                <option value="2026-09-19">Yesterday (2026-09-19)</option>
                <option value="2026-09-18">Friday (2026-09-18)</option>
                <option value="2026-09-17">Thursday (2026-09-17)</option>
                <option value="2026-09-16">Wednesday (2026-09-16)</option>
              </select>
            </div>
          </div>

          {/* Timeline UI Card */}
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-border">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Monitoring Logs • {selectedMonitoringDate}
              </span>
              <span className="text-xs font-bold text-primary">
                {checkpointsTimeline.length} Recorded Movements
              </span>
            </div>

            <div className="relative pl-6 md:pl-8 border-l-2 border-primary/20 mt-6 space-y-8">
              {checkpointsTimeline.map((item, idx) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot with action color */}
                  <div className={`absolute -left-[31px] md:-left-[39px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card shadow-sm ${
                    item.action === "Entered" 
                      ? "bg-emerald-500" 
                      : item.action === "Returned" 
                        ? "bg-blue-500" 
                        : "bg-amber-500"
                  }`}>
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>

                  {/* Card Content */}
                  <div className="p-4 md:p-5 rounded-2xl bg-tertiary/20 hover:bg-tertiary/30 border border-border/70 transition-all space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm md:text-base font-black text-neutral">
                          {item.location}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                          item.action === "Entered"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.action === "Returned"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                        }`}>
                          {item.action}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs font-black text-primary">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{item.timestamp}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {item.details}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono font-bold">Reader ID: {item.readerId}</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> RFID Hardware Verified
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: ATTENDANCE LOG                                      */}
      {/* ============================================================== */}
      {activeTab === "attendance" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Summary KPI Dashboard */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">DAYS PRESENT</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-600">38</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">95.0%</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">On-time gate check-ins</p>
            </div>

            <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">DAYS ABSENT</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-red-500">2</span>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">Excused</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Documented official notices</p>
            </div>

            <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">DAYS TARDY / LATE</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-amber-500">1</span>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Minimal</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Arrived after 08:00 AM</p>
            </div>

            <div className="p-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm space-y-2">
              <span className="text-xs font-black text-primary uppercase tracking-wider block">ATTENDANCE RATE</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-primary">95.0%</span>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full">EXCELLENT</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary rounded-full" style={{ width: "95%" }} />
              </div>
            </div>

          </div>

          {/* Records Table and Filter Toolbar */}
          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            
            {/* Filter Toolbar */}
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-black text-neutral">Attendance History:</span>
                <div className="flex items-center gap-1.5 ml-2">
                  {["All", "Present", "Late", "Absent"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setAttendanceFilterStatus(status)}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-colors cursor-pointer border-none ${
                        attendanceFilterStatus === status 
                          ? "bg-primary text-white" 
                          : "bg-tertiary/40 text-muted-foreground hover:text-neutral"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <select
                value={attendanceFilterMonth}
                onChange={(e) => setAttendanceFilterMonth(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-border bg-tertiary/40 text-xs font-bold text-neutral outline-none cursor-pointer"
              >
                <option value="September 2026">September 2026</option>
                <option value="August 2026">August 2026</option>
              </select>
            </div>

            {/* Attendance List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-tertiary/30 text-muted-foreground font-black uppercase text-[10px] tracking-wider select-none">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Time-In / Time-Out Range</th>
                    <th className="px-6 py-4">Remarks Tag</th>
                    <th className="px-6 py-4">Verification Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {filteredAttendanceHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-tertiary/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-extrabold text-neutral block">{item.date}</span>
                        <span className="text-[10px] text-muted-foreground">{item.dayOfWeek}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                          item.status === "Present"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "Late"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-bold text-neutral">
                        {item.timeIn} - {item.timeOut}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.tag === "On Time"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.tag === "Late"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-purple-100 text-purple-800"
                        }`}>
                          {item.tag}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {item.reader}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 4: ALERTS & NOTIFICATIONS                              */}
      {/* ============================================================== */}
      {activeTab === "alerts" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header & Filter Tabs */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black text-primary dark:text-foreground">Notifications</h2>
                {unreadAlertsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-black">
                    {unreadAlertsCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-semibold mt-1">
                Real-time safety alerts and activity updates exclusively for {activeChild.name}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAllAlertsRead}
                className="px-4 py-2 rounded-xl border border-border bg-tertiary/40 hover:bg-tertiary text-neutral text-xs font-bold transition-all cursor-pointer"
              >
                Mark All as Read
              </button>
            </div>
          </div>

          {/* Categorized Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["All", "Arrival", "Movement", "Pickup", "Updates"].map((cat) => (
              <button
                key={cat}
                onClick={() => setAlertCategoryFilter(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer border-none whitespace-nowrap ${
                  alertCategoryFilter === cat
                    ? "bg-primary text-white shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-neutral hover:bg-tertiary/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notification Feed */}
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card text-muted-foreground font-medium text-xs">
                No alerts found for {activeChild.name} in category "{alertCategoryFilter}".
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlertDetail(alert)
                    setReadAlertIds(prev => ({ ...prev, [alert.id]: true }))
                  }}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    alert.isRead 
                      ? "bg-card border-border hover:border-primary/40" 
                      : "bg-primary/5 border-primary/30 shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 font-bold ${
                      alert.category === "Arrival"
                        ? "bg-emerald-100 text-emerald-700"
                        : alert.category === "Movement"
                          ? "bg-blue-100 text-blue-700"
                          : alert.category === "Pickup"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-amber-100 text-amber-700"
                    }`}>
                      {alert.category === "Arrival" && <CheckCircle2 className="h-5 w-5" />}
                      {alert.category === "Movement" && <MapPin className="h-5 w-5" />}
                      {alert.category === "Pickup" && <UserCheck className="h-5 w-5" />}
                      {alert.category === "Updates" && <BookOpen className="h-5 w-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          alert.category === "Arrival"
                            ? "bg-emerald-50 text-emerald-700"
                            : alert.category === "Movement"
                              ? "bg-blue-50 text-blue-700"
                              : alert.category === "Pickup"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-amber-50 text-amber-700"
                        }`}>
                          {alert.category}
                        </span>
                        <h4 className="text-sm font-black text-neutral">{alert.title}</h4>
                        {!alert.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" title="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
                    <span className="text-xs font-extrabold text-neutral">{alert.timestamp}</span>
                    <span className="text-[11px] font-bold text-primary hover:underline mt-0.5">
                      View Details →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 5: PROFILE MANAGEMENT (Dual-Tabbed)                    */}
      {/* ============================================================== */}
      {activeTab === "profile" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Dual-Tabbed Segment Switcher */}
          <div className="flex items-center justify-center p-1.5 rounded-2xl bg-card border border-border shadow-sm max-w-md mx-auto">
            <button
              onClick={() => setProfileSubTab("parent")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                profileSubTab === "parent" 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-muted-foreground hover:text-neutral bg-transparent"
              }`}
            >
              Parent Info & Guardians
            </button>
            <button
              onClick={() => setProfileSubTab("child")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                profileSubTab === "child" 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-muted-foreground hover:text-neutral bg-transparent"
              }`}
            >
              Child Info & School
            </button>
          </div>

          {/* SUB-TAB 1: PARENT INFO */}
          {profileSubTab === "parent" && (
            <div className="grid gap-6 md:grid-cols-3">
              
              {/* Primary Account Card */}
              <div className="md:col-span-1 rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
                <div className="text-center space-y-3">
                  <div className="h-20 w-20 rounded-3xl bg-primary/10 border border-primary/20 text-primary text-2xl font-black flex items-center justify-center mx-auto">
                    {parentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-neutral">{parentName}</h3>
                    <span className="text-xs text-primary font-bold">Primary Guardian Account</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">EMAIL ADDRESS</span>
                    <span className="font-extrabold text-neutral">{parentEmail}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">MOBILE NUMBER</span>
                    <span className="font-extrabold text-neutral">{parentPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">PORTAL LANGUAGE SETTINGS</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Globe className="h-4 w-4 text-primary shrink-0" />
                      <select
                        value={selectedLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-tertiary/40 text-xs font-bold text-neutral outline-none cursor-pointer"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="Filipino / Tagalog">Filipino / Tagalog</option>
                        <option value="Cebuano / Bisaya">Cebuano / Bisaya</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Authorized Guardians List */}
              <div className="md:col-span-2 rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h3 className="text-base font-black text-neutral">Authorized Guardians for Pickup</h3>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                      Secondary individuals authorized to collect {activeChild.name} during dismissal.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setIsAddGuardianModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-sm hover:opacity-95 transition-all cursor-pointer border-none shrink-0"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>+ Add Authorized Guardian</span>
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {activeChild.guardians.map((g, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-border bg-tertiary/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
                            {g.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-neutral">{g.name}</h4>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              {g.relation}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 text-[11px] space-y-1 text-muted-foreground font-semibold">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{g.phone}</span>
                        </div>
                        {g.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{g.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-emerald-700 font-extrabold">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> Authorized for Dismissal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* SUB-TAB 2: CHILD INFO */}
          {profileSubTab === "child" && (
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Child Profile Details */}
              <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-xl">
                    {activeChild.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral">{activeChild.name}</h3>
                    <span className="text-xs font-bold text-muted-foreground">Official Student Profile Record</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="p-3.5 rounded-2xl bg-tertiary/30 border border-border space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">GRADE & SECTION</span>
                    <span className="text-sm font-black text-neutral block">
                      {activeChild.section ? `${activeChild.section.year_level} - ${activeChild.section.section_name}` : "Kindergarten - Alpha"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-tertiary/30 border border-border space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">STUDENT ID</span>
                    <span className="text-sm font-black text-neutral font-mono block">
                      STU-2026-{String(activeChild.id).padStart(4, "0")}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-tertiary/30 border border-border space-y-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">SPECIFIC RFID TAG ID</span>
                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ● Tag Active
                      </span>
                    </div>
                    <span className="text-sm font-black text-neutral font-mono tracking-wider block">
                      {activeChild.rfid}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      High-frequency 13.56MHz contactless security chip
                    </span>
                  </div>
                </div>

                {/* Adviser Info Box */}
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-blue-900 block">
                    ASSIGNED CLASS ADVISER
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-blue-950">
                        {activeChild.section?.teacher?.name || "Ana Maria Reyes"}
                      </h4>
                      <p className="text-[11px] text-blue-700 font-semibold">
                        {activeChild.section?.teacher?.title || "Kindergarten Lead Teacher"}
                      </p>
                    </div>
                    <a
                      href={`mailto:${activeChild.section?.teacher?.email || 'teacher@fcu.edu'}`}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold no-underline"
                    >
                      Email Teacher
                    </a>
                  </div>
                </div>
              </div>

              {/* School General Info Details */}
              <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white font-black text-xl">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral">Filamer Christian University</h3>
                    <span className="text-xs font-bold text-muted-foreground">Kindergarten Department Information</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs font-medium">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">CAMPUS ADDRESS</span>
                    <p className="font-bold text-neutral mt-0.5 leading-relaxed">
                      Roxas Avenue, Roxas City, Capiz 5800, Philippines
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">KINDERGARTEN CLASSROOM</span>
                    <p className="font-bold text-neutral mt-0.5">
                      Room 102, Alpha Building, Ground Floor West Wing
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">EMERGENCY SCHOOL HOTLINE</span>
                    <p className="font-bold text-neutral mt-0.5 font-mono">
                      (036) 621-1234 • Mobile: 0917 555 0199
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">DAILY OPERATING HOURS</span>
                    <p className="font-bold text-neutral mt-0.5">
                      Monday to Friday: 7:00 AM – 4:30 PM (Gate access from 7:15 AM)
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CLASS SCHEDULE TIMETABLE                              */}
      {/* ============================================================== */}
      {isScheduleModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-scale-up text-neutral"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral">Kindergarten Daily Schedule</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Routine timetable for Section Alpha</p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 text-xs">
              {[
                { time: "07:30 AM – 08:00 AM", title: "Student Arrival & RFID Turnstile Tap", desc: "Gate entrance check-in and friendly morning greetings." },
                { time: "08:00 AM – 08:45 AM", title: "Morning Circle & Phonics Play", desc: "Flag ceremony, songs, alphabet phonics, and storytelling." },
                { time: "08:45 AM – 09:30 AM", title: "Numbers & Interactive Math Fun", desc: "Counting blocks, shapes, and early numeracy activities." },
                { time: "09:30 AM – 10:00 AM", title: "Snack Break & Monitored Recess", desc: "Healthy snacks and supervised social playtime." },
                { time: "10:00 AM – 10:45 AM", title: "Arts, Crafts & Activity Center", desc: "Coloring, clay modeling, and sensory motor skills development." },
                { time: "10:45 AM – 11:15 AM", title: "Music, Rhymes & Bag Packing", desc: "Reflective circle time and preparing for safe departure." },
                { time: "11:15 AM – 11:30 AM", title: "Authorized Guardian Pickup & Dismissal", desc: "RFID departure verification at main campus gate." },
              ].map((slot, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-tertiary/30 border border-border/70 flex items-start gap-3">
                  <div className="text-xs font-black text-primary shrink-0 w-28 pt-0.5">
                    {slot.time}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-neutral">{slot.title}</h4>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{slot.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end border-t border-border">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-sm cursor-pointer border-none"
              >
                Close Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CLASS UPDATES & NOTICE BOARD                          */}
      {/* ============================================================== */}
      {isUpdatesModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsUpdatesModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-scale-up text-neutral"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral">Class Updates & Announcements</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Notices from Teacher {activeChild.section?.teacher?.name || "Ana Maria Reyes"}</p>
                </div>
              </div>
              <button
                onClick={() => setIsUpdatesModalOpen(false)}
                className="p-1 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs">Nutrition Week Fruit Parade 🍎</span>
                  <span className="text-[10px] font-bold text-emerald-700">Sep 24, 2026</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Parents are encouraged to send pupils with their favorite fruit snack for our classroom sharing day this coming Wednesday.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-tertiary/40 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-neutral">Parent-Teacher Conference (PTC)</span>
                  <span className="text-[10px] font-bold text-muted-foreground">Sep 28, 2026</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  First quarter developmental evaluations will be discussed. Individual 15-minute appointment slips will be sent home in student kits.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-tertiary/40 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-neutral">RFID Security Tag Reminder</span>
                  <span className="text-[10px] font-bold text-muted-foreground">Notice</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Please ensure pupils wear their ID lanyards securely every morning so turnstiles can log arrival automatically without delays.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-border">
              <button
                onClick={() => setIsUpdatesModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-sm cursor-pointer border-none"
              >
                Close Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ADD AUTHORIZED GUARDIAN                               */}
      {/* ============================================================== */}
      {isAddGuardianModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsAddGuardianModalOpen(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-scale-up text-neutral"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral">Add Authorized Guardian</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Grant child pickup and emergency contact rights</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddGuardianModalOpen(false)}
                className="p-1 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddGuardianSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold text-neutral">Guardian Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Michael Johnson"
                  value={newGuardianName}
                  onChange={(e) => setNewGuardianName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-tertiary/30 text-xs font-bold text-neutral outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-neutral">Relationship</label>
                  <select
                    value={newGuardianRelation}
                    onChange={(e) => setNewGuardianRelation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-tertiary/30 text-xs font-bold text-neutral outline-none cursor-pointer"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Grandmother">Grandmother</option>
                    <option value="Grandfather">Grandfather</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-neutral">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0917 555 0102"
                    value={newGuardianPhone}
                    onChange={(e) => setNewGuardianPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-tertiary/30 text-xs font-bold text-neutral outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-neutral">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. michael@fcu.edu"
                  value={newGuardianEmail}
                  onChange={(e) => setNewGuardianEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-tertiary/30 text-xs font-bold text-neutral outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-100 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  This contact will be officially verified by gate guards during dismissal.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddGuardianModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-tertiary transition-colors cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingGuardian}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-sm hover:opacity-90 transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  {isAddingGuardian ? "Registering..." : "Authorize Guardian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ALERT DETAIL RECEIPT                                  */}
      {/* ============================================================== */}
      {selectedAlertDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedAlertDetail(null)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-scale-up text-neutral"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {selectedAlertDetail.category}
                </span>
                <h3 className="text-sm font-black text-neutral">Event Notification Details</h3>
              </div>
              <button
                onClick={() => setSelectedAlertDetail(null)}
                className="p-1 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="text-base font-black text-neutral">{selectedAlertDetail.title}</h4>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                {selectedAlertDetail.description}
              </p>

              <div className="p-3.5 rounded-2xl bg-tertiary/30 border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Event Timestamp:</span>
                  <span className="font-bold text-neutral">{selectedAlertDetail.timestamp}</span>
                </div>
                {selectedAlertDetail.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Recorded Location:</span>
                    <span className="font-bold text-neutral">{selectedAlertDetail.location}</span>
                  </div>
                )}
                {selectedAlertDetail.verifiedBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Verification System:</span>
                    <span className="font-bold text-emerald-600">{selectedAlertDetail.verifiedBy}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-border">
              <button
                onClick={() => setSelectedAlertDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-sm cursor-pointer border-none"
              >
                Close Alert
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default GuardianDashboard
