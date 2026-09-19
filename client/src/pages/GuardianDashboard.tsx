import { useState, useEffect } from "react"
import { 
  User, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Users, 
  Activity, 
  Phone,
  QrCode,
  Camera,
  Clock,
  LogOut
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import { LoadingScreen } from "../components/LoadingScreen"
import GuardianQrScannerModal from "../components/GuardianQrScannerModal"

interface Guardian {
  id?: string | number
  name: string
  relation: string
  phone: string
  email: string
}

interface Student {
  id: string | number
  name: string
  grade: string
  rfid: string
  guardians: Guardian[]
  section?: {
    year_level: string
    section_name: string
  } | null
}

interface AttendanceRecord {
  id: number
  date: string
  time_in: string
  time_out: string | null
  status: string
  verified_by?: string
}

export function GuardianDashboard() {
  const [child, setChild] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const user = JSON.parse(localStorage.getItem("user") || "{}")

  const fetchGuardianChildData = async () => {
    try {
      const childData = await ApiHandler.get<Student>("/guardian/child")
      setChild(childData)

      if (childData && childData.id) {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const localToday = `${year}-${month}-${day}`

        let attendances = await ApiHandler.get<any[]>(`/attendance?date=${localToday}`)
        if (!Array.isArray(attendances) || attendances.length === 0) {
          attendances = await ApiHandler.get<any[]>(`/attendance`)
        }

        const match = attendances.find(a => a.student_id === childData.id)
        if (match) {
          setAttendance(match)
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
    const interval = setInterval(fetchGuardianChildData, 4000)

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

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-card border border-border rounded-2xl p-8">
        <LoadingScreen fullScreen={false} />
      </div>
    )
  }

  if (!child) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center max-w-lg mx-auto mt-8 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
          <User className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-primary dark:text-foreground">Profile Not Synced</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We couldn't retrieve any student profile linked to your guardian account. Please contact the school administration to map your email to your child's profile.
        </p>
      </div>
    )
  }

  // Determine real-time attendance status
  let childStatus = "Not Checked In Yet"
  let statusBg = "bg-amber-50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-950/20 text-amber-800"
  let statusBadge = "bg-amber-500"
  let isPresent = false

  if (attendance) {
    if (attendance.status === "Checked Out" || attendance.time_out) {
      childStatus = `Checked Out at ${attendance.time_out}`
      statusBg = "bg-blue-50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-950/20 text-blue-800"
      statusBadge = "bg-blue-500"
    } else if (attendance.time_in) {
      childStatus = `Present (Scanned in at ${attendance.time_in})`
      statusBg = "bg-emerald-50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-950/20 text-emerald-800"
      statusBadge = "bg-emerald-500"
      isPresent = true
    }
  }

  const otherGuardians = child.guardians.filter((g) => g.email !== user.email)

  const sectionLabel = child.section 
    ? `${child.section.year_level} - ${child.section.section_name}`
    : child.grade.replace("Grade: ", "")

  const timelineEvents = [
    {
      title: attendance?.time_in ? "Arrived at School Today" : "Awaiting Arrival Scan",
      desc: attendance?.time_in ? "RFID Card scanned at Kindergarten Main Entrance." : "Student has not scanned RFID tag at school gate yet.",
      time: attendance?.time_in ? `Today • ${attendance.time_in}` : "Today",
      type: attendance?.time_in ? "in" : "pending"
    },
    {
      title: attendance?.time_out ? "Picked Up & Checked Out" : "Pickup Status",
      desc: attendance?.time_out ? `Verified via ${attendance.verified_by || 'Guardian QR Scan'}.` : "Student awaiting guardian QR pickup.",
      time: attendance?.time_out ? `Today • ${attendance.time_out}` : "Pending Pickup",
      type: attendance?.time_out ? "out" : "pending"
    }
  ]

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary dark:text-foreground">
              Guardian Control Panel
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Welcome back, {user.name}. View real-time attendance and scan teacher QR code for child pickup.
            </p>
          </div>
        </div>
        
        {/* Actions Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer border-none px-4 py-3"
          >
            <Camera className="h-4 w-4 text-secondary" />
            <span>Scan Teacher's QR Code</span>
          </button>

          <div className="hidden md:flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground shadow-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* GUARDIAN QR CODE SCANNER PROMINENT CARD */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-tertiary p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-extrabold uppercase">
            <QrCode className="h-3.5 w-3.5 text-primary" />
            <span>Student Pickup Scanner</span>
          </div>
          <h2 className="text-lg font-extrabold text-primary dark:text-foreground">
            Picking up {child.name} today?
          </h2>
          <p className="text-xs text-muted-foreground font-semibold leading-relaxed max-w-lg">
            Tap the button to open your camera scanner and scan the QR code displayed on the teacher's screen to authorize pickup.
          </p>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-full md:w-auto px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-lg transition-all cursor-pointer border-none flex items-center justify-center gap-2.5 shrink-0"
        >
          <Camera className="h-5 w-5" />
          <span>Open Camera Scanner</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Child Profile Card */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Student Profile & Safety Status
            </span>
            
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xl font-extrabold select-none">
                {child.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-primary dark:text-foreground">{child.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-primary/5 text-primary border border-primary/10 px-2.5 py-0.5 text-[10px] font-bold select-none">
                    Class: {sectionLabel}
                  </span>
                  <span className="inline-flex rounded-full bg-neutral/5 text-muted-foreground border border-border px-2.5 py-0.5 text-[10px] font-bold select-none">
                    RFID: {child.rfid}
                  </span>
                </div>
              </div>
            </div>

            {/* Real-Time Attendance Status Callout */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${statusBg}`}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-bold">{childStatus}</h4>
                  <p className="text-[10px] opacity-90 mt-0.5 font-semibold">FCU Kindergarten Real-Time Database Sync</p>
                </div>
              </div>
              <span className={`rounded-full ${statusBadge} text-white px-3 py-1 text-[10px] font-bold uppercase select-none`}>
                {attendance?.status === "Checked Out" ? "CHECKED OUT" : isPresent ? "SAFE" : "NOT SCAN"}
              </span>
            </div>
          </div>

          <div className="border-t border-border mt-6 pt-6">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-4">
              Other Authorized Guardians
            </span>
            
            {otherGuardians.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No other guardians registered for this child.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {otherGuardians.map((guardian, gIdx) => (
                  <div key={gIdx} className="rounded-xl border border-border bg-white dark:bg-neutral/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral/10 text-neutral">
                        <Users className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-primary dark:text-foreground">{guardian.name}</h4>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {guardian.relation} • {guardian.phone}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 text-[8px] font-bold text-emerald-600 select-none">
                      PICKUP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Access Timeline Activity */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-5 border-b border-border">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Today's Attendance Events
            </span>
            <Activity className="h-4.5 w-4.5 text-primary" />
          </div>

          <div className="relative border-l border-border pl-5 mt-6 space-y-6 flex-1">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="relative">
                {/* Timeline Dot */}
                <div className={`absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border bg-card ${
                  evt.type === "in" ? "border-emerald-500" : evt.type === "out" ? "border-blue-500" : "border-gray-300"
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    evt.type === "in" ? "bg-emerald-500" : evt.type === "out" ? "bg-blue-500" : "bg-gray-300"
                  }`} />
                </div>
                
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-primary dark:text-foreground">{evt.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{evt.desc}</p>
                  <span className="inline-flex mt-1 text-[9px] font-semibold text-muted-foreground/80">
                    {evt.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* School Contact Support */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-between flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary dark:text-foreground">Need to authorize a temporary pickup?</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Contact the kindergarten office directly for time-bound visitor permissions.</p>
          </div>
        </div>
        <a 
          href="tel:555-0100" 
          className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all select-none border-none cursor-pointer"
        >
          Call Office
        </a>
      </div>

      {/* Guardian QR Scanner Modal */}
      <GuardianQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={fetchGuardianChildData}
      />

    </div>
  )
}

export default GuardianDashboard

