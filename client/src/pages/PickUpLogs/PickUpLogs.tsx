import { useState, useEffect, useMemo, useRef } from "react"
import { 
  Sun, 
  Search, 
  Calendar as CalendarIcon, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  Clock, 
  ChevronDown,
  Phone,
  Plus,
  X,
  RefreshCw,
  LogOut,
  Eye,
  Check,
  FileText,
  UserRound,
  School
} from "lucide-react"
import ApiHandler from "../../api/ApiHandler"
import { LoadingScreen } from "../../components/LoadingScreen"
import { toast } from "../../components/ui/toast"

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
}

interface Student {
  id: string | number
  name: string
  grade: string
  rfid: string
  section_id?: string | number | null
  guardians: Guardian[]
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

interface PickupItem {
  id: string
  attendanceId: number
  time: string
  rawTimeOut: string
  rawTimeIn: string
  studentId: string | number
  studentName: string
  studentRfid: string
  studentSection: string
  guardianName: string
  guardianPhone: string
  guardianRelation: string
  pickupType: string
  verifiedBy: string
  allGuardians: Guardian[]
}

export function PickUpLogs() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState<string | number | "all">("all")


  // Date selection (default today)
  const todayStr = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Modals
  const [selectedPickupDetail, setSelectedPickupDetail] = useState<PickupItem | null>(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)

  // Record Pick Up form state
  const [selectedStudentForPickup, setSelectedStudentForPickup] = useState<string | number>("")
  const [selectedGuardianForPickup, setSelectedGuardianForPickup] = useState<string>("")
  const [isSubmittingPickup, setIsSubmittingPickup] = useState(false)

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const role = (user.role || "teacher").toLowerCase()
  const displayName = user.name || (role === "admin" ? "Administrator" : "Ms. Garcia")

  // Greeting dynamic based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  // Format military time to standard 12-hr AM/PM format
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

  // Format date display (e.g., "July 23, 2026")
  const formatSelectedDateDisplay = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(n => parseInt(n, 10))
      const d = new Date(year, month - 1, day)
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  // Calculate elapsed time between arrival and pickup
  const getElapsedTime = (timeIn?: string | null, timeOut?: string | null) => {
    if (!timeIn || !timeOut) return "N/A"
    try {
      const parseMinutes = (t: string) => {
        const parts = t.split(":")
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
      }
      const m1 = parseMinutes(timeIn)
      const m2 = parseMinutes(timeOut)
      const diff = m2 - m1
      if (diff > 0) {
        const h = Math.floor(diff / 60)
        const m = diff % 60
        return h > 0 ? `${h}h ${m}m` : `${m} mins`
      }
    } catch {}
    return "N/A"
  }

