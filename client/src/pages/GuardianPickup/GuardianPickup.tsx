import { useState, useEffect, useRef } from "react"
import { 
  QrCode, 
  User, 
  Camera, 
  Info, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  X,
  Send,
  HelpCircle
} from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../../components/ui/toast"
import { LoadingScreen } from "../../components/LoadingScreen"

interface Student {
  id: string | number
  name: string
  grade: string
  rfid: string
}

export function GuardianPickup() {
  const [child, setChild] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pickupStatus, setPickupStatus] = useState<string>("Idle") // "Idle" | "Request Sent - Awaiting Teacher Approval" | "Dismissal Approved (SUCCESS)" | "Flagged" | "Rejected"
  
  // Camera scanning states
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  // Simulator states for dev environments
  const [showSimulator, setShowSimulator] = useState(false)
  const [simulatedToken, setSimulatedToken] = useState("")

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const authToken = localStorage.getItem("token") || ""

  // Fetch child info on load
  useEffect(() => {
    const fetchChild = async () => {
      try {
        const data = await ApiHandler.get<Student>("/guardian/child")
        setChild(data)
      } catch (error) {
        console.error("Failed to load child details:", error)
        // Fallback to localStorage user mapping if API fails
        if (user.student) {
          setChild(user.student)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchChild()
  }, [])

  // Setup real-time updates (SSE with polling fallback)
  useEffect(() => {
    if (!child) return

    let eventSource: EventSource | null = null
    let pollInterval: any = null

    const handleStatusUpdate = (statusData: any) => {
      if (statusData && statusData.status) {
        if (statusData.status === "idle") {
          setPickupStatus("Idle")
        } else if (statusData.status === "Request Sent - Awaiting Teacher Approval") {
          setPickupStatus("Request Sent - Awaiting Teacher Approval")
        } else if (statusData.status === "Dismissal Approved (SUCCESS)") {
          setPickupStatus("Dismissal Approved (SUCCESS)")
        } else if (statusData.status === "Flagged") {
          setPickupStatus("Flagged")
        } else if (statusData.status === "Rejected") {
          setPickupStatus("Rejected")
        }
      }
    }

    const startSSE = () => {
      const streamUrl = `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/v1/dismissal/stream?token=${authToken}&role=guardian&student_id=${child.id}`
      
      eventSource = new EventSource(streamUrl)

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          handleStatusUpdate(parsed)
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
      
      const fetchStatus = async () => {
        try {
          const res = await ApiHandler.get<{ status: string }>(`/v1/dismissal/status/${child.id}`)
          handleStatusUpdate(res)
        } catch (err) {
          console.error("Failed to poll child status:", err)
        }
      }

      // Initial check
      fetchStatus()
      // Poll every 3 seconds
      pollInterval = setInterval(fetchStatus, 3000)
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
  }, [child, authToken])

  // Stop camera scan helper
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop()
      } catch (err) {
        console.error("Failed to stop scanner:", err)
      }
    }
    setIsScanning(false)
  }

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Unmount cleanup failed:", err))
      }
    }
  }, [])

  // Start Camera scanning process
  const handleStartScanning = async () => {
    setCameraError(null)
    setIsScanning(true)

    // Give the DOM a moment to mount the target div
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader")
        html5QrCodeRef.current = scanner

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 } 
        }

        await scanner.start(
          { facingMode: "environment" }, 
          config,
          async (decodedText) => {
            // QR Code scanned successfully
            await stopScanner()
            handleSubmitToken(decodedText)
          },
          () => {
            // Ignore scan failure logs to avoid spam
          }
        )
      } catch (err: any) {
        console.error("Camera access failed:", err)
        setCameraError(err.message || "Unable to access back camera. Please verify permission or try Simulator.")
        setIsScanning(false)
      }
    }, 100)
  }

  // Handle Token submit (either scanned or typed in simulator)
  const handleSubmitToken = async (token: string) => {
    if (!token.trim()) return

    try {
      const response = await ApiHandler.post<{ message: string; log: any }>("/v1/dismissal/request-pickup", {
        station_token: token,
        guardian_id: user.id,
        student_id: child?.id,
      })

      toast.add({
        title: "Request Submitted",
        description: response.message || "Awaiting teacher confirmation.",
        type: "success"
      })

      setPickupStatus("Request Sent - Awaiting Teacher Approval")
      setSimulatedToken("")
      setShowSimulator(false)
    } catch (err: any) {
      toast.add({
        title: "Scanning Error",
        description: err.message || "Verification request failed.",
        type: "error"
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-card border border-border rounded-2xl p-8">
        <LoadingScreen fullScreen={true} />
      </div>
    )
  }

  if (!child) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center max-w-lg mx-auto mt-8 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
          <User className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-primary dark:text-foreground">Profile Sync Required</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          No child profile mapping could be retrieved. Contact kindergarten administrators to map your account correctly.
        </p>
      </div>
    )
  }

  // Deterministic styling mapping for the pickup status banner
  const getBannerConfig = () => {
    switch (pickupStatus) {
      case "Dismissal Approved (SUCCESS)":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30",
          text: "text-emerald-700 dark:text-emerald-400",
          desc: "Dismissal approved! Handover completed securely.",
          icon: CheckCircle
        }
      case "Request Sent - Awaiting Teacher Approval":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30",
          text: "text-amber-700 dark:text-amber-400",
          desc: "Request sent. Please wait for the teacher to verify your identity.",
          icon: Clock
        }
      case "Flagged":
        return {
          bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30",
          text: "text-red-700 dark:text-red-400",
          desc: "Verification flagged. Please report to the class gate directly.",
          icon: AlertTriangle
        }
      case "Rejected":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30",
          text: "text-rose-700 dark:text-rose-400",
          desc: "Pickup request rejected. Please verify with the teacher.",
          icon: X
        }
      default:
        return {
          bg: "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800",
          text: "text-slate-700 dark:text-slate-400",
          desc: "Scan the teacher's gate/classroom screen QR code to request pickup.",
          icon: Info
        }
    }
  }

  const banner = getBannerConfig()
  const StatusIcon = banner.icon

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-neutral font-sans p-2">
      
      {/* Title & Introduction */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Guardian Pickup Desk</h1>
        <p className="text-muted-foreground mt-1.5 text-xs sm:text-sm font-semibold">
          Authorize your child's end-of-day checkout by scanning the teacher's station screen QR code.
        </p>
      </div>

      {/* Real-time Status Banner */}
      <div className={`border rounded-2xl p-5 md:p-6 transition-all duration-300 ${banner.bg}`}>
        <div className="flex items-start gap-4">
          <div className="mt-0.5 shrink-0">
            <StatusIcon className={`h-6 w-6 ${banner.text}`} />
          </div>
          <div className="space-y-1">
            <h2 className={`text-base font-extrabold uppercase tracking-wider ${banner.text}`}>
              {pickupStatus === "Idle" ? "Idle - Ready" : pickupStatus}
            </h2>
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
              {banner.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Layout Split: Left (Student Info), Right (Scanner Action) */}
      <div className="grid gap-6 md:grid-cols-5">
        
        {/* Student Details Card */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-3">
            Student Profile
          </h3>
          
          <div className="flex flex-col items-center py-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-border/50">
            <div className="h-16 w-16 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
              <User className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h4 className="font-extrabold text-neutral text-lg">{child.name}</h4>
              <p className="text-xs text-muted-foreground font-bold mt-0.5">Grade Level: {child.grade}</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-semibold">Student RFID:</span>
              <span className="font-mono bg-border/40 text-neutral px-2.5 py-1 rounded-md text-[10px] font-bold">
                {child.rfid}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-semibold">Guardian Access:</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                {user.name} ({user.relation || "Mother"})
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-border/50 pt-3">
              <span className="text-muted-foreground font-semibold">Handover Status:</span>
              <span className={`font-bold select-none ${
                pickupStatus.includes("SUCCESS") ? "text-emerald-500" :
                pickupStatus.includes("Awaiting") ? "text-amber-500" : "text-primary"
              }`}>
                {pickupStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Action Panel: Scanner Target Area */}
        <div className="md:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-6">
          
          {/* Top Instruction Panel */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-3">
              Gate Handshake
            </h3>
            
            {!isScanning ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                  Scan the dynamic QR code projected on the classroom door, teacher screen, or gate kiosk. Once scanned, a pickup ticket is issued to the teacher for immediate verification.
                </p>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border border-border/60 rounded-xl space-y-3 text-xs">
                  <h4 className="font-extrabold flex items-center gap-1.5 text-neutral">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    How does it work?
                  </h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground font-medium">
                    <li>Teacher generates a dynamic QR code.</li>
                    <li>Guardian scans it using their mobile camera.</li>
                    <li>Teacher receives the confirmation request.</li>
                    <li>Handover logs are completed securely.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-semibold">
                Point your device's camera towards the gate monitor QR Code.
              </p>
            )}
          </div>

          {/* Scanner / Camera View Container */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            {isScanning ? (
              <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden border-2 border-primary shadow-lg bg-black">
                <div id="reader" className="w-full h-full"></div>
                <button
                  onClick={stopScanner}
                  className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer transition-colors z-20"
                >
                  <X size={16} />
                </button>
                <div className="absolute inset-0 border border-primary/20 pointer-events-none flex items-center justify-center">
                  <div className="w-[80%] h-[80%] border-2 border-dashed border-white/40 rounded-xl animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto text-primary animate-pulse">
                  <QrCode className="h-10 w-10" />
                </div>
                
                {cameraError && (
                  <div className="max-w-xs mx-auto p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
                    {cameraError}
                  </div>
                )}

                <button
                  onClick={handleStartScanning}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:opacity-90 active:scale-[0.99] transition-all px-8 py-4 text-xs font-bold text-white shadow-md cursor-pointer border-none"
                >
                  <Camera className="h-4 w-4" />
                  <span>START CAMERA SCANNER</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Action bar (Developer Simulator Toggle) */}
          <div className="pt-4 border-t border-border flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-semibold">Running in dev environment?</span>
            <button
              onClick={() => {
                if (isScanning) stopScanner()
                setShowSimulator(!showSimulator)
              }}
              className="font-bold text-primary hover:underline cursor-pointer bg-transparent border-none"
            >
              {showSimulator ? "Hide Simulator" : "Use Scan Simulator"}
            </button>
          </div>

          {/* Expanded Simulation Input */}
          {showSimulator && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border border-dashed border-border rounded-xl space-y-3.5 animate-in slide-in-from-bottom duration-200">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-neutral">Scan Simulator</h4>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Manually paste the dynamic station token generated on the teacher's screen to trigger a scanned callback.
                </p>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste station token (e.g. Str::random)"
                  value={simulatedToken}
                  onChange={(e) => setSimulatedToken(e.target.value)}
                  className="flex-1 bg-white dark:bg-card border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary text-neutral"
                />
                
                <button
                  onClick={() => handleSubmitToken(simulatedToken)}
                  disabled={!simulatedToken.trim()}
                  className="px-4 py-2 bg-secondary hover:opacity-90 disabled:opacity-50 disabled:scale-100 rounded-lg text-xs font-bold text-neutral shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer border-none"
                >
                  <Send className="h-3 w-3" />
                  <span>Simulate</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default GuardianPickup
