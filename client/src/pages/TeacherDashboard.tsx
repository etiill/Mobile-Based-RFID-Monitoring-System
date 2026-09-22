import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { 
  Sun,
  Moon,
  GraduationCap,
  Check,
  X,
  Timer,
  BookOpen,
  School,
  ShieldCheck,
  Phone,
  Bell,
  CheckCircle2,
  UserCheck,
  Megaphone,
  ArrowRight,
  Search,
  Copy,
  Clock,
  LogIn,
  LogOut,
  ChevronDown,
  UserRound
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import { LoadingScreen } from "../components/LoadingScreen"
import { toast } from "../components/ui/toast"

interface Guardian {
  id?: string | number
  name: string
  relation: string
  phone: string
  email?: string
}

interface Section {
  id: string | number
  year_level: string
  section_name: string
  teacher_id?: string | number | null
  teacher?: {
    id: string | number
    name: string
    email?: string
  } | null
}

interface Student {
  id: string | number
  name: string
  grade: string
  rfid: string
  guardians: Guardian[]
  section_id?: string | number | null
  section?: Section | null
}

interface AttendanceRecord {
  id: number
  student_id: string | number
  date: string
  time_in: string | null
  time_out: string | null
  status: string
  verified_by?: string
  student?: Student
}

export function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Section filter
  const [selectedSectionId, setSelectedSectionId] = useState<string | number | "all">("all")

  // Pupil filter
  const [activePupilTab, setActivePupilTab] = useState<"all" | "present" | "late" | "absent" | "checked_out">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Selected student for quick details & action modal
  const [selectedPupilModal, setSelectedPupilModal] = useState<Student | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Selected guardian for quick contact modal
  const [selectedGuardianModal, setSelectedGuardianModal] = useState<{
    guardian: Guardian
    studentName: string
  } | null>(null)


  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const role = user.role || "teacher"
  const displayName = user.name || (role === "admin" ? "Administrator" : "Ms. Garcia")

  // Dynamic Greeting & Sun/Moon icon indicator synced with time
  const getTimeBasedInfo = () => {
    const hour = new Date().getHours()
    const isDaytime = hour >= 6 && hour < 18
    let greeting = "Good Evening"
    if (hour < 12) greeting = "Good Morning"
    else if (hour < 18) greeting = "Good Afternoon"
    return { greeting, isDaytime }
  }

  // Format military time to standard 12-hr format
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

  const fetchDashboardData = async () => {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const localToday = `${year}-${month}-${day}`

      const [studentsData, sectionsData] = await Promise.all([
        ApiHandler.get<Student[]>("/students"),
        ApiHandler.get<Section[]>("/sections")
      ])

      let attendanceData = await ApiHandler.get<AttendanceRecord[]>(`/attendance?date=${localToday}`)
      if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        attendanceData = await ApiHandler.get<AttendanceRecord[]>(`/attendance`)
      }

      if (Array.isArray(studentsData)) {
        setStudents(studentsData)
      }
      if (Array.isArray(sectionsData)) {
        setSections(sectionsData)
        if (selectedSectionId === "all" && sectionsData.length > 0) {
          // If teacher is assigned to a section, select it by default
          const assigned = sectionsData.find(s => s.teacher_id?.toString() === user.id?.toString())
          if (assigned) {
            setSelectedSectionId(assigned.id)
          } else {
            setSelectedSectionId(sectionsData[0].id)
          }
        }
      }
      if (Array.isArray(attendanceData)) {
        setAttendances(attendanceData)
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 3500)

    const handleCustomScanEvent = () => fetchDashboardData()
    window.addEventListener("rfid_scan_updated", handleCustomScanEvent)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("rfid_attendance_sync")
      bc.onmessage = () => fetchDashboardData()
    } catch {}

    return () => {
      clearInterval(interval)
      window.removeEventListener("rfid_scan_updated", handleCustomScanEvent)
      if (bc) bc.close()
    }
  }, [])

  // Currently active section
  const currentSection = useMemo(() => {
    if (selectedSectionId === "all") {
      return sections[0] || null
    }
    return sections.find(s => s.id.toString() === selectedSectionId.toString()) || sections[0] || null
  }, [sections, selectedSectionId])

  // Filter students based on section
  const filteredClassStudents = useMemo(() => {
    if (selectedSectionId === "all" || !selectedSectionId) {
      return students
    }
    return students.filter(s => s.section_id?.toString() === selectedSectionId.toString() || s.section?.id?.toString() === selectedSectionId.toString())
  }, [students, selectedSectionId])

  // Attendance map by student ID
  const attendanceMap = useMemo(() => {
    const map: Record<string | number, AttendanceRecord> = {}
    attendances.forEach(att => {
      if (att.student_id) {
        map[att.student_id] = att
      }
    })
    return map
  }, [attendances])

  // Top stats
  const totalStudents = filteredClassStudents.length
  const presentCount = filteredClassStudents.filter(s => {
    const att = attendanceMap[s.id]
    return att && (att.status === "Present" || att.status === "Late" || att.time_in) && !att.time_out
  }).length

  const lateCount = filteredClassStudents.filter(s => {
    const att = attendanceMap[s.id]
    return att && att.status === "Late"
  }).length

  const checkedOutCount = filteredClassStudents.filter(s => {
    const att = attendanceMap[s.id]
    return att && att.time_out
  }).length

  const absentCount = Math.max(0, totalStudents - presentCount - checkedOutCount)

  const presentPercentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : "0"
  const absentPercentage = totalStudents > 0 ? ((absentCount / totalStudents) * 100).toFixed(1) : "0"

  // Process pupils for display with avatar styling
  const avatarColors = [
    "bg-rose-100 text-rose-600",
    "bg-sky-100 text-sky-600",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-600",
    "bg-emerald-100 text-emerald-700",
    "bg-indigo-100 text-indigo-700"
  ]

  const pupilsOverviewList = useMemo(() => {
    return filteredClassStudents
      .map((student, idx) => {
        const att = attendanceMap[student.id]
        let status: "Present" | "Late (5m)" | "Absent" | "Checked Out" = "Absent"
        let statusColor = "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/30"
        let rawStatus = "Absent"

        if (att) {
          if (att.time_out) {
            status = "Checked Out"
            rawStatus = "Checked Out"
            statusColor = "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/30"
          } else if (att.status === "Late") {
            status = "Late (5m)"
            rawStatus = "Late"
            statusColor = "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/30"
          } else if (att.time_in || att.status === "Present" || att.status === "Checked In") {
            status = "Present"
            rawStatus = "Present"
            statusColor = "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/30"
          }
        }

        const nameParts = student.name.split(" ")
        const initials = nameParts.length >= 2 
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
          : student.name.substring(0, 2).toUpperCase()

        const sectionLabel = student.section 
          ? `${student.section.year_level} • ${student.section.section_name}`
          : "Kindergarten • Section A"

        return {
          student,
          id: student.id,
          name: student.name,
          rfid: student.rfid,
          sectionLabel,
          status,
          rawStatus,
          statusColor,
          avatarBg: avatarColors[idx % avatarColors.length],
          initials,
          timeIn: att?.time_in ? formatTime12h(att.time_in) : "--:--",
          timeOut: att?.time_out ? formatTime12h(att.time_out) : "--:--",
          verifiedBy: att?.verified_by || "N/A"
        }
      })
      .filter((pupil) => {
        // Tab filter
        if (activePupilTab === "present" && pupil.rawStatus !== "Present") return false
        if (activePupilTab === "late" && pupil.rawStatus !== "Late") return false
        if (activePupilTab === "absent" && pupil.rawStatus !== "Absent") return false
        if (activePupilTab === "checked_out" && pupil.rawStatus !== "Checked Out") return false

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          return pupil.name.toLowerCase().includes(q) || pupil.rfid.toLowerCase().includes(q)
        }
        return true
      })
  }, [filteredClassStudents, attendanceMap, activePupilTab, searchQuery])

  // Extract Guardians list
  const guardiansList = useMemo(() => {
    const list: Array<{
      id: string | number
      name: string
      phone: string
      relation: string
      studentName: string
      avatarBg: string
      initials: string
      rawGuardian: Guardian
    }> = []

    filteredClassStudents.forEach((student) => {
      if (Array.isArray(student.guardians)) {
        student.guardians.forEach((g) => {
          if (g.name && !list.some(item => item.name === g.name)) {
            const parts = g.name.split(" ")
            const initials = parts.length >= 2 
              ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
              : g.name.substring(0, 2).toUpperCase()

            list.push({
              id: g.id || `g-${list.length}`,
              name: g.name,
              phone: g.phone || "0917 555 0100",
              relation: g.relation || "Guardian",
              studentName: student.name,
              avatarBg: avatarColors[list.length % avatarColors.length],
              initials,
              rawGuardian: g
            })
          }
        })
      }
    })

    return list.slice(0, 6)
  }, [filteredClassStudents])

  // Dynamic Recent Notifications from real attendance events
  const dynamicNotifications = useMemo(() => {
    const items: Array<{
      id: string | number
      type: "arrival" | "pickup" | "announcement" | "late"
      title: string
      time: string
      studentName?: string
    }> = []

    // Map recent attendance events
    attendances.slice(0, 10).forEach((att) => {
      const studentName = att.student?.name || (students.find(s => s.id === att.student_id)?.name) || "Pupil"
      
      if (att.time_out) {
        items.push({
          id: `notif-out-${att.id}`,
          type: "pickup",
          title: `${studentName} was checked out by guardian (${att.verified_by || 'Guardian QR'}).`,
          time: formatTime12h(att.time_out),
          studentName
        })
      }

      if (att.time_in) {
        if (att.status === "Late") {
          items.push({
            id: `notif-late-${att.id}`,
            type: "late",
            title: `${studentName} arrived late for class.`,
            time: formatTime12h(att.time_in),
            studentName
          })
        } else {
          items.push({
            id: `notif-in-${att.id}`,
            type: "arrival",
            title: `${studentName} arrived at the Kindergarten Entrance.`,
            time: formatTime12h(att.time_in),
            studentName
          })
        }
      }
    })

    // System announcement if fewer than 3
    if (items.length < 3) {
      items.push({
        id: "sys-announcement",
        type: "announcement",
        title: "A new class announcement has been posted.",
        time: "Yesterday, 04:12 PM"
      })
    }

    return items.slice(0, 3)
  }, [attendances, students])



  // Quick Manual Check-in handler (Present or Late)
  const handleQuickCheckIn = async (student: Student, status: "Present" | "Late") => {
    setIsActionLoading(true)
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const localToday = `${year}-${month}-${day}`
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      await ApiHandler.post("/attendance/override", {
        student_id: student.id,
        date: localToday,
        status: status,
        time_in: currentTime,
        time_out: null
      })

      toast.add({
        title: "Attendance Recorded",
        description: `${student.name} marked as ${status}.`,
        type: "success"
      })

      // Notify broadcast channel
      try {
        const bc = new BroadcastChannel("rfid_attendance_sync")
        bc.postMessage({ event: "attendance_updated" })
        bc.close()
      } catch {}

      await fetchDashboardData()
      setSelectedPupilModal(null)
    } catch (err: any) {
      console.error("Failed manual check-in:", err)
      toast.add({
        title: "Action Failed",
        description: err.message || "Could not record attendance.",
        type: "error"
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  // Quick Manual Check-out handler (Manual Pickup Override)
  const handleQuickCheckOut = async (student: Student) => {
    setIsActionLoading(true)
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const localToday = `${year}-${month}-${day}`
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      const currentAtt = attendanceMap[student.id]

      await ApiHandler.post("/attendance/override", {
        student_id: student.id,
        date: localToday,
        status: "Checked Out",
        time_in: currentAtt?.time_in || "08:00:00",
        time_out: currentTime
      })

      toast.add({
        title: "Pickup Confirmed",
        description: `${student.name} marked as Checked Out (Manual Pickup).`,
        type: "success"
      })

      try {
        const bc = new BroadcastChannel("rfid_attendance_sync")
        bc.postMessage({ event: "attendance_updated" })
        bc.close()
      } catch {}

      await fetchDashboardData()
      setSelectedPupilModal(null)
    } catch (err: any) {
      console.error("Failed manual checkout:", err)
      toast.add({
        title: "Action Failed",
        description: err.message || "Could not record pickup.",
        type: "error"
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  // Copy phone helper
  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(phone)
    toast.add({
      title: "Phone Copied",
      description: `Copied ${phone} to clipboard.`,
      type: "success"
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingScreen fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans text-neutral max-w-[1400px] mx-auto pb-8">
      
      {/* 1. Header Greeting & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {getTimeBasedInfo().isDaytime ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 shadow-xs shrink-0">
              <Sun className="h-6 w-6 fill-amber-400 text-amber-500" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-500/30 shadow-xs shrink-0">
              <Moon className="h-6 w-6 fill-indigo-400 text-indigo-500 dark:text-indigo-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral">
                {getTimeBasedInfo().greeting}, {displayName}!
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-50 text-sky-600 border border-sky-200/60">
                Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              Here's what's happening in your class today.
            </p>
          </div>
        </div>

        {/* Section Switcher if multiple sections exist */}
        {sections.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-card border border-border px-3 py-1.5 rounded-2xl shadow-xs">
            <School className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-muted-foreground">Class:</span>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-neutral outline-none cursor-pointer border-none pr-2"
            >
              <option value="all">All Sections ({students.length})</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.year_level} - {sec.section_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Top Stats Row (4 Metric Cards with Click-to-filter capability) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* TOTAL STUDENTS */}
        <button
          onClick={() => setActivePupilTab("all")}
          className={`text-left rounded-2xl border bg-card p-5 shadow-xs flex items-center justify-between transition-all cursor-pointer ${
            activePupilTab === "all" ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-border hover:border-border/80"
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">
              TOTAL STUDENTS
            </span>
            <div className="mt-1">
              <span className="text-3xl font-black tracking-tight text-neutral block leading-none">
                {totalStudents}
              </span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
        </button>

        {/* PRESENT */}
        <button
          onClick={() => setActivePupilTab("present")}
          className={`text-left rounded-2xl border bg-card p-5 shadow-xs flex items-center justify-between transition-all cursor-pointer ${
            activePupilTab === "present" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-border hover:border-border/80"
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">
              PRESENT
            </span>
            <div className="mt-1">
              <span className="text-3xl font-black tracking-tight text-neutral block leading-none">
                {presentCount}
              </span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>
        </button>

        {/* ABSENT */}
        <button
          onClick={() => setActivePupilTab("absent")}
          className={`text-left rounded-2xl border bg-card p-5 shadow-xs flex items-center justify-between transition-all cursor-pointer ${
            activePupilTab === "absent" ? "border-rose-500 ring-2 ring-rose-500/20" : "border-border hover:border-border/80"
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 block">
              ABSENT
            </span>
            <div className="mt-1">
              <span className="text-3xl font-black tracking-tight text-neutral block leading-none">
                {absentCount}
              </span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shrink-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
              <X className="h-4 w-4 stroke-[3]" />
            </div>
          </div>
        </button>

        {/* LATE */}
        <button
          onClick={() => setActivePupilTab("late")}
          className={`text-left rounded-2xl border bg-card p-5 shadow-xs flex items-center justify-between transition-all cursor-pointer ${
            activePupilTab === "late" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-border hover:border-border/80"
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 block">
              LATE
            </span>
            <div className="mt-1">
              <span className="text-3xl font-black tracking-tight text-neutral block leading-none">
                {lateCount}
              </span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shrink-0">
            <Timer className="h-6 w-6" />
          </div>
        </button>

      </div>

      {/* 3. Main Dashboard Layout (Left ~7 Cols, Right ~5 Cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Today's Class, Pupils Overview, Quote of the Day */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Today's Class */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-neutral leading-snug">
                    Today's Class
                  </h3>
                  <p className="text-xs font-bold text-purple-600">
                    {currentSection ? `${currentSection.year_level} - ${currentSection.section_name}` : "Kindergarten - Section A"}
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-600 border border-amber-200/60">
                <School className="h-3.5 w-3.5" />
                <span>Activity Room 1</span>
              </div>
            </div>

            {/* 4 Metadata Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-tertiary/25 border border-border/40">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  GRADE LEVEL
                </span>
                <span className="text-xs font-extrabold text-neutral block mt-1">
                  {currentSection?.year_level || "Kindergarten"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  SECTION
                </span>
                <span className="text-xs font-extrabold text-neutral block mt-1">
                  {currentSection?.section_name || "Section A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  ROOM
                </span>
                <span className="text-xs font-extrabold text-neutral block mt-1">
                  Room 1 (Ground Flr)
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  ADVISER
                </span>
                <span className="text-xs font-extrabold text-neutral block mt-1 truncate">
                  {currentSection?.teacher?.name || displayName}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Pupils Overview */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            
            {/* Header row with View All link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-rose-500" />
                <h3 className="text-sm font-extrabold text-neutral">
                  Pupils Overview
                </h3>
                <span className="text-xs font-bold text-muted-foreground ml-1">
                  ({pupilsOverviewList.length})
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search input */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search pupil..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-2 py-1 text-xs rounded-xl bg-tertiary/40 border border-border/70 focus:outline-none focus:border-primary w-28 sm:w-36 text-neutral"
                  />
                </div>

                <Link 
                  to={role === "admin" ? "/app/pupils" : "/app/my_students"} 
                  className="text-xs font-extrabold text-primary hover:underline inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(["all", "present", "late", "absent", "checked_out"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActivePupilTab(tab)}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-colors capitalize text-[11px] cursor-pointer whitespace-nowrap ${
                    activePupilTab === tab
                      ? "bg-primary text-white border-primary"
                      : "bg-tertiary/30 text-muted-foreground border-transparent hover:bg-tertiary/60"
                  }`}
                >
                  {tab.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Pupil Items List */}
            <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto pr-1">
              {pupilsOverviewList.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-semibold">
                  No pupils found matching current filters.
                </div>
              ) : (
                pupilsOverviewList.map((pupil) => {
                  const isPresent = pupil.rawStatus === "Present" || pupil.rawStatus === "Late"

                  return (
                    <div 
                      key={pupil.id} 
                      onClick={() => setSelectedPupilModal(pupil.student)}
                      className="py-3 flex items-center justify-between hover:bg-tertiary/20 px-2 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs shrink-0 ${pupil.avatarBg}`}>
                          {pupil.initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-neutral leading-tight group-hover:text-primary transition-colors truncate">
                            {pupil.name}
                          </h4>
                          <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
                            {pupil.sectionLabel} {pupil.timeIn !== "--:--" ? `• In: ${pupil.timeIn}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold border ${pupil.statusColor}`}>
                          {pupil.status}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Card: Quote of the Day Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white p-7 shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2 z-10 max-w-lg">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-md">
                QUOTE OF THE DAY
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                Small steps today, big dreams tomorrow! 🌟
              </h2>
              <p className="text-xs text-white/90 font-medium leading-relaxed">
                Kindergarten education lays the happiest foundations for lifelong curiosity and kindness.
              </p>
            </div>

            <div className="z-10 shrink-0">
              <Link
                to="/app/attendance"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-xs font-black bg-white text-indigo-600 shadow-sm hover:bg-white/90 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                Open Attendance
              </Link>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Guardians Quick Contact & Recent Notifications */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Guardians Quick Contact */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-neutral">
                  Guardians Quick Contact
                </h3>
              </div>
              <Link 
                to={role === "admin" ? "/app/registration?tab=students" : "/app/my_students"} 
                className="text-xs font-extrabold text-primary hover:underline transition-colors"
              >
                View All
              </Link>
            </div>

            {/* Guardians List */}
            <div className="divide-y divide-border/60">
              {guardiansList.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground font-semibold">
                  No registered guardians found.
                </div>
              ) : (
                guardiansList.map((g) => (
                  <div 
                    key={g.id} 
                    onClick={() => setSelectedGuardianModal({ guardian: g.rawGuardian, studentName: g.studentName })}
                    className="py-3 flex items-center justify-between hover:bg-tertiary/20 px-2 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs shrink-0 ${g.avatarBg}`}>
                        {g.initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-neutral leading-tight group-hover:text-primary transition-colors truncate">
                          {g.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a 
                            href={`tel:${g.phone.replace(/\s+/g, '')}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors truncate"
                          >
                            <Phone className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                            <span>{g.phone}</span>
                          </a>
                          <button
                            onClick={(e) => handleCopyPhone(g.phone, e)}
                            title="Copy Phone"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-tertiary/70 text-muted-foreground border border-border/60 shrink-0">
                      {g.relation}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Recent Notifications */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-sky-500" />
                <h3 className="text-sm font-extrabold text-neutral">
                  Recent Notifications
                </h3>
              </div>
              <Link 
                to="/app/attendance" 
                className="text-xs font-extrabold text-primary hover:underline transition-colors"
              >
                View All
              </Link>
            </div>

            {/* 3 Notification Cards */}
            <div className="space-y-3">
              {dynamicNotifications.map((notif) => {
                if (notif.type === "pickup") {
                  return (
                    <div 
                      key={notif.id} 
                      className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30 flex items-start gap-3"
                    >
                      <div className="mt-0.5 shrink-0">
                        <UserCheck className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-neutral leading-snug">
                          {notif.title}
                        </h4>
                        <p className="text-[10px] font-semibold text-muted-foreground mt-1">
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  )
                }

                if (notif.type === "late") {
                  return (
                    <div 
                      key={notif.id} 
                      className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 flex items-start gap-3"
                    >
                      <div className="mt-0.5 shrink-0">
                        <Timer className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-neutral leading-snug">
                          {notif.title}
                        </h4>
                        <p className="text-[10px] font-semibold text-muted-foreground mt-1">
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  )
                }

                if (notif.type === "announcement") {
                  return (
                    <div 
                      key={notif.id} 
                      className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 flex items-start gap-3"
                    >
                      <div className="mt-0.5 shrink-0">
                        <Megaphone className="h-4 w-4 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-neutral leading-snug">
                          {notif.title}
                        </h4>
                        <p className="text-[10px] font-semibold text-muted-foreground mt-1">
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div 
                    key={notif.id} 
                    className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 flex items-start gap-3"
                  >
                    <div className="mt-0.5 shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-neutral leading-snug">
                        {notif.title}
                      </h4>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-1">
                        {notif.time}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Pupil Quick Actions & Detail Modal */}
      {selectedPupilModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedPupilModal(null)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-sm">
                  {selectedPupilModal.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral">
                    {selectedPupilModal.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    RFID: <span className="font-mono">{selectedPupilModal.rfid}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPupilModal(null)}
                className="p-1.5 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Attendance Status Today */}
            {(() => {
              const att = attendanceMap[selectedPupilModal.id]
              const isPresent = att && (att.status === "Present" || att.status === "Late" || att.time_in) && !att.time_out
              const isCheckedOut = att && att.time_out
              const isAbsent = !att || att.status === "Absent"

              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-tertiary/25 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Today's Status:</span>
                      {isPresent && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {att.status === "Late" ? "Late" : "Present in Class"}
                        </span>
                      )}
                      {isCheckedOut && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-50 text-blue-600 border border-blue-100">
                          Picked Up / Checked Out
                        </span>
                      )}
                      {isAbsent && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-rose-50 text-rose-600 border border-rose-100">
                          Absent (Not Arrived)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold">ARRIVAL:</span>
                        <span className="font-bold text-neutral">
                          {att?.time_in ? formatTime12h(att.time_in) : "Not Scanned"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold">PICKUP:</span>
                        <span className="font-bold text-neutral">
                          {att?.time_out ? formatTime12h(att.time_out) : "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Guardians for this pupil */}
                  {selectedPupilModal.guardians && selectedPupilModal.guardians.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-extrabold text-neutral block">
                        Guardian Contacts:
                      </span>
                      <div className="space-y-2">
                        {selectedPupilModal.guardians.map((g, idx) => (
                          <div 
                            key={idx} 
                            className="p-2.5 rounded-xl border border-border/70 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-neutral">{g.name} ({g.relation})</p>
                              <p className="text-[11px] text-muted-foreground">{g.phone}</p>
                            </div>
                            <a 
                              href={`tel:${g.phone.replace(/\s+/g, '')}`}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              <span>Call</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Functional Actions */}
                  <div className="pt-2 border-t border-border space-y-2">
                    {isPresent && (
                      <div>
                        <button
                          onClick={() => handleQuickCheckOut(selectedPupilModal)}
                          disabled={isActionLoading}
                          className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black shadow-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border-none"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Check Out / Record Pickup</span>
                        </button>
                      </div>
                    )}

                    {isAbsent && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleQuickCheckIn(selectedPupilModal, "Present")}
                          disabled={isActionLoading}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-sm hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border-none"
                        >
                          <Check className="h-4 w-4" />
                          <span>Mark Present</span>
                        </button>
                        <button
                          onClick={() => handleQuickCheckIn(selectedPupilModal, "Late")}
                          disabled={isActionLoading}
                          className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black shadow-sm hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border-none"
                        >
                          <Timer className="h-4 w-4" />
                          <span>Mark Late</span>
                        </button>
                      </div>
                    )}

                    {isCheckedOut && (
                      <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold text-center border border-blue-100">
                        Student is checked out for today ({att?.verified_by || 'Verified'}).
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

          </div>
        </div>
      )}

      {/* Guardian Detail Modal */}
      {selectedGuardianModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedGuardianModal(null)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black text-neutral">Guardian Profile</h3>
              </div>
              <button
                onClick={() => setSelectedGuardianModal(null)}
                className="p-1 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-tertiary/25 border border-border/50 space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">FULL NAME:</span>
                  <p className="font-extrabold text-neutral text-sm">{selectedGuardianModal.guardian.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">RELATIONSHIP:</span>
                  <p className="font-bold text-neutral">{selectedGuardianModal.guardian.relation}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">STUDENT:</span>
                  <p className="font-bold text-primary">{selectedGuardianModal.studentName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">CONTACT NUMBER:</span>
                  <p className="font-bold text-neutral font-mono">{selectedGuardianModal.guardian.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`tel:${selectedGuardianModal.guardian.phone.replace(/\s+/g, '')}`}
                  className="py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Guardian</span>
                </a>
                <button
                  onClick={(e) => {
                    handleCopyPhone(selectedGuardianModal.guardian.phone, e)
                    setSelectedGuardianModal(null)
                  }}
                  className="py-2 rounded-xl border border-border bg-card text-neutral font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-tertiary transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Number</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  )
}

export default TeacherDashboard