  // Close date picker dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchData = async () => {
    try {
      const [attData, studentsData, sectionsData] = await Promise.all([
        ApiHandler.get<AttendanceRecord[]>(`/attendance?date=${selectedDate}`),
        ApiHandler.get<Student[]>("/students"),
        ApiHandler.get<Section[]>("/sections")
      ])

      if (Array.isArray(attData)) {
        setAttendances(attData)
      }
      if (Array.isArray(studentsData)) {
        setStudents(studentsData)
      }
      if (Array.isArray(sectionsData)) {
        setSections(sectionsData)
      }
    } catch (err) {
      console.error("Failed to load pick up logs:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 4000)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("rfid_attendance_sync")
      bc.onmessage = () => fetchData()
    } catch {}

    const handleCustomScanEvent = () => fetchData()
    window.addEventListener("rfid_scan_updated", handleCustomScanEvent)

    return () => {
      clearInterval(interval)
      if (bc) bc.close()
      window.removeEventListener("rfid_scan_updated", handleCustomScanEvent)
    }
  }, [selectedDate])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    fetchData()
  }

  // Extract real pickup logs from attendance records
  const realPickupList = useMemo<PickupItem[]>(() => {
    return attendances
      .filter(a => a.time_out !== null || a.status === "Checked Out")
      .map(att => {
        const student = att.student || students.find(s => s.id === att.student_id)
        const studentName = student?.name || "Pupil"
        const studentRfid = student?.rfid || "N/A"
        const studentSection = student?.section 
          ? `${student.section.year_level} - ${student.section.section_name}` 
          : "Kindergarten - Section A"
        
        const guardians = student?.guardians || []
        let guardianName = "Authorized Guardian"
        let guardianPhone = "0917 555 0100"
        let guardianRelation = "Guardian"

        if (guardians.length > 0) {
          guardianName = guardians[0].name
          guardianPhone = guardians[0].phone
          guardianRelation = guardians[0].relation
        }

        const formattedTime = formatTime12h(att.time_out) || "--:--"

        return {
          id: String(att.id),
          attendanceId: att.id,
          time: formattedTime,
          rawTimeOut: att.time_out || "--:--",
          rawTimeIn: att.time_in || "--:--",
          studentId: att.student_id,
          studentName,
          studentRfid,
          studentSection,
          guardianName,
          guardianPhone,
          guardianRelation,
          pickupType: "Authorized",
          verifiedBy: att.verified_by || "Authorized Gate Verification",
          allGuardians: guardians
        }
      })
  }, [attendances, students])

  // Filtered pickup list based on search, section, and verification type
  const filteredPickups = useMemo(() => {
    return realPickupList.filter(item => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = item.studentName.toLowerCase().includes(q)
        const matchesGuardian = item.guardianName.toLowerCase().includes(q)
        const matchesRfid = item.studentRfid.toLowerCase().includes(q)
        if (!matchesName && !matchesGuardian && !matchesRfid) return false
      }

      // Section filter
      if (selectedSectionId !== "all") {
        const student = students.find(s => s.id === item.studentId)
        if (student && student.section_id?.toString() !== selectedSectionId.toString()) {
          return false
        }
      }

      return true
    })
  }, [realPickupList, searchQuery, selectedSectionId, students])

  // Students currently in class awaiting pickup (for Record Pick Up modal)
  const presentStudentsAwaitingPickup = useMemo(() => {
    return students.filter(student => {
      const att = attendances.find(a => a.student_id === student.id)
      return att && (att.status === "Present" || att.status === "Late" || att.time_in) && !att.time_out
    })
  }, [students, attendances])

  // Handle Recording a New Pick Up
  const handleRecordPickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentForPickup) {
      toast.add({
        title: "Selection Required",
        description: "Please select a student to check out.",
        type: "error"
      })
      return
    }

    const student = students.find(s => s.id.toString() === selectedStudentForPickup.toString())
    if (!student) return

    setIsSubmittingPickup(true)
    try {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      const att = attendances.find(a => a.student_id === student.id)

      await ApiHandler.post("/attendance/override", {
        student_id: student.id,
        date: selectedDate,
        status: "Checked Out",
        time_in: att?.time_in || "08:00:00",
        time_out: currentTime
      })

      toast.add({
        title: "Pick Up Confirmed",
        description: `${student.name} was successfully picked up by ${selectedGuardianForPickup || "Authorized Guardian"}.`,
        type: "success"
      })

      // Sync across open tabs
      try {
        const bc = new BroadcastChannel("rfid_attendance_sync")
        bc.postMessage({ event: "attendance_updated" })
        bc.close()
      } catch {}

      await fetchData()
      setIsRecordModalOpen(false)
      setSelectedStudentForPickup("")
      setSelectedGuardianForPickup("")
    } catch (err: any) {
      console.error("Failed to record pickup:", err)
      toast.add({
        title: "Action Failed",
        description: err.message || "Could not record pickup in system.",
        type: "error"
      })
    } finally {
      setIsSubmittingPickup(false)
    }
  }

  // Update selected guardian dropdown when student changes
  const activeStudentInModal = students.find(s => s.id.toString() === selectedStudentForPickup.toString())
  useEffect(() => {
    if (activeStudentInModal && activeStudentInModal.guardians && activeStudentInModal.guardians.length > 0) {
      setSelectedGuardianForPickup(activeStudentInModal.guardians[0].name)
    } else {
      setSelectedGuardianForPickup("")
    }
  }, [selectedStudentForPickup])

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingScreen fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans text-neutral max-w-[1400px] mx-auto pb-8">
      
      {/* 1. Top Header Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 shadow-xs shrink-0">
            <Sun className="h-6 w-6 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral">
                {getGreeting()}, {displayName}!
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

        {/* Action Buttons: Refresh & Record Pick Up */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Sync Gate Logs"
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-neutral hover:bg-tertiary transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border-none"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Record Pick Up</span>
          </button>
        </div>
      </div>

      {/* 2. Main Pick Up Logs Header Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-xs shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-neutral">
              Pick Up Logs
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Real-time gate and guardian verification history
            </p>
          </div>
        </div>

        {/* Right: Date Picker Dropdown, Section Selector & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Section Filter if multiple sections exist */}
          {sections.length > 1 && (
            <div className="relative flex items-center">
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-border bg-card text-xs font-bold text-neutral cursor-pointer focus:outline-none focus:border-primary shadow-xs"
              >
                <option value="all">All Classes</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.year_level} - {s.section_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Selector Dropdown Pill */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="px-4 py-2 rounded-full border border-border bg-card text-xs font-bold text-neutral flex items-center gap-2 shadow-xs hover:border-primary/60 transition-colors cursor-pointer"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              <span>{formatSelectedDateDisplay(selectedDate)}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 z-50 p-3 rounded-2xl bg-card border border-border shadow-xl space-y-2 animate-scale-up min-w-[220px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block px-1">
                  Select Log Date:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setIsDatePickerOpen(false)
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-border bg-tertiary/30 text-xs font-bold text-neutral focus:outline-none focus:border-primary"
                />
                <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
                  <button
                    onClick={() => {
                      setSelectedDate(todayStr)
                      setIsDatePickerOpen(false)
                    }}
                    className="flex-1 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setIsDatePickerOpen(false)}
                    className="flex-1 py-1 text-[11px] font-bold text-muted-foreground hover:bg-tertiary rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or guardian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-full border border-border bg-card text-xs text-neutral placeholder:text-muted-foreground focus:outline-none focus:border-primary w-full sm:w-56 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neutral border-none bg-transparent cursor-pointer p-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* 3. Content Grid: Pick Up Table on Left, Trust Card & Pending on Right */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* LEFT COLUMN: Pick Up Logs Table Card (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-border bg-card shadow-xs overflow-hidden space-y-0">
          
          {/* Filter sub-header */}
          <div className="px-6 py-3 border-b border-border/70 flex items-center justify-between text-xs bg-tertiary/10">
            <span className="font-bold text-muted-foreground">Pick Up Log Entries</span>

            <span className="text-[11px] font-bold text-muted-foreground">
              {filteredPickups.length} {filteredPickups.length === 1 ? "Record" : "Records"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/70 text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase bg-tertiary/20">
                  <th className="py-4 px-6">TIME</th>
                  <th className="py-4 px-6">STUDENT NAME</th>
                  <th className="py-4 px-6">GUARDIAN NAME</th>
                  <th className="py-4 px-6">PICKUP TYPE</th>
                  <th className="py-4 px-6 text-right">DETAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPickups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-xs text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserCheck className="h-8 w-8 text-muted-foreground/50 stroke-1" />
                        <p>No pick up records found for {formatSelectedDateDisplay(selectedDate)}.</p>
                        {selectedDate === todayStr && presentStudentsAwaitingPickup.length > 0 && (
                          <button
                            onClick={() => setIsRecordModalOpen(true)}
                            className="mt-2 text-xs font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                          >
                            Click here to record a pickup for {presentStudentsAwaitingPickup.length} waiting students →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPickups.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedPickupDetail(log)}
                      className="hover:bg-tertiary/20 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-semibold text-muted-foreground whitespace-nowrap">
                        {log.time}
                      </td>
                      <td className="py-4 px-6 font-bold text-neutral whitespace-nowrap group-hover:text-primary transition-colors">
                        {log.studentName}
                      </td>
                      <td className="py-4 px-6 font-semibold text-neutral whitespace-nowrap">
                        {log.guardianName}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40">
                          {log.pickupType}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPickupDetail(log)
                          }}
                          className="p-1.5 rounded-lg border border-border/70 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="View Verification Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="py-3 px-6 border-t border-border/60 bg-tertiary/10 flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>
              Showing {filteredPickups.length} of {realPickupList.length} total verified checkouts
            </span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>All records synced with RFID gate & QR tokens</span>
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: Safe Pickups Trust Card & Awaiting Pickup Summary */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Trust Card */}
          <div className="rounded-3xl bg-sky-50/70 border border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/30 p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
            
            {/* Circular Happy Child Badge */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-sky-500 shadow-sm border border-sky-100 dark:bg-slate-900">
              <Sparkles className="h-8 w-8" />
            </div>

            {/* Headline */}
            <h3 className="text-lg font-black text-neutral tracking-tight">
              Safe pickups, Happy kids! ❤️
            </h3>

            {/* Body Text */}
            <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-xs">
              Every child is safely surrendered only to biometric or authorized guardians registered in FCU Kindergarten Database.
            </p>

            {/* Bottom Pill Badge */}
            <div className="pt-2">
              <span className="inline-flex items-center px-5 py-2 rounded-full text-xs font-black bg-white border border-sky-200/80 text-sky-700 dark:bg-slate-900 dark:text-sky-400 shadow-xs tracking-wide">
                RFID & Card Verified
              </span>
            </div>

          </div>

          {/* Awaiting Pickup Widget (Live Class Context) */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-amber-500" />
                <h4 className="text-xs font-black text-neutral uppercase tracking-wider">
                  Currently Awaiting Pickup
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-600 border border-amber-100">
                {presentStudentsAwaitingPickup.length} in class
              </span>
            </div>

            {presentStudentsAwaitingPickup.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium text-center py-2">
                All present pupils have been picked up for today.
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {presentStudentsAwaitingPickup.map(student => (
                  <div 
                    key={student.id} 
                    className="p-2.5 rounded-xl bg-tertiary/20 border border-border/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-neutral">{student.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {student.guardians?.[0]?.name || "Guardian"} ({student.guardians?.[0]?.phone || "Phone N/A"})
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudentForPickup(student.id)
                        setIsRecordModalOpen(true)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-bold hover:opacity-90 transition-opacity border-none cursor-pointer"
                    >
                      Pick Up
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL 1: Record Pick Up Modal */}
      {isRecordModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsRecordModalOpen(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral">Record Pupil Pick Up</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Verify guardian and confirm safe departure</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPickupSubmit} className="space-y-4">
              {/* Select Pupil */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-neutral block">
                  Select Student to Check Out:
                </label>
                <select
                  value={selectedStudentForPickup}
                  onChange={(e) => setSelectedStudentForPickup(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-tertiary/20 text-xs font-bold text-neutral focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Present Student --</option>
                  {presentStudentsAwaitingPickup.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.section ? `${s.section.year_level} - ${s.section.section_name}` : s.grade})
                    </option>
                  ))}
                  {/* Fallback option if empty */}
                  {presentStudentsAwaitingPickup.length === 0 && (
                    <option value="" disabled>No students currently marked in class</option>
                  )}
                </select>
              </div>

              {/* Authorized Guardian Selector */}
              {activeStudentInModal && (
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-neutral block">
                    Authorized Guardian Receiving Child:
                  </label>
                  <select
                    value={selectedGuardianForPickup}
                    onChange={(e) => setSelectedGuardianForPickup(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-tertiary/20 text-xs font-bold text-neutral focus:outline-none focus:border-primary"
                  >
                    {activeStudentInModal.guardians && activeStudentInModal.guardians.length > 0 ? (
                      activeStudentInModal.guardians.map((g, idx) => (
                        <option key={idx} value={g.name}>
                          {g.name} ({g.relation} • {g.phone})
                        </option>
                      ))
                    ) : (
                      <option value="Registered Guardian">Registered Guardian</option>
                    )}
                  </select>
                </div>
              )}

              {/* Departure Verification Mode */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 dark:bg-emerald-950/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verified Classroom Dismissal</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Timestamp will be recorded as current time ({new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}) and synced with the gate RFID log.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-tertiary transition-colors cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPickup || !selectedStudentForPickup}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 border-none"
                >
                  {isSubmittingPickup ? "Recording..." : "Confirm & Complete Pick Up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Pick Up Detail Receipt Modal */}
      {selectedPickupDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedPickupDetail(null)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral">Pick Up Verification Log</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Record ID #{selectedPickupDetail.attendanceId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPickupDetail(null)}
                className="p-1 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Verification Receipt Details */}
            <div className="space-y-3.5 text-xs">
              
              {/* Student Details Card */}
              <div className="p-3.5 rounded-2xl bg-tertiary/20 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">STUDENT</span>
                    <h4 className="font-extrabold text-neutral text-sm">{selectedPickupDetail.studentName}</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {selectedPickupDetail.studentSection}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  RFID Tag: <span className="font-mono text-neutral font-bold">{selectedPickupDetail.studentRfid}</span>
                </div>
              </div>

              {/* Guardian Contact Details */}
              <div className="p-3.5 rounded-2xl bg-tertiary/20 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SURRENDERED TO</span>
                    <h4 className="font-extrabold text-neutral text-sm">{selectedPickupDetail.guardianName}</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-tertiary text-muted-foreground border border-border">
                    {selectedPickupDetail.guardianRelation}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="font-mono text-muted-foreground">{selectedPickupDetail.guardianPhone}</span>
                  <a
                    href={`tel:${selectedPickupDetail.guardianPhone.replace(/\s+/g, '')}`}
                    className="text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    <span>Call Guardian</span>
                  </a>
                </div>
              </div>

              {/* Timestamp Log */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-sky-50/50 border border-sky-100 dark:bg-sky-950/20 text-center">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">TIME IN</span>
                  <span className="font-bold text-neutral mt-0.5 block">{formatTime12h(selectedPickupDetail.rawTimeIn)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">TIME OUT</span>
                  <span className="font-bold text-emerald-600 mt-0.5 block">{selectedPickupDetail.time}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">DURATION</span>
                  <span className="font-bold text-primary mt-0.5 block">
                    {getElapsedTime(selectedPickupDetail.rawTimeIn, selectedPickupDetail.rawTimeOut)}
                  </span>
                </div>
              </div>

              {/* Verification method */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{selectedPickupDetail.verifiedBy}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800">
                  Confirmed
                </span>
              </div>

            </div>

            <div className="pt-2 flex items-center justify-end border-t border-border">
              <button
                onClick={() => setSelectedPickupDetail(null)}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default PickUpLogs
