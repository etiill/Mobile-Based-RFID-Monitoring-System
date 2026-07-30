import { useState, useEffect } from "react"
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Shield,
  Activity,
  AlertTriangle
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import { LoadingScreen } from "../components/LoadingScreen"

interface Guardian {
  id?: string | number
  name: string
  relation: string
  phone: string
}

interface Student {
  id: string | number
  name: string
  grade: string
  rfid: string
  guardians: Guardian[]
}

export function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await ApiHandler.get<Student[]>("/students")
        setStudents(data)
      } catch (error) {
        console.error("Failed to load students:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStudents()
  }, [])

  // Mock attendance status based on student data
  const attendanceData = students.map((student, index) => {
    // Distribute status mock-style but deterministic
    let status: "Checked In" | "Checked Out" | "Absent" = "Checked In"
    let time = "08:15 AM"
    
    if (index % 5 === 0) {
      status = "Absent"
      time = "-"
    } else if (index % 4 === 0) {
      status = "Checked Out"
      time = "03:30 PM"
    } else if (index % 3 === 0) {
      status = "Checked In"
      time = "08:22 AM"
    }

    return {
      ...student,
      status,
      time
    }
  })

  const totalPupils = attendanceData.length
  const presentCount = attendanceData.filter(s => s.status === "Checked In").length
  const checkoutCount = attendanceData.filter(s => s.status === "Checked Out").length
  const absentCount = attendanceData.filter(s => s.status === "Absent").length

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
      change: `${checkoutCount} Checked Out`,
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/20",
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

  // Mock activity logs
  const activityLogs = [
    {
      student: "Emma Johnson",
      event: "Checked Out by Sarah Johnson (Mother)",
      time: "03:45 PM",
      type: "out"
    },
    {
      student: "Liam Chen",
      event: "Checked Out by Michael Chen (Father)",
      time: "03:30 PM",
      type: "out"
    },
    {
      student: "Sophia Martinez",
      event: "Checked In via RFID Scanner Front Gates",
      time: "08:22 AM",
      type: "in"
    },
    {
      student: "Noah Wilson",
      event: "Checked In via RFID Scanner Front Gates",
      time: "08:15 AM",
      type: "in"
    },
    {
      student: "Emma Johnson",
      event: "Checked In via RFID Scanner Front Gates",
      time: "08:12 AM",
      type: "in"
    }
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
            Welcome back, <span className="font-semibold text-primary dark:text-foreground">{user.name || "Teacher"}</span>. Manage your classrooms' daily RFID attendances below.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <div className={`rounded-lg p-2 ${stat.iconBg} ${stat.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                <p className="text-xs text-muted-foreground mt-1 font-semibold">{stat.change}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Side: Attendance Roster */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border bg-[#FAFBFD] dark:bg-neutral/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4.5 w-4.5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary dark:text-foreground">Attendance Roster</h2>
            </div>
            <span className="text-[10px] bg-primary/10 text-primary dark:text-foreground px-2.5 py-1 rounded-full font-bold">
              Real-Time Feed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold tracking-widest text-muted-foreground uppercase bg-tertiary/20">
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">RFID Tag</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6">Time</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((student) => (
                  <tr key={student.id} className="border-b border-border hover:bg-tertiary/10 last:border-0">
                    <td className="p-4 pl-6 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold select-none shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold">{student.name}</span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-muted-foreground">
                      {student.grade.replace("Grade: ", "")}
                    </td>
                    <td className="p-4 text-xs font-mono text-muted-foreground font-semibold">
                      {student.rfid}
                    </td>
                    <td className="p-4">
                      {student.status === "Checked In" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30">
                          Checked In
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
                    <td className="p-4 pr-6 text-xs text-muted-foreground font-semibold">
                      {student.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Scan Logs Feed */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border bg-[#FAFBFD] dark:bg-neutral/5 flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary dark:text-foreground">Recent Scan Activity</h2>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {activityLogs.map((log, index) => (
              <div key={index} className="flex gap-3 text-xs leading-relaxed border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div className="mt-0.5">
                  {log.type === "in" ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/20">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/20">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-neutral">
                    {log.student}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {log.event}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-semibold">
                    <Clock className="h-3 w-3" />
                    <span>{log.time}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default TeacherDashboard
