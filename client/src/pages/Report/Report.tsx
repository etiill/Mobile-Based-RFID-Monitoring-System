import React, { useState, useEffect, useMemo } from "react"
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Download, 
  Search, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Filter, 
  FileText, 
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  ChevronRight
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

export function Report() {
  const [students, setStudents] = useState<Student[]>([])
  const [sections, setSections] = useState<Section[]>([])
  
  const [activeReport, setActiveReport] = useState<"dashboard" | "daily" | "weekly" | "monthly" | "late">("dashboard")
  const [isLoading, setIsLoading] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState<string | number>("")
  const [selectedDate, setSelectedDate] = useState("2025-05-26") // default demo date
  const [selectedMonth, setSelectedMonth] = useState("May 2025")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All")

  // Current logged in teacher details
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
  const teacherId = currentUser.id
  const role = currentUser.role || "admin"

  // Fetch Core Data
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [studentsData, sectionsData] = await Promise.all([
        ApiHandler.get<Student[]>("/students"),
        ApiHandler.get<Section[]>("/sections")
      ])
      setStudents(studentsData)
      setSections(sectionsData)

      // Auto select first section for teacher users
      if (role === "teacher") {
        const teacherSecs = sectionsData.filter(s => s.teacher_id?.toString() === teacherId?.toString())
        if (teacherSecs.length > 0) {
          setSelectedSectionId(teacherSecs[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to load core data:", error)
      toast.add({
        title: "Error Loading Data",
        description: "Could not retrieve student list from the server.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Reset query filters on screen navigation
    setSearchQuery("")
    setSelectedStatusFilter("All")
  }, [activeReport])

  // Filter sections by teacher role
  const filteredSections = useMemo(() => {
    if (role === "admin") return sections
    return sections.filter(sec => sec.teacher_id?.toString() === teacherId?.toString())
  }, [sections, teacherId, role])

  // Generate historical attendance log records for the last 5 days
  const attendanceLogs = useMemo(() => {
    const dates = [
      { dateStr: "May 26, 2025", rawDate: "2025-05-26", dayName: "MONDAY" },
      { dateStr: "May 23, 2025", rawDate: "2025-05-23", dayName: "FRIDAY" },
      { dateStr: "May 22, 2025", rawDate: "2025-05-22", dayName: "THURSDAY" },
      { dateStr: "May 21, 2025", rawDate: "2025-05-21", dayName: "WEDNESDAY" },
      { dateStr: "May 20, 2025", rawDate: "2025-05-20", dayName: "TUESDAY" },
    ]

    const logs: AttendanceRecord[] = []

    // Target students based on role
    const targetStudents = role === "admin" 
      ? students 
      : students.filter(s => s.section?.teacher_id?.toString() === teacherId?.toString())

    dates.forEach((d) => {
      targetStudents.forEach((student) => {
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
          date: d.rawDate, // YYYY-MM-DD
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
  }, [students, teacherId, role])

  // Helper to export CSV tables
  const handleCSVExport = (filename: string, headers: string[], rows: string[][]) => {
    const escapeCell = (cell: string) => {
      const clean = String(cell).replace(/"/g, '""')
      return `"${clean}"`
    }
    
    const csvContent = "\uFEFF" + [
      headers.map(escapeCell).join(","), 
      ...rows.map(row => row.map(escapeCell).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.add({
      title: "Export Successful",
      description: `CSV file "${filename}" downloaded successfully.`,
      type: "success",
    })
  }

  // --- Daily Attendance Calculation ---
  const dailyRecords = useMemo(() => {
    return attendanceLogs.filter(rec => {
      const matchesDate = rec.date === selectedDate
      const matchesSection = selectedSectionId === "" || rec.sectionId.toString() === selectedSectionId.toString()
      const matchesStatus = selectedStatusFilter === "All" || rec.status === selectedStatusFilter
      const matchesSearch = rec.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesDate && matchesSection && matchesStatus && matchesSearch
    })
  }, [attendanceLogs, selectedDate, selectedSectionId, selectedStatusFilter, searchQuery])

  const dailyStats = useMemo(() => {
    const filteredByDateSec = attendanceLogs.filter(rec => 
      rec.date === selectedDate && 
      (selectedSectionId === "" || rec.sectionId.toString() === selectedSectionId.toString())
    )
    const total = filteredByDateSec.length
    const present = filteredByDateSec.filter(r => r.status === "Present").length
    const late = filteredByDateSec.filter(r => r.status === "Late").length
    const absent = filteredByDateSec.filter(r => r.status === "Absent").length
    
    return { total, present, late, absent }
  }, [attendanceLogs, selectedDate, selectedSectionId])

  // --- Weekly Attendance Trend Calculation ---
  const weeklyTrends = useMemo(() => {
    // Map dates to sections
    const dataBySection: { [key: string]: { sectionName: string; sectionId: string | number; present: number; total: number } } = {}

    // Initialize list
    filteredSections.forEach(sec => {
      dataBySection[sec.id] = {
        sectionName: `${sec.year_level} - ${sec.section_name}`,
        sectionId: sec.id,
        present: 0,
        total: 0
      }
    })

    attendanceLogs.forEach(rec => {
      if (dataBySection[rec.sectionId]) {
        dataBySection[rec.sectionId].total++
        if (rec.status === "Present" || rec.status === "Late") {
          dataBySection[rec.sectionId].present++
        }
      }
    })

    return Object.values(dataBySection).map(s => {
      const rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 100
      return {
        ...s,
        attendanceRate: rate
      }
    })
  }, [attendanceLogs, filteredSections])

  // --- Monthly Student Summaries ---
  const monthlySummaries = useMemo(() => {
    // Group records by student ID
    const studentDataMap: { 
      [key: string]: { 
        studentName: string
        studentId: string | number
        sectionName: string
        sectionId: string | number
        present: number
        late: number
        absent: number
        total: number
      } 
    } = {}

    // Build unique students list in the selection
    const targetStudents = role === "admin" 
      ? students 
      : students.filter(s => s.section?.teacher_id?.toString() === teacherId?.toString())

    targetStudents.forEach(st => {
      studentDataMap[st.id] = {
        studentName: st.name,
        studentId: st.id,
        sectionName: st.section ? `${st.section.year_level} - ${st.section.section_name}` : "",
        sectionId: st.section_id || "",
        present: 0,
        late: 0,
        absent: 0,
        total: 0
      }
    })

    attendanceLogs.forEach(rec => {
      if (studentDataMap[rec.studentId]) {
        studentDataMap[rec.studentId].total++
        if (rec.status === "Present") studentDataMap[rec.studentId].present++
        else if (rec.status === "Late") studentDataMap[rec.studentId].late++
        else if (rec.status === "Absent") studentDataMap[rec.studentId].absent++
      }
    })

    return Object.values(studentDataMap).filter(summary => {
      const matchesSection = selectedSectionId === "" || summary.sectionId.toString() === selectedSectionId.toString()
      const matchesSearch = summary.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSection && matchesSearch
    })
  }, [attendanceLogs, students, selectedSectionId, searchQuery, role, teacherId])


  // --- Late Students Chronic Infractions ---
  const lateStudentsSummary = useMemo(() => {
    const studentLatesMap: {
      [key: string]: {
        studentName: string
        studentId: string | number
        rfid: string
        sectionName: string
        sectionId: string | number
        lateDates: string[]
        lateCount: number
      }
    } = {}

    // Pull all logs marked as Late
    attendanceLogs.forEach(rec => {
      if (rec.status === "Late") {
        if (!studentLatesMap[rec.studentId]) {
          studentLatesMap[rec.studentId] = {
            studentName: rec.studentName,
            studentId: rec.studentId,
            rfid: rec.rfid,
            sectionName: rec.sectionName,
            sectionId: rec.sectionId,
            lateDates: [],
            lateCount: 0
          }
        }
        studentLatesMap[rec.studentId].lateDates.push(`${rec.date} (${rec.timeIn})`)
        studentLatesMap[rec.studentId].lateCount++
      }
    })

    return Object.values(studentLatesMap).filter(st => {
      const matchesSection = selectedSectionId === "" || st.sectionId.toString() === selectedSectionId.toString()
      const matchesSearch = st.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSection && matchesSearch
    }).sort((a, b) => b.lateCount - a.lateCount)
  }, [attendanceLogs, selectedSectionId, searchQuery])


  if (isLoading && students.length === 0) {
    return <LoadingScreen fullScreen={false} />
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans pb-12">
      
      {/* ----------------- DASHBOARD VIEW ----------------- */}
      {activeReport === "dashboard" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-primary dark:text-foreground">Reports Overview</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Access comprehensive logs, audit trails, and attendance trend analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Daily Attendance */}
            <div 
              onClick={() => setActiveReport("daily")}
              className="bg-card border border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-56 group relative"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-blue-50 dark:bg-card border border-blue-100 rounded-xl">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                    Real-time
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral group-hover:text-primary mt-4 transition-colors">
                  Daily Attendance Report
                </h3>
                <p className="text-muted-foreground text-[11px] mt-2 font-medium leading-relaxed">
                  Detailed breakdown of today's present, absent, and late students by classroom.
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                  TYPE: ACTIVITY SUMMARY
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Weekly Attendance */}
            <div 
              onClick={() => setActiveReport("weekly")}
              className="bg-card border border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-56 group relative"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-50 dark:bg-card border border-amber-100 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
                    Weekly
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral group-hover:text-primary mt-4 transition-colors">
                  Weekly Attendance Report
                </h3>
                <p className="text-muted-foreground text-[11px] mt-2 font-medium leading-relaxed">
                  Analyze trends in attendance patterns across the past 7 days of school activity.
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                  TYPE: TREND ANALYSIS
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Monthly Attendance */}
            <div 
              onClick={() => setActiveReport("monthly")}
              className="bg-card border border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-56 group relative"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-indigo-50 dark:bg-card border border-indigo-100 rounded-xl">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-500/10">
                    Archive
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral group-hover:text-primary mt-4 transition-colors">
                  Monthly Attendance Report
                </h3>
                <p className="text-muted-foreground text-[11px] mt-2 font-medium leading-relaxed">
                  Complete monthly overview suitable for board meetings and regulatory compliance.
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                  TYPE: COMPLIANCE
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>



            {/* Card 5: Late Students Report */}
            <div 
              onClick={() => setActiveReport("late")}
              className="bg-card border border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-56 group relative"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-orange-50 dark:bg-card border border-orange-100 rounded-xl">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10">
                    Action Required
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral group-hover:text-primary mt-4 transition-colors">
                  Late Students Report
                </h3>
                <p className="text-muted-foreground text-[11px] mt-2 font-medium leading-relaxed">
                  Identify chronic tardiness and track entry times beyond the standard grace period.
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                  TYPE: POLICY MONITORING
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- DAILY ATTENDANCE VIEW ----------------- */}
      {activeReport === "daily" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveReport("dashboard")}
                className="p-2 border border-border bg-card rounded-xl hover:bg-muted text-muted-foreground hover:text-neutral cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-primary dark:text-foreground">Daily Attendance Report</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Today's present, absent, and late student breakdown.</p>
              </div>
            </div>
            <button
              onClick={() => {
                const headers = ["Student Name", "RFID Tag", "Time In", "Status", "Verified By", "Grade", "Section"]
                const rows = dailyRecords.map(r => [
                  r.studentName, r.rfid, r.timeIn, r.status, r.verifiedBy, r.grade, r.sectionName
                ])
                handleCSVExport(`daily_attendance_${selectedDate}.csv`, headers, rows)
              }}
              className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs border-none self-start"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Daily Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Pupils</span>
              <h2 className="text-xl font-extrabold text-neutral mt-1">{dailyStats.total}</h2>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-start gap-3">
              <div className="mt-1 p-1 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Present</span>
                <h2 className="text-xl font-extrabold text-neutral mt-1">{dailyStats.present}</h2>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-start gap-3">
              <div className="mt-1 p-1 bg-amber-50 rounded-lg text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Late</span>
                <h2 className="text-xl font-extrabold text-neutral mt-1">{dailyStats.late}</h2>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-start gap-3">
              <div className="mt-1 p-1 bg-red-50 rounded-lg text-red-600">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Absent</span>
                <h2 className="text-xl font-extrabold text-neutral mt-1">{dailyStats.absent}</h2>
              </div>
            </div>
          </div>

          {/* Toolbar Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name..."
                className="w-full rounded-xl border border-border bg-tertiary pl-10 pr-4 py-2.5 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-3 w-full sm:w-auto items-center">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
              </div>

              {/* Classroom filter */}
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-neutral outline-none cursor-pointer"
              >
                <option value="">All Classrooms</option>
                {filteredSections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.year_level} - {sec.section_name}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-neutral outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>

              {/* Date picker */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min="2025-05-20"
                max="2025-05-26"
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-neutral outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-border bg-tertiary/30 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Student</th>
                    <th className="px-6 py-4 font-bold">Classroom</th>
                    <th className="px-6 py-4 font-bold">Time In</th>
                    <th className="px-6 py-4 font-bold">RFID Code</th>
                    <th className="px-6 py-4 font-bold">Method</th>
                    <th className="px-6 py-4 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-neutral">
                  {dailyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                        No attendance records match your active search filters.
                      </td>
                    </tr>
                  ) : (
                    dailyRecords.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-tertiary/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-primary">{rec.studentName}</td>
                        <td className="px-6 py-4">{rec.sectionName}</td>
                        <td className="px-6 py-4 font-semibold">{rec.timeIn}</td>
                        <td className="px-6 py-4 text-muted-foreground font-semibold">{rec.rfid}</td>
                        <td className="px-6 py-4 font-semibold text-muted-foreground">{rec.verifiedBy}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            rec.status === "Present" ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                            rec.status === "Late" ? "bg-amber-50 border-amber-200 text-amber-600" :
                            "bg-red-50 border-red-200 text-red-600"
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- WEEKLY ATTENDANCE VIEW ----------------- */}
      {activeReport === "weekly" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveReport("dashboard")}
              className="p-2 border border-border bg-card rounded-xl hover:bg-muted text-muted-foreground hover:text-neutral cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-primary dark:text-foreground">Weekly Attendance Report</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Average compliance rates across the past 5 school days.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Highlights Columns */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-primary dark:text-foreground border-b border-border pb-3">
                  Attendance Insights
                </h3>
                <div className="space-y-4 text-xs font-medium text-neutral/80">
                  <p>
                    Average school-wide weekly compliance is calculated at <strong className="text-emerald-600 text-sm">92%</strong> based on the past 5 school days.
                  </p>
                  <p>
                    Attendance tracking is monitored using standard RFID scan triggers at the campus entrance nodes.
                  </p>
                </div>
              </div>
            </div>

            {/* Trends Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-neutral border-b border-border pb-4">
                  Classroom Compliance Summary
                </h3>

                <div className="space-y-6">
                  {weeklyTrends.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6 font-semibold">
                      No classrooms section details available to analyze.
                    </p>
                  ) : (
                    weeklyTrends.map((trend) => (
                      <div key={trend.sectionId} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-neutral">{trend.sectionName}</span>
                          <span className={`${
                            trend.attendanceRate >= 90 ? "text-emerald-600" :
                            trend.attendanceRate >= 80 ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {trend.attendanceRate}% Average
                          </span>
                        </div>
                        {/* Progress Bar Container */}
                        <div className="w-full h-3 rounded-full bg-tertiary overflow-hidden border border-border/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              trend.attendanceRate >= 90 ? "bg-emerald-600" :
                              trend.attendanceRate >= 80 ? "bg-amber-600" :
                              "bg-red-600"
                            }`}
                            style={{ width: `${trend.attendanceRate}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MONTHLY ATTENDANCE VIEW ----------------- */}
      {activeReport === "monthly" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveReport("dashboard")}
                className="p-2 border border-border bg-card rounded-xl hover:bg-muted text-muted-foreground hover:text-neutral cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-primary dark:text-foreground">Monthly Attendance Report</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Aggregated student records for compliance review.</p>
              </div>
            </div>
            <button
              onClick={() => {
                const headers = ["Student Name", "Classroom", "Total Days", "Present Days", "Late Days", "Absent Days"]
                const rows = monthlySummaries.map(r => [
                  r.studentName, r.sectionName, String(r.total), String(r.present), String(r.late), String(r.absent)
                ])
                handleCSVExport(`monthly_attendance_${selectedMonth.replace(" ", "_")}.csv`, headers, rows)
              }}
              className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs border-none self-start"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name..."
                className="w-full rounded-xl border border-border bg-tertiary pl-10 pr-4 py-2.5 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-neutral outline-none cursor-pointer"
              >
                <option value="">All Classrooms</option>
                {filteredSections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.year_level} - {sec.section_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-neutral outline-none cursor-pointer"
              >
                <option value="May 2025">May 2025</option>
              </select>
            </div>
          </div>

          {/* Monthly Table Summary */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-border bg-tertiary/30 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Student</th>
                    <th className="px-6 py-4 font-bold">Classroom</th>
                    <th className="px-6 py-4 font-bold text-center">Tracked Days</th>
                    <th className="px-6 py-4 font-bold text-center">Present</th>
                    <th className="px-6 py-4 font-bold text-center">Late</th>
                    <th className="px-6 py-4 font-bold text-center">Absent</th>
                    <th className="px-6 py-4 font-bold text-center">Compliance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-neutral">
                  {monthlySummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                        No classroom students data found matching search filter.
                      </td>
                    </tr>
                  ) : (
                    monthlySummaries.map((summary) => {
                      const presentLate = summary.present + summary.late
                      const rate = summary.total > 0 ? Math.round((presentLate / summary.total) * 100) : 100
                      
                      return (
                        <tr key={summary.studentId} className="hover:bg-tertiary/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-primary">{summary.studentName}</td>
                          <td className="px-6 py-4">{summary.sectionName}</td>
                          <td className="px-6 py-4 text-center font-bold text-muted-foreground">{summary.total}</td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-600">{summary.present}</td>
                          <td className="px-6 py-4 text-center font-bold text-amber-600">{summary.late}</td>
                          <td className="px-6 py-4 text-center font-bold text-red-600">{summary.absent}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              rate >= 90 ? "bg-emerald-50 text-emerald-600" :
                              rate >= 80 ? "bg-amber-50 text-amber-600" :
                              "bg-red-50 text-red-600"
                            }`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* ----------------- LATE STUDENTS VIEW ----------------- */}
      {activeReport === "late" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveReport("dashboard")}
                className="p-2 border border-border bg-card rounded-xl hover:bg-muted text-muted-foreground hover:text-neutral cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-primary dark:text-foreground">Late Entry Audit</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Chronic tardiness tracking and grace period infractions.</p>
              </div>
            </div>
            <button
              onClick={() => {
                const headers = ["Student Name", "RFID Code", "Classroom", "Total Late Incidents"]
                const rows = lateStudentsSummary.map(r => [
                  r.studentName, r.rfid, r.sectionName, String(r.lateCount)
                ])
                handleCSVExport(`late_student_infractions.csv`, headers, rows)
              }}
              className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs border-none self-start"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name..."
                className="w-full rounded-xl border border-border bg-tertiary pl-10 pr-4 py-2.5 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-neutral outline-none cursor-pointer"
              >
                <option value="">All Classrooms</option>
                {filteredSections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.year_level} - {sec.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Late Students List Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-border bg-tertiary/30 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Student</th>
                    <th className="px-6 py-4 font-bold">Classroom</th>
                    <th className="px-6 py-4 font-bold">RFID Tag</th>
                    <th className="px-6 py-4 font-bold">Tardiness Frequency</th>
                    <th className="px-6 py-4 font-bold">Timestamps Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-neutral">
                  {lateStudentsSummary.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                        No students are flagged with tardy entry logs.
                      </td>
                    </tr>
                  ) : (
                    lateStudentsSummary.map((student) => (
                      <tr key={student.studentId} className="hover:bg-tertiary/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-primary">{student.studentName}</td>
                        <td className="px-6 py-4">{student.sectionName}</td>
                        <td className="px-6 py-4 text-muted-foreground font-semibold">{student.rfid}</td>
                        <td className="px-6 py-4 font-extrabold text-amber-600">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-amber-700">
                            {student.lateCount} Incident{student.lateCount > 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-semibold max-w-xs truncate" title={student.lateDates.join(", ")}>
                          {student.lateDates.join(", ")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Report