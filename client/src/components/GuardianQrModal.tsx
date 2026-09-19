import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { X, Clock, CheckCircle2, ShieldCheck, Copy, Check, Smartphone } from "lucide-react"
import { toast } from "./ui/toast"
import ApiHandler from "../api/ApiHandler"

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

interface GuardianQrModalProps {
  isOpen: boolean
  onClose: () => void
  student: Student | null
  token: string
  expiresAt: string
  onCheckoutSuccess?: () => void
}

export function GuardianQrModal({
  isOpen,
  onClose,
  student,
  token,
  expiresAt,
  onCheckoutSuccess
}: GuardianQrModalProps) {
  const [timeLeft, setTimeLeft] = useState<number>(900) // 15 minutes in seconds
  const [isCopied, setIsCopied] = useState(false)
  const [isCheckedOut, setIsCheckedOut] = useState(false)
  const [checkoutTime, setCheckoutTime] = useState<string>("")

  const checkoutUrl = `${window.location.origin}/checkout-confirm?token=${token}`

  // Session Expiration Countdown Timer
  useEffect(() => {
    if (!expiresAt) return

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setTimeLeft(diff)
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  // Live status listener polling to detect when guardian completes pickup
  useEffect(() => {
    if (!isOpen || !token || isCheckedOut) return

    const checkStatus = async () => {
      try {
        const response = await ApiHandler.get<{
          valid: boolean
          attendance: { time_out: string | null }
        }>(`/attendance/checkout-qr/validate?token=${token}`)

        if (response.attendance && response.attendance.time_out) {
          setIsCheckedOut(true)
          setCheckoutTime(response.attendance.time_out)
          if (onCheckoutSuccess) onCheckoutSuccess()
        }
      } catch (err: any) {
        // If 400 because already checked out or used
        if (err.message && err.message.includes("checked out")) {
          setIsCheckedOut(true)
          if (onCheckoutSuccess) onCheckoutSuccess()
        }
      }
    }

    const interval = setInterval(checkStatus, 2500)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("rfid_attendance_sync")
      bc.onmessage = () => checkStatus()
    } catch {}

    return () => {
      clearInterval(interval)
      if (bc) bc.close()
    }
  }, [isOpen, token, isCheckedOut, onCheckoutSuccess])

  if (!isOpen || !student) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = String(timeLeft % 60).padStart(2, "0")

  const handleCopyLink = () => {
    navigator.clipboard.writeText(checkoutUrl)
    setIsCopied(true)
    toast.add({
      title: "Link Copied",
      description: "Checkout confirmation URL copied to clipboard.",
      type: "success"
    })
    setTimeout(() => setIsCopied(false), 2000)
  }

  const sectionLabel = student.section
    ? `${student.section.year_level} - ${student.section.section_name}`
    : student.grade.replace("Grade: ", "")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral space-y-5 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-primary">Guardian Checkout QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-tertiary rounded-xl text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Student & Guardian Info Header */}
        <div className="flex items-center gap-4 p-4 border border-border rounded-2xl bg-tertiary/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-base shrink-0">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-primary truncate">{student.name}</h3>
            <p className="text-xs text-muted-foreground font-semibold truncate mt-0.5">
              Class: {sectionLabel} • RFID: {student.rfid}
            </p>
            {student.guardians.length > 0 && (
              <p className="text-[11px] text-emerald-600 font-bold truncate mt-0.5">
                Guardian: {student.guardians[0].name} ({student.guardians[0].relation})
              </p>
            )}
          </div>
        </div>

        {/* Checked Out State vs Active QR Code Display */}
        {isCheckedOut ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in duration-300">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-600">Pickup Confirmed!</h3>
              <p className="text-xs text-muted-foreground font-semibold mt-1">
                {student.name} was successfully checked out via Guardian QR Code.
              </p>

              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold">
                <Clock className="h-3.5 w-3.5" />
                <span>Time Out: {checkoutTime || "Just now"}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
            >
              Done / Close Window
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-neutral-900 border border-border rounded-2xl shadow-inner relative">
              {timeLeft <= 0 ? (
                <div className="py-8 text-center space-y-2 text-red-500">
                  <Clock className="h-10 w-10 mx-auto animate-pulse" />
                  <p className="text-xs font-bold">QR Session Expired</p>
                  <p className="text-[10px] text-muted-foreground">Please close and click "Generate QR Code" again.</p>
                </div>
              ) : (
                <>
                  <QRCodeSVG
                    value={checkoutUrl}
                    size={210}
                    level="H"
                    includeMargin={true}
                    aria-label={`QR Code for ${student.name} checkout`}
                  />
                  <p className="text-[10px] text-muted-foreground font-semibold mt-3 text-center flex items-center gap-1">
                    <Smartphone className="h-3 w-3 text-primary shrink-0" />
                    <span>Guardian scans this code using their phone camera to confirm pickup</span>
                  </p>
                </>
              )}
            </div>

            {/* Session Timer & Status Banner */}
            <div className="flex items-center justify-between p-3.5 border border-border rounded-2xl bg-tertiary/30 text-xs">
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${timeLeft < 120 ? 'text-red-500 animate-pulse' : 'text-primary'}`} />
                <span className="font-semibold text-muted-foreground">Expires in:</span>
                <span className="font-mono font-bold text-neutral">{minutes}:{seconds}</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Awaiting Scan
              </span>
            </div>

            {/* Direct Link Copy Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={checkoutUrl}
                className="flex-1 rounded-xl border border-border bg-tertiary px-3 py-2 text-[10px] font-mono font-semibold text-muted-foreground outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="p-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all cursor-pointer border-none shrink-0"
                title="Copy mobile URL to clipboard"
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default GuardianQrModal
