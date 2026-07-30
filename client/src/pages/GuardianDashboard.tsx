import { useState, useEffect } from "react"
import { 
  User, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Users, 
  Activity, 
  Phone
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import { LoadingScreen } from "../components/LoadingScreen"

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
}

export function GuardianDashboard() {
  const [child, setChild] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  useEffect(() => {
    const fetchChild = async () => {
      try {
        const data = await ApiHandler.get<Student>("/guardian/child")
        setChild(data)
      } catch (error) {
        console.error("Failed to load child details:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchChild()
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

  // Deterministic daily status mock logic for child
  const childStatus = "Checked In"
  const checkInTime = "08:15 AM"

  const otherGuardians = child.guardians.filter((g) => g.email !== user.email)

  const timelineEvents = [
    {
      title: "Arrived at School",
      desc: "RFID Card scanned at Kindergarten Main Entrance.",
      time: "Today • 08:15 AM",
      type: "in"
    },
    {
      title: "Departed School",
      desc: "Checked out by Sarah Johnson (Mother).",
      time: "Yesterday • 03:45 PM",
      type: "out"
    },
    {
      title: "Arrived at School",
      desc: "RFID Card scanned at Kindergarten Main Entrance.",
      time: "Yesterday • 08:08 AM",
      type: "in"
    },
    {
      title: "Departed School",
      desc: "Checked out by Michael Johnson (Father).",
      time: "2 days ago • 03:30 PM",
      type: "out"
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
              Welcome back, {user.name}. View real-time attendance and safety records for your child.
            </p>
          </div>
        </div>
        
        {/* Quick Date Display */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground shadow-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Child Profile Card */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Student Profile
            </span>
            
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xl font-extrabold select-none">
                {child.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-primary dark:text-foreground">{child.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-primary/5 text-primary border border-primary/10 px-2.5 py-0.5 text-[10px] font-bold select-none">
                    {child.grade}
                  </span>
                  <span className="inline-flex rounded-full bg-neutral/5 text-muted-foreground border border-border px-2.5 py-0.5 text-[10px] font-bold select-none">
                    RFID: {child.rfid}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Status Callout */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Current Status: {childStatus}</h4>
                  <p className="text-[10px] text-emerald-600/90 dark:text-emerald-500 mt-0.5">Scanned in at {checkInTime}</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500 text-white px-3 py-1 text-[10px] font-bold uppercase select-none">
                SAFE
              </span>
            </div>
          </div>

          <div className="border-t border-border mt-6 pt-6">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-4">
              Other Authorized Pickups
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
              Recent Scans Timeline
            </span>
            <Activity className="h-4.5 w-4.5 text-primary" />
          </div>

          <div className="relative border-l border-border pl-5 mt-6 space-y-6 flex-1">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="relative">
                {/* Timeline Dot */}
                <div className={`absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border bg-card ${
                  evt.type === "in" ? "border-emerald-500" : "border-amber-500"
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    evt.type === "in" ? "bg-emerald-500" : "bg-amber-500"
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

    </div>
  )
}

export default GuardianDashboard
