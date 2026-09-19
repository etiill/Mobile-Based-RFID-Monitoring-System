import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone, 
  Building2,
  Lock
} from "lucide-react"
import ApiHandler from "../../api/ApiHandler"
import { LoadingScreen } from "../../components/LoadingScreen"

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

export function CheckoutConfirm() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") || ""

  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  
  const [student, setStudent] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [confirmedTime, setConfirmedTime] = useState("")

  // Validate Token on Page Load
  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      setIsValid(false)
      setErrorMessage("No checkout QR token provided in URL.")
      return
    }

    const validateToken = async () => {
      try {
        const response = await ApiHandler.get<{
          valid: boolean
          student: Student
          attendance: AttendanceRecord
          message?: string
        }>(`/attendance/checkout-qr/validate?token=${token}`)

        if (response.valid) {
          setIsValid(true)
          setStudent(response.student)
          setAttendance(response.attendance)
        } else {
          setIsValid(false)
          setErrorMessage(response.message || "Invalid or expired QR token.")
        }
      } catch (err: any) {
        console.error("Token validation error:", err)
        setIsValid(false)
        setErrorMessage(err.message || "This QR code is invalid, expired, or has already been used.")
      } finally {
        setIsLoading(false)
      }
    }

    validateToken()
  }, [token])

  // Handle Pickup Confirmation Submission
  const handleConfirmPickup = async () => {
    if (!token || isConfirming) return

    setIsConfirming(true)
    try {
      const response = await ApiHandler.post<{
        message: string
        student: Student
        time_out: string
      }>("/attendance/checkout-qr/confirm", { token })

      setIsSuccess(true)
      setConfirmedTime(response.time_out)
    } catch (err: any) {
      console.error("Confirmation error:", err)
      setIsValid(false)
      setErrorMessage(err.message || "Failed to confirm pickup. Please ask teacher for a new QR code.")
    } finally {
      setIsConfirming(false)
    }
  }

  // Format 24-hour military time to 12-hour AM/PM
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <LoadingScreen fullScreen={false} />
        <p className="text-xs text-muted-foreground font-semibold mt-4">Verifying Guardian QR Checkout Session...</p>
      </div>
    )
  }

  const sectionLabel = student?.section
    ? `${student.section.year_level} - ${student.section.section_name}`
    : student?.grade.replace("Grade: ", "")

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-neutral font-sans p-4 sm:p-6 flex flex-col items-center justify-center">
      
      {/* Mobile Card Container */}
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl overflow-hidden my-auto space-y-0">
        
        {/* Header Bar */}
        <div className="bg-primary text-white p-6 text-center space-y-2 relative overflow-hidden">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-1">
            <Building2 className="h-6 w-6 text-secondary" />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight">FCU Kindergarten</h1>
          <p className="text-xs text-white/80 font-medium">Authorized Guardian Student Pickup</p>
        </div>

        {/* --- SUCCESS VIEW --- */}
        {isSuccess ? (
          <div className="p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-emerald-600">Pickup Confirmed!</h2>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Student <strong className="text-primary">{student?.name}</strong> has been successfully checked out.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-tertiary/30 p-4 space-y-2 text-xs font-semibold text-left">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Student Name:</span>
                <span className="font-bold text-neutral">{student?.name}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Classroom:</span>
                <span className="font-bold text-neutral">{sectionLabel}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Checkout Time:</span>
                <span className="font-bold text-emerald-600">{confirmedTime || formatTime(attendance?.time_out)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verification Method:</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Guardian QR Scan
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Thank you for using FCU Kindergarten Safety System. Have a nice day!</span>
            </div>
          </div>
        ) : !isValid ? (
          /* --- ERROR VIEW --- */
          <div className="p-6 text-center space-y-6">
            <div className="h-16 w-16 bg-red-100 text-red-600 border border-red-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="h-9 w-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-red-600">Invalid or Expired QR Code</h2>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                {errorMessage || "This checkout session token has expired or has already been used."}
              </p>
            </div>

            <div className="p-4 border border-dashed border-red-200 bg-red-50/50 rounded-2xl text-[11px] text-red-700 font-medium leading-relaxed">
              <p className="font-bold mb-1">What to do next:</p>
              <p>Please approach the class teacher and ask them to tap <strong>"Generate QR Code"</strong> on their device to create a fresh 15-minute checkout session.</p>
            </div>
          </div>
        ) : (
          /* --- VALID CONFIRMATION FORM --- */
          <div className="p-6 space-y-6 font-sans">
            
            {/* Student & Class Details Card */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Student Pickup Details
              </h3>

              <div className="flex items-center gap-4 p-4 border border-border rounded-2xl bg-tertiary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-base shrink-0">
                  {student?.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary">{student?.name}</h4>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                    Class: {sectionLabel}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
                    <Clock className="h-3 w-3" />
                    <span>Arrived Today: {formatTime(attendance?.time_in)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Guardians Verification Card */}
            {student?.guardians && student.guardians.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Authorized Guardian Contacts
                </h3>
                <div className="rounded-2xl border border-border p-3.5 bg-card space-y-2">
                  {student.guardians.map((g, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-bold text-neutral block">{g.name}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">{g.phone}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase">
                        {g.relation}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation Warning Checklist */}
            <div className="p-4 border border-blue-100 bg-blue-50/60 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span>Guardian Verification</span>
              </div>
              <p className="text-[11px] leading-relaxed font-semibold">
                By tapping the button below, you verify that you have arrived at FCU Kindergarten and are picking up <strong>{student?.name}</strong>.
              </p>
            </div>

            {/* Confirm Pickup Action Button */}
            <button
              onClick={handleConfirmPickup}
              disabled={isConfirming}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  <span>Confirm Pickup & Complete Checkout</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-muted-foreground font-semibold flex items-center justify-center gap-1">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span>Single-use secure session verified by FCU RFID System</span>
            </p>

          </div>
        )}

      </div>
    </div>
  )
}

export default CheckoutConfirm
