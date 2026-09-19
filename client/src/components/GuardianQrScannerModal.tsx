import { useState, useEffect, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { 
  Camera, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Lock,
  QrCode,
  Sparkles,
  RefreshCw
} from "lucide-react"
import ApiHandler from "../api/ApiHandler"
import { toast } from "./ui/toast"

interface Guardian {
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
}

interface GuardianQrScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function GuardianQrScannerModal({
  isOpen,
  onClose,
  onSuccess
}: GuardianQrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [manualTokenInput, setManualTokenInput] = useState("")

  // Token Verification State
  const [scannedToken, setScannedToken] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null)
  const [scannedAttendance, setScannedAttendance] = useState<AttendanceRecord | null>(null)

  // Pickup Confirmation State
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [confirmedTime, setConfirmedTime] = useState("")

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = "guardian-qr-reader"

  // Synthesize scan audio chime
  const playScanChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1) // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }

  // Extract token from QR code payload (handles full URLs and raw tokens)
  const parseToken = (qrText: string): string => {
    let raw = qrText.trim()
    try {
      if (raw.includes("token=")) {
        const url = new URL(raw.startsWith("http") ? raw : `http://${raw}`)
        const extracted = url.searchParams.get("token")
        if (extracted) return extracted
      }
    } catch {}
    return raw
  }

  // Validate Token API Call
  const handleValidateToken = async (tokenToVerify: string) => {
    if (!tokenToVerify || isValidating) return
    setScannedToken(tokenToVerify)
    setIsValidating(true)
    setValidationError("")

    try {
      const response = await ApiHandler.get<{
        valid: boolean
        student: Student
        attendance: AttendanceRecord
        message?: string
      }>(`/attendance/checkout-qr/validate?token=${tokenToVerify}`)

      if (response.valid) {
        playScanChime()
        setIsValid(true)
        setScannedStudent(response.student)
        setScannedAttendance(response.attendance)
        stopCameraScanner()
      } else {
        setIsValid(false)
        setValidationError(response.message || "Invalid or expired QR token.")
      }
    } catch (err: any) {
      console.error("Token validation failed:", err)
      setIsValid(false)
      setValidationError(err.message || "This QR code is invalid, expired, or already used.")
    } finally {
      setIsValidating(false)
    }
  }

  // Start Camera QR Code Scanner using Html5Qrcode
  const startCameraScanner = async () => {
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop()
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId)
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          const extractedToken = parseToken(decodedText)
          handleValidateToken(extractedToken)
        },
        () => {
          // Ignore transient scan frame errors
        }
      )
      setIsCameraActive(true)
    } catch (err: any) {
      console.error("Camera scanner error:", err)
      setIsCameraActive(false)
      toast.add({
        title: "Camera Access Error",
        description: "Could not access device camera. Please check browser camera permissions or paste code below.",
        type: "warning"
      })
    }
  }

  // Stop Camera Scanner
  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch (e) {
        console.error("Failed to stop scanner:", e)
      }
    }
    setIsCameraActive(false)
  }

  // Initialize camera when modal opens in camera tab
  useEffect(() => {
    if (isOpen && activeTab === "camera" && !scannedToken) {
      const timer = setTimeout(() => {
        startCameraScanner()
      }, 300)
      return () => {
        clearTimeout(timer)
        stopCameraScanner()
      }
    } else {
      stopCameraScanner()
    }
  }, [isOpen, activeTab, scannedToken])

  // Reset state on modal close
  const handleModalClose = () => {
    stopCameraScanner()
    setScannedToken(null)
    setScannedStudent(null)
    setScannedAttendance(null)
    setIsValid(false)
    setIsSuccess(false)
    setManualTokenInput("")
    setValidationError("")
    onClose()
  }

  // Confirm Student Pickup Action
  const handleConfirmPickup = async () => {
    if (!scannedToken || isConfirming) return

    setIsConfirming(true)
    try {
      const response = await ApiHandler.post<{
        message: string
        student: Student
        time_out: string
      }>("/attendance/checkout-qr/confirm", { token: scannedToken })

      setIsSuccess(true)
      setConfirmedTime(response.time_out)
      toast.add({
        title: "Pickup Confirmed!",
        description: `Successfully checked out ${response.student?.name || "student"}.`,
        type: "success"
      })
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error("Confirmation error:", err)
      toast.add({
        title: "Checkout Failed",
        description: err.message || "Failed to confirm pickup. Please try again.",
        type: "error"
      })
    } finally {
      setIsConfirming(false)
    }
  }

  if (!isOpen) return null

  const formatTime = (rawTime?: string | null) => {
    if (!rawTime || rawTime === "--:--") return "--:--"
    if (rawTime.includes("AM") || rawTime.includes("PM")) return rawTime
    try {
      const parts = rawTime.split(":")
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10)
        const minutes = parseInt(parts[1], 10)
        const ampm = hours >= 12 ? 'PM' : 'AM'
        hours = hours % 12
        hours = hours ? hours : 12
        return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`
      }
    } catch {}
    return rawTime
  }

  const sectionLabel = scannedStudent?.section
    ? `${scannedStudent.section.year_level} - ${scannedStudent.section.section_name}`
    : scannedStudent?.grade.replace("Grade: ", "")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in scale-in duration-200 text-neutral space-y-0 relative">
        
        {/* Header Bar */}
        <div className="bg-primary text-white p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              <Camera className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Scan Teacher QR Code</h2>
              <p className="text-[10px] text-white/80 font-semibold">Authorized Guardian Student Pickup</p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white cursor-pointer border-none bg-transparent transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* --- VIEW 1: PICKUP CONFIRMED SUCCESS SCREEN --- */}
        {isSuccess ? (
          <div className="p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-emerald-600">Pickup Confirmed!</h3>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Student <strong className="text-primary">{scannedStudent?.name}</strong> has been successfully checked out.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-tertiary/30 p-4 space-y-2 text-xs font-semibold text-left">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-bold text-neutral">{scannedStudent?.name}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Classroom:</span>
                <span className="font-bold text-neutral">{sectionLabel}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Time Out:</span>
                <span className="font-bold text-emerald-600">{confirmedTime || formatTime(scannedAttendance?.time_out)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Guardian In-App Scanner
                </span>
              </div>
            </div>

            <button
              onClick={handleModalClose}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-xs shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
            >
              Done / Close Scanner
            </button>
          </div>
        ) : isValid && scannedStudent ? (
          /* --- VIEW 2: VALIDATED TOKEN CONFIRMATION FORM --- */
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4 p-4 border border-border rounded-2xl bg-tertiary/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-base shrink-0">
                {scannedStudent.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">{scannedStudent.name}</h3>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                  Class: {sectionLabel}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
                  <Clock className="h-3 w-3" />
                  <span>Arrived Today: {formatTime(scannedAttendance?.time_in)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-blue-100 bg-blue-50/60 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>Authorized Guardian Verification</span>
              </div>
              <p className="text-[11px] leading-relaxed font-semibold">
                Tap below to verify that you are at school picking up <strong>{scannedStudent.name}</strong>.
              </p>
            </div>

            <button
              onClick={handleConfirmPickup}
              disabled={isConfirming}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isConfirming ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Confirming Pickup...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  <span>Confirm Pickup & Complete Checkout</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setScannedToken(null)
                setIsValid(false)
                setScannedStudent(null)
              }}
              className="w-full py-2.5 rounded-xl border border-border bg-tertiary/40 text-xs font-semibold text-muted-foreground hover:bg-tertiary transition-all border-none cursor-pointer"
            >
              Rescan Another QR Code
            </button>
          </div>
        ) : (
          /* --- VIEW 3: LIVE CAMERA SCANNER & MANUAL PASTE --- */
          <div className="p-6 space-y-5">
            
            {/* Mode Tabs */}
            <div className="flex items-center gap-1 bg-tertiary/50 p-1 rounded-2xl border border-border">
              <button
                onClick={() => setActiveTab("camera")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "camera"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-neutral bg-transparent"
                }`}
              >
                <Camera className="h-4 w-4" />
                <span>Camera Scanner</span>
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "manual"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-neutral bg-transparent"
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>Enter / Paste Token</span>
              </button>
            </div>

            {/* ERROR ALERT */}
            {validationError && (
              <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="font-semibold">{validationError}</span>
              </div>
            )}

            {/* TAB 1: LIVE CAMERA VIEW */}
            {activeTab === "camera" && (
              <div className="space-y-4">
                <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden border-2 border-primary/40 bg-black flex flex-col items-center justify-center shadow-inner">
                  
                  {/* Html5Qrcode video mount div */}
                  <div id={scannerContainerId} className="w-full h-full" />

                  {/* Aiming Reticle Overlay */}
                  <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative animate-pulse">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                    </div>
                  </div>

                  {isValidating && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                      <div className="h-8 w-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold">Verifying Token...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold px-2">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Point camera at teacher's screen
                  </span>
                  <button
                    onClick={startCameraScanner}
                    className="text-primary font-bold hover:underline border-none bg-transparent cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Restart Camera
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: MANUAL TOKEN / URL PASTE */}
            {activeTab === "manual" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground block">
                    Paste Checkout URL or Token Code:
                  </label>
                  <textarea
                    rows={3}
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    placeholder="e.g. http://localhost:5173/checkout-confirm?token=a8f9d0c..."
                    className="w-full rounded-2xl border border-border bg-tertiary px-4 py-3 text-xs font-mono font-semibold text-neutral outline-none focus:border-primary resize-none"
                  />
                </div>

                <button
                  onClick={() => {
                    const extracted = parseToken(manualTokenInput)
                    if (extracted) {
                      handleValidateToken(extracted)
                    } else {
                      setValidationError("Please enter a valid checkout token or URL.")
                    }
                  }}
                  disabled={!manualTokenInput.trim() || isValidating}
                  className="w-full py-3.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-sm hover:opacity-90 active:scale-[0.99] border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validating Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify & Process Pickup</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="text-[10px] text-center text-muted-foreground font-semibold flex items-center justify-center gap-1 pt-2 border-t border-border">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span>FCU Kindergarten Guardian Safety System</span>
            </p>

          </div>
        )}

      </div>
    </div>
  )
}

export default GuardianQrScannerModal
