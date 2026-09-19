import React, { useState, useEffect, useRef, useMemo } from "react"
import {
  Wifi,
  WifiOff,
  Settings,
  Radio,
  Zap,
  Play,
  Pause,
  ArrowRightLeft,
  CheckCircle2,
  UserCheck,
  HelpCircle,
  Smartphone,
  Sliders,
  Usb,
  ShieldAlert,
  Terminal,
  Volume2,
  VolumeX,
  Trash2
} from "lucide-react"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../../components/ui/toast"

interface Guardian {
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

interface ScanLog {
  id: string
  timestamp: string
  studentName: string
  rfid: string
  grade: string
  sectionName: string
  direction: 'in' | 'out'
  rssi: number
  distance: number
  status: string
  smsLogs: Array<{
    guardian_name: string
    phone: string
    relation: string
    message: string
  }>
}

export function RfidScan() {
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const userRole = user.role || "admin"
  const isAdmin = userRole === "admin"

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [isLoading, setIsLoading] = useState(true)

  // UHF Reader Settings State
  const [rfPower, setRfPower] = useState<number>(27) // dBm (approx 1-10 meters)
  const [frequencyBand, setFrequencyBand] = useState<string>("US (902-928 MHz)")
  const [multiTagMode, setMultiTagMode] = useState<boolean>(true)
  const [tagInventoryInterval, setTagInventoryInterval] = useState<number>(300) // ms
  const [readerStatus, setReaderStatus] = useState<'Connected' | 'Disconnected' | 'Scanning'>('Scanning')

  // Physical USB WebHID Reader State
  const [hidDevice, setHidDevice] = useState<any>(null)
  const [isConnectingHid, setIsConnectingHid] = useState<boolean>(false)
  const [physicalDeviceName, setPhysicalDeviceName] = useState<string>("")
  const [lastRawPacket, setLastRawPacket] = useState<string>("")
  const [lastPhysicalEpc, setLastPhysicalEpc] = useState<string>("")
  const [physicalScanCount, setPhysicalScanCount] = useState<number>(0)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [manualEpcInput, setManualEpcInput] = useState<string>("")
  const lastScannedTimeRef = useRef<{ [epc: string]: number }>({})

  const getLocalTodayDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Simulation Controls State
  const [isTrafficSimulating, setIsTrafficSimulating] = useState<boolean>(false)
  const [simulationDate, setSimulationDate] = useState<string>(getLocalTodayDate())
  const [simulatedAttenuation, setSimulatedAttenuation] = useState<number>(0) // dB

  // Radar points animation state
  const [radarPoints, setRadarPoints] = useState<Array<{ id: string; x: number; y: number; r: number; opacity: number; label: string }>>([])

  // Real-time scan log list (initialized from localStorage to persist across refreshes)
  const [scanLogs, setScanLogs] = useState<ScanLog[]>(() => {
    try {
      const cached = localStorage.getItem("rfid_gate_logs")
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })

  // Persist scanLogs to localStorage whenever updated
  useEffect(() => {
    if (scanLogs.length > 0) {
      try {
        localStorage.setItem("rfid_gate_logs", JSON.stringify(scanLogs))
      } catch (e) {
        console.error("Failed to save gate logs to localStorage", e)
      }
    }
  }, [scanLogs])

  // Connection config
  const readerIP = "192.168.1.105"
  const readerPort = "5080"

  const simIntervalRef = useRef<any>(null)

  // Calculate estimated read range dynamically based on RF Power and attenuation
  const estimatedRange = useMemo(() => {
    const powerEffective = rfPower - simulatedAttenuation
    if (powerEffective <= 10) return "1.2 meters"
    if (powerEffective <= 15) return "3.0 meters"
    if (powerEffective <= 20) return "5.5 meters"
    if (powerEffective <= 25) return "8.0 meters"
    return "10.5 meters"
  }, [rfPower, simulatedAttenuation])

  // Fetch student database for simulation triggers
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const studentsData = await ApiHandler.get<Student[]>("/students")
        setStudents(studentsData)
        if (studentsData.length > 0) {
          setSelectedStudentId(studentsData[0].id.toString())
        }
      } catch (error) {
        console.error("Failed to load students:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStudents()
  }, [])

  // Auto clean up simulation on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current)
    }
  }, [])

  // Helper to convert military 24-hour time to standard 12-hour AM/PM time
  const formatTimeString = (rawTime?: string | null) => {
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

  // Fetch real-time gate attendance logs from backend
  const fetchRecentScans = async () => {
    try {
      const localToday = getLocalTodayDate()
      const targetDate = simulationDate || localToday

      let data = await ApiHandler.get<any[]>(`/attendance?date=${targetDate}`)
      if (!Array.isArray(data) || data.length === 0) {
        data = await ApiHandler.get<any[]>(`/attendance`)
      }
      if (Array.isArray(data)) {
        const dbEvents: ScanLog[] = []

        data.forEach(item => {
          const studentObj = item.student
          const studentName = studentObj?.name || item.student_name || "Student"
          const sectionName = studentObj?.section
            ? `${studentObj.section.year_level} - ${studentObj.section.section_name}`
            : "Unassigned"
          const guardians = studentObj?.guardians || []

          // Check Out Event first (time_out occurs later than time_in, so it is newer)
          if (item.time_out) {
            const timeOutStr = formatTimeString(item.time_out)
            dbEvents.push({
              id: `db-out-${item.id}`,
              timestamp: timeOutStr,
              studentName,
              rfid: studentObj?.rfid || item.rfid || "N/A",
              grade: studentObj?.grade || "N/A",
              sectionName,
              direction: 'out',
              rssi: -58 - Math.floor(Math.random() * 8),
              distance: parseFloat((1.5 + Math.random() * 2).toFixed(1)),
              status: item.status || "Present",
              smsLogs: (item.sms_logs && item.sms_logs.length > 0) ? item.sms_logs : guardians.map((g: any) => ({
                guardian_name: g.name,
                phone: g.phone,
                relation: g.relation,
                message: `FCU Attendance Alert: ${studentName} checked OUT at ${timeOutStr}.`
              }))
            })
          }

          // Check In Event second
          if (item.time_in) {
            const timeInStr = formatTimeString(item.time_in)
            dbEvents.push({
              id: `db-in-${item.id}`,
              timestamp: timeInStr,
              studentName,
              rfid: studentObj?.rfid || item.rfid || "N/A",
              grade: studentObj?.grade || "N/A",
              sectionName,
              direction: 'in',
              rssi: -55 - Math.floor(Math.random() * 8),
              distance: parseFloat((1.2 + Math.random() * 2).toFixed(1)),
              status: item.status || "Present",
              smsLogs: (item.sms_logs && item.sms_logs.length > 0) ? item.sms_logs : guardians.map((g: any) => ({
                guardian_name: g.name,
                phone: g.phone,
                relation: g.relation,
                message: `FCU Attendance Alert: ${studentName} checked IN at ${timeInStr}.`
              }))
            })
          }
        })

        // Merge DB events into scanLog history without purging previous scan logs
        setScanLogs(prev => {
          if (dbEvents.length === 0) return prev

          // Identify DB events that do not already exist in scanLog history
          const missingDbEvents = dbEvents.filter(d =>
            !prev.some(p => p.id === d.id || (p.rfid === d.rfid && p.direction === d.direction && p.timestamp === d.timestamp))
          )

          if (missingDbEvents.length === 0) return prev

          return [...missingDbEvents, ...prev].slice(0, 100)
        })
      }
    } catch (error) {
      console.error("Failed to fetch real-time gate logs:", error)
    }
  }

  useEffect(() => {
    fetchRecentScans()
    const interval = setInterval(fetchRecentScans, 3000)

    const handleCustomScanEvent = () => fetchRecentScans()
    window.addEventListener("rfid_scan_updated", handleCustomScanEvent)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("rfid_attendance_sync")
      bc.onmessage = () => fetchRecentScans()
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rfid_gate_logs") fetchRecentScans()
    }
    window.addEventListener("storage", handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener("rfid_scan_updated", handleCustomScanEvent)
      window.removeEventListener("storage", handleStorageChange)
      if (bc) bc.close()
    }
  }, [simulationDate])

  // Generate random coordinate point for radar sweep when a scan occurs
  const addRadarPoint = (label: string) => {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 95 + 10
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    const newPoint = {
      id: Math.random().toString(),
      x,
      y,
      r: 6,
      opacity: 1.0,
      label
    }
    setRadarPoints(prev => [...prev, newPoint])

    const decayInterval = setInterval(() => {
      setRadarPoints(prev =>
        prev.map(p => p.id === newPoint.id ? { ...p, opacity: p.opacity - 0.05 } : p)
          .filter(p => p.opacity > 0)
      )
    }, 150)

    setTimeout(() => {
      clearInterval(decayInterval)
    }, 4000)
  }

  // API Call - Send scan payload to Laravel backend
  const executeScan = async (studentRfid: string, overrideDirection?: 'in' | 'out', customTime?: string) => {
    try {
      const baseRssi = -50 - (30 - rfPower) * 1.5 - simulatedAttenuation
      const variance = Math.floor(Math.random() * 8) - 4
      const rssi = Math.max(-95, Math.min(-40, baseRssi + variance))

      const distanceFraction = (rssi + 40) / -55
      const distance = parseFloat(Math.max(0.5, Math.min(11, distanceFraction * 10)).toFixed(1))

      const scanDirection = overrideDirection || direction

      let formattedTime = customTime
      if (!formattedTime) {
        const now = new Date()
        formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      }

      const response = await ApiHandler.post<{
        message: string
        student: Student
        attendance: {
          id: number
          time_in: string
          time_out: string | null
          status: string
          verified_by: string
        } | null
        direction: 'in' | 'out'
        ignored?: boolean
        sms_logs: Array<{
          guardian_name: string
          phone: string
          relation: string
          message: string
        }>
      }>("/attendance/scan", {
        rfid: studentRfid,
        direction: scanDirection,
        date: simulationDate,
        time: formattedTime
      })

      const scannedStudent = response.student

      // Check if backend database ignored the scan because transaction is currently active
      if (response.ignored) {
        toast.add({
          title: `Scan Ignored: ${scannedStudent ? scannedStudent.name : studentRfid}`,
          description: response.message || `Barcode ${studentRfid} is currently active/checked in. Mark as checked out before scanning again.`,
          type: "warning"
        })
        return false
      }

      const sectionName = scannedStudent?.section
        ? `${scannedStudent.section.year_level} - ${scannedStudent.section.section_name}`
        : "Unassigned"

      const newLog: ScanLog = {
        id: Math.random().toString(),
        timestamp: formattedTime,
        studentName: scannedStudent ? scannedStudent.name : "Unknown",
        rfid: studentRfid,
        grade: scannedStudent ? scannedStudent.grade : "N/A",
        sectionName,
        direction: response.direction,
        rssi,
        distance,
        status: response.attendance ? response.attendance.status : "Present",
        smsLogs: response.sms_logs
      }

      setScanLogs(prev => [newLog, ...prev].slice(0, 100))
      if (scannedStudent) {
        addRadarPoint(scannedStudent.name)
      }
      window.dispatchEvent(new Event("rfid_scan_updated"))

      try {
        const bc = new BroadcastChannel("rfid_attendance_sync")
        bc.postMessage({ type: "rfid_scanned", timestamp: Date.now() })
        bc.close()
      } catch {}

      toast.add({
        title: `UHF Scanned: ${scannedStudent ? scannedStudent.name : studentRfid}`,
        description: `Student ${response.direction === 'in' ? 'checked IN' : 'checked OUT'} successfully. RSSI: ${rssi} dBm.`,
        type: "success"
      })

      return true
    } catch (error: any) {
      console.error(error)
      toast.add({
        title: "Scan Failed",
        description: error.message || "Failed to submit RFID scan to API.",
        type: "error"
      })
      return false
    }
  }

  // Synthesize an RFID scan beep
  const playBeep = () => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.09)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } catch {
      // Audio context restricted
    }
  }

  // Handle incoming EPC tags from physical reader (WebHID or Keyboard Wedge)
  const handlePhysicalTagDetected = async (epc: string, rssiVal?: number) => {
    const cleanedEpc = epc.trim().toUpperCase()
    if (!cleanedEpc || cleanedEpc.length < 4) return

    const now = Date.now()
    const lastScan = lastScannedTimeRef.current[cleanedEpc] || 0
    if (now - lastScan < 5000) {
      console.log(`[UHF Cooldown] Tag ${cleanedEpc} in cooldown`)
      return
    }
    lastScannedTimeRef.current[cleanedEpc] = now
    setLastPhysicalEpc(cleanedEpc)
    setPhysicalScanCount(prev => prev + 1)
    playBeep()

    await executeScan(cleanedEpc)
  }

  // Connect Physical USB UHF Reader using WebHID API
  const connectPhysicalReader = async () => {
    if (!("hid" in navigator)) {
      toast.add({
        title: "Browser Not Supported",
        description: "Direct WebHID USB connection is supported in Google Chrome and Microsoft Edge.",
        type: "error"
      })
      return
    }

    try {
      setIsConnectingHid(true)
      const devices = await (navigator as any).hid.requestDevice({
        filters: [
          { vendorId: 0x04d8, productId: 0x033f },
          { vendorId: 0x04d8 }
        ]
      })

      if (!devices || devices.length === 0) {
        setIsConnectingHid(false)
        return
      }

      const device = devices[0]
      if (!device.opened) {
        await device.open()
      }

      setHidDevice(device)
      const devName = device.productName || "915MHz UHF Reader (QW0A)"
      setPhysicalDeviceName(devName)
      setReaderStatus('Scanning')

      toast.add({
        title: "Physical UHF Reader Connected!",
        description: `Linked to ${devName} (VID:04D8 PID:033F).`,
        type: "success"
      })

      try {
        const startCmd = new Uint8Array([0x7C, 0xFF, 0xFF, 0x81, 0x32, 0x00, 0xD3])
        await device.sendReport(0x00, startCmd)
      } catch (cmdErr) {
        console.log("Start inventory note:", cmdErr)
      }

      device.oninputreport = (event: any) => {
        const { data } = event
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('')
        setLastRawPacket(hex)

        const rcpMatch = hex.match(/CCFF[0-9A-F]{4}[0-9A-F]{4}3000([0-9A-F]{24})/i)
        if (rcpMatch && rcpMatch[1]) {
          handlePhysicalTagDetected(rcpMatch[1])
          return
        }

        const epcMatch = hex.match(/E2[0-9A-F]{22}/i)
        if (epcMatch) {
          handlePhysicalTagDetected(epcMatch[0])
          return
        }

        const anyHex24 = hex.match(/[0-9A-F]{24}/i)
        if (anyHex24 && anyHex24[0] !== '000000000000000000000000' && anyHex24[0] !== 'FFFFFFFFFFFFFFFFFFFFFFFF') {
          handlePhysicalTagDetected(anyHex24[0])
        }
      }
    } catch (err: any) {
      console.error("WebHID failed:", err)
      toast.add({
        title: "USB Connection Failed",
        description: err.message || "Failed to open USB device.",
        type: "error"
      })
    } finally {
      setIsConnectingHid(false)
    }
  }

  // Disconnect Physical Reader
  const disconnectPhysicalReader = async () => {
    if (hidDevice) {
      try {
        await hidDevice.close()
      } catch (e) {
        console.error("Error closing device:", e)
      }
      setHidDevice(null)
      setPhysicalDeviceName("")
      toast.add({
        title: "USB Reader Disconnected",
        description: "Physical UHF reader link closed.",
        type: "info"
      })
    }
  }

  useEffect(() => {
    const handleHidDisconnect = (event: any) => {
      if (event.device === hidDevice) {
        setHidDevice(null)
        setPhysicalDeviceName("")
        toast.add({
          title: "Hardware Disconnected",
          description: "USB UHF RFID Reader was unplugged.",
          type: "warning"
        })
      }
    }

    if ("hid" in navigator) {
      (navigator as any).hid.addEventListener("disconnect", handleHidDisconnect)
    }

    return () => {
      if ("hid" in navigator) {
        (navigator as any).hid.removeEventListener("disconnect", handleHidDisconnect)
      }
      if (hidDevice && hidDevice.opened) {
        hidDevice.close().catch(() => { })
      }
    }
  }, [hidDevice])

  useEffect(() => {
    let keyBuffer = ""
    let lastKeyTime = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      const now = Date.now()
      if (now - lastKeyTime > 250) {
        keyBuffer = ""
      }
      lastKeyTime = now

      if (e.key === 'Enter') {
        const cleaned = keyBuffer.trim().toUpperCase()
        if (cleaned.length >= 8) {
          handlePhysicalTagDetected(cleaned)
        }
        keyBuffer = ""
      } else if (e.key.length === 1) {
        keyBuffer += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSingleScan = async () => {
    if (readerStatus === 'Disconnected') {
      toast.add({
        title: "Reader Offline",
        description: "Please connect the UHF reader before simulating scans.",
        type: "error"
      })
      return
    }

    const student = students.find(s => s.id.toString() === selectedStudentId)
    if (!student) return
    await executeScan(student.rfid)
  }

  const handleBatchScan = async () => {
    if (readerStatus === 'Disconnected') {
      toast.add({
        title: "Reader Offline",
        description: "Please connect the UHF reader before simulating scans.",
        type: "error"
      })
      return
    }

    if (students.length < 2) {
      toast.add({
        title: "Simulator Error",
        description: "Not enough students in database to run batch simulation.",
        type: "error"
      })
      return
    }

    const shuffled = [...students].sort(() => 0.5 - Math.random())
    const batchSize = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 3)
    const batchStudents = shuffled.slice(0, batchSize)

    toast.add({
      title: "UHF Batch Read Initialized",
      description: `Simulating group walkthrough. Field scanning ${batchSize} tags...`,
      type: "info"
    })

    for (let i = 0; i < batchStudents.length; i++) {
      const student = batchStudents[i]
      setTimeout(async () => {
        const randDir = Math.random() > 0.5 ? 'in' : 'out'
        await executeScan(student.rfid, randDir)
      }, i * 120)
    }
  }

  const handleToggleTrafficSimulation = () => {
    if (isTrafficSimulating) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current)
        simIntervalRef.current = null
      }
      setIsTrafficSimulating(false)
      toast.add({
        title: "Simulator Stopped",
        description: "Continuous foot traffic simulation deactivated.",
        type: "info"
      })
    } else {
      if (readerStatus === 'Disconnected') {
        toast.add({
          title: "Connection Required",
          description: "Cannot start simulation on an offline reader.",
          type: "error"
        })
        return
      }

      setIsTrafficSimulating(true)
      toast.add({
        title: "Simulator Running",
        description: "Continuous random foot traffic simulation activated.",
        type: "success"
      })

      simIntervalRef.current = setInterval(async () => {
        if (students.length === 0) return
        const randomStudent = students[Math.floor(Math.random() * students.length)]
        const randDir = Math.random() > 0.35 ? 'in' : 'out'

        const hour = Math.floor(Math.random() * 2) + 7
        const minute = String(Math.floor(Math.random() * 60)).padStart(2, '0')
        const second = String(Math.floor(Math.random() * 60)).padStart(2, '0')
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour > 12 ? hour - 12 : hour
        const simulatedTimeStr = `${String(displayHour).padStart(2, '0')}:${minute}:${second} ${ampm}`

        await executeScan(randomStudent.rfid, randDir, simulatedTimeStr)
      }, 6000)
    }
  }

  const toggleReaderStatus = () => {
    if (readerStatus === 'Disconnected') {
      setReaderStatus('Scanning')
      toast.add({
        title: "UHF Reader Connected",
        description: `Established communication on ${readerIP}:${readerPort} via TCP/IP.`,
        type: "success"
      })
    } else {
      if (isTrafficSimulating) {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current)
          simIntervalRef.current = null
        }
        setIsTrafficSimulating(false)
      }
      setReaderStatus('Disconnected')
      toast.add({
        title: "UHF Reader Offline",
        description: "Communication link terminated.",
        type: "warning"
      })
    }
  }

  // Clear Gate Logs Handler
  const handleClearGateLogs = async () => {
    if (!confirm("Are you sure you want to clear all active gate scan logs?")) return

    try {
      localStorage.removeItem("rfid_gate_logs")
      setScanLogs([])

      await ApiHandler.post("/attendance/clear-gate-logs", { delete_attendance: false })

      window.dispatchEvent(new Event("rfid_scan_updated"))

      try {
        const bc = new BroadcastChannel("rfid_attendance_sync")
        bc.postMessage({ type: "rfid_logs_cleared", timestamp: Date.now() })
        bc.close()
      } catch {}

      toast.add({
        title: "Gate Logs Cleared",
        description: "All gate scan activity logs have been cleared successfully.",
        type: "success"
      })
    } catch (error: any) {
      console.error("Failed to clear gate logs:", error)
      toast.add({
        title: "Clear Logs Failed",
        description: error.message || "Failed to clear gate logs from server.",
        type: "error"
      })
    }
  }

  return (
    <div className="space-y-8 animate-fade-in text-neutral font-sans">

      {/* Top Banner Status Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Radio className={`h-6 w-6 animate-pulse ${readerStatus === 'Disconnected' ? 'text-red-500' : 'text-primary'}`} />
            <h1 className="text-xl font-bold tracking-tight text-primary">
              {isAdmin ? "UHF Range RFID Gate Monitor (Admin Controls)" : "UHF Range RFID Gate Monitor"}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-semibold">
            Real-time active tracking of long-range multi-tag RFID attendance sensors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-border bg-tertiary/40 hover:bg-tertiary text-muted-foreground transition-all cursor-pointer"
            title={soundEnabled ? "Audio scan chime enabled (Click to mute)" : "Audio scan chime muted (Click to unmute)"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          </button>

          <div className="flex items-center gap-2 bg-tertiary/40 border border-border rounded-xl px-3.5 py-2 text-xs">
            <span className="font-bold text-muted-foreground">Reader Node:</span>
            <span className="font-bold text-neutral">MAIN_GATE_A</span>
          </div>

          <div className="flex items-center gap-2 bg-tertiary/40 border border-border rounded-xl px-3.5 py-2 text-xs">
            <span className="font-bold text-muted-foreground">IP/Port:</span>
            <span className="font-mono font-bold text-primary">{readerIP}:{readerPort}</span>
          </div>

          {/* Physical USB Reader Button */}
          {hidDevice ? (
            <button
              onClick={disconnectPhysicalReader}
              className="flex items-center gap-2 rounded-xl text-xs font-bold text-white shadow-sm border-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer"
              title="Click to disconnect physical USB UHF reader"
            >
              <Usb className="h-4 w-4 animate-pulse" />
              <span>USB: Connected (04D8:033F)</span>
            </button>
          ) : (
            <button
              onClick={connectPhysicalReader}
              disabled={isConnectingHid}
              className="flex items-center gap-2 rounded-xl text-xs font-bold text-white shadow-sm border-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Connect physical 915MHz QW0A USB Reader via WebHID"
            >
              <Usb className="h-4 w-4" />
              <span>{isConnectingHid ? "Connecting..." : "Connect Physical USB Reader"}</span>
            </button>
          )}

          <button
            onClick={toggleReaderStatus}
            className={`flex items-center gap-2 rounded-xl text-xs font-bold text-white shadow-sm border-none px-4 py-2.5 transition-all cursor-pointer ${readerStatus === 'Disconnected'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
          >
            {readerStatus === 'Disconnected' ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span>TCP Offline</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 animate-bounce" />
                <span>Gate Active</span>
              </>
            )}
          </button>

          {/* Clear Gate Logs Button */}
          {isAdmin && (
            <button
              onClick={handleClearGateLogs}
              className="flex items-center gap-2 rounded-xl text-xs font-bold text-white shadow-sm border-none px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
              title="Clear live RFID gate scan activity logs"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Gate Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* ADMIN SIDE: Full Grid View with Hardware Controls, Radar & Simulator */}
      {isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-12">

          {/* LEFT COLUMN: Hardware Config & Physical Link Panel */}
          <div className="lg:col-span-4 space-y-6">

            {/* PHYSICAL HARDWARE USB LINK CARD */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Usb className={`h-4 w-4 ${hidDevice ? 'text-emerald-500 animate-pulse' : 'text-indigo-600'}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Physical USB UHF Reader</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hidDevice
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  }`}>
                  {hidDevice ? 'WebHID Linked' : 'Ready to Link'}
                </span>
              </div>

              {/* Hardware specifications */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50 text-[11px]">
                  <span className="text-muted-foreground font-semibold">Detected Model:</span>
                  <span className="font-bold text-neutral">915MHz Reader (QW0A - V1.32)</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50 text-[11px]">
                  <span className="text-muted-foreground font-semibold">USB Interface:</span>
                  <span className="font-mono font-bold text-primary">VID:04D8 PID:033F</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50 text-[11px]">
                  <span className="text-muted-foreground font-semibold">Physical Scans Captured:</span>
                  <span className="font-bold text-emerald-600">{physicalScanCount} reads</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50 text-[11px]">
                  <span className="text-muted-foreground font-semibold">Last Scanned EPC:</span>
                  <span className="font-mono text-[10px] font-extrabold text-indigo-600 truncate max-w-[180px]">
                    {lastPhysicalEpc || "None yet"}
                  </span>
                </div>
              </div>

              {/* Live Raw Hex Packet Stream display */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Terminal className="h-3 w-3 text-indigo-500" />
                    <span>Last Hardware Hex Packet</span>
                  </span>
                  <span className="font-mono text-[9px] uppercase">RCP AUTO</span>
                </div>
                <div className="bg-tertiary/60 border border-border rounded-xl p-2.5 font-mono text-[10px] text-neutral break-all max-h-16 overflow-y-auto select-all">
                  {lastRawPacket || "Awaiting raw RCP packets from USB reader..."}
                </div>
              </div>

              {/* Manual Tag Test / Barcode Wedge Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                  <span>Test Tag EPC / Scanner Input</span>
                  <span className="text-[9px] lowercase font-normal">press enter to scan</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. E2806A960000501AB7463924"
                    value={manualEpcInput}
                    onChange={(e) => setManualEpcInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualEpcInput.trim()) {
                        handlePhysicalTagDetected(manualEpcInput.trim())
                        setManualEpcInput("")
                      }
                    }}
                    className="flex-1 rounded-xl border border-border bg-tertiary px-3 py-2 text-xs font-mono font-semibold text-neutral outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualEpcInput.trim()) {
                        handlePhysicalTagDetected(manualEpcInput.trim())
                        setManualEpcInput("")
                      }
                    }}
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                  >
                    Scan
                  </button>
                </div>
              </div>

              {/* Windows Device Exclusivity Note */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-2.5 text-[10px] text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <strong className="block text-amber-900 dark:text-amber-200">Device Exclusivity Warning:</strong>
                  Windows allows only one app to access the USB reader at a time. Please click <strong>DISCONNECT(C)</strong> in your Windows <em>RFID READER DEMO</em> app before clicking <strong>Connect Physical USB Reader</strong>.
                </div>
              </div>
            </div>

            {/* UHF Antenna Config Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Reader Configuration</h3>
                </div>
                <Sliders className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="space-y-4">
                {/* Power Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground">RF Output Power</span>
                    <span className="text-primary">{rfPower} dBm</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="30"
                    value={rfPower}
                    onChange={(e) => setRfPower(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-tertiary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                    <span>10 dBm (Low)</span>
                    <span>30 dBm (Max Range)</span>
                  </div>
                </div>

                {/* Estimated Range Meter */}
                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground">Est. Detection Range</span>
                  <span className="text-xs font-extrabold text-primary">{estimatedRange}</span>
                </div>

                {/* Freq selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground">Frequency Band</label>
                  <select
                    value={frequencyBand}
                    onChange={(e) => setFrequencyBand(e.target.value)}
                    className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-bold text-neutral outline-none"
                  >
                    <option value="US (902-928 MHz)">US FCC (902-928 MHz)</option>
                    <option value="EU (865-868 MHz)">EU ETSI (865-868 MHz)</option>
                    <option value="CN (920-925 MHz)">CN MII (920-925 MHz)</option>
                  </select>
                </div>

                {/* Poll interval selection */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground">Inventory Poll Interval</span>
                    <span className="text-primary">{tagInventoryInterval} ms</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="100"
                    value={tagInventoryInterval}
                    onChange={(e) => setTagInventoryInterval(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-tertiary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Anti-collision Toggle */}
                <div className="flex items-center justify-between py-2 border-t border-border mt-3">
                  <div>
                    <span className="text-[11px] font-bold text-neutral block">Anti-Collision Mode</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">Fast multi-tag EPC inventory scan</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={multiTagMode}
                      onChange={(e) => setMultiTagMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Simulator Controls Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Zap className="h-4 w-4 text-amber-500 animate-bounce" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">RFID Simulator Engine</h3>
              </div>

              <div className="space-y-4">

                {/* Date Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground">Simulated Date</label>
                  <input
                    type="date"
                    value={simulationDate}
                    onChange={(e) => setSimulationDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2 text-xs font-semibold text-neutral outline-none"
                  />
                </div>

                {/* Signal attenuation control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground">Signal Attenuation</span>
                    <span className="text-amber-600">{simulatedAttenuation} dB</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={simulatedAttenuation}
                    onChange={(e) => setSimulatedAttenuation(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-tertiary rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[9px] text-muted-foreground font-semibold block text-right">
                    Simulates physical obstacles (walls, heavy rain)
                  </span>
                </div>

                {/* Direction Mode Indicator */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-[11px] font-bold text-muted-foreground">RFID Reader Operation Mode</label>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      Student Arrival Check-In Only
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    * RFID Readers exclusively record student arrivals. Student checkouts are completed via Guardian QR Code scan on the Teacher Dashboard.
                  </p>
                </div>

                {/* Active Continuous Foot Traffic Simulation */}
                <div className="pt-2">
                  <button
                    onClick={handleToggleTrafficSimulation}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-white shadow-sm border-none px-4 py-3 transition-all cursor-pointer ${isTrafficSimulating
                        ? 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                        : 'bg-primary hover:bg-primary/95'
                      }`}
                  >
                    {isTrafficSimulating ? (
                      <>
                        <Pause className="h-4 w-4" />
                        <span>Stop Auto Foot Traffic</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Start Auto Foot Traffic</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* MIDDLE COLUMN: Radar Antenna field Visualizer & Trigger Scanners */}
          <div className="lg:col-span-8 space-y-6">

            <div className="grid gap-6 md:grid-cols-12">

              {/* RADAR FIELD DISPLAY CARD WITH GRID STATUS */}
              <div className="md:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden min-h-[350px]">

                {/* Animated Radar Scanning Lines */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[280px] h-[280px] rounded-full border border-primary/20 absolute flex items-center justify-center animate-pulse" />
                  <div className="w-[180px] h-[180px] rounded-full border border-primary/15 absolute" />
                  <div className="w-[80px] h-[80px] rounded-full border border-primary/10 absolute" />

                  <div className="w-[290px] h-[1px] bg-primary/15 absolute" />
                  <div className="h-[290px] w-[1px] bg-primary/15 absolute" />

                  {readerStatus === 'Scanning' && (
                    <div className="absolute w-[280px] h-[280px] rounded-full border-none pointer-events-none origin-center animate-[spin_6s_linear_infinite] overflow-hidden">
                      <div className="w-1/2 h-1/2 bg-gradient-to-tr from-primary/30 to-transparent absolute top-0 right-0 origin-bottom-left -skew-x-[20deg]" />
                    </div>
                  )}
                </div>

                {/* Dynamic Animated Scanned Tags on Radar Grid */}
                <div className="relative w-[300px] h-[300px] flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary text-white border-2 border-white flex items-center justify-center shadow-lg z-10 animate-bounce">
                    <Radio className="h-4 w-4" />
                  </div>

                  {radarPoints.map((point) => (
                    <div
                      key={point.id}
                      className="absolute bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-md animate-ping"
                      style={{
                        transform: `translate(${point.x}px, ${point.y}px)`,
                        width: `${point.r * 2}px`,
                        height: `${point.r * 2}px`,
                        opacity: point.opacity
                      }}
                    />
                  ))}

                  {radarPoints.map((point) => (
                    <div
                      key={`lbl-${point.id}`}
                      className="absolute text-[8px] font-extrabold bg-card border border-border px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"
                      style={{
                        transform: `translate(${point.x + 8}px, ${point.y - 12}px)`,
                        opacity: point.opacity,
                        transition: 'opacity 150ms'
                      }}
                    >
                      {point.label}
                    </div>
                  ))}
                </div>

                {/* Grid Radar overlay bottom metrics */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                  <span className="font-bold">GRID STATUS: ACTIVE</span>
                  <span className="font-bold">TAG COUNT: {radarPoints.length}</span>
                </div>
              </div>

              {/* QUICK ACTIONS SIMULATOR TRIGGERS CARD */}
              <div className="md:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">

                <div className="space-y-4">
                  <div className="border-b border-border pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Simulate Tag Sweep</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                      Manually inject RFID tag reads into the active UHF reader range field.
                    </p>
                  </div>

                  {/* Dropdown student */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Select Pupil</label>
                    {isLoading ? (
                      <div className="h-9 w-full bg-tertiary animate-pulse rounded-xl" />
                    ) : (
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold text-neutral outline-none cursor-pointer"
                      >
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} ({student.rfid})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    {/* Single scan triggers */}
                    <button
                      onClick={handleSingleScan}
                      disabled={isLoading || students.length === 0 || readerStatus === 'Disconnected'}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-[0.99] border-none py-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Pass Gate (Detect Tag)</span>
                    </button>

                    <div className="flex items-center gap-2 my-2.5 text-muted-foreground text-[10px] font-bold justify-center">
                      <span className="h-[1px] bg-border w-1/4"></span>
                      <span>OR MULTI-TAG SCAN</span>
                      <span className="h-[1px] bg-border w-1/4"></span>
                    </div>

                    {/* Multi student walkthrough */}
                    <button
                      onClick={handleBatchScan}
                      disabled={isLoading || students.length === 0 || readerStatus === 'Disconnected'}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral text-xs font-bold text-white shadow-sm hover:bg-neutral/90 active:scale-[0.99] border-none py-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRightLeft className="h-4 w-4 animate-pulse" />
                      <span>Group Walkthrough Scan</span>
                    </button>
                  </div>
                </div>

                {/* Warning note */}
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-2.5 text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                  <HelpCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                  <span>
                    Passing tags automatically marks check-ins or check-outs based on the current database time and schedules.
                  </span>
                </div>

              </div>

            </div>

            {/* LIVE SCAN LOG FEED */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

              <div className="flex items-center justify-between bg-tertiary/20 px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Live RFID Gate Log</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearGateLogs}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all cursor-pointer"
                    title="Clear live gate scan logs"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear Logs</span>
                  </button>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">
                    Real-Time
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full border-collapse text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-border bg-tertiary/10 text-muted-foreground font-bold select-none uppercase tracking-wider">
                      <th className="px-5 py-3 font-bold text-[10px]">Time</th>
                      <th className="px-5 py-3 font-bold text-[10px]">Student Name</th>
                      <th className="px-5 py-3 font-bold text-[10px]">RFID Card</th>
                      <th className="px-5 py-3 font-bold text-[10px]">Metrics</th>
                      <th className="px-5 py-3 font-bold text-[10px]">Direction</th>
                      <th className="px-5 py-3 font-bold text-[10px]">Status</th>
                      <th className="px-5 py-3 font-bold text-[10px]">SMS Gateways</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-semibold text-neutral">
                    {scanLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground font-bold">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Wifi className="h-7 w-7 text-muted-foreground/35 animate-pulse" />
                            <span>No tags currently detected in the antenna field range.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      scanLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-tertiary/10 transition-colors animate-fade-in">
                          <td className="px-5 py-3.5 whitespace-nowrap text-[11px] font-mono text-muted-foreground">
                            {log.timestamp}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary select-none font-bold text-[10px] shrink-0">
                                {log.studentName.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-primary block text-[11px]">{log.studentName}</span>
                                <span className="text-[9px] text-muted-foreground block font-semibold">{log.sectionName}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-[11px] text-muted-foreground font-mono">
                            {log.rfid}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col text-[9px] font-semibold text-neutral">
                              <span>Dist: <strong className="text-primary">{log.distance}m</strong></span>
                              <span>RSSI: <strong className="text-primary">{log.rssi} dBm</strong></span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {log.direction === 'in' ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold select-none uppercase">
                                Check IN
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 text-[9px] font-bold select-none uppercase">
                                Check OUT
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {log.status === 'Present' && (
                              <span className="text-[9px] font-bold text-emerald-600">On Time</span>
                            )}
                            {log.status === 'Late' && (
                              <span className="text-[9px] font-bold text-amber-600">Late In</span>
                            )}
                            {log.status === 'Absent' && (
                              <span className="text-[9px] font-bold text-red-600">Absent</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="space-y-1 max-w-[180px]">
                              {log.smsLogs.length === 0 ? (
                                <span className="text-[9px] text-muted-foreground font-semibold">No active guardians</span>
                              ) : (
                                log.smsLogs.map((sms, i) => (
                                  <div key={i} className="flex items-center gap-1 text-[9px] bg-tertiary/30 px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                                    <Smartphone className="h-2.5 w-2.5 text-primary shrink-0" />
                                    <span className="truncate font-semibold text-[8px]">{sms.guardian_name}: {sms.phone}</span>
                                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0 ml-auto" />
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* TEACHER SIDE: Simplified View (Clean Live Gate Log) */
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between bg-tertiary/20 px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Live RFID Gate Log</h3>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">
              Real-Time Feed
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-border bg-tertiary/10 text-muted-foreground font-bold select-none uppercase tracking-wider">
                  <th className="px-5 py-3 font-bold text-[10px]">Time</th>
                  <th className="px-5 py-3 font-bold text-[10px]">Student Name</th>
                  <th className="px-5 py-3 font-bold text-[10px]">RFID Card</th>
                  <th className="px-5 py-3 font-bold text-[10px]">Metrics</th>
                  <th className="px-5 py-3 font-bold text-[10px]">Direction</th>
                  <th className="px-5 py-3 font-bold text-[10px]">Status</th>
                  <th className="px-5 py-3 font-bold text-[10px]">SMS Gateways</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold text-neutral">
                {scanLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground font-bold">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Wifi className="h-7 w-7 text-muted-foreground/35 animate-pulse" />
                        <span>No tags currently detected in the antenna field range.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  scanLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-tertiary/10 transition-colors animate-fade-in">
                      <td className="px-5 py-3.5 whitespace-nowrap text-[11px] font-mono text-muted-foreground">
                        {log.timestamp}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary select-none font-bold text-[10px] shrink-0">
                            {log.studentName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-primary block text-[11px]">{log.studentName}</span>
                            <span className="text-[9px] text-muted-foreground block font-semibold">{log.sectionName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-[11px] text-muted-foreground font-mono">
                        {log.rfid}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col text-[9px] font-semibold text-neutral">
                          <span>Dist: <strong className="text-primary">{log.distance}m</strong></span>
                          <span>RSSI: <strong className="text-primary">{log.rssi} dBm</strong></span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.direction === 'in' ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold select-none uppercase">
                            Check IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 text-[9px] font-bold select-none uppercase">
                            Check OUT
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.status === 'Present' && (
                          <span className="text-[9px] font-bold text-emerald-600">On Time</span>
                        )}
                        {log.status === 'Late' && (
                          <span className="text-[9px] font-bold text-amber-600">Late In</span>
                        )}
                        {log.status === 'Absent' && (
                          <span className="text-[9px] font-bold text-red-600">Absent</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1 max-w-[180px]">
                          {log.smsLogs.length === 0 ? (
                            <span className="text-[9px] text-muted-foreground font-semibold">No active guardians</span>
                          ) : (
                            log.smsLogs.map((sms, i) => (
                              <div key={i} className="flex items-center gap-1 text-[9px] bg-tertiary/30 px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                                <Smartphone className="h-2.5 w-2.5 text-primary shrink-0" />
                                <span className="truncate font-semibold text-[8px]">{sms.guardian_name}: {sms.phone}</span>
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0 ml-auto" />
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}

export default RfidScan