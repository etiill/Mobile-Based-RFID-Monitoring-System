import { useState, useEffect, useMemo } from "react"
import { 
  Users, 
  CheckCircle, 
  Calendar, 
  Activity, 
  AlertTriangle,
  QrCode,
  ShieldCheck,
  UserCheck,
  LogOut
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import { LoadingScreen } from "../components/LoadingScreen"
import GuardianQrModal from "../components/GuardianQrModal"
import { toast } from "../components/ui/toast"

interface Guardian {
  id?: string | number
  name: string
  relation: string
  phone: string
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
  guardians: Guardian[]
  section?: Section | null
}

export function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "present" | "checked_out" | "absent">("all")

  // Guardian QR Modal state
  const [qrModalState, setQrModalState] = useState<{
    isOpen: boolean
    student: Student | null
    token: string
    expiresAt: string
  }>({
    isOpen: false,
    student: null,
    token: "",
    expiresAt: ""
  })
  const [generatingStudentId, setGeneratingStudentId] = useState<string | number | null>(null)

  const user = JSON.parse(localStorage.getItem("user") || "{}")

  const fetchDashboardData = async () => {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const localToday = `${year}-${month}-${day}`

      const studentsData = await ApiHandler.get<Student[]>("/students")
      let attendanceData = await ApiHandler.get<any[]>(`/attendance?date=${localToday}`)
      if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        attendanceData = await ApiHandler.get<any[]>(`/attendance`)
      }
      setStudents(studentsData)
      setAttendances(attendanceData)
    } catch (error) {
      console.error("Failed to load teacher dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 3000)

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

  // Helper to convert military 24-hour time to standard 12-hour AM/PM time
  const formatToStandardTime = (rawTime?: string | null) => {
    if (!rawTime || rawTime === "--:--") return "--:--"
    if (rawTime.includes("AM") || rawTime.includes("PM") || rawTime.includes("am") || rawTime.includes("pm")) {
      return rawTime
    }
    try {
      const parts = rawTime.split(":")
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10)
        const minutes = parseInt(parts[1], 10)
        const seconds = parts[2] ? parseInt(parts[2], 10) : undefined

        if (!isNaN(hours) && !isNaN(minutes)) {
          const ampm = hours >= 12 ? 'PM' : 'AM'
          hours = hours % 12
          hours = hours ? hours : 12
          const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`

          if (seconds !== undefined) {
            const strSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`
            return `${hours}:${strMinutes}:${strSeconds} ${ampm}`
          }
          return `${hours}:${strMinutes} ${ampm}`
        }
      }
    } catch {}

    try {
      const dateObj = new Date(`2000-01-01T${rawTime}`)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      }
    } catch {}

    return rawTime
  }

  // Generate QR Code handler
  const handleGenerateQr = async (student: Student) => {
    setGeneratingStudentId(student.id)
    try {
      const response = await ApiHandler.post<{
        token: string
        expires_at: string
        student: Student
      }>("/attendance/checkout-qr/generate", { student_id: student.id })

      setQrModalState({
        isOpen: true,
        student: student,
        token: response.token,
        expiresAt: response.expires_at
      })
    } catch (err: any) {
      console.error("Failed to generate QR code:", err)
      toast.add({
        title: "QR Generation Failed",
        description: err.message || "Could not generate checkout QR code.",
        type: "error"
      })
    } finally {
      setGeneratingStudentId(null)
    }
  }

  // Map students to real-time attendance records synced from admin side
  const attendanceRoster = useMemo(() => {
    return students.map((student) => {
      const record = attendances.find(a => a.student_id === student.id)
      let status: "Present" | "Late" | "Absent" | "Checked In" | "Checked Out" = "Absent"
      let timeIn = "--:--"
      let timeOut = "--:--"
      let verifiedBy = "N/A"

      if (record) {
        verifiedBy = record.verified_by || "RFID System"
        if (record.time_in) {
          timeIn = formatToStandardTime(record.time_in)
        }
        if (record.time_out) {
          timeOut = formatToStandardTime(record.time_out)
        }

        if (record.status) {
          status = record.status
        } else if (record.time_out) {
          status = "Checked Out"
        } else if (record.time_in) {
          status = "Checked In"
        }
      }

      const sectionLabel = student.section 
        ? `${student.section.year_level} - ${student.section.section_name}`
        : student.grade.replace("Grade: ", "")

      return {
        ...student,
        sectionLabel,
        status,
        timeIn,
        timeOut,
        verifiedBy
      }
    })
  }, [students, attendances])

  // Filter roster by active tab
  const filteredRoster = useMemo(() => {
    return attendanceRoster.filter(s => {
      if (activeTab === "present") {
        return (s.status === "Present" || s.status === "Checked In" || s.status === "Late") && s.timeOut === "--:--"
      }
      if (activeTab === "checked_out") {
        return s.status === "Checked Out"
      }
      if (activeTab === "absent") {
        return s.status === "Absent"
      }
      return true
    })
  }, [attendanceRoster, activeTab])

  const totalPupils = attendanceRoster.length
  const presentCount = attendanceRoster.filter(s => (s.status === "Present" || s.status === "Checked In" || s.status === "Late") && s.timeOut === "--:--").length
  const checkedOutCount = attendanceRoster.filter(s => s.status === "Checked Out").length
  const absentCount = attendanceRoster.filter(s => s.status === "Absent").length

  const stats = [
    {
      label: "Class Roster Total",
      value: `${totalPupils} Pupils`,
      change: "Grade: K-1 & K-2",
      icon: Users,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      label: "Currently Present",
      value: `${presentCount} In Class`,
      change: "Awaiting Guardian Pickup",
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      label: "Checked Out Today",
      value: `${checkedOutCount} Picked Up`,
      change: "Guardian QR Verified",
      icon: LogOut,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "Today's Absences",
      value: `${absentCount} Absent`,
      change: "Excused parents notified",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50 dark:bg-amber-950/20",
    },
  ]

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingScreen fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in text-neutral">
      
      {/* Welcome & Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary dark:text-foreground">Teacher Workspace</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, <span className="font-semibold text-primary dark:text-foreground">{user.name || "Teacher"}</span>. Manage student arrival attendance and generate secure Guardian Checkout QR Codes below.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <div className={`rounded-lg p-2 ${stat.iconBg} ${stat.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                <p className="text-xs text-muted-foreground mt-1 font-semibold">{stat.change}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Centralized Attendance Table */}
      <div className="w-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Header Controls */}
        <div className="p-5 border-b border-border bg-[#FAFBFD] dark:bg-neutral/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary dark:text-foreground">Attendance Logs</h2>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-tertiary/40 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                activeTab === "all" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-neutral bg-transparent"
              }`}
            >
              All ({attendanceRoster.length})
            </button>
            <button
              onClick={() => setActiveTab("present")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                activeTab === "present" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-neutral bg-transparent"
              }`}
            >
              Present ({presentCount})
            </button>
            <button
              onClick={() => setActiveTab("checked_out")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                activeTab === "checked_out" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-neutral bg-transparent"
              }`}
            >
              Checked Out ({checkedOutCount})
            </button>
            <button
              onClick={() => setActiveTab("absent")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                activeTab === "absent" ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:text-neutral bg-transparent"
              }`}
            >
              Absent ({absentCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold tracking-widest text-muted-foreground uppercase bg-tertiary/20">
                <th className="p-4 pl-6">Student</th>
                <th className="p-4">Class Section</th>
                <th className="p-4">RFID Tag</th>
                <th className="p-4">Time In</th>
                <th className="p-4">Time Out</th>
                <th className="p-4">Status</th>
                <th className="p-4">Verified By</th>
                <th className="p-4 pr-6 text-right">Guardian Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground font-semibold">
                    No student records matching current filter.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((student) => {
                  const isCurrentlyPresent = (student.status === "Present" || student.status === "Checked In" || student.status === "Late") && student.timeOut === "--:--"

                  return (
                    <tr key={student.id} className="border-b border-border hover:bg-tertiary/10 last:border-0">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold select-none shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-primary">{student.name}</span>
                      </td>
                      <td className="p-4 text-xs font-semibold text-muted-foreground">
                        {student.sectionLabel}
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground font-semibold">
                        {student.rfid}
                      </td>
                      <td className="p-4 text-xs font-semibold text-neutral">
                        {student.timeIn}
                      </td>
                      <td className="p-4 text-xs font-semibold text-neutral">
                        {student.timeOut}
                      </td>
                      <td className="p-4">
                        {(student.status === "Present" || student.status === "Checked In") && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30">
                            Present
                          </span>
                        )}
                        {student.status === "Late" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30">
                            Late
                          </span>
                        )}
                        {student.status === "Checked Out" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30">
                            Checked Out
                          </span>
                        )}
                        {student.status === "Absent" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/30">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground font-semibold">
                        {student.verifiedBy === "Guardian QR" ? (
                          <span className="inline-flex items-center gap-1 text-primary font-bold">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            Guardian QR
                          </span>
                        ) : (
                          student.verifiedBy
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {isCurrentlyPresent ? (
                          <button
                            onClick={() => handleGenerateQr(student)}
                            disabled={generatingStudentId === student.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all border-none cursor-pointer disabled:opacity-50"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            <span>{generatingStudentId === student.id ? "Generating..." : "Generate QR"}</span>
                          </button>
                        ) : student.status === "Checked Out" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                            <UserCheck className="h-3.5 w-3.5" />
                            Picked Up
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-semibold">N/A</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guardian Checkout QR Code Modal */}
      <GuardianQrModal
        isOpen={qrModalState.isOpen}
        onClose={() => setQrModalState(prev => ({ ...prev, isOpen: false }))}
        student={qrModalState.student}
        token={qrModalState.token}
        expiresAt={qrModalState.expiresAt}
        onCheckoutSuccess={() => {
          fetchDashboardData()
        }}
      />

    </div>
  )
}

export default TeacherDashboard


