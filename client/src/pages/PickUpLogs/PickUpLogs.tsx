import { useState, useEffect, useMemo, useRef } from "react"
import {
  Sun,
  Moon,
  Search,
  Calendar as CalendarIcon,
  ShieldCheck,
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
  School,
  CreditCard,
  Wifi,
  Smartphone,
  Sparkles,
  Trash2
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
  nfcCardUid: string
  isNfcVerified: boolean
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

  // NFC Card Verification State
  const [verificationMode, setVerificationMode] = useState<"nfc" | "manual">("nfc")
  const [isNfcScanning, setIsNfcScanning] = useState(false)
  const [isNfcCardVerified, setIsNfcCardVerified] = useState(false)
  const [scannedNfcUid, setScannedNfcUid] = useState("")
  const [manualNfcInput, setManualNfcInput] = useState("")
  const [quickNfcInput, setQuickNfcInput] = useState("")
  const [isPhoneNfcListening, setIsPhoneNfcListening] = useState(false)
  const [lastPhoneReadUid, setLastPhoneReadUid] = useState<string>("")
  const [lastPhoneReadTime, setLastPhoneReadTime] = useState<string>("")
  const lastProcessedTapIdRef = useRef<string>("")
  const mountTimestampRef = useRef<number>(Math.floor(Date.now() / 1000))
  const lastNfcScanTimeRef = useRef<number>(0)
  const ndefReaderRef = useRef<any>(null)
  const isNfcCardVerifiedRef = useRef<boolean>(false)
  const isRecordModalOpenRef = useRef<boolean>(false)

  useEffect(() => {
    isNfcCardVerifiedRef.current = isNfcCardVerified
    isRecordModalOpenRef.current = isRecordModalOpen
  }, [isNfcCardVerified, isRecordModalOpen])

  // NFC Card Profile Assignment State ("scan" vs "assign" mode)
  const [terminalTab, setTerminalTab] = useState<"scan" | "assign">("scan")
  const [assignedNfcCards, setAssignedNfcCards] = useState<
    Record<string, { uid: string; student_id: string | number; student_name: string; guardian_name: string }>
  >({})
  const [assignStudentId, setAssignStudentId] = useState<string | number>("")
  const [assignGuardianName, setAssignGuardianName] = useState<string>("")
  const [assignCardUid, setAssignCardUid] = useState<string>("")
  const [isWaitingForCardToAssign, setIsWaitingForCardToAssign] = useState<boolean>(false)
  const isWaitingForCardToAssignRef = useRef<boolean>(false)
  const assignStudentIdRef = useRef<string | number>("")
  const assignGuardianNameRef = useRef<string>("")

  const terminalTabRef = useRef<"scan" | "assign">("scan")

  useEffect(() => {
    isWaitingForCardToAssignRef.current = isWaitingForCardToAssign
    terminalTabRef.current = terminalTab
    assignStudentIdRef.current = assignStudentId
    assignGuardianNameRef.current = assignGuardianName
  }, [isWaitingForCardToAssign, terminalTab, assignStudentId, assignGuardianName])

  // Load saved NFC card -> Student Profile mappings from backend
  const fetchAssignedNfcCards = async () => {
    try {
      const res = await ApiHandler.get<{
        cards?: Record<string, { uid: string; student_id: string | number; student_name: string; guardian_name: string }>
      }>("/nfc/cards")
      if (res?.cards) {
        setAssignedNfcCards(res.cards)
      }
    } catch { }
  }

  useEffect(() => {
    fetchAssignedNfcCards()
  }, [])

  // Get the assigned NFC Card UID for a specific student & guardian
  const getStudentNfcCardUid = (student?: Student | null, guardianIndex = 0, guardianName?: string) => {
    if (!student) return "UNASSIGNED"
    const studentCards = Object.values(assignedNfcCards).filter(
      c => String(c.student_id) === String(student.id)
    )
    if (studentCards.length > 0) {
      const targetGName =
        guardianName || student.guardians?.[guardianIndex]?.name || ""
      if (targetGName) {
        const gLower = targetGName.trim().toLowerCase()
        const exactGuardianCard = studentCards.find(c => {
          const names = c.guardian_names
            ? c.guardian_names.map(n => n.trim().toLowerCase())
            : c.guardian_name.split(",").map(n => n.trim().toLowerCase())
          return names.includes(gLower)
        })
        if (exactGuardianCard) return exactGuardianCard.uid
      }
      if (studentCards[guardianIndex]) return studentCards[guardianIndex].uid
      return studentCards[0].uid
    }
    const tail = (student.rfid || String(student.id)).slice(-4).toUpperCase().padStart(4, "0")
    const suffix = guardianIndex > 0 ? `G${guardianIndex + 1}` : "G1"
    return `NFC-${tail}-${suffix}`
  }

  // Get all assigned NFC card UIDs for a student across all their guardians
  const getAllStudentNfcCardUids = (student?: Student | null): string[] => {
    if (!student) return []
    const studentCards = Object.values(assignedNfcCards)
      .filter(c => String(c.student_id) === String(student.id))
      .map(c => c.uid.toUpperCase())
    const defaults = (student.guardians || []).map((g, idx) =>
      getStudentNfcCardUid(student, idx, g.name).toUpperCase()
    )
    return Array.from(new Set([...studentCards, ...defaults]))
  }

  // Play a pleasant two-tone NFC verification chime
  const playNfcBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(987.77, ctx.currentTime) // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08) // E6
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.22)
    } catch { }
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const role = (user.role || "teacher").toLowerCase()
  const displayName = user.name || (role === "admin" ? "Administrator" : "Ms. Garcia")

  // Dynamic Greeting & Sun/Moon icon indicator synced with time
  const getTimeBasedInfo = () => {
    const hour = new Date().getHours()
    const isDaytime = hour >= 6 && hour < 18
    let greeting = "Good Evening"
    if (hour >= 6 && hour < 12) greeting = "Good Morning"
    else if (hour >= 12 && hour < 18) greeting = "Good Afternoon"
    return { greeting, isDaytime }
  }

  // Format military/ISO time to standard 12-hr AM/PM format
  const formatTime12h = (rawTime?: string | null) => {
    if (!rawTime || rawTime === "--:--" || rawTime === "null") return "--:--"
    if (rawTime.includes("AM") || rawTime.includes("PM") || rawTime.includes("am") || rawTime.includes("pm")) {
      return rawTime
    }
    try {
      let timePart = rawTime
      if (rawTime.includes("T")) {
        timePart = rawTime.split("T")[1]
      } else if (rawTime.includes(" ")) {
        const spaceParts = rawTime.split(" ")
        timePart = spaceParts[spaceParts.length - 1]
      }

      const parts = timePart.split(":")
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
    } catch { }
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
        let timePart = t
        if (t.includes("T")) timePart = t.split("T")[1]
        else if (t.includes(" ")) {
          const sp = t.split(" ")
          timePart = sp[sp.length - 1]
        }
        timePart = timePart.replace(/(AM|PM|am|pm)/g, "").trim()
        const parts = timePart.split(":")
        let h = parseInt(parts[0], 10) || 0
        const m = parseInt(parts[1], 10) || 0
        if (t.toLowerCase().includes("pm") && h < 12) h += 12
        if (t.toLowerCase().includes("am") && h === 12) h = 0
        return h * 60 + m
      }
      const m1 = parseMinutes(timeIn)
      const m2 = parseMinutes(timeOut)
      const diff = m2 - m1
      if (diff > 0) {
        const h = Math.floor(diff / 60)
        const m = diff % 60
        return h > 0 ? `${h}h ${m}m` : `${m} mins`
      }
    } catch { }
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

  const fetchAttendanceOnly = async () => {
    try {
      const attData = await ApiHandler.get<AttendanceRecord[]>(`/attendance?date=${selectedDate}`)
      if (Array.isArray(attData)) {
        setAttendances(attData)
      }
    } catch {}
  }

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
    // Fast 1.5s poll on attendance only so check-outs appear with zero lag across devices
    const interval = setInterval(fetchAttendanceOnly, 1500)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("rfid_attendance_sync")
      bc.onmessage = () => fetchAttendanceOnly()
    } catch { }

    const handleCustomScanEvent = () => fetchAttendanceOnly()
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

        const rawVerifiedBy = att.verified_by || "Authorized Gate Verification"
        // Extract guardian name if encoded in verified_by (e.g. "NFC Card Verified (NFC-3924-G1) • Reyes, Maria")
        if (rawVerifiedBy.includes("•")) {
          const parts = rawVerifiedBy.split("•")
          const extractedGuardian = parts[parts.length - 1].trim()
          const matchedG = guardians.find(g => g.name.toLowerCase() === extractedGuardian.toLowerCase())
          if (matchedG) {
            guardianName = matchedG.name
            guardianPhone = matchedG.phone
            guardianRelation = matchedG.relation
          } else if (extractedGuardian) {
            guardianName = extractedGuardian
          }
        }

        const nfcMatch = rawVerifiedBy.match(/NFC-[A-Z0-9-]+/i)
        const isManualCheckout = rawVerifiedBy.toLowerCase().includes("manual")
        const nfcCardUid = isManualCheckout
          ? "MANUAL"
          : nfcMatch
          ? nfcMatch[0].toUpperCase()
          : getStudentNfcCardUid(student, 0)
        const isNfcVerified = !isManualCheckout && (
          rawVerifiedBy.toLowerCase().includes("nfc") ||
          rawVerifiedBy.toLowerCase().includes("rfid") ||
          rawVerifiedBy.toLowerCase().includes("authorized")
        )

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
          pickupType: isManualCheckout
            ? "Manual Check Out"
            : rawVerifiedBy.toLowerCase().includes("nfc")
            ? "NFC Verified"
            : "Authorized",
          verifiedBy: rawVerifiedBy,
          nfcCardUid,
          isNfcVerified,
          allGuardians: guardians
        }
      })
      .sort((a, b) => {
        const getSortScore = (timeStr: string, id: number) => {
          if (!timeStr || timeStr === "--:--") return id
          try {
            let t = timeStr
            if (t.includes("T")) t = t.split("T")[1]
            else if (t.includes(" ")) {
              const sp = t.split(" ")
              t = sp[sp.length - 1]
            }
            if (t.includes(":")) {
              const parts = t.replace(/(AM|PM|am|pm)/g, "").trim().split(":")
              let h = parseInt(parts[0], 10) || 0
              const m = parseInt(parts[1], 10) || 0
              const s = parseInt(parts[2], 10) || 0
              if (t.toLowerCase().includes("pm") && h < 12) h += 12
              if (t.toLowerCase().includes("am") && h === 12) h = 0
              return h * 3600 + m * 60 + s
            }
          } catch { }
          return id
        }
        const scoreA = getSortScore(a.rawTimeOut, Number(a.attendanceId))
        const scoreB = getSortScore(b.rawTimeOut, Number(b.attendanceId))
        if (scoreA !== scoreB) return scoreB - scoreA
        return Number(b.attendanceId) - Number(a.attendanceId)
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

  // Update selected guardian dropdown and reset NFC verification when student changes
  const activeStudentInModal = students.find(s => s.id.toString() === selectedStudentForPickup.toString())
  const activeGuardianIdx = useMemo(() => {
    if (!activeStudentInModal?.guardians) return 0
    const idx = activeStudentInModal.guardians.findIndex(g => g.name === selectedGuardianForPickup)
    return idx >= 0 ? idx : 0
  }, [activeStudentInModal, selectedGuardianForPickup])

  const expectedNfcUid = useMemo(
    () => getStudentNfcCardUid(activeStudentInModal, activeGuardianIdx, selectedGuardianForPickup),
    [activeStudentInModal, activeGuardianIdx, selectedGuardianForPickup, assignedNfcCards]
  )

  useEffect(() => {
    if (activeStudentInModal && activeStudentInModal.guardians && activeStudentInModal.guardians.length > 0) {
      const alreadyMatches = activeStudentInModal.guardians.some(g => g.name === selectedGuardianForPickup)
      if (!alreadyMatches) {
        setSelectedGuardianForPickup(activeStudentInModal.guardians[0].name)
      }
    } else {
      setSelectedGuardianForPickup("")
    }
    setIsNfcCardVerified(false)
    setScannedNfcUid("")
    setManualNfcInput("")
  }, [selectedStudentForPickup])

  // Currently selected student object in the Assign Card tab
  const assignStudentObj = students.find(s => String(s.id) === String(assignStudentId))

  // Save NFC Card -> Student & Guardian Profile mapping to backend
  const saveCardProfileAssignment = async (cardUid: string, studentIdVal: string | number, guardianNameVal: string) => {
    const cleanUid = cardUid.trim().toUpperCase()
    if (!cleanUid || !studentIdVal) {
      toast.add({
        title: "Missing Details",
        description: "Please select a student and tap/enter an NFC card UID to assign.",
        type: "warning"
      })
      return false
    }

    try {
      const res = await ApiHandler.post<{
        message: string
        cards: Record<string, { uid: string; student_id: string | number; student_name: string; guardian_name: string }>
      }>("/nfc/assign", {
        uid: cleanUid,
        student_id: studentIdVal,
        guardian_name: guardianNameVal
      })
      if (res?.cards) {
        setAssignedNfcCards(res.cards)
      }
      setAssignStudentId("")
      setAssignGuardianName("")
      setAssignCardUid("")
      setIsWaitingForCardToAssign(false)
      playNfcBeep()
      toast.add({
        title: "NFC Card Profile Saved ✓",
        description: res.message || `Card ${cleanUid} is now linked to the selected student profile!`,
        type: "success"
      })
      return true
    } catch (err: any) {
      toast.add({
        title: "Failed to Assign Card",
        description: err?.message || "Could not save NFC card profile mapping.",
        type: "error"
      })
      return false
    }
  }

  // Delete an assigned NFC Card profile mapping (with confirmation modal)
  const [cardToDelete, setCardToDelete] = useState<{
    uid: string
    student_name: string
    guardian_name: string
  } | null>(null)
  const [isDeletingCard, setIsDeletingCard] = useState(false)

  const handleConfirmDeleteAssignedCard = async () => {
    if (!cardToDelete) return
    const { uid } = cardToDelete
    setIsDeletingCard(true)
    try {
      const res = await ApiHandler.post<{
        message: string
        cards: Record<string, { uid: string; student_id: string | number; student_name: string; guardian_name: string }>
      }>("/nfc/unassign", { uid })
      setAssignedNfcCards(res?.cards || {})
      if (lastPhoneReadUid === uid) {
        setLastPhoneReadUid("")
      }
      setCardToDelete(null)
      toast.add({
        title: "NFC Card Unassigned",
        description: `Removed profile from card ${uid}.`,
        type: "info"
      })
    } catch (err: any) {
      toast.add({
        title: "Delete Failed",
        description: err?.message || "Could not remove NFC card profile.",
        type: "error"
      })
    } finally {
      setIsDeletingCard(false)
    }
  }

  // Start Phone NFC Reader inside modal (waits for actual physical NFC tap — does NOT fake-scan)
  const handleSimulateNfcTap = async () => {
    if (!activeStudentInModal) {
      toast.add({
        title: "Select a Student First",
        description: "Please choose the student being picked up before tapping the guardian's NFC card.",
        type: "warning"
      })
      return
    }

    setIsNfcScanning(true)
    setIsNfcCardVerified(false)

    if ("NDEFReader" in window && !isPhoneNfcListening) {
      await handleStartPhoneNfcReader()
    } else {
      toast.add({
        title: "Waiting for Physical NFC Card Tap...",
        description: `Tap the guardian's NFC card (${expectedNfcUid}) on your paired phone or USB reader now.`,
        type: "info"
      })
    }
  }

  // Handle physical USB NFC Reader / manual UID input inside modal
  const handleManualNfcVerify = (rawInput: string) => {
    const cleaned = rawInput.trim().toUpperCase()
    if (!cleaned) {
      toast.add({
        title: "Enter or Scan NFC UID",
        description: "Please scan the NFC card or type its UID first.",
        type: "warning"
      })
      return
    }

    // Check if this UID is assigned to a specific student profile
    const mappedProfile = assignedNfcCards[cleaned]
    if (mappedProfile) {
      if (activeStudentInModal && String(mappedProfile.student_id) !== String(activeStudentInModal.id)) {
        toast.add({
          title: "Wrong Guardian NFC Card!",
          description: `Card ${cleaned} belongs to ${mappedProfile.student_name} (${mappedProfile.guardian_name}), not ${activeStudentInModal.name}.`,
          type: "error"
        })
        return
      }
      const matchedStu = students.find(s => String(s.id) === String(mappedProfile.student_id))
      if (matchedStu) {
        setSelectedStudentForPickup(matchedStu.id)
        setSelectedGuardianForPickup(mappedProfile.guardian_name)
        setIsNfcScanning(false)
        setIsNfcCardVerified(true)
        setScannedNfcUid(cleaned)
        setManualNfcInput("")
        playNfcBeep()
        toast.add({
          title: "NFC Card Profile Matched ✓",
          description: `Verified ${cleaned} for ${matchedStu.name} (${mappedProfile.guardian_name}).`,
          type: "success"
        })
        return
      }
    }

    if (!activeStudentInModal) {
      const matchedStudent = presentStudentsAwaitingPickup.find(
        s =>
          getAllStudentNfcCardUids(s).includes(cleaned) ||
          s.rfid.toUpperCase() === cleaned
      )
      if (matchedStudent) {
        const matchedCard = assignedNfcCards[cleaned]
        setSelectedStudentForPickup(matchedStudent.id)
        setTimeout(() => {
          if (matchedCard?.guardian_name) {
            setSelectedGuardianForPickup(matchedCard.guardian_name)
          }
          setIsNfcScanning(false)
          setIsNfcCardVerified(true)
          setScannedNfcUid(cleaned)
          playNfcBeep()
        }, 100)
        return
      }
      toast.add({
        title: "Unassigned NFC Card",
        description: `Card "${cleaned}" is not assigned to any student yet. Switch to 'Assign Card Profile' to link it!`,
        type: "warning"
      })
      setAssignCardUid(cleaned)
      setTerminalTab("assign")
      return
    }

    const validUids = [
      ...getAllStudentNfcCardUids(activeStudentInModal),
      expectedNfcUid.toUpperCase(),
      activeStudentInModal.rfid.toUpperCase(),
    ]

    if (validUids.includes(cleaned)) {
      const matchedCard = assignedNfcCards[cleaned]
      if (matchedCard?.guardian_name) {
        setSelectedGuardianForPickup(matchedCard.guardian_name)
      }
      setIsNfcScanning(false)
      setIsNfcCardVerified(true)
      setScannedNfcUid(cleaned)
      setManualNfcInput("")
      playNfcBeep()
      toast.add({
        title: "NFC Card Verified ✓",
        description: `Verified guardian pickup card (${cleaned}) for ${activeStudentInModal.name} (${matchedCard?.guardian_name || selectedGuardianForPickup}).`,
        type: "success"
      })
    } else {
      toast.add({
        title: "NFC Card Mismatch",
        description: `Card (${cleaned}) does not match any of ${activeStudentInModal.name}'s registered guardian cards (${getAllStudentNfcCardUids(activeStudentInModal).join(", ")}).`,
        type: "error"
      })
    }
  }

  // Process a real NFC Card UID scan (from Phone NFC Reader or USB Reader input)
  const handleQuickNfcScan = (inputUid?: string, explicitStudentId?: string | number, explicitGuardianName?: string) => {
    const query = (inputUid ?? quickNfcInput).trim().toUpperCase()
    if (!query) {
      toast.add({
        title: "No NFC Card Scanned Yet",
        description: "Hold a physical NFC card against the back of your paired phone (or type its UID) to scan.",
        type: "warning"
      })
      return
    }

    // Prevent repeated spam ONLY if the exact same card UID is held against the phone within 3 seconds
    const nowMs = Date.now()
    if (nowMs - lastNfcScanTimeRef.current < 3000 && lastPhoneReadUid === query) {
      return
    }
    if (isRecordModalOpenRef.current && isNfcCardVerifiedRef.current && scannedNfcUid === query) {
      return
    }
    lastNfcScanTimeRef.current = nowMs

    const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    setLastPhoneReadUid(query)
    setLastPhoneReadTime(nowTime)

    // 1. If user is currently in "Assign Card Profile" tab or waiting to link a card to a student:
    if (terminalTabRef.current === "assign" || isWaitingForCardToAssignRef.current) {
      setAssignCardUid(query)
      if (assignStudentIdRef.current) {
        saveCardProfileAssignment(
          query,
          assignStudentIdRef.current,
          assignGuardianNameRef.current,
          assignSelectedGuardiansRef.current
        )
      } else {
        playNfcBeep()
        toast.add({
          title: `NFC Card Detected: ${query}`,
          description: "Now select a Registered Guardian above and click Save Profile to Card.",
          type: "info"
        })
      }
      return
    }

    // 2. Check if this card UID is mapped to a student profile in assignedNfcCards
    const mappedProfile = assignedNfcCards[query]
    const targetStudentId = explicitStudentId || mappedProfile?.student_id
    const targetGuardianName = explicitGuardianName || mappedProfile?.guardian_name

    let matched: Student | undefined
    if (targetStudentId) {
      matched = students.find(s => String(s.id) === String(targetStudentId))
    }

    if (!matched) {
      matched = students.find(
        s =>
          getAllStudentNfcCardUids(s).includes(query) ||
          s.rfid.toUpperCase() === query ||
          s.name.toUpperCase() === query
      )
    }

    // 3. If this physical NFC card has not been assigned to any student yet, prompt to assign it!
    if (!matched) {
      playNfcBeep()
      setAssignCardUid(query)
      setTerminalTab("assign")
      toast.add({
        title: `New NFC Card Read: ${query}`,
        description: "Card UID captured! Select the guardian in 'Assign Card Profile' and click Save Profile to Card.",
        type: "info"
      })
      return
    }

    setSelectedStudentForPickup(matched.id)
    setVerificationMode("nfc")
    setIsRecordModalOpen(true)
    setQuickNfcInput("")
    setTimeout(() => {
      if (targetGuardianName) {
        setSelectedGuardianForPickup(targetGuardianName)
      }
      setIsNfcScanning(false)
      setIsNfcCardVerified(true)
      setScannedNfcUid(query)
      playNfcBeep()
    }, 150)
  }

  // Keep live refs to handlers so the Web NFC hardware listener never uses a stale closure
  const handleQuickNfcScanRef = useRef(handleQuickNfcScan)
  const saveCardProfileAssignmentRef = useRef(saveCardProfileAssignment)
  useEffect(() => {
    handleQuickNfcScanRef.current = handleQuickNfcScan
    saveCardProfileAssignmentRef.current = saveCardProfileAssignment
  })

  // Activate Phone's Built-in NFC Hardware via Web NFC API (Chrome on Android)
  const handleStartPhoneNfcReader = async (forAssignMode = false) => {
    if (forAssignMode) {
      if (!assignStudentId) {
        toast.add({
          title: "Select a Student First",
          description: "Choose which student and guardian profile you want to put on the NFC card.",
          type: "warning"
        })
        return
      }
      setIsWaitingForCardToAssign(true)
    }

    if (!("NDEFReader" in window)) {
      toast.add({
        title: "Use Chrome on Your Android Phone",
        description: forAssignMode
          ? "Tap your NFC card on your paired phone (or type the Card UID below) and click Save Profile to Card."
          : "Open http://localhost:5173/app/pickup_logs in Chrome on your Android phone and tap 'Pair Phone NFC'.",
        type: "info"
      })
      return
    }

    try {
      // Reuse existing NDEFReader instance so we never attach duplicate onreading listeners
      if (!ndefReaderRef.current) {
        const ndef = new (window as any).NDEFReader()
        await ndef.scan()
        ndefReaderRef.current = ndef

        ndef.onreading = async (event: any) => {
          // Cooldown check right at hardware listener level (1.5 seconds)
          if (Date.now() - lastNfcScanTimeRef.current < 1500) {
            return
          }

          const rawSerial = event.serialNumber
            ? event.serialNumber.replace(/[^0-9A-Fa-f]/g, "").toUpperCase()
            : ""
          let cardHardwareUid = rawSerial ? `NFC-${rawSerial}` : ""
          let embeddedStudentId: string | number | undefined
          let embeddedGuardianName: string | undefined

          if (event.message?.records) {
            for (const record of event.message.records) {
              if (record.recordType === "text") {
                try {
                  const textDecoder = new TextDecoder(record.encoding || "utf-8")
                  const textVal = textDecoder.decode(record.data).trim()
                  if (textVal.startsWith("FCU-PICKUP|")) {
                    const parts = textVal.split("|")
                    if (parts[1]) embeddedStudentId = parts[1]
                    if (parts[2]) embeddedGuardianName = parts[2]
                    if (parts[3] && !cardHardwareUid) cardHardwareUid = parts[3].toUpperCase()
                  } else if (textVal) {
                    if (!cardHardwareUid) {
                      cardHardwareUid = textVal.toUpperCase().startsWith("NFC-")
                        ? textVal.toUpperCase()
                        : `NFC-${textVal.toUpperCase()}`
                    }
                  }
                } catch { }
              }
            }
          }

          const finalUid = cardHardwareUid || `NFC-TAG-${Math.floor(1000 + Math.random() * 9000)}`

          // If user is in "Assign Card Profile" tab or waiting to assign, save or fill the card UID immediately!
          if (terminalTabRef.current === "assign" || isWaitingForCardToAssignRef.current) {
            lastNfcScanTimeRef.current = Date.now()
            setAssignCardUid(finalUid)
            if (assignStudentIdRef.current) {
              await saveCardProfileAssignmentRef.current(
                finalUid,
                assignStudentIdRef.current,
                assignGuardianNameRef.current,
                assignSelectedGuardiansRef.current
              )
            } else {
              playNfcBeep()
              toast.add({
                title: `Card Read: ${finalUid}`,
                description: "Select a guardian from the dropdown and click Save Profile to Card.",
                type: "info"
              })
            }
            return
          }

          // Otherwise, we are in Scan Pick Up mode: broadcast tap to laptop & verify locally once!
          try {
            const tapRes = await ApiHandler.post<{
              tap?: { id: string; uid: string; student_id?: string | number; guardian_name?: string }
            }>("/nfc/tap", {
              uid: finalUid,
              student_id: embeddedStudentId,
              guardian_name: embeddedGuardianName
            })
            if (tapRes?.tap?.id) {
              lastProcessedTapIdRef.current = tapRes.tap.id
            }
            handleQuickNfcScanRef.current(
              finalUid,
              tapRes?.tap?.student_id ?? embeddedStudentId,
              tapRes?.tap?.guardian_name ?? embeddedGuardianName
            )
          } catch {
            handleQuickNfcScanRef.current(finalUid, embeddedStudentId, embeddedGuardianName)
          }
        }
      }

      setIsPhoneNfcListening(true)
    } catch (err: any) {
      toast.add({
        title: "Phone NFC Permission Required",
        description: err?.message || "Please turn ON NFC in your Android settings and allow Chrome permission.",
        type: "error"
      })
    }
  }

  // Poll backend for remote Phone NFC taps (ignores any tap that occurred before this page opened)
  useEffect(() => {
    const pollPhoneNfc = async () => {
      try {
        const res = await ApiHandler.get<{
          tap?: { id: string; uid: string; student_id?: string | number; guardian_name?: string; timestamp?: number }
        }>("/nfc/poll")
        if (
          res?.tap &&
          res.tap.id !== lastProcessedTapIdRef.current &&
          (!res.tap.timestamp || res.tap.timestamp >= mountTimestampRef.current)
        ) {
          lastProcessedTapIdRef.current = res.tap.id
          await fetchAssignedNfcCards()
          handleQuickNfcScan(res.tap.uid, res.tap.student_id, res.tap.guardian_name)
        }
      } catch { }
    }

    const timer = setInterval(pollPhoneNfc, 2000)
    return () => clearInterval(timer)
  }, [presentStudentsAwaitingPickup, assignedNfcCards])

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

    if (verificationMode === "nfc" && !isNfcCardVerified) {
      toast.add({
        title: "NFC Card Verification Required",
        description: "Please tap or scan the guardian's NFC Pickup Card to verify before completing dismissal.",
        type: "warning"
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
      const guardianLabel = selectedGuardianForPickup || "Authorized Guardian"
      const verifiedByStr =
        verificationMode === "nfc"
          ? `NFC Card Verified (${scannedNfcUid || expectedNfcUid}) • ${guardianLabel}`
          : `Manual Check Out • ${guardianLabel}`

      const res = await ApiHandler.post<{ attendance?: AttendanceRecord }>("/attendance/override", {
        student_id: student.id,
        date: selectedDate,
        status: "Checked Out",
        time_in: att?.time_in || "08:00:00",
        time_out: currentTime,
        verified_by: verifiedByStr
      })

      // Optimistically update attendance state immediately so UI updates in 0ms
      const updatedRecord: AttendanceRecord = res?.attendance || {
        id: att?.id || Date.now(),
        student_id: student.id,
        date: selectedDate,
        time_in: att?.time_in || "08:00:00",
        time_out: currentTime,
        status: "Checked Out",
        verified_by: verifiedByStr,
        student
      }
      setAttendances(prev => {
        const exists = prev.some(a => String(a.student_id) === String(student.id))
        if (exists) {
          return prev.map(a => (String(a.student_id) === String(student.id) ? { ...a, ...updatedRecord } : a))
        }
        return [updatedRecord, ...prev]
      })

      // Close modal immediately without waiting for background re-fetch
      setIsRecordModalOpen(false)
      setSelectedStudentForPickup("")
      setSelectedGuardianForPickup("")
      setIsNfcCardVerified(false)
      setScannedNfcUid("")

      toast.add({
        title: verificationMode === "nfc" ? "NFC Pick Up Verified & Logged" : "Manual Check Out Logged ✓",
        description: `${student.name} was checked out to ${guardianLabel} (${verificationMode === "nfc" ? scannedNfcUid || expectedNfcUid : "Manual Check Out"}).`,
        type: "success"
      })

      // Sync across open tabs & Admin pages immediately
      window.dispatchEvent(new Event("rfid_scan_updated"))
      try {
        const bc = new BroadcastChannel("rfid_attendance_sync")
        bc.postMessage({ type: "attendance_updated", event: "attendance_updated", timestamp: Date.now() })
        bc.close()
      } catch { }

      fetchAttendanceOnly()
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
          {getTimeBasedInfo().isDaytime ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 shadow-xs shrink-0">
              <Sun className="h-6 w-6 fill-amber-400 text-amber-500" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-500/30 shadow-xs shrink-0">
              <Moon className="h-6 w-6 fill-indigo-400 text-indigo-500" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral">
              {getTimeBasedInfo().greeting}, {displayName}!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              Here's what's happening in your class today.
            </p>
          </div>
        </div>

        {/* Action Buttons: Refresh, Manual Check Out & NFC Pick Up */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Sync Gate Logs"
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-neutral hover:bg-tertiary transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={() => {
              setVerificationMode("manual")
              setIsRecordModalOpen(true)
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-none"
          >
            <LogOut className="h-4 w-4" />
            <span>Manual Check Out</span>
          </button>

          <button
            onClick={() => {
              setVerificationMode("nfc")
              setIsRecordModalOpen(true)
            }}
            className="px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border-none"
          >
            <CreditCard className="h-4 w-4" />
            <span>NFC Pick Up</span>
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

      {/* 3. Content Grid: On smaller windows (< xl), NFC Terminal & Awaiting Pickup appear FIRST (order-1), Table SECOND (order-2) */}
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-12 items-start">

        {/* LEFT COLUMN: Pick Up Logs Table & Responsive Cards (8 Cols on xl+) */}
        <div className="order-2 xl:order-1 xl:col-span-8 min-w-0 rounded-3xl border border-border bg-card shadow-xs overflow-hidden space-y-0">

          {/* Filter sub-header */}
          <div className="px-4 sm:px-6 py-3 border-b border-border/70 flex items-center justify-between text-xs bg-tertiary/10">
            <span className="font-bold text-muted-foreground">Pick Up Log Entries</span>

            <span className="text-[11px] font-bold text-muted-foreground">
              {filteredPickups.length} {filteredPickups.length === 1 ? "Record" : "Records"}
            </span>
          </div>

          {/* Responsive Card List (< lg) */}
          <div className="lg:hidden divide-y divide-border/60">
            {filteredPickups.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-semibold">
                <div className="flex flex-col items-center justify-center gap-2">
                  <UserCheck className="h-8 w-8 text-muted-foreground/50 stroke-1" />
                  <p>No pick up records found for {formatSelectedDateDisplay(selectedDate)}.</p>
                </div>
              </div>
            ) : (
              filteredPickups.map((log) => (
                <div
                  key={`mob-card-${log.id}`}
                  onClick={() => setSelectedPickupDetail(log)}
                  className="p-4 space-y-2.5 hover:bg-tertiary/20 active:bg-tertiary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-neutral text-sm truncate">{log.studentName}</h4>
                      <p className="text-[11px] text-muted-foreground font-semibold mt-0.5 truncate">
                        Picked up by <span className="text-neutral font-bold">{log.guardianName}</span> ({log.guardianRelation})
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg shrink-0">
                      {log.time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {log.pickupType === "Manual Check Out" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <UserCheck className="h-3 w-3 text-amber-600" />
                          <span>Manual Check Out</span>
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CreditCard className="h-3 w-3 text-emerald-600" />
                            <span>{log.pickupType === "NFC Verified" ? "NFC Verified" : "Verified"}</span>
                          </span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-tertiary/60 border border-border text-primary">
                            {log.nfcCardUid}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1 shrink-0">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Receipt</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/70 text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase bg-tertiary/20">
                  <th className="py-4 px-6">TIME</th>
                  <th className="py-4 px-6">STUDENT NAME</th>
                  <th className="py-4 px-6">GUARDIAN NAME</th>
                  <th className="py-4 px-6">NFC CARD / VERIFICATION</th>
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
                            Click here to verify NFC card & record pickup for {presentStudentsAwaitingPickup.length} waiting students →
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
                        <div>{log.guardianName}</div>
                        <span className="text-[10px] text-muted-foreground">{log.guardianRelation}</span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {log.pickupType === "Manual Check Out" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-400">
                              <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                              <span>Manual Check Out</span>
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-400">
                                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{log.pickupType === "NFC Verified" ? "NFC Card Verified" : "Verified Card"}</span>
                              </span>
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-tertiary/60 border border-border text-primary">
                                {log.nfcCardUid}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPickupDetail(log)
                          }}
                          className="p-1.5 rounded-lg border border-border/70 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="View NFC Verification Details"
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
              <span>All records verified via Guardian NFC Card & RFID Gate</span>
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: NFC Scanner Terminal & Awaiting Pickup Summary (Shown FIRST on smaller windows) */}
        <div className="order-1 xl:order-2 xl:col-span-4 min-w-0 space-y-5 sm:space-y-6">

          {/* Quick NFC Card Verification & Profile Assignment Terminal */}
          <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral uppercase tracking-wider">
                    NFC Card Pickup Terminal
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {isPhoneNfcListening ? "Phone NFC Reader Listening..." : "Pair Phone to Scan or Assign Cards"}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${isPhoneNfcListening
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-amber-50 text-amber-600 border-amber-200"
                  }`}
              >
                <Wifi className={`h-3 w-3 rotate-90 ${isPhoneNfcListening ? "animate-ping" : ""}`} />
                {isPhoneNfcListening ? "Listening" : "Standby"}
              </span>
            </div>

            {/* Mode Switcher: Scan Pick Up vs Assign Card Profile */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-tertiary/40 border border-border">
              <button
                type="button"
                onClick={() => {
                  setTerminalTab("scan")
                  setIsWaitingForCardToAssign(false)
                }}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border-none ${terminalTab === "scan"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-transparent text-muted-foreground hover:text-neutral"
                  }`}
              >
                1. Scan Pick Up
              </button>
              <button
                type="button"
                onClick={() => setTerminalTab("assign")}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border-none ${terminalTab === "assign"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-transparent text-muted-foreground hover:text-neutral"
                  }`}
              >
                2. Assign Card Profile
              </button>
            </div>

            {terminalTab === "scan" ? (
              <div className="space-y-3.5">
                {/* Visual Mini NFC Smart Card Preview */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#003399] via-[#0B3B99] to-[#1E293B] p-4 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold tracking-widest uppercase text-yellow-300 block">
                        FCU KINDERGARTEN • GUARDIAN PASS
                      </span>
                      <span className="text-xs font-black tracking-tight mt-0.5 block">
                        {lastPhoneReadUid
                          ? assignedNfcCards[lastPhoneReadUid]?.student_name || "Physical NFC Card Read"
                          : "Awaiting Physical NFC Card Tap"}
                      </span>
                    </div>
                    <Wifi className={`h-5 w-5 rotate-90 ${isPhoneNfcListening ? "text-emerald-300 animate-pulse" : "text-yellow-300/90"}`} />
                  </div>

                  <div className="my-3 flex items-center justify-between">
                    <div className="h-7 w-9 rounded-md bg-gradient-to-tr from-amber-300 to-yellow-200 border border-amber-400/60 shadow-inner flex items-center justify-center">
                      <div className="h-4 w-6 rounded-xs border border-amber-600/40" />
                    </div>
                    <span className="font-mono text-xs font-extrabold tracking-wider text-yellow-300">
                      {lastPhoneReadUid || "TAP CARD TO SCAN"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/85 pt-2 border-t border-white/15">
                    <span className="truncate pr-2">
                      {lastPhoneReadUid
                        ? `Last Read: ${lastPhoneReadUid} (${lastPhoneReadTime})`
                        : isPhoneNfcListening
                          ? "Hold NFC card on back of phone..."
                          : "Tap 'Pair Phone NFC' to start"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartPhoneNfcReader(false)}
                      className="px-2.5 py-1 rounded-lg bg-yellow-400 text-slate-950 font-black hover:bg-yellow-300 transition-colors cursor-pointer border-none flex items-center gap-1 shrink-0 text-[10px]"
                    >
                      <Smartphone className="h-3 w-3" />
                      <span>{isPhoneNfcListening ? "NFC Active ✓" : "Pair Phone NFC"}</span>
                    </button>
                  </div>
                </div>

                {/* Manual / USB Reader UID Lookup */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Or Enter / USB-Scan Registered Card UID:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Scan card or type UID..."
                      value={quickNfcInput}
                      onChange={(e) => setQuickNfcInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleQuickNfcScan()
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-tertiary/30 text-xs font-mono font-bold text-neutral placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickNfcScan()}
                      disabled={!quickNfcInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-extrabold hover:opacity-90 transition-opacity cursor-pointer border-none flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                    >
                      <span>Verify UID</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: ASSIGN STUDENT & GUARDIAN PROFILE TO PHYSICAL NFC CARD */
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-primary/5 border border-primary/15 space-y-1">
                  <p className="font-extrabold text-primary text-[11px]">
                    Link a Student & Guardian Profile to an NFC Card
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Select a student below, then tap <strong>Scan & Write to NFC Card</strong> on your phone and touch your physical NFC card to the back of your phone.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                    1. Select Registered Guardian:
                  </label>
                  <select
                    value={assignStudentId && assignGuardianName ? `${assignStudentId}|${assignGuardianName}` : ""}
                    onChange={(e) => {
                      const val = e.target.value
                      if (!val) {
                        setAssignStudentId("")
                        setAssignGuardianName("")
                        return
                      }
                      const [stuId, ...gParts] = val.split("|")
                      const gName = gParts.join("|")
                      setAssignStudentId(stuId)
                      setTimeout(() => setAssignGuardianName(gName), 0)
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-tertiary/30 text-xs font-bold text-neutral focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Choose Registered Guardian --</option>
                    {students
                      .flatMap(s =>
                        (s.guardians && s.guardians.length > 0
                          ? s.guardians
                          : [{ name: "Authorized Guardian", relation: "Guardian", phone: "N/A" }]
                        )
                          .filter(
                            g =>
                              !Object.values(assignedNfcCards).some(
                                card =>
                                  String(card.student_id) === String(s.id) &&
                                  card.guardian_name.trim().toLowerCase() === g.name.trim().toLowerCase()
                              )
                          )
                          .map((g, i) => ({ student: s, guardian: g, key: `${s.id}-${i}` }))
                      )
                      .map(({ student: s, guardian: g, key }) => (
                        <option key={key} value={`${s.id}|${g.name}`}>
                          {g.name} ({g.relation} • {g.phone})
                        </option>
                      ))}
                  </select>
                </div>

                {assignStudentObj && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                      2. Student (Child of Guardian):
                    </label>
                    <div className="px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-neutral">{assignStudentObj.name}</span>
                      <span className="text-[10px] font-bold text-primary">
                        {assignStudentObj.section
                          ? `${assignStudentObj.section.year_level} - ${assignStudentObj.section.section_name}`
                          : assignStudentObj.grade}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                    3. Physical NFC Card UID (Auto-fills on phone tap):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tap card on phone or enter UID..."
                      value={assignCardUid}
                      onChange={(e) => setAssignCardUid(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-tertiary/30 text-xs font-mono font-bold text-neutral focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleStartPhoneNfcReader(true)}
                      disabled={!assignStudentId}
                      className={`px-3 py-2 rounded-xl text-[11px] font-extrabold text-white border-none cursor-pointer flex items-center gap-1 shrink-0 ${isWaitingForCardToAssign ? "bg-amber-500 animate-pulse" : "bg-indigo-600 hover:bg-indigo-700"
                        } disabled:opacity-40`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>{isWaitingForCardToAssign ? "Tap Card Now..." : "Tap Card on Phone"}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveCardProfileAssignment(assignCardUid, assignStudentId, assignGuardianName)}
                  disabled={!assignStudentId || !assignCardUid.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer border-none disabled:opacity-40"
                >
                  Save Profile to Card ({assignCardUid || "No UID"})
                </button>

                {/* List of Assigned NFC Cards */}
                {Object.keys(assignedNfcCards).length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                      Registered NFC Cards ({Object.keys(assignedNfcCards).length}):
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {Object.values(assignedNfcCards).map((item) => (
                        <div
                          key={item.uid}
                          className="px-2.5 py-2 rounded-xl bg-tertiary/40 border border-border/60 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-neutral block truncate">{item.student_name}</span>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              {item.guardian_name} • <span className="font-mono font-bold text-primary">{item.uid}</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCardToDelete(item)}
                            title={`Remove profile from card ${item.uid}`}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {presentStudentsAwaitingPickup.map(student => {
                  const cardUid = getStudentNfcCardUid(student, 0)
                  return (
                    <div
                      key={student.id}
                      className="p-3 rounded-xl bg-tertiary/20 border border-border/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-neutral truncate">{student.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {student.guardians?.[0]?.name || "Guardian"} • <span className="font-mono font-bold text-primary">{cardUid}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedStudentForPickup(student.id)
                            setVerificationMode("manual")
                            setIsRecordModalOpen(true)
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-colors border-none cursor-pointer flex items-center gap-1"
                          title={`Manual Check Out for ${student.name}`}
                        >
                          <LogOut className="h-3 w-3" />
                          <span>Manual</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudentForPickup(student.id)
                            setVerificationMode("nfc")
                            setIsRecordModalOpen(true)
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold hover:opacity-90 transition-opacity border-none cursor-pointer flex items-center gap-1"
                          title={`Verify NFC Card (${cardUid}) for ${student.name}`}
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>NFC</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL 1: Record Pick Up Modal with NFC Card Verification */}
      {isRecordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsRecordModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-scale-up max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral">NFC Guardian Pick Up Verification</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Verify guardian NFC card and confirm safe student dismissal</p>
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
              {/* Child of Registered Guardian (Read-Only Display) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Student (Child of Registered Guardian)
                </label>
                {activeStudentInModal ? (
                  <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black text-xs shrink-0">
                        {activeStudentInModal.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-neutral truncate">
                          {activeStudentInModal.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-muted-foreground truncate">
                          {activeStudentInModal.section
                            ? `${activeStudentInModal.section.year_level} - ${activeStudentInModal.section.section_name}`
                            : activeStudentInModal.grade}{" "}
                          • RFID: <span className="font-mono font-bold text-primary">{activeStudentInModal.rfid}</span>
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Linked Child
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-tertiary/30 border border-dashed border-border text-center text-xs text-muted-foreground font-semibold">
                    Tap the guardian's NFC card (or select the registered guardian below) to display their child.
                  </div>
                )}
              </div>

              {/* Authorized Guardian Presenting Card */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Registered Guardian Presenting Card
                </label>
                {activeStudentInModal && isNfcCardVerified ? (
                  <div className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-extrabold text-neutral block">{selectedGuardianForPickup || "Authorized Guardian"}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {activeStudentInModal.guardians?.find(g => g.name === selectedGuardianForPickup)?.relation || "Registered Guardian"}
                        {activeStudentInModal.guardians?.find(g => g.name === selectedGuardianForPickup)?.phone
                          ? ` • ${activeStudentInModal.guardians?.find(g => g.name === selectedGuardianForPickup)?.phone}`
                          : ""}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {scannedNfcUid || expectedNfcUid}
                    </span>
                  </div>
                ) : (
                  <select
                    value={activeStudentInModal ? `${activeStudentInModal.id}|${selectedGuardianForPickup}` : ""}
                    onChange={(e) => {
                      const val = e.target.value
                      if (!val) {
                        setSelectedStudentForPickup("")
                        setSelectedGuardianForPickup("")
                        return
                      }
                      const [stuId, ...gParts] = val.split("|")
                      const gName = gParts.join("|")
                      setSelectedStudentForPickup(stuId)
                      setTimeout(() => setSelectedGuardianForPickup(gName), 0)
                      setIsNfcCardVerified(false)
                      setScannedNfcUid("")
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-tertiary/20 text-xs font-bold text-neutral focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Tap NFC Card or Select Registered Guardian --</option>
                    {(presentStudentsAwaitingPickup.length > 0 ? presentStudentsAwaitingPickup : students).flatMap(s =>
                      (s.guardians && s.guardians.length > 0
                        ? s.guardians
                        : [{ name: "Registered Guardian", relation: "Guardian", phone: "N/A" }]
                      ).map((g, idx) => (
                        <option key={`${s.id}-${idx}`} value={`${s.id}|${g.name}`}>
                          {g.name} ({g.relation}) — Child: {s.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Verification Method Switcher */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Verification Method
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-tertiary/40 border border-border">
                  <button
                    type="button"
                    onClick={() => setVerificationMode("nfc")}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${verificationMode === "nfc"
                      ? "bg-primary text-white shadow-xs"
                      : "bg-transparent text-muted-foreground hover:text-neutral"
                      }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>NFC Card Tap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationMode("manual")}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${verificationMode === "manual"
                      ? "bg-primary text-white shadow-xs"
                      : "bg-transparent text-muted-foreground hover:text-neutral"
                      }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Manual Override</span>
                  </button>
                </div>
              </div>

              {/* Interactive Guardian NFC Card Widget */}
              {verificationMode === "nfc" ? (
                <div className="space-y-3">
                  {/* Visual NFC Smart Card */}
                  <div
                    className={`relative overflow-hidden rounded-2xl p-4 text-white transition-all duration-300 shadow-lg border-2 ${isNfcCardVerified
                      ? "bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-800 border-emerald-300"
                      : isNfcScanning
                        ? "bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 border-yellow-300 animate-pulse"
                        : "bg-gradient-to-br from-[#003399] via-[#0F3D99] to-[#1E293B] border-white/15"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-yellow-300 block">
                          FILAMER CHRISTIAN UNIVERSITY • NFC PICKUP PASS
                        </span>
                        <h4 className="text-sm font-black mt-0.5">
                          {activeStudentInModal ? activeStudentInModal.name : "Select a Student Above"}
                        </h4>
                        <p className="text-[11px] text-white/80 font-semibold">
                          Guardian: {selectedGuardianForPickup || "Authorized Guardian"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Wifi className={`h-5 w-5 rotate-90 ${isNfcScanning ? "animate-ping text-yellow-300" : "text-white/90"}`} />
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isNfcCardVerified
                            ? "bg-white text-emerald-800"
                            : isNfcScanning
                              ? "bg-yellow-300 text-slate-900"
                              : "bg-white/15 text-white"
                            }`}
                        >
                          {isNfcCardVerified ? "✓ NFC Verified" : isNfcScanning ? "Scanning..." : "Awaiting Tap"}
                        </span>
                      </div>
                    </div>

                    <div className="my-3.5 flex items-center justify-between">
                      <div className="h-8 w-11 rounded-lg bg-gradient-to-tr from-amber-300 to-yellow-200 border border-amber-400 shadow-inner flex items-center justify-center">
                        <div className="h-5 w-7 rounded-xs border border-amber-700/40" />
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-white/70 block">GUARDIAN NFC UID</span>
                        <span className="font-mono text-sm font-black tracking-widest text-yellow-300">
                          {scannedNfcUid || expectedNfcUid}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-white/85 font-semibold">
                        {isNfcCardVerified
                          ? `Verified ${scannedNfcUid || expectedNfcUid} • Matched to ${activeStudentInModal?.name}`
                          : "Tap physical NFC card or click button to verify guardian identity"}
                      </span>
                      <button
                        type="button"
                        onClick={handleSimulateNfcTap}
                        disabled={!activeStudentInModal || isNfcScanning}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border-none shrink-0 flex items-center gap-1.5 ${isNfcCardVerified
                          ? "bg-white text-emerald-800 hover:bg-white/90"
                          : "bg-yellow-400 text-slate-950 hover:bg-yellow-300"
                          } disabled:opacity-50`}
                      >
                        <Wifi className="h-3.5 w-3.5 rotate-90" />
                        <span>{isNfcCardVerified ? "Re-Tap NFC Card" : isNfcScanning ? "Reading Card..." : "Tap NFC Card"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Hardware USB NFC Scanner Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Scan USB NFC Reader or enter ${expectedNfcUid}...`}
                      value={manualNfcInput}
                      onChange={(e) => setManualNfcInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleManualNfcVerify(manualNfcInput)
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-tertiary/20 text-xs font-mono font-bold text-neutral placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleManualNfcVerify(manualNfcInput || expectedNfcUid)}
                      disabled={!activeStudentInModal}
                      className="px-3 py-2 rounded-xl border border-border bg-tertiary/60 hover:bg-tertiary text-xs font-bold text-neutral transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Verify UID
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 dark:bg-amber-950/20 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <span>Faculty Visual ID Inspection (Manual Override)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Use when guardian does not have their physical NFC card present and identity is verified visually by the class adviser.
                  </p>
                </div>
              )}

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
                  disabled={
                    isSubmittingPickup ||
                    !selectedStudentForPickup ||
                    (verificationMode === "nfc" && !isNfcCardVerified)
                  }
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 border-none flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {isSubmittingPickup
                      ? "Recording..."
                      : verificationMode === "nfc"
                        ? "Confirm NFC Verified Pick Up"
                        : "Confirm Manual Pick Up"}
                  </span>
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
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span>RFID Tag: <span className="font-mono text-neutral font-bold">{selectedPickupDetail.studentRfid}</span></span>
                  <span>NFC Card: <span className="font-mono text-primary font-bold">{selectedPickupDetail.nfcCardUid}</span></span>
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

              {/* NFC Verification Badge */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <span>NFC Card Verification</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] uppercase tracking-wider font-extrabold">
                    Verified • {selectedPickupDetail.nfcCardUid}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  {selectedPickupDetail.verifiedBy}
                </p>
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

      {/* MODAL 3: Confirm Delete Registered NFC Card Modal */}
      {cardToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => !isDeletingCard && setCardToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral">Remove NFC Card?</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Unlink profile from physical card</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeletingCard}
                onClick={() => setCardToDelete(null)}
                className="p-1 rounded-full hover:bg-tertiary text-muted-foreground transition-colors cursor-pointer border-none bg-transparent disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Are you sure you want to remove the assigned student and guardian profile from this NFC card?
              </p>

              <div className="p-3.5 rounded-2xl bg-tertiary/30 border border-border/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">NFC CARD UID</span>
                  <span className="font-mono text-xs font-extrabold text-primary">{cardToDelete.uid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">STUDENT</span>
                  <span className="font-bold text-neutral">{cardToDelete.student_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">GUARDIAN</span>
                  <span className="font-semibold text-neutral">{cardToDelete.guardian_name}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <button
                type="button"
                disabled={isDeletingCard}
                onClick={() => setCardToDelete(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-tertiary transition-colors cursor-pointer bg-transparent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCard}
                onClick={handleConfirmDeleteAssignedCard}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingCard ? "Removing..." : "Yes, Remove Card"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default PickUpLogs
