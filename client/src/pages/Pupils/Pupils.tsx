import { useState, useEffect } from "react"
import { 
  Search, 
  Plus, 
  Pencil, 
  Eye, 
  X, 
  CreditCard, 
  User, 
  Users, 
  Trash2,
  Filter,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  GraduationCap
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
  teacher?: {
    id: string | number
    name: string
    email: string
  } | null
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

export function Pupils() {
  const [students, setStudents] = useState<Student[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const [classFilter, setClassFilter] = useState("")
  const [teacherFilter, setTeacherFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // all, active, inactive

  // Add/Edit Modal State
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false)
  const [editingPupil, setEditingPupil] = useState<Student | null>(null)
  const [pupilName, setPupilName] = useState("")
  const [pupilRfid, setPupilRfid] = useState("")
  const [pupilSectionId, setPupilSectionId] = useState<string | number>("")

  // View Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingPupil, setViewingPupil] = useState<Student | null>(null)

  // Fetch Data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [studentsData, sectionsData, teachersData] = await Promise.all([
          ApiHandler.get<Student[]>("/students"),
          ApiHandler.get<Section[]>("/sections"),
          ApiHandler.get<any[]>("/teachers")
        ])
        setStudents(studentsData)
        setSections(sectionsData)
        setTeachers(teachersData)
      } catch (error) {
        console.error("Failed to load data:", error)
        toast.add({
          title: "Error Loading Data",
          description: "Could not fetch pupils, sections, and teachers data from the server.",
          type: "error",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Search and filter logic
  const filteredStudents = students.filter((student) => {
    // Search filter (searches by student name, RFID, or guardian name)
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.guardians.some(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))

    // Class (Section ID) filter
    const matchesClass = classFilter === "" || student.section_id?.toString() === classFilter.toString()

    // Teacher ID filter
    const matchesTeacher = teacherFilter === "" || student.section?.teacher_id?.toString() === teacherFilter.toString()

    // Status filter (mock logic: all students are active unless status filter is 'inactive', which yields none)
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active") // currently all database records are treated as active

    return matchesSearch && matchesClass && matchesTeacher && matchesStatus
  })

  // Pagination State (Limit: 10 per page)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const itemsPerPage = 10

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, classFilter, teacherFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return
    setIsPageLoading(true)
    setCurrentPage(newPage)
    setTimeout(() => {
      setIsPageLoading(false)
    }, 250)
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
      }
    }
    return pages
  }

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingPupil(null)
    setPupilName("")
    setPupilRfid("")
    setPupilSectionId("")
    setIsAddEditModalOpen(true)
  }

  const handleOpenEdit = (student: Student) => {
    setEditingPupil(student)
    setPupilName(student.name)
    setPupilRfid(student.rfid)
    setPupilSectionId(student.section_id || "")
    setIsAddEditModalOpen(true)
  }

  const handleCloseAddEdit = () => {
    setIsAddEditModalOpen(false)
    setEditingPupil(null)
    setPupilName("")
    setPupilRfid("")
    setPupilSectionId("")
  }

  const handleOpenView = (student: Student) => {
    setViewingPupil(student)
    setIsViewModalOpen(true)
  }

  const handleCloseView = () => {
    setIsViewModalOpen(false)
    setViewingPupil(null)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pupilName.trim() || !pupilRfid.trim() || !pupilSectionId) {
      toast.add({
        title: "Validation Error",
        description: "Please fill in all required fields, including class section.",
        type: "error",
      })
      return
    }

    const selectedSec = sections.find(s => s.id.toString() === pupilSectionId.toString())
    if (!selectedSec) {
      toast.add({
        title: "Validation Error",
        description: "Selected section is invalid.",
        type: "error",
      })
      return
    }

    const formattedRfid = pupilRfid.trim()
    const formattedGrade = `Grade: ${selectedSec.year_level}`

    const payload = {
      name: pupilName,
      grade: formattedGrade,
      rfid: formattedRfid,
      section_id: pupilSectionId,
    }

    if (editingPupil) {
      // Edit mode
      try {
        const response = await ApiHandler.put<Student>(`/students/${editingPupil.id}`, payload)
        setStudents(students.map(s => s.id === editingPupil.id ? response : s))
        toast.add({
          title: "Pupil Updated",
          description: `${pupilName}'s profile has been updated successfully.`,
          type: "success",
        })
        handleCloseAddEdit()
      } catch (err: any) {
        toast.add({
          title: "Update Failed",
          description: err.message || "Failed to update pupil details.",
          type: "error",
        })
      }
    } else {
      // Add mode
      try {
        const response = await ApiHandler.post<Student>("/students", payload)
        setStudents([...students, response])
        toast.add({
          title: "Pupil Registered",
          description: `${pupilName} has been registered successfully.`,
          type: "success",
        })
        handleCloseAddEdit()
      } catch (err: any) {
        toast.add({
          title: "Registration Failed",
          description: err.message || "Failed to register pupil.",
          type: "error",
        })
      }
    }
  }

  const handleDeletePupil = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this pupil record?")) return
    try {
      await ApiHandler.delete(`/students/${id}`)
      setStudents(students.filter(s => s.id !== id))
      toast.add({
        title: "Record Deleted",
        description: "Pupil record deleted successfully.",
        type: "success",
      })
      if (isAddEditModalOpen) handleCloseAddEdit()
    } catch (err: any) {
      toast.add({
        title: "Delete Failed",
        description: err.message || "Failed to delete pupil record.",
        type: "error",
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

  return (
    <div className="space-y-8 animate-fade-in text-neutral font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Pupil Management</h1>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-xs font-bold text-neutral shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border-none shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Pupils</span>
        </button>
      </div>

      {/* Filter Toolbar (matches layout of screen screenshot) */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pupil..."
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

          {/* Class Dropdown Filter */}
          <div className="relative w-full md:w-44 shrink-0">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all appearance-none cursor-pointer"
            >
              <option value="">All Classes</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.year_level} - {sec.section_name}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher Dropdown Filter */}
          <div className="relative w-full md:w-44 shrink-0">
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all appearance-none cursor-pointer"
            >
              <option value="">All Teachers</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown Filter */}
          <div className="relative w-full md:w-36 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pupils List Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] relative scrollbar-thin">
          {isPageLoading && (
            <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] flex items-center justify-center z-30 transition-all">
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-md">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs font-bold text-primary">Loading page {currentPage}...</span>
              </div>
            </div>
          )}
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead className="sticky top-0 z-20 bg-[#FAFBFD] dark:bg-card border-b border-border shadow-xs backdrop-blur-md">
              <tr className="border-b border-border bg-tertiary/40 text-muted-foreground font-bold select-none uppercase tracking-wider">
                <th className="px-6 py-4 font-bold bg-inherit">ID</th>
                <th className="px-6 py-4 font-bold bg-inherit">Pupil</th>
                <th className="px-6 py-4 font-bold bg-inherit">Class</th>
                <th className="px-6 py-4 font-bold bg-inherit">RFID</th>
                <th className="px-6 py-4 font-bold bg-inherit">Guardian</th>
                <th className="px-6 py-4 font-bold bg-inherit">Status</th>
                <th className="px-6 py-4 font-bold text-center bg-inherit">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-neutral">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User className="h-8 w-8 text-muted-foreground/45 animate-pulse" />
                      <span>No pupils found matching the active search or filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const formattedId = `S${String(student.id).padStart(3, "0")}`
                  const primaryGuardianName = student.guardians[0]?.name || "None"
                  const classInfo = student.section 
                    ? `${student.section.year_level} - ${student.section.section_name}` 
                    : student.grade.replace("Grade: ", "") || "Unassigned"

                  return (
                    <tr key={student.id} className="hover:bg-tertiary/10 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap font-bold">
                        {formattedId}
                      </td>
                      <td className="px-6 py-4 font-bold text-primary whitespace-nowrap">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {classInfo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-semibold">
                        {student.rfid}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {primaryGuardianName}
                        {student.guardians.length > 1 && ` (+${student.guardians.length - 1})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-0.5 text-[9px] font-bold select-none uppercase">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenView(student)}
                            className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-bold bg-white dark:bg-card text-neutral hover:bg-tertiary transition-all cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-bold bg-white dark:bg-card text-neutral hover:bg-tertiary transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 px-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-semibold bg-tertiary/10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Showing{" "}
              <strong className="text-primary font-bold">
                {filteredStudents.length === 0 ? 0 : startIndex + 1}
              </strong>
              {" "}-{" "}
              <strong className="text-primary font-bold">
                {Math.min(startIndex + itemsPerPage, filteredStudents.length)}
              </strong>
              {" "}of{" "}
              <strong className="text-primary font-bold">
                {filteredStudents.length}
              </strong>
              {" "}pupils
            </span>
            <span className="inline-flex items-center rounded-md bg-tertiary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              Limit: 10 / page
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button
                disabled={currentPage === 1 || isPageLoading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-tertiary hover:text-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {getPageNumbers().map((page, idx) => {
                if (page === "...") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="h-8 w-8 flex items-center justify-center text-muted-foreground font-bold select-none text-xs"
                    >
                      ...
                    </span>
                  )
                }

                const pageNum = Number(page)
                const isActive = pageNum === currentPage

                return (
                  <button
                    key={pageNum}
                    disabled={isPageLoading}
                    onClick={() => handlePageChange(pageNum)}
                    className={`h-8 min-w-[32px] px-2 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-white border-none shadow-xs"
                        : "bg-card border border-border text-muted-foreground hover:bg-tertiary hover:text-primary"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                disabled={currentPage === totalPages || isPageLoading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-tertiary hover:text-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD/EDIT PUPIL */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">
                {editingPupil ? "Edit Pupil Details" : "Add Pupils"}
              </h2>
              <button 
                onClick={handleCloseAddEdit}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Pupil Full Name</label>
                <input
                  type="text"
                  value={pupilName}
                  onChange={(e) => setPupilName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Class Section</label>
                <select
                  value={pupilSectionId}
                  onChange={(e) => setPupilSectionId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all cursor-pointer"
                  required
                >
                  <option value="">-- Select Class Section --</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.year_level} - {sec.section_name} {sec.teacher ? `(Teacher: ${sec.teacher.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">RFID Tag Code</label>
                <input
                  type="text"
                  value={pupilRfid}
                  onChange={(e) => setPupilRfid(e.target.value)}
                  placeholder="e.g. 04 A2 77 BC"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                {editingPupil && (
                  <button
                    type="button"
                    onClick={() => handleDeletePupil(editingPupil.id)}
                    className="flex-1 py-2.5 rounded-lg border border-destructive text-xs font-bold bg-transparent text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                  >
                    Delete Pupil
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseAddEdit}
                  className="flex-1 py-2.5 rounded-lg border border-border text-xs font-bold bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none font-sans"
                >
                  {editingPupil ? "Save Changes" : "Save Pupil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PUPIL DETAIL */}
      {isViewModalOpen && viewingPupil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">Pupil Information Details</h2>
              <button 
                onClick={handleCloseView}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6 mt-4 font-sans text-xs">
              
              {/* Pupil Details Row */}
              <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-tertiary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0 select-none font-bold">
                  {viewingPupil.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">{viewingPupil.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-muted-foreground font-semibold">
                      ID: {`S${String(viewingPupil.id).padStart(3, "0")}`}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground font-semibold">
                      Grade: {viewingPupil.grade.replace("Grade: ", "")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Class & Teacher Details Card */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Class & Class Teacher details
                </h4>
                <div className="rounded-xl border border-border p-4 bg-white space-y-3">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-semibold">Assigned Section:</span>
                    <span className="font-bold text-neutral">
                      {viewingPupil.section 
                        ? `${viewingPupil.section.year_level} - ${viewingPupil.section.section_name}` 
                        : "Unassigned"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Class Teacher:</span>
                    <span className="font-bold text-neutral">
                      {viewingPupil.section?.teacher?.name || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              {/* RFID Tag Row */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  RFID Tracking Code
                </h4>
                <div className="flex items-center gap-2 rounded-xl border border-border p-3.5 bg-white font-mono font-semibold text-neutral">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{viewingPupil.rfid}</span>
                </div>
              </div>

              {/* Guardians List */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Authorized Guardians ({viewingPupil.guardians.length})
                </h4>
                {viewingPupil.guardians.length === 0 ? (
                  <div className="p-4 border border-dashed border-border rounded-xl text-center text-muted-foreground">
                    No authorized guardians associated with this pupil.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {viewingPupil.guardians.map((g, idx) => (
                      <div key={idx} className="rounded-xl border border-border p-3 bg-white space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-neutral">{g.name}</span>
                          <span className="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 text-[8px] font-bold border border-emerald-100 uppercase select-none">
                            {g.relation}
                          </span>
                        </div>
                        <div className="text-muted-foreground font-semibold text-[10px]">
                          Phone: {g.phone}
                        </div>
                        {g.email && (
                          <div className="text-muted-foreground font-semibold text-[10px] truncate">
                            Email: {g.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  onClick={handleCloseView}
                  className="px-6 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                >
                  Close Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Pupils