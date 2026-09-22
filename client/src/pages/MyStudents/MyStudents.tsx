import { useState, useEffect } from "react"
import { 
  Search, 
  Eye, 
  X, 
  CreditCard, 
  User, 
  Users,
  Building2,
  Phone,
  Mail,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle
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

export function MyStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null)
  const [viewingPupil, setViewingPupil] = useState<Student | null>(null)

  // Student Form State
  const [studentName, setStudentName] = useState("")
  const [studentRfid, setStudentRfid] = useState("")
  const [studentSectionId, setStudentSectionId] = useState<string | number>("")

  // Guardian Form State
  const [guardianName, setGuardianName] = useState("")
  const [guardianRelation, setGuardianRelation] = useState("Mother")
  const [guardianPhone, setGuardianPhone] = useState("")
  const [guardianEmail, setGuardianEmail] = useState("")
  const [guardianPassword, setGuardianPassword] = useState("")
  const [guardianConfirmPassword, setGuardianConfirmPassword] = useState("")

  // Get current teacher info
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
  const teacherId = currentUser.id

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [studentsData, sectionsData] = await Promise.all([
        ApiHandler.get<Student[]>("/students"),
        ApiHandler.get<Section[]>("/sections")
      ])
      setStudents(studentsData)
      setSections(sectionsData)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.add({
        title: "Error Loading Data",
        description: "Could not fetch pupils list from the server.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Find sections assigned to this teacher
  const teacherSections = sections.filter(sec => sec.teacher_id?.toString() === teacherId?.toString())

  // Filter students assigned to this teacher's sections
  const myStudents = students.filter(student => {
    const isAssignedToTeacher = student.section?.teacher_id?.toString() === teacherId?.toString()
    
    // Search filter (searches by student name, RFID, or guardian name)
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.guardians.some(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))

    return isAssignedToTeacher && matchesSearch
  })

  // Pagination State for My Students (Limit: 10 per page)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const itemsPerPage = 10

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(myStudents.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedStudents = myStudents.slice(startIndex, startIndex + itemsPerPage)

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

  // Password strength logic
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "" }
    let score = 0
    if (password.length >= 6) score++
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (password.length < 6) {
      return { score: 1, label: "Weak", color: "bg-red-500 text-red-500" }
    }
    if (score <= 2) {
      return { score: 1, label: "Weak", color: "bg-red-500 text-red-500" }
    } else if (score <= 4) {
      return { score: 2, label: "Medium", color: "bg-amber-500 text-amber-500" }
    } else {
      return { score: 3, label: "Strong", color: "bg-emerald-500 text-emerald-500" }
    }
  }

  const strength = getPasswordStrength(guardianPassword)

  // Student Handlers
  const handleOpenAddStudent = () => {
    setEditingStudent(null)
    setStudentName("")
    setStudentRfid("")
    // Auto-select first teacher section as default if available
    setStudentSectionId(teacherSections[0]?.id || "")
    setIsStudentModalOpen(true)
  }

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student)
    setStudentName(student.name)
    setStudentRfid(student.rfid)
    setStudentSectionId(student.section_id || "")
    setIsStudentModalOpen(true)
  }

  const handleCloseStudentModal = () => {
    setIsStudentModalOpen(false)
    setEditingStudent(null)
    setStudentName("")
    setStudentRfid("")
    setStudentSectionId("")
  }

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentName.trim() || !studentRfid.trim() || !studentSectionId) {
      toast.add({
        title: "Validation Failed",
        description: "Please fill out all required fields, including classroom section.",
        type: "error",
      })
      return
    }

    const selectedSec = sections.find(s => s.id.toString() === studentSectionId.toString())
    if (!selectedSec) {
      toast.add({
        title: "Validation Failed",
        description: "Selected section is invalid.",
        type: "error",
      })
      return
    }

    const formattedRfid = studentRfid.trim()
    const formattedGrade = `Grade: ${selectedSec.year_level}`

    const payload = {
      name: studentName,
      grade: formattedGrade,
      rfid: formattedRfid,
      section_id: studentSectionId,
    }

    if (editingStudent) {
      // Edit
      try {
        const response = await ApiHandler.put<Student>(`/students/${editingStudent.id}`, payload)
        setStudents(students.map(s => s.id === editingStudent.id ? response : s))
        toast.add({
          title: "Pupil Updated",
          description: `${studentName}'s profile has been updated successfully.`,
          type: "success",
        })
        handleCloseStudentModal()
      } catch (err: any) {
        toast.add({
          title: "Update Failed",
          description: err.message || "Failed to update pupil details.",
          type: "error",
        })
      }
    } else {
      // Add
      try {
        const response = await ApiHandler.post<Student>("/students", payload)
        setStudents([...students, response])
        toast.add({
          title: "Pupil Registered",
          description: `${studentName} has been registered successfully.`,
          type: "success",
        })
        handleCloseStudentModal()
      } catch (err: any) {
        toast.add({
          title: "Registration Failed",
          description: err.message || "Failed to register pupil.",
          type: "error",
        })
      }
    }
  }

  const [studentToDelete, setStudentToDelete] = useState<{ id: string | number; name: string } | null>(null)
  const [guardianToDelete, setGuardianToDelete] = useState<{ studentId: string | number; guardianId: string | number; guardianName: string } | null>(null)

  const promptDeleteStudent = (id: string | number, name: string) => {
    setStudentToDelete({ id, name })
  }

  const promptDeleteGuardian = (studentId: string | number, guardianId: string | number, guardianName: string) => {
    setGuardianToDelete({ studentId, guardianId, guardianName })
  }

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return
    const { id } = studentToDelete
    try {
      await ApiHandler.delete(`/students/${id}`)
      setStudents(students.filter(s => s.id !== id))
      toast.add({
        title: "Record Deleted",
        description: "Pupil record deleted successfully.",
        type: "success",
      })
      handleCloseStudentModal()
    } catch (err: any) {
      toast.add({
        title: "Delete Failed",
        description: err.message || "Failed to delete pupil record.",
        type: "error",
      })
    } finally {
      setStudentToDelete(null)
    }
  }

  // Guardian Handlers
  const handleOpenAddGuardian = (studentId: string | number) => {
    setSelectedStudentId(studentId)
    setGuardianName("")
    setGuardianRelation("Mother")
    setGuardianPhone("")
    setGuardianEmail("")
    setGuardianPassword("")
    setGuardianConfirmPassword("")
    setIsGuardianModalOpen(true)
  }

  const handleCloseGuardianModal = () => {
    setIsGuardianModalOpen(false)
    setSelectedStudentId(null)
    setGuardianName("")
    setGuardianRelation("Mother")
    setGuardianPhone("")
    setGuardianEmail("")
    setGuardianPassword("")
    setGuardianConfirmPassword("")
  }

  const handleAddGuardianSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guardianName.trim() || !selectedStudentId || !guardianEmail.trim() || !guardianPassword.trim()) {
      toast.add({
        title: "Validation Failed",
        description: "Please fill in all required guardian details.",
        type: "error",
      })
      return
    }

    if (guardianPassword !== guardianConfirmPassword) {
      toast.add({
        title: "Validation Failed",
        description: "Passwords do not match.",
        type: "error",
      })
      return
    }

    try {
      const response = await ApiHandler.post<Guardian>(`/students/${selectedStudentId}/guardians`, {
        name: guardianName,
        relation: guardianRelation,
        phone: guardianPhone,
        email: guardianEmail,
        password: guardianPassword,
      })

      // Update student guardians in local list state
      setStudents(
        students.map((student) => {
          if (student.id === selectedStudentId) {
            return {
              ...student,
              guardians: [...student.guardians, response],
            }
          }
          return student
        })
      )

      toast.add({
        title: "Guardian Account Created",
        description: `Guardian ${guardianName} account registered and linked successfully.`,
        type: "success",
      })

      handleCloseGuardianModal()
    } catch (err: any) {
      toast.add({
        title: "Creation Failed",
        description: err.message || "Failed to register guardian account.",
        type: "error",
      })
    }
  }

  const handleConfirmDeleteGuardian = async () => {
    if (!guardianToDelete) return
    const { studentId, guardianId } = guardianToDelete
    try {
      await ApiHandler.delete(`/students/${studentId}/guardians/${guardianId}`)
      
      setStudents(
        students.map((student) => {
          if (student.id === studentId) {
            return {
              ...student,
              guardians: student.guardians.filter((g) => g.id !== guardianId),
            }
          }
          return student
        })
      )

      toast.add({
        title: "Guardian Account Removed",
        description: "Guardian account deleted successfully.",
        type: "success",
      })

      if (isViewModalOpen && viewingPupil && viewingPupil.id === studentId) {
        setViewingPupil({
          ...viewingPupil,
          guardians: viewingPupil.guardians.filter((g) => g.id !== guardianId)
        })
      }
    } catch (err: any) {
      toast.add({
        title: "Deletion Failed",
        description: err.message || "Failed to remove guardian account.",
        type: "error",
      })
    } finally {
      setGuardianToDelete(null)
    }
  }

  const handleOpenView = (student: Student) => {
    setViewingPupil(student)
    setIsViewModalOpen(true)
  }

  const handleCloseView = () => {
    setIsViewModalOpen(false)
    setViewingPupil(null)
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
      
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Pupils</h1>
        </div>
        
        {teacherSections.length > 0 && (
          <button
            onClick={handleOpenAddStudent}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] px-5 py-3 text-xs font-bold text-white shadow-sm active:scale-[0.99] transition-all cursor-pointer border-none shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Pupils</span>
          </button>
        )}
      </div>

      {/* Class Section Info Card */}
      <div className="bg-[#FAFBFD] dark:bg-neutral/5 border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-6 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Building2 className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-primary">Your Assigned Classrooms</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {teacherSections.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">
                You are currently not assigned to any year level or section. Contact administration to assign your account.
              </span>
            ) : (
              teacherSections.map(sec => (
                <span key={sec.id} className="inline-flex rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 px-3.5 py-1 text-xs font-bold select-none uppercase">
                  {sec.year_level} - {sec.section_name}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search class pupils..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
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
      </div>

      {/* Pupil Table list */}
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
                <th className="px-6 py-4 font-bold bg-inherit">Class Section</th>
                <th className="px-6 py-4 font-bold bg-inherit">RFID Code</th>
                <th className="px-6 py-4 font-bold bg-inherit">Primary Guardian</th>
                <th className="px-6 py-4 font-bold text-center bg-inherit">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-neutral">
              {myStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User className="h-8 w-8 text-muted-foreground/45 animate-pulse" />
                      <span>No students found in your assigned class list.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const formattedId = `S${String(student.id).padStart(3, "0")}`
                  const primaryGuardianName = student.guardians[0]?.name || "None"
                  const classInfo = student.section 
                    ? `${student.section.year_level} - ${student.section.section_name}` 
                    : "Unassigned"

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
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenView(student)}
                            className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-bold bg-white dark:bg-card text-neutral hover:bg-tertiary transition-all cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEditStudent(student)}
                            className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-bold bg-white dark:bg-card text-neutral hover:bg-tertiary transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenAddGuardian(student.id)}
                            className="px-3 py-1.5 rounded-lg border border-[#4F46E5] text-[11px] font-bold bg-[#4F46E5]/5 text-[#4F46E5] hover:bg-[#4F46E5]/10 transition-all cursor-pointer"
                          >
                            + Guardian
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
                {myStudents.length === 0 ? 0 : startIndex + 1}
              </strong>
              {" "}-{" "}
              <strong className="text-primary font-bold">
                {Math.min(startIndex + itemsPerPage, myStudents.length)}
              </strong>
              {" "}of{" "}
              <strong className="text-primary font-bold">
                {myStudents.length}
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

      {/* MODAL: ADD/EDIT STUDENT */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">
                {editingStudent ? "Edit Pupil Details" : "Add Pupils"}
              </h2>
              <button 
                onClick={handleCloseStudentModal}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleStudentSubmit} className="space-y-4 mt-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Pupil Full Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Liam Chen"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Assigned Classroom</label>
                <select
                  value={studentSectionId}
                  onChange={(e) => setStudentSectionId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all cursor-pointer"
                  required
                >
                  <option value="">-- Select Section --</option>
                  {teacherSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.year_level} - {sec.section_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">RFID Tag Code</label>
                <input
                  type="text"
                  value={studentRfid}
                  onChange={(e) => setStudentRfid(e.target.value)}
                  placeholder="e.g. 05 B4 21 AF"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                {editingStudent && (
                  <button
                    type="button"
                    onClick={() => promptDeleteStudent(editingStudent.id, editingStudent.name)}
                    className="flex-1 py-2.5 rounded-lg border border-destructive text-xs font-bold bg-transparent text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                  >
                    Delete Pupil
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseStudentModal}
                  className="flex-1 py-2.5 rounded-lg border border-border text-xs font-bold bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none font-sans"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD GUARDIAN ACCOUNT */}
      {isGuardianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <span>Register Guardian Account</span>
              </h2>
              <button 
                onClick={handleCloseGuardianModal}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddGuardianSubmit} className="space-y-4 mt-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Guardian Full Name</label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="e.g. Sarah Johnson"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral/80">Relationship</label>
                  <select
                    value={guardianRelation}
                    onChange={(e) => setGuardianRelation(e.target.value)}
                    className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Grandmother">Grandmother</option>
                    <option value="Grandfather">Grandfather</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Guardian">Legal Guardian</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral/80">Phone Number</label>
                  <input
                    type="text"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="e.g. 09123456789"
                    className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Email (Username for login)</label>
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  placeholder="e.g. guardian@fcu.edu"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Login Password</label>
                <input
                  type="password"
                  value={guardianPassword}
                  onChange={(e) => setGuardianPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
                
                {/* Password Strength Meter */}
                {guardianPassword && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-semibold">Password Strength:</span>
                      <span className="font-bold">{strength.label}</span>
                    </div>
                    <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-350 ${strength.color}`} 
                        style={{ width: `${(strength.score / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Confirm Password</label>
                <input
                  type="password"
                  value={guardianConfirmPassword}
                  onChange={(e) => setGuardianConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseGuardianModal}
                  className="flex-1 py-2.5 rounded-lg border border-border text-xs font-bold bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                >
                  Register Account
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

              {/* Class details */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Class Section Details
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
                  Authorized Emergency Contacts ({viewingPupil.guardians.length})
                </h4>
                {viewingPupil.guardians.length === 0 ? (
                  <div className="p-4 border border-dashed border-border rounded-xl text-center text-muted-foreground">
                    No emergency guardian contact details registered for this pupil.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {viewingPupil.guardians.map((g, idx) => (
                      <div key={idx} className="rounded-xl border border-border p-3.5 bg-white space-y-2">
                        <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
                          <span className="font-bold text-neutral">{g.name}</span>
                          <button
                            onClick={() => promptDeleteGuardian(viewingPupil.id, g.id!, g.name)}
                            className="p-1 hover:bg-destructive/10 rounded text-destructive border-none bg-transparent cursor-pointer"
                            title="Delete Guardian Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[10px]">
                          <span className="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 text-[8px] font-bold border border-emerald-100 uppercase select-none mr-1.5">
                            {g.relation}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[10px]">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                          <span>{g.phone}</span>
                        </div>
                        {g.email && (
                          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[10px] truncate">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                            <span className="truncate">{g.email}</span>
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
                  Close details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM PUPIL DELETION */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Remove Pupil Record?</h3>
                <p className="text-xs text-muted-foreground">This action requires confirmation</p>
              </div>
            </div>

            <p className="text-xs text-neutral/80 font-medium leading-relaxed">
              Are you sure you want to permanently delete pupil record <strong className="text-neutral font-bold">{studentToDelete.name}</strong>? All linked guardian relationships and RFID history will be removed.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-tertiary transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteStudent}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM GUARDIAN DELETION */}
      {guardianToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Remove Guardian?</h3>
                <p className="text-xs text-muted-foreground">This action requires confirmation</p>
              </div>
            </div>

            <p className="text-xs text-neutral/80 font-medium leading-relaxed">
              Are you sure you want to permanently delete guardian <strong className="text-neutral font-bold">{guardianToDelete.guardianName}</strong>? They will no longer be authorized for pickup verification.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setGuardianToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-tertiary transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteGuardian}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default MyStudents
