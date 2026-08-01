import { useState, useEffect, useMemo } from "react"
import { 
  Search, 
  Download, 
  Calendar, 
  Check, 
  X, 
  Clock, 
  SlidersHorizontal,
  User,
  Users,
  Eye
} from "lucide-react"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../../components/ui/toast"
import { LoadingScreen } from "../../components/LoadingScreen"

interface Guardian {
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

interface AttendanceRecord {
  date: string
  dayOfWeek: string
  studentId: string | number
  studentName: string
  rfid: string
  timeIn: string
  status: "Present" | "Late" | "Absent"
  verifiedBy: "RFID System" | "Manual Override" | "N/A"
  grade: string
  sectionName: string
  sectionId: string | number
}

export function Attendance() {
  const [students, setStudents] = useState<Student[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("May 2025")
  const [selectedSectionId, setSelectedSectionId] = useState<string | number>("")
  const [selectedStatus, setSelectedStatus] = useState("All Status")

  // Modal details
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null)

  // Current logged in teacher
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
  const teacherId = currentUser.id

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [studentsData, sectionsData] = await Promise.all([
          ApiHandler.get<Student[]>("/students"),
          ApiHandler.get<Section[]>("/sections")
        ])
        setStudents(studentsData)
        setSections(sectionsData)
        
        // Auto select first section of this teacher
        const teacherSecs = sectionsData.filter(s => s.teacher_id?.toString() === teacherId?.toString())
        if (teacherSecs.length > 0) {
          setSelectedSectionId(teacherSecs[0].id)
        }
      } catch (error) {
        console.error("Failed to load data:", error)
        toast.add({
          title: "Error Loading Data",
          description: "Could not fetch students and sections lists from the server.",
          type: "error",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter sections assigned to this teacher
  const teacherSections = useMemo(() => {
    return sections.filter(sec => sec.teacher_id?.toString() === teacherId?.toString())
  }, [sections, teacherId])

  // Generate historical attendance log records for the last 5 days (May 22 to May 26, 2025)
  const attendanceLogs = useMemo(() => {
    const dates = [
      { dateStr: "May 26, 2025", dayName: "MONDAY" },
      { dateStr: "May 23, 2025", dayName: "FRIDAY" },
      { dateStr: "May 22, 2025", dayName: "THURSDAY" },
      { dateStr: "May 21, 2025", dayName: "WEDNESDAY" },
      { dateStr: "May 20, 2025", dayName: "TUESDAY" },
    ]

    const logs: AttendanceRecord[] = []

    // Only generate logs for students in the teacher's sections
    const teacherStudents = students.filter(s => 
      s.section?.teacher_id?.toString() === teacherId?.toString()
    )

    dates.forEach((d) => {
      teacherStudents.forEach((student) => {
        // Deterministic status mock based on student ID + date string hash
        const hashSeed = (student.name.length + d.dateStr.length + Number(student.id || 0)) % 100
        
        let status: "Present" | "Late" | "Absent" = "Present"
        let timeIn = "07:55 AM"
        let verifiedBy: "RFID System" | "Manual Override" | "N/A" = "RFID System"

        if (hashSeed % 12 === 0) {
          status = "Absent"
          timeIn = "--:--"
          verifiedBy = "N/A"
        } else if (hashSeed % 7 === 0) {
          status = "Late"
          timeIn = hashSeed % 2 === 0 ? "08:15 AM" : "08:08 AM"
          verifiedBy = hashSeed % 2 === 0 ? "Manual Override" : "RFID System"
        } else {
          status = "Present"
          timeIn = hashSeed % 3 === 0 ? "07:55 AM" : (hashSeed % 2 === 0 ? "08:05 AM" : "07:48 AM")
          verifiedBy = "RFID System"
        }

        logs.push({
          date: d.dateStr,
          dayOfWeek: d.dayName,
          studentId: student.id,
          studentName: student.name,
          rfid: student.rfid,
          timeIn,
          status,
          verifiedBy,
          grade: student.grade,
          sectionName: student.section ? `${student.section.year_level} - ${student.section.section_name}` : "",
          sectionId: student.section_id || ""
        })
      })
    })

    return logs
  }, [students, teacherId])

  // Filtered records
  const filteredRecords = useMemo(() => {
    return attendanceLogs.filter(rec => {
      // Section filter
      const matchesSection = selectedSectionId === "" || rec.sectionId.toString() === selectedSectionId.toString()
      
      // Status filter
      const matchesStatus = selectedStatus === "All Status" || rec.status === selectedStatus

      // Search filter (searches student name or ID)
      const formattedId = `S${String(rec.studentId).padStart(3, "0")}`
      const matchesSearch = 
        rec.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formattedId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.rfid.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSection && matchesStatus && matchesSearch
    })
  }, [attendanceLogs, selectedSectionId, selectedStatus, searchQuery])

  // Stats summaries (calculated dynamically from filtered/total current records)
  const stats = useMemo(() => {
    // Look at today's records (e.g. May 26, 2025)
    const todayRecords = attendanceLogs.filter(r => r.date === "May 26, 2025" && (selectedSectionId === "" || r.sectionId.toString() === selectedSectionId.toString()))
    const total = todayRecords.length
    const present = todayRecords.filter(r => r.status === "Present").length
    const late = todayRecords.filter(r => r.status === "Late").length
    const absent = todayRecords.filter(r => r.status === "Absent").length

    return {
      total,
      present,
      late,
      absent
    }
  }, [attendanceLogs, selectedSectionId])

  const activeSectionLabel = useMemo(() => {
    const activeSec = teacherSections.find(s => s.id.toString() === selectedSectionId.toString())
    return activeSec ? `${activeSec.year_level} - ${activeSec.section_name}` : "Assigned Sections"
  }, [teacherSections, selectedSectionId])

  // CSV Export Handler
  const handleExportData = () => {
    if (filteredRecords.length === 0) {
      toast.add({
        title: "Export Failed",
        description: "No records found to export.",
        type: "error"
      })
      return
    }

    let csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Day,Student Name,RFID Tag,Time In,Status,Verified By,Classroom\n"

    filteredRecords.forEach(r => {
      const row = [
        `"${r.date}"`,
        `"${r.dayOfWeek}"`,
        `"${r.studentName}"`,
        `"${r.rfid}"`,
        `"${r.timeIn}"`,
        `"${r.status}"`,
        `"${r.verifiedBy}"`,
        `"${r.sectionName}"`
      ].join(",")
      csvContent += row + "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Attendance_Records_${activeSectionLabel.replace(/\s+/g, "_")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.add({
      title: "Data Exported",
      description: "Attendance records CSV file generated and downloaded successfully.",
      type: "success"
    })
  }

  const handleOpenDetails = (record: AttendanceRecord) => {
    setActiveRecord(record)
    setIsDetailModalOpen(true)
  }

  const handleCloseView = () => {
    setIsDetailModalOpen(false)
    setActiveRecord(null)
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
      
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Attendance Records</h1>
          <p className="text-muted-foreground mt-1 text-sm font-semibold">
            View and manage student attendance history for <span className="text-primary font-bold">{activeSectionLabel}</span>
          </p>
        </div>
        
        <button
          onClick={handleExportData}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border-none px-5 py-3 shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Export Data</span>
        </button>
      </div>

      {/* Stats row (matches cards layout of uploaded image) */}
      <div className="grid gap-6 sm:grid-cols-4">
        {/* Card 1: Total Students */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Total Students
            </span>
            <span className="text-3xl font-extrabold text-primary block leading-none">
              {stats.total}
            </span>
          </div>
          <div className="h-10 w-10 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="bg-card border-l-4 border-l-emerald-500 border-y border-r border-border rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Present Today
            </span>
            <span className="text-3xl font-extrabold text-emerald-600 block leading-none">
              {stats.present}
            </span>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <Check className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Absent Today */}
        <div className="bg-card border-l-4 border-l-red-500 border-y border-r border-border rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Absent Today
            </span>
            <span className="text-3xl font-extrabold text-red-600 block leading-none">
              {String(stats.absent).padStart(2, "0")}
            </span>
          </div>
          <div className="h-10 w-10 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center justify-center shrink-0">
            <X className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Late Today */}
        <div className="bg-card border-l-4 border-l-amber-500 border-y border-r border-border rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Late Today
            </span>
            <span className="text-3xl font-extrabold text-amber-600 block leading-none">
              {String(stats.late).padStart(2, "0")}
            </span>
          </div>
          <div className="h-10 w-10 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters & search panel (matches image style) */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          
          {/* Search Box */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name or ID..."
              className="w-full rounded-xl border border-border bg-tertiary pl-10 pr-4 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral/10 rounded-full border-none bg-transparent cursor-pointer text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Month selector */}
          <div className="relative w-full sm:max-w-[150px]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all appearance-none cursor-pointer"
            >
              <option value="May 2025">May 2025</option>
              <option value="April 2025">April 2025</option>
            </select>
          </div>

          {/* Section Filter dropdown */}
          <div className="relative w-full sm:max-w-[180px]">
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all appearance-none cursor-pointer"
            >
              {teacherSections.map(sec => (
                <option key={sec.id} value={sec.id}>
                  {sec.year_level} - {sec.section_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div className="relative w-full sm:max-w-[150px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all appearance-none cursor-pointer"
            >
              <option value="All Status">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

        </div>
      </div>

      {/* Roster Table (matches layout of screen exactly) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-border bg-tertiary/30 text-muted-foreground font-bold select-none uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Student Name</th>
                <th className="px-6 py-4 font-bold">RFID ID</th>
                <th className="px-6 py-4 font-bold">Time In</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Verified By</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-semibold text-neutral">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-bold">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User className="h-8 w-8 text-muted-foreground/45 animate-pulse" />
                      <span>No attendance records match your active search or filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((log, idx) => {
                  const initials = log.studentName.charAt(0)
                  
                  return (
                    <tr key={idx} className="hover:bg-tertiary/10 transition-colors">
                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral text-xs">{log.date}</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                            {log.dayOfWeek}
                          </span>
                        </div>
                      </td>

                      {/* Student Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 select-none font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <span className="font-bold text-primary text-xs">{log.studentName}</span>
                        </div>
                      </td>

                      {/* RFID Code */}
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-semibold">
                        {log.rfid}
                      </td>

                      {/* Time In */}
                      <td className="px-6 py-4 whitespace-nowrap text-neutral">
                        {log.timeIn}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.status === "Present" && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-0.5 text-[9px] font-bold select-none uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            Present
                          </span>
                        )}
                        {log.status === "Late" && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30 px-2.5 py-0.5 text-[9px] font-bold select-none uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5" />
                            Late
                          </span>
                        )}
                        {log.status === "Absent" && (
                          <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/30 px-2.5 py-0.5 text-[9px] font-bold select-none uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5" />
                            Absent
                          </span>
                        )}
                      </td>

                      {/* Verified By */}
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {log.verifiedBy}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleOpenDetails(log)}
                          className="px-3.5 py-1.5 rounded-lg border border-border text-[11px] font-bold bg-white dark:bg-card text-neutral hover:bg-tertiary transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ATTENDANCE SCAN LOG DETAILS */}
      {isDetailModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">Attendance Log Details</h2>
              <button 
                onClick={handleCloseView}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-5 mt-4 font-sans text-xs">
              
              {/* Pupil info */}
              <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-tertiary/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0 select-none font-bold">
                  {activeRecord.studentName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-primary">{activeRecord.studentName}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-muted-foreground font-semibold">
                    <span>{activeRecord.sectionName}</span>
                    <span>•</span>
                    <span>RFID: {activeRecord.rfid}</span>
                  </div>
                </div>
              </div>

              {/* Status details */}
              <div className="rounded-xl border border-border p-4 bg-white space-y-3">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-semibold">Date of Scan:</span>
                  <span className="font-bold text-neutral">
                    {activeRecord.date} ({activeRecord.dayOfWeek})
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-semibold">Time of Scan:</span>
                  <span className="font-bold text-neutral">
                    {activeRecord.timeIn}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-semibold">Verification Node:</span>
                  <span className="font-bold text-neutral">
                    {activeRecord.verifiedBy}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Status Badge:</span>
                  <span>
                    {activeRecord.status === "Present" && (
                      <span className="inline-flex rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 text-[8px] font-bold">
                        PRESENT
                      </span>
                    )}
                    {activeRecord.status === "Late" && (
                      <span className="inline-flex rounded-full bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 text-[8px] font-bold">
                        LATE
                      </span>
                    )}
                    {activeRecord.status === "Absent" && (
                      <span className="inline-flex rounded-full bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 text-[8px] font-bold">
                        ABSENT
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Logs Timeline */}
              <div className="space-y-3.5">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Verification Node Logs
                </h4>
                {activeRecord.status === "Absent" ? (
                  <div className="p-3 border border-dashed border-border rounded-xl text-center text-muted-foreground">
                    No RFID verification tag scan was recorded for this date.
                  </div>
                ) : (
                  <div className="relative border-l border-border pl-4 ml-2 space-y-4">
                    <div className="relative">
                      <span className="absolute -left-[20.5px] top-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                      <div className="text-[10px] font-bold text-neutral">
                        {activeRecord.timeIn} - RFID gate sensor detected tag
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        Unique tag {activeRecord.rfid} scanned at school front gate.
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[20.5px] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white" />
                      <div className="text-[10px] font-bold text-neutral">
                        {activeRecord.timeIn} - Auto SMS Notification dispatched
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        Verification confirmation SMS sent successfully to authorized parent guardians.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  onClick={handleCloseView}
                  className="px-6 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                >
                  Close details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Attendance