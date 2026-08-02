import { useState, useEffect, useMemo } from "react"
import { 
  ShieldCheck, 
  Scan, 
  History, 
  Download, 
  User, 
  Users, 
  Check, 
  X, 
  Clock, 
  Camera, 
  Fingerprint, 
  Info,
  CheckCircle,
  AlertTriangle,
  QrCode,
  RefreshCw
} from "lucide-react"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../../components/ui/toast"
import { LoadingScreen } from "../../components/LoadingScreen"

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
  teacher_id: string | number | null
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

interface PendingVerification {
  id: string
  guardianName: string
  relation: string
  studentName: string
  studentId: string | number
  classLabel: string
  avatarUrl?: string
}

interface VerificationHistory {
  id: string
  time: string
  date: string
  studentName: string
  guardianName: string
  relationship: string
  verifiedBy: string
  status: "Success" | "Flagged"
}

export function GuardianVerification() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modals & States
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isScanSuccessful, setIsScanSuccessful] = useState(false)
  const [scanningProgress, setScanningProgress] = useState(0)
  const [detectedGuardian, setDetectedGuardian] = useState<PendingVerification | null>(null)
  
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [selectedPending, setSelectedPending] = useState<PendingVerification | null>(null)

  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [manualStudentId, setManualStudentId] = useState("")
  const [manualGuardianId, setManualGuardianId] = useState("")

  // QR Code States
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [qrToken, setQrToken] = useState("")
  const [qrTokenExpiry, setQrTokenExpiry] = useState<number>(300)

  // Active logged-in teacher info
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
  const teacherName = currentUser.name || "Ms. Jenkins"
  const teacherId = currentUser.id

  // State arrays for pending and history list
  const [pendingList, setPendingList] = useState<PendingVerification[]>([])
  const [historyList, setHistoryList] = useState<VerificationHistory[]>([
    {
      id: "H001",
      time: "14:25",
      date: "May 24, 2026",
      studentName: "Thomas Jefferson",
      guardianName: "David Jefferson",
      relationship: "FATHER",
      verifiedBy: "Ms. Jenkins",
      status: "Success"
    },
    {
      id: "H002",
      time: "14:12",
      date: "May 24, 2026",
      studentName: "Alice Miller",
      guardianName: "Rebecca Miller",
      relationship: "MOTHER",
      verifiedBy: "Ms. Jenkins",
      status: "Success"
    }
  ])

  const authToken = localStorage.getItem("token") || ""

  // Fetch teacher registries
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [studentsData, pendingData] = await Promise.all([
          ApiHandler.get<Student[]>("/students"),
          ApiHandler.get<PendingVerification[]>("/v1/dismissal/pending")
        ])
        setStudents(studentsData)
        setPendingList(pendingData)
      } catch (error) {
        console.error("Failed to load registries:", error)
        toast.add({
          title: "Error Loading Data",
          description: "Could not fetch registries from server.",
          type: "error"
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [teacherId])

  // Setup real-time updates (SSE with polling fallback) for teacher
  useEffect(() => {
    if (!teacherId) return

    let eventSource: EventSource | null = null
    let pollInterval: any = null

    const startSSE = () => {
      const streamUrl = `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/v1/dismissal/stream?token=${authToken}&role=teacher&teacher_id=${teacherId}`
      
      eventSource = new EventSource(streamUrl)

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (Array.isArray(parsed)) {
            setPendingList(parsed)
          }
        } catch (err) {
          console.error("Error parsing SSE data:", err)
        }
      }

      eventSource.onerror = (err) => {
        console.warn("SSE connection error, falling back to polling...", err)
        if (eventSource) {
          eventSource.close()
        }
        startPolling()
      }
    }

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval)
      
      const fetchPending = async () => {
        try {
          const res = await ApiHandler.get<PendingVerification[]>("/v1/dismissal/pending")
          setPendingList(res)
        } catch (err) {
          console.error("Failed to poll pending list:", err)
        }
      }

      // Initial check
      fetchPending()
      // Poll every 3.5 seconds
      pollInterval = setInterval(fetchPending, 3500)
    }

    // Try starting Server-Sent Events first
    startSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [teacherId, authToken])

  const fetchNewQrToken = async () => {
    try {
      const res = await ApiHandler.post<{ token: string; expires_at: string }>("/v1/dismissal/generate-token")
      setQrToken(res.token)
      setQrTokenExpiry(300)
    } catch (err: any) {
      console.error("Failed to generate QR token:", err)
      toast.add({
        title: "QR Error",
        description: err.message || "Failed to generate dynamic Station QR.",
        type: "error"
      })
    }
  }

  // Handle QR Modal opening
  const handleOpenQrModal = () => {
    setIsQrModalOpen(true)
    fetchNewQrToken()
  }

  // QR Token countdown effect
  useEffect(() => {
    if (!isQrModalOpen || !qrToken) return

    const timer = setInterval(() => {
      setQrTokenExpiry((prev) => {
        if (prev <= 1) {
          fetchNewQrToken()
          return 300
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isQrModalOpen, qrToken])

  // Simulate RFID/Face ID scanner scanning progress
  useEffect(() => {
    let interval: any
    if (isScannerOpen && !isScanSuccessful) {
      interval = setInterval(() => {
        setScanningProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsScanSuccessful(true)
            // Pick a random pending guardian to match scanner results
            if (pendingList.length > 0) {
              const randomIndex = Math.floor(Math.random() * pendingList.length)
              setDetectedGuardian(pendingList[randomIndex])
            }
            return 100
          }
          return prev + 10
        })
      }, 200)
    }
    return () => clearInterval(interval)
  }, [isScannerOpen, isScanSuccessful, pendingList])

  // Trigger verify details confirmation modal
  const handleVerifyClick = (pending: PendingVerification) => {
    setSelectedPending(pending)
    setIsVerifyModalOpen(true)
  }

  // Confirm verification, remove from pending, and add to history
  const handleConfirmVerification = async (status: "Success" | "Flagged") => {
    const activeItem = selectedPending || detectedGuardian
    if (!activeItem) return

    try {
      await ApiHandler.post(`/v1/dismissal/verify/${activeItem.id}`, {
        status: status === "Success" ? "success" : "flagged"
      })

      const now = new Date()
      const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const dateString = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

      // Add to history log
      const newRecord: VerificationHistory = {
        id: `H00${historyList.length + 1}`,
        time: timeString,
        date: dateString,
        studentName: activeItem.studentName,
        guardianName: activeItem.guardianName,
        relationship: activeItem.relation,
        verifiedBy: teacherName,
        status
      }

      setHistoryList(prev => [newRecord, ...prev])
      setPendingList(prev => prev.filter(item => item.id !== activeItem.id))

      toast.add({
        title: status === "Success" ? "Guardian Approved" : "Verification Flagged",
        description: status === "Success"
          ? `Successfully logged secure student dismissal handover for ${activeItem.studentName}.`
          : `Handover flagged. Parent/Guardian access was marked suspicious.`,
        type: status === "Success" ? "success" : "error"
      })
    } catch (err: any) {
      toast.add({
        title: "Verification Failed",
        description: err.message || "Failed to log verification on server.",
        type: "error"
      })
    }

    // Reset modals
    setIsVerifyModalOpen(false)
    setSelectedPending(null)
    setIsScannerOpen(false)
    setIsScanSuccessful(false)
    setScanningProgress(0)
    setDetectedGuardian(null)
  }

  // Trigger simulated scan launch
  const handleLaunchScanner = () => {
    setScanningProgress(0)
    setIsScanSuccessful(false)
    setDetectedGuardian(null)
    setIsScannerOpen(true)
  }

  // Manual pickup submit handler
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualStudentId || !manualGuardianId) {
      toast.add({
        title: "Validation Error",
        description: "Please select both a student and an authorized guardian.",
        type: "error"
      })
      return
    }

    const studentObj = students.find(s => s.id.toString() === manualStudentId.toString())
    if (!studentObj) return

    const guardianObj = studentObj.guardians.find(g => g.id?.toString() === manualGuardianId.toString())
    if (!guardianObj) return

    try {
      await ApiHandler.post("/v1/dismissal/manual", {
        student_id: studentObj.id,
        guardian_id: guardianObj.id,
      })

      const now = new Date()
      const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const dateString = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

      const newRecord: VerificationHistory = {
        id: `H00${historyList.length + 1}`,
        time: timeString,
        date: dateString,
        studentName: studentObj.name,
        guardianName: guardianObj.name,
        relationship: guardianObj.relation.toUpperCase(),
        verifiedBy: teacherName,
        status: "Success"
      }

      setHistoryList(prev => [newRecord, ...prev])
      
      // Remove from pending if match exists
      setPendingList(prev => prev.filter(item => item.studentName.toLowerCase() !== studentObj.name.toLowerCase()))

      toast.add({
        title: "Manual Verification Logged",
        description: `Manual dismissal check-in created for ${studentObj.name}.`,
        type: "success"
      })
    } catch (err: any) {
      toast.add({
        title: "Check-in Failed",
        description: err.message || "Failed to log manual dismissal on server.",
        type: "error"
      })
    }

    // Reset
    setIsManualModalOpen(false)
    setManualStudentId("")
    setManualGuardianId("")
  }

  // Fetch potential guardians for manual dropdown
  const selectedStudentGuardians = useMemo(() => {
    const stud = students.find(s => s.id.toString() === manualStudentId.toString())
    return stud ? stud.guardians : []
  }, [students, manualStudentId])

  // Filter students to teacher's section only
  const teacherStudents = useMemo(() => {
    return students.filter(s => s.section?.teacher_id?.toString() === teacherId?.toString())
  }, [students, teacherId])

  // Export CSV Report
  const handleExportCSV = () => {
    if (historyList.length === 0) {
      toast.add({
        title: "No History Logs",
        description: "There are no verification history entries to export.",
        type: "error"
      })
      return
    }

    let csvContent = "data:text/csv;charset=utf-8,"
      + "Time,Date,Student Name,Guardian Name,Relationship,Verified By,Status\n"

    historyList.forEach(h => {
      const row = [
        `"${h.time}"`,
        `"${h.date}"`,
        `"${h.studentName}"`,
        `"${h.guardianName}"`,
        `"${h.relationship}"`,
        `"${h.verifiedBy}"`,
        `"${h.status}"`
      ].join(",")
      csvContent += row + "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Guardian_Verification_Report_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.add({
      title: "Report Exported",
      description: "Guardian handovers spreadsheet downloaded successfully.",
      type: "success"
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-card border border-border rounded-2xl p-8">
        <LoadingScreen fullScreen={true} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in text-neutral font-sans">
      
      {/* Welcome Safe & Secure Pickup Banner */}
      <div className="bg-white dark:bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            Safe & Secure Pickup
          </h1>
          <p className="text-muted-foreground max-w-2xl text-xs sm:text-sm font-semibold leading-relaxed">
            Ready to verify a guardian for end-of-day dismissal? Display the Station QR code for secure student handovers.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 pt-1">
          <button
            onClick={handleOpenQrModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer border-none"
          >
            <QrCode className="h-4 w-4" />
            <span>SHOW STATION QR</span>
          </button>
        </div>
      </div>

      {/* Pending Verifications Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-primary">Pending Verifications</h2>
          </div>
          {pendingList.length > 0 && (
            <span className="rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/30 px-3 py-1 text-[10px] font-bold select-none uppercase">
              • {pendingList.length} Waiting
            </span>
          )}
        </div>

        {pendingList.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground font-bold space-y-2">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto animate-bounce" />
            <h3>No pending pickups</h3>
            <p className="text-xs font-semibold max-w-xs mx-auto">
              All student handovers have been securely cleared and verified.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pendingList.map((pending) => {
              const initials = pending.guardianName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
              
              return (
                <div key={pending.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-border/80 transition-all">
                  
                  {/* Card Header info */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs select-none">
                          {initials}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-primary truncate max-w-[120px]">
                            {pending.guardianName}
                          </h4>
                          <span className="text-[9px] text-muted-foreground font-bold tracking-wide uppercase mt-0.5 block">
                            {pending.relation}
                          </span>
                        </div>
                      </div>
                      <div className="text-primary opacity-60">
                        <User className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Middle details mapping */}
                    <div className="border-t border-border pt-3.5 space-y-2 text-[11px] font-semibold text-neutral">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Student:</span>
                        <span className="font-bold text-primary">{pending.studentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Class:</span>
                        <span className="font-semibold text-neutral">{pending.classLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dismiss card verify button */}
                  <button
                    onClick={() => handleVerifyClick(pending)}
                    className="w-full mt-5 bg-primary hover:opacity-90 active:scale-[0.99] text-xs font-bold text-white py-2.5 rounded-xl border-none shadow-sm cursor-pointer transition-all"
                  >
                    Verify Access
                  </button>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Verification History Table section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-primary">Verification History</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white dark:bg-card px-4 py-2 text-xs font-bold text-neutral hover:bg-tertiary transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>
            
            <select className="rounded-xl border border-border bg-white dark:bg-card px-3.5 py-2 text-xs font-bold text-neutral outline-none cursor-pointer">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>
        </div>

        {/* Roster table content */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-border bg-tertiary/30 text-muted-foreground font-bold select-none uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Time</th>
                  <th className="px-6 py-4 font-bold">Student Name</th>
                  <th className="px-6 py-4 font-bold">Guardian Name</th>
                  <th className="px-6 py-4 font-bold">Relationship</th>
                  <th className="px-6 py-4 font-bold">Verified By</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold text-neutral">
                {historyList.map((log) => {
                  const studentInitials = log.studentName.charAt(0)
                  return (
                    <tr key={log.id} className="hover:bg-tertiary/10 transition-colors">
                      {/* Time Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral text-xs">{log.time}</span>
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                            {log.date}
                          </span>
                        </div>
                      </td>

                      {/* Student Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 select-none font-bold text-[10px] shrink-0">
                            {studentInitials}
                          </div>
                          <span className="font-bold text-primary text-xs">{log.studentName}</span>
                        </div>
                      </td>

                      {/* Guardian Name */}
                      <td className="px-6 py-4 whitespace-nowrap text-neutral">
                        {log.guardianName}
                      </td>

                      {/* Relationship */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex rounded bg-tertiary border border-border px-2 py-0.5 text-[9px] font-bold text-muted-foreground select-none uppercase">
                          {log.relationship}
                        </span>
                      </td>

                      {/* Verified By */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[8px] select-none uppercase shrink-0">
                            {log.verifiedBy.charAt(0)}
                          </div>
                          <span className="text-xs text-neutral">{log.verifiedBy}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.status === "Success" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold select-none uppercase">
                            <Check className="h-2.5 w-2.5 mr-1" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 text-[9px] font-bold select-none uppercase">
                            <X className="h-2.5 w-2.5 mr-1" />
                            Flagged
                          </span>
                        )}
                      </td>

                      {/* Action details trigger */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            toast.add({
                              title: "Secure Verification Log",
                              description: `This dismissal handover was verified by ${log.verifiedBy} via RFID node on ${log.date} at ${log.time}.`,
                              type: "info"
                            })
                          }}
                          className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent mx-auto block"
                          title="View Info"
                        >
                          <Info className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: SCANNER SIMULATION VIEW */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-border text-neutral text-xs font-sans">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Camera className="h-5 w-5 text-secondary animate-pulse" />
                <span>Simulated Face-ID & RFID Scanner</span>
              </div>
              <button
                onClick={() => {
                  setIsScannerOpen(false)
                  setIsScanSuccessful(false)
                }}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 mt-5 text-center">
              {!isScanSuccessful ? (
                <div className="space-y-4">
                  {/* Visual scanner viewfinder block */}
                  <div className="relative w-64 h-48 mx-auto border-2 border-dashed border-secondary/60 rounded-2xl bg-[#090D1A] overflow-hidden flex flex-col items-center justify-center shadow-inner">
                    <Fingerprint className="h-16 w-16 text-secondary/40 animate-pulse" />
                    <div className="absolute inset-x-0 top-0 h-1 bg-secondary animate-scanner-laser shadow-secondary shadow-md" />
                    <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-4 animate-pulse">
                      Positioning RFID / Face
                    </span>
                  </div>

                  <div className="space-y-2 max-w-xs mx-auto">
                    <div className="w-full bg-tertiary h-2 rounded-full overflow-hidden border border-border">
                      <div className="bg-secondary h-full transition-all duration-200" style={{ width: `${scanningProgress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Scanning nodes... {scanningProgress}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in scale-in duration-200">
                  {detectedGuardian ? (
                    <div className="space-y-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold mx-auto text-lg shadow-sm">
                        <Check className="h-7 w-7" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-extrabold text-primary">Guardian Detected!</h3>
                        <p className="text-muted-foreground text-[11px] leading-relaxed max-w-xs mx-auto">
                          Scanner recognized parent card matches registered guardian profiles in our system.
                        </p>
                      </div>

                      {/* Scanned Guardian profile card layout */}
                      <div className="max-w-xs mx-auto border border-border rounded-2xl bg-tertiary/20 p-4 space-y-3.5 text-left font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs select-none shrink-0">
                            {detectedGuardian.guardianName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-primary">{detectedGuardian.guardianName}</h4>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase block mt-0.5">
                              {detectedGuardian.relation}
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-border/80 pt-3 flex flex-col gap-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Authorized student:</span>
                            <span className="font-bold text-primary">{detectedGuardian.studentName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Class Section:</span>
                            <span>{detectedGuardian.classLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Approve dismissal actions */}
                      <div className="flex gap-3 max-w-xs mx-auto pt-2">
                        <button
                          onClick={() => handleConfirmVerification("Flagged")}
                          className="flex-1 bg-transparent hover:bg-red-50 border border-red-200 text-red-600 font-bold py-2.5 rounded-xl cursor-pointer text-xs transition-all"
                        >
                          Flag Access
                        </button>
                        <button
                          onClick={() => handleConfirmVerification("Success")}
                          className="flex-1 bg-primary hover:opacity-90 text-white font-bold py-2.5 rounded-xl border-none shadow-sm cursor-pointer text-xs transition-all"
                        >
                          Approve Pickup
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-bold mx-auto text-lg shadow-sm">
                        <AlertTriangle className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-primary">Unidentified Tag</h3>
                        <p className="text-muted-foreground text-[11px] leading-relaxed max-w-xs mx-auto">
                          No registered parent guardian credentials were found matching this card.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsScanSuccessful(false)
                          setScanningProgress(0)
                        }}
                        className="bg-primary hover:opacity-90 text-white font-bold px-6 py-2.5 rounded-xl border-none shadow-sm cursor-pointer text-xs transition-all mx-auto block"
                      >
                        Try scanning again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VERIFY ACCESS CONFIRMATION DIALOG */}
      {isVerifyModalOpen && selectedPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border text-neutral text-xs font-sans">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">Dismissal Access Verification</h2>
              <button
                onClick={() => {
                  setIsVerifyModalOpen(false)
                  setSelectedPending(null)
                }}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 mt-4 font-sans font-semibold">
              <div className="p-4 rounded-xl border border-border bg-tertiary/20 space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs">
                    {selectedPending.guardianName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary">{selectedPending.guardianName}</h3>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block mt-0.5">
                      {selectedPending.relation}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-3.5 space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Authorized student:</span>
                    <span className="font-bold text-primary">{selectedPending.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class section:</span>
                    <span>{selectedPending.classLabel}</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                Confirming pickup logs an automatic timestamp in the database and releases the student. Do you approve handover access?
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleConfirmVerification("Flagged")}
                  className="flex-1 bg-transparent hover:bg-red-50 border border-red-200 text-red-600 font-bold py-2.5 rounded-xl cursor-pointer text-xs transition-all"
                >
                  Flag Access
                </button>
                <button
                  onClick={() => handleConfirmVerification("Success")}
                  className="flex-1 bg-primary hover:opacity-90 text-white font-bold py-2.5 rounded-xl border-none shadow-sm cursor-pointer text-xs transition-all"
                >
                  Approve Dismissal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MANUAL HANDOVER CHECK-IN */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border text-neutral text-xs font-sans">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">Manual Dismissal Log</h2>
              <button
                onClick={() => {
                  setIsManualModalOpen(false)
                  setManualStudentId("")
                  setManualGuardianId("")
                }}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-4 mt-4 font-sans font-bold">
              {/* Select Student */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral/80 font-bold">Select Student</label>
                <select
                  value={manualStudentId}
                  onChange={(e) => {
                    setManualStudentId(e.target.value)
                    setManualGuardianId("")
                  }}
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer"
                  required
                >
                  <option value="">-- Choose student --</option>
                  {teacherStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (S{String(s.id).padStart(3, "0")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Guardian */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral/80 font-bold">Authorized Pick-up Guardian</label>
                <select
                  value={manualGuardianId}
                  onChange={(e) => setManualGuardianId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer"
                  disabled={!manualStudentId}
                  required
                >
                  <option value="">-- Choose guardian relation --</option>
                  {selectedStudentGuardians.map(g => (
                    <option key={g.id || g.name} value={g.id || g.name}>
                      {g.name} ({g.relation})
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudentGuardians.length === 0 && manualStudentId && (
                <p className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                  Warning: No authorized guardians are configured for this student. Handovers require registered profiles.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualModalOpen(false)
                    setManualStudentId("")
                    setManualGuardianId("")
                  }}
                  className="px-5 py-2.5 rounded-lg border border-border bg-white text-neutral hover:bg-tertiary text-xs transition-all cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!manualStudentId || selectedStudentGuardians.length === 0}
                  className="px-6 py-2.5 rounded-lg bg-primary text-white text-xs hover:opacity-90 font-bold border-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Dismissal Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DYNAMIC STATION QR CODE */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border text-neutral text-xs font-sans">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                <span>Station / Gate QR Code</span>
              </h2>
              <button
                onClick={() => {
                  setIsQrModalOpen(false)
                  setQrToken("")
                }}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 mt-6 flex flex-col items-center justify-center font-sans font-semibold">
              <p className="text-[11px] text-muted-foreground text-center font-medium leading-relaxed max-w-xs">
                Guardians should scan this code at the gate/classroom to verify their pickup ticket. The token refreshes automatically.
              </p>

              {/* QR Image Frame */}
              <div className="relative p-4 bg-white rounded-2xl border border-border/80 shadow-md">
                {qrToken ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrToken}`}
                    alt="Station Gate QR Code"
                    className="w-[200px] h-[200px] block"
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground bg-tertiary/20 rounded-xl">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>

              {/* Countdown and token copy helper */}
              {qrToken && (
                <div className="w-full space-y-4 text-center">
                  <div className="flex justify-center items-center gap-1.5 text-xs">
                    <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                    <span className="text-muted-foreground">Token expires in:</span>
                    <span className="font-mono font-extrabold text-amber-600">
                      {Math.floor(qrTokenExpiry / 60)}m {qrTokenExpiry % 60}s
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-border/80 rounded-xl space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground font-bold">ACTIVE DEV TOKEN:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(qrToken)
                          toast.add({
                            title: "Token Copied",
                            description: "Copied to clipboard for Simulator testing.",
                            type: "success"
                          })
                        }}
                        className="text-primary font-bold hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Copy Token
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-neutral-800 break-all select-all font-bold">
                      {qrToken}
                    </div>
                  </div>
                </div>
              )}

              {/* Manual refresh button */}
              <button
                onClick={fetchNewQrToken}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-neutral cursor-pointer border-none transition-all"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span>REGENERATE STATION QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default GuardianVerification