import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { 
  UserPlus, 
  Pencil, 
  Trash2, 
  Plus, 
  ChevronDown, 
  X, 
  Users, 
  CreditCard,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../../components/ui/toast"
import { LoadingScreen } from "../../components/LoadingScreen"

interface Guardian {
  id?: string | number
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
  section_id?: string | number | null
  section?: Section | null
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

export function Registration() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab") as "students" | "teachers" | "sections" | null

  // Students List State
  const [students, setStudents] = useState<Student[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)

  // Tab State synchronized with URL search params
  const [activeTab, setActiveTabState] = useState<"students" | "teachers" | "sections" | null>(
    tabParam || null
  )

  const setActiveTab = (tab: "students" | "teachers" | "sections" | null) => {
    setActiveTabState(tab)
    if (tab) {
      setSearchParams({ tab })
    } else {
      setSearchParams({})
    }
  }

  useEffect(() => {
    if (tabParam === "students" || tabParam === "teachers" || tabParam === "sections") {
      setActiveTabState(tabParam)
    } else if (!tabParam) {
      setActiveTabState(null)
    }
  }, [tabParam])

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await ApiHandler.get<Student[]>("/students")
        setStudents(data)
      } catch (error) {
        console.error("Failed to load students:", error)
        toast.add({
          title: "Error Loading Data",
          description: "Could not fetch students list from the server.",
          type: "error",
        })
      } finally {
        setIsLoadingStudents(false)
      }
    }

    const fetchSections = async () => {
      try {
        const data = await ApiHandler.get<Section[]>("/sections")
        setSections(data)
      } catch (error) {
        console.error("Failed to load sections:", error)
      }
    }

    fetchStudents()
    fetchSections()
  }, [])

  // Search State
  const [searchQuery, setSearchQuery] = useState("")

  // Filter and sort students dynamically based on search query (alphabetically by name)
  const filteredStudents = students
    .filter((student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.guardians.some(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Pagination State for Guardian Registration (Limit: 10 per page)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const itemsPerPage = 10

  // Reset page when search query or activeTab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeTab])

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

  // Modal State Variables
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null)
  const [editingStudentId, setEditingStudentId] = useState<string | number | null>(null)

  // Teachers State
  const [teachers, setTeachers] = useState<any[]>([])
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false)

  // Teacher Modal & Form State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false)
  const [teacherName, setTeacherName] = useState("")
  const [teacherEmail, setTeacherEmail] = useState("")
  const [teacherPassword, setTeacherPassword] = useState("")
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState("")

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

  // Sections State
  const [sections, setSections] = useState<Section[]>([])
  const [isLoadingSections, setIsLoadingSections] = useState(false)

  // Section Modal & Form State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | number | null>(null)
  const [sectionYearLevel, setSectionYearLevel] = useState("K-1")
  const [sectionName, setSectionName] = useState("")
  const [sectionTeacherId, setSectionTeacherId] = useState<string | number>("")

  // Actions
  useEffect(() => {
    if (activeTab === "teachers" || activeTab === "sections") {
      const fetchTeachers = async () => {
        setIsLoadingTeachers(true)
        try {
          const data = await ApiHandler.get<any[]>("/teachers")
          setTeachers(data)
        } catch (error) {
          console.error("Failed to load teachers:", error)
          toast.add({
            title: "Error Loading Data",
            description: "Could not fetch teachers list from the server.",
            type: "error",
          })
        } finally {
          setIsLoadingTeachers(false)
        }
      }
      fetchTeachers()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "sections") {
      const fetchSections = async () => {
        setIsLoadingSections(true)
        try {
          const data = await ApiHandler.get<Section[]>("/sections")
          setSections(data)
        } catch (error) {
          console.error("Failed to load sections:", error)
          toast.add({
            title: "Error Loading Data",
            description: "Could not fetch sections list from the server.",
            type: "error",
          })
        } finally {
          setIsLoadingSections(false)
        }
      }
      fetchSections()
    }
  }, [activeTab])

  const handleCloseTeacherModal = () => {
    setIsTeacherModalOpen(false)
    setTeacherName("")
    setTeacherEmail("")
    setTeacherPassword("")
    setTeacherConfirmPassword("")
  }

  const handleCloseSectionModal = () => {
    setIsSectionModalOpen(false)
    setEditingSectionId(null)
    setSectionYearLevel("K-1")
    setSectionName("")
    setSectionTeacherId("")
  }

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sectionYearLevel.trim() || !sectionName.trim()) return

    const payload = {
      year_level: sectionYearLevel,
      section_name: sectionName,
      teacher_id: sectionTeacherId || null,
    }

    if (editingSectionId) {
      try {
        const response = await ApiHandler.put<Section>(`/sections/${editingSectionId}`, payload)
        setSections(
          sections.map((sec) => (sec.id === editingSectionId ? response : sec))
        )
        toast.add({
          title: "Section Updated",
          description: `Section ${sectionName} has been updated successfully.`,
          type: "success",
        })
        handleCloseSectionModal()
      } catch (err: any) {
        toast.add({
          title: "Update Failed",
          description: err.message || "Failed to update section.",
          type: "error",
        })
      }
    } else {
      try {
        const response = await ApiHandler.post<Section>("/sections", payload)
        setSections([...sections, response])
        toast.add({
          title: "Section Registered",
          description: `Section ${sectionName} has been registered successfully.`,
          type: "success",
        })
        handleCloseSectionModal()
      } catch (err: any) {
        toast.add({
          title: "Registration Failed",
          description: err.message || "Failed to register section.",
          type: "error",
        })
      }
    }
  }

  const handleEditSectionClick = (sec: Section) => {
    setEditingSectionId(sec.id)
    setSectionYearLevel(sec.year_level)
    setSectionName(sec.section_name)
    setSectionTeacherId(sec.teacher_id || "")
    setIsSectionModalOpen(true)
  }

  const handleDeleteSection = async (id: string | number) => {
    try {
      await ApiHandler.delete(`/sections/${id}`)
      setSections(sections.filter((sec) => sec.id !== id))
      toast.add({
        title: "Section Removed",
        description: "Section deleted successfully.",
        type: "success",
      })
    } catch (err: any) {
      toast.add({
        title: "Deletion Failed",
        description: err.message || "Failed to delete section.",
        type: "error",
      })
    }
  }

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

  const strength = getPasswordStrength(teacherPassword)

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacherName.trim() || !teacherEmail.trim() || !teacherPassword.trim()) return

    if (teacherPassword !== teacherConfirmPassword) {
      toast.add({
        title: "Registration Failed",
        description: "Passwords do not match.",
        type: "error",
      })
      return
    }

    try {
      const response = await ApiHandler.post<any>("/teachers", {
        name: teacherName,
        email: teacherEmail,
        password: teacherPassword,
      })

      setTeachers([...teachers, response])
      
      toast.add({
        title: "Teacher Registered",
        description: `${teacherName} has been registered successfully.`,
        type: "success",
      })

      // Reset Form
      handleCloseTeacherModal()
    } catch (err: any) {
      toast.add({
        title: "Registration Failed",
        description: err.message || "Failed to register teacher.",
        type: "error",
      })
    }
  }

  const handleDeleteTeacher = async (id: string | number) => {
    try {
      await ApiHandler.delete(`/teachers/${id}`)
      setTeachers(teachers.filter((teacher) => teacher.id !== id))
      
      toast.add({
        title: "Teacher Removed",
        description: "Teacher account deleted successfully.",
        type: "success",
      })
    } catch (err: any) {
      toast.add({
        title: "Deletion Failed",
        description: err.message || "Failed to delete teacher.",
        type: "error",
      })
    }
  }

  const handleCloseStudentModal = () => {
    setIsStudentModalOpen(false)
    setEditingStudentId(null)
    setStudentName("")
    setStudentRfid("")
    setStudentSectionId("")
  }

  const handleEditStudentClick = (student: Student) => {
    setEditingStudentId(student.id)
    setStudentName(student.name)
    setStudentRfid(student.rfid)
    setStudentSectionId(student.section_id || "")
    setIsStudentModalOpen(true)
  }

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentName.trim() || !studentRfid.trim() || !studentSectionId) {
      toast.add({
        title: "Validation Failed",
        description: "Please fill out all required fields, including class section.",
        type: "error",
      })
      return
    }

    const selectedSec = sections.find(s => s.id.toString() === studentSectionId.toString())
    if (!selectedSec) {
      toast.add({
        title: "Validation Failed",
        description: "Selected class section is invalid.",
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

    if (editingStudentId) {
      try {
        const response = await ApiHandler.put<Student>(`/students/${editingStudentId}`, payload)

        setStudents(
          students.map((student) => (student.id === editingStudentId ? response : student))
        )

        toast.add({
          title: "Student Updated",
          description: `${studentName}'s profile has been updated successfully.`,
          type: "success",
        })

        handleCloseStudentModal()
      } catch (err: any) {
        toast.add({
          title: "Update Failed",
          description: err.message || "Failed to update student details.",
          type: "error",
        })
      }
    } else {
      try {
        const response = await ApiHandler.post<Student>("/students", payload)

        setStudents([...students, response])
        
        toast.add({
          title: "Student Registered",
          description: `${studentName} has been registered successfully.`,
          type: "success",
        })

        handleCloseStudentModal()
      } catch (err: any) {
        toast.add({
          title: "Registration Failed",
          description: err.message || "Failed to register student.",
          type: "error",
        })
      }
    }
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

  const handleAddGuardian = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guardianName.trim() || !selectedStudentId || !guardianEmail.trim() || !guardianPassword.trim()) return

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
        title: "Guardian Added",
        description: `${guardianName} has been authorized successfully.`,
        type: "success",
      })

      // Reset Form
      handleCloseGuardianModal()
    } catch (err: any) {
      toast.add({
        title: "Error Adding Guardian",
        description: err.message || "Failed to add guardian.",
        type: "error",
      })
    }
  }

  const handleDeleteStudent = async (id: string | number) => {
    try {
      await ApiHandler.delete(`/students/${id}`)
      setStudents(students.filter((student) => student.id !== id))
      
      toast.add({
        title: "Student Removed",
        description: "Student profile deleted successfully.",
        type: "success",
      })
    } catch (err: any) {
      toast.add({
        title: "Deletion Failed",
        description: err.message || "Failed to delete student.",
        type: "error",
      })
    }
  }

  const handleDeleteGuardian = async (studentId: string | number, guardianId: string | number) => {
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
        title: "Guardian Removed",
        description: "Guardian deleted successfully.",
        type: "success",
      })
    } catch (err: any) {
      toast.add({
        title: "Error Deleting Guardian",
        description: err.message || "Failed to delete guardian.",
        type: "error",
      })
    }
  }

  if (activeTab === null) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-8 animate-fade-in text-neutral font-sans">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Registration Workspace</h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm font-semibold">
            Select a module to manage school registries, class structures, and access credentials.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 pt-4">
          {/* Card 1: Students & Guardians */}
          <div 
            onClick={() => setActiveTab("students")}
            className="bg-card hover:bg-tertiary/10 border border-border hover:border-primary/30 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 transform hover:-translate-y-1 space-y-4 group text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-[#4F46E5] border border-indigo-100 dark:border-indigo-900/30 group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-primary">Guardians</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Register student profiles and set up emergency authorized parent credentials.
              </p>
            </div>
          </div>

          {/* Card 2: Class Teachers */}
          <div 
            onClick={() => setActiveTab("teachers")}
            className="bg-card hover:bg-tertiary/10 border border-border hover:border-primary/30 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 transform hover:-translate-y-1 space-y-4 group text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/20 text-[#0284C7] border border-sky-100 dark:border-sky-900/30 group-hover:scale-110 transition-transform">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-primary">Class Teachers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Create teacher accounts and configure workspace classroom assignments.
              </p>
            </div>
          </div>

          {/* Card 3: Year Levels & Sections */}
          <div 
            onClick={() => setActiveTab("sections")}
            className="bg-card hover:bg-tertiary/10 border border-border hover:border-primary/30 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 transform hover:-translate-y-1 space-y-4 group text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-[#10B981] border border-emerald-100 dark:border-emerald-900/30 group-hover:scale-110 transition-transform">
              <Plus className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-primary">Year Levels & Sections</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Establish year levels, define classroom sections, and assign teachers.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in text-neutral font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {activeTab === "students" 
                ? "Guardian Registration" 
                : activeTab === "teachers" 
                  ? "Teacher Account Registration"
                  : "Year Level & Section Registration"
              }
            </h1>
          </div>
        </div>
        
        {/* Dynamic CTA */}
        {activeTab === "teachers" && (
          <button
            onClick={() => setIsTeacherModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-xs font-bold text-neutral shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border-none shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Teacher</span>
          </button>
        )}
        {activeTab === "sections" && (
          <button
            onClick={() => {
              setEditingSectionId(null)
              setSectionYearLevel("K-1")
              setSectionName("")
              setSectionTeacherId("")
              setIsSectionModalOpen(true)
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-xs font-bold text-neutral shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border-none shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Section</span>
          </button>
        )}
      </div>



      {activeTab === "students" ? (
        <>
          {/* Search Input Bar */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name, grade, or RFID..."
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-xs font-semibold text-neutral outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-tertiary rounded-full border-none bg-transparent cursor-pointer text-muted-foreground hover:text-neutral transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Main Table for Guardian Registration */}
          {isLoadingStudents ? (
            <div className="min-h-[350px] flex items-center justify-center bg-card border border-border rounded-2xl p-8">
              <LoadingScreen fullScreen={false} />
            </div>
          ) : (
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
                      <th className="px-6 py-4 font-bold bg-inherit">Pupil</th>
                      <th className="px-6 py-4 font-bold bg-inherit">Class & Section</th>
                      <th className="px-6 py-4 font-bold bg-inherit">RFID Tag</th>
                      <th className="px-6 py-4 font-bold bg-inherit min-w-[320px]">Authorized Guardians</th>
                      <th className="px-6 py-4 font-bold text-center bg-inherit">Status</th>
                      <th className="px-6 py-4 font-bold text-center bg-inherit">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium text-neutral">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Search className="h-8 w-8 text-muted-foreground opacity-40 animate-pulse" />
                            <h3 className="text-sm font-bold text-primary">No search results</h3>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                              We couldn't find any students matching "{searchQuery}". Try searching for another name, grade, or RFID code.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((student) => {
                        const hasGuardians = student.guardians && student.guardians.length > 0

                        return (
                          <tr key={student.id} className="hover:bg-tertiary/10 transition-colors">
                            {/* Pupil Column */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-primary text-sm">{student.name}</div>
                                  <div className="text-[10px] text-muted-foreground font-semibold">ID: S{String(student.id).padStart(3, "0")}</div>
                                </div>
                              </div>
                            </td>

                            {/* Class & Section Column */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-neutral">
                                  {student.section 
                                    ? `${student.section.year_level} - ${student.section.section_name}`
                                    : student.grade || "Unassigned"
                                  }
                                </span>
                                {student.section?.teacher && (
                                  <span className="text-[10px] text-emerald-600 font-bold">
                                    Teacher: {student.section.teacher.name}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* RFID Tag Column */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-tertiary px-3 py-1 text-[11px] font-bold text-muted-foreground select-none">
                                <CreditCard className="h-3 w-3" />
                                <span>{student.rfid}</span>
                              </div>
                            </td>

                            {/* Authorized Guardians Column */}
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {hasGuardians ? (
                                  student.guardians.map((guardian, gIdx) => (
                                    <div
                                      key={gIdx}
                                      className="group/item inline-flex items-center gap-2 rounded-xl border border-border bg-white dark:bg-card px-3 py-1.5 shadow-xs transition-all hover:border-primary/30"
                                    >
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                                        <Users className="h-3 w-3" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-neutral leading-tight">{guardian.name}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {guardian.relation} • {guardian.phone}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => guardian.id && handleDeleteGuardian(student.id, guardian.id)}
                                        className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground transition-colors border-none bg-transparent cursor-pointer ml-1"
                                        title="Remove Guardian"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground italic mr-2">
                                    No guardian linked
                                  </span>
                                )}
                                
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(student.id)
                                    setIsGuardianModalOpen(true)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary transition-all cursor-pointer whitespace-nowrap"
                                  title="Add Authorized Guardian"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Add Guardian</span>
                                </button>
                              </div>
                            </td>

                            {/* Status Column */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {hasGuardians ? (
                                <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-0.5 text-[9px] font-bold select-none uppercase">
                                  Authorized ({student.guardians.length})
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30 px-2.5 py-0.5 text-[9px] font-bold select-none uppercase">
                                  No Guardian
                                </span>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEditStudentClick(student)}
                                  className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer hover:bg-tertiary rounded-lg border-none bg-transparent"
                                  title="Edit Student"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer hover:bg-destructive/10 rounded-lg border-none bg-transparent"
                                  title="Delete Student"
                                >
                                  <Trash2 className="h-4 w-4" />
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
          )}
        </>
      ) : activeTab === "teachers" ? (
        <>
          {/* Teachers Section */}
          {isLoadingTeachers ? (
            <div className="min-h-[350px] flex items-center justify-center bg-card border border-border rounded-2xl p-8">
              <LoadingScreen fullScreen={false} />
            </div>
          ) : (
            <div className="space-y-6">
              {teachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-2xl bg-card text-center space-y-3">
                  <Users className="h-10 w-10 text-muted-foreground opacity-40 animate-pulse" />
                  <h3 className="text-sm font-bold text-primary">No teachers registered</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    There are currently no teacher accounts created. Click "Add Teacher" in the top-right to register a new account.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
                  {teachers.map((teacher) => {
                    const initials = teacher.name
                      ? teacher.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
                      : "T"
                    return (
                      <div key={teacher.id} className="rounded-2xl border border-border bg-card shadow-sm p-5 flex items-center justify-between transition-all hover:shadow-md hover:border-border/80">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0 select-none font-bold">
                            {initials}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-primary dark:text-foreground">{teacher.name}</h3>
                            <p className="text-xs text-muted-foreground font-semibold mt-0.5">{teacher.email}</p>
                            <span className="inline-flex mt-2.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 px-2.5 py-0.5 text-[9px] font-bold select-none uppercase">
                              Class Teacher
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer hover:bg-destructive/10 rounded-lg border-none bg-transparent"
                          title="Remove Teacher"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Sections Section */}
          {isLoadingSections ? (
            <div className="min-h-[350px] flex items-center justify-center bg-card border border-border rounded-2xl p-8">
              <LoadingScreen fullScreen={false} />
            </div>
          ) : (
            <div className="space-y-6">
              {sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-2xl bg-card text-center space-y-3">
                  <Users className="h-10 w-10 text-muted-foreground opacity-40 animate-pulse" />
                  <h3 className="text-sm font-bold text-primary">No sections registered</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    There are currently no year levels & sections created. Click "Add Section" in the top-right to register a new class.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
                  {sections.map((sec) => (
                    <div key={sec.id} className="rounded-2xl border border-border bg-card shadow-sm p-5 flex items-center justify-between transition-all hover:shadow-md hover:border-border/80">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0 select-none font-bold">
                          {sec.year_level.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-primary dark:text-foreground">
                            {sec.year_level} - {sec.section_name}
                          </h3>
                          <div className="mt-2.5">
                            {sec.teacher ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                  Class Teacher:
                                </span>
                                <span className="text-xs font-semibold text-neutral">
                                  {sec.teacher.name}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30 px-2.5 py-0.5 text-[9px] font-bold select-none uppercase">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditSectionClick(sec)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer hover:bg-tertiary rounded-lg border-none bg-transparent"
                          title="Edit Section"
                        >
                          <Pencil className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(sec.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer hover:bg-destructive/10 rounded-lg border-none bg-transparent"
                          title="Remove Section"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Bottom Footer Info */}
      <footer className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-6 text-xs text-muted-foreground font-semibold">
        <span>© 2026 GuardianLink RFID Systems. Institutional Modernist Edition.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms of Service</a>
        </div>
      </footer>

      {/* MODAL: ADD STUDENT */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">
                {editingStudentId ? "Edit Student Details" : "Register New Pupils"}
              </h2>
              <button 
                onClick={handleCloseStudentModal}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleStudentSubmit} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Pupils Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Emma Johnson"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Class Section</label>
                <select
                  value={studentSectionId}
                  onChange={(e) => setStudentSectionId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
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
                  value={studentRfid}
                  onChange={(e) => setStudentRfid(e.target.value)}
                  placeholder="e.g. 001234"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseStudentModal}
                  className="flex-1 py-2.5 rounded-lg border border-border text-xs font-bold bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                >
                  {editingStudentId ? "Update Student" : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD GUARDIAN */}
      {isGuardianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">Add Authorized Guardian</h2>
              <button 
                onClick={handleCloseGuardianModal}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddGuardian} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Guardian Name</label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="e.g. Sarah Johnson"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Relationship</label>
                <select
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Phone Number</label>
                <input
                  type="text"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="e.g. 555-0101"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Email Address</label>
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
                <label className="text-xs font-bold text-neutral/80">Password</label>
                <input
                  type="password"
                  value={guardianPassword}
                  onChange={(e) => setGuardianPassword(e.target.value)}
                  placeholder="Choose password (min 6 characters)"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
                
                {/* Password Strength Indicator */}
                {guardianPassword && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-neutral/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        getPasswordStrength(guardianPassword).score >= 1 
                          ? (getPasswordStrength(guardianPassword).score === 1 ? 'bg-red-500 w-1/3' : getPasswordStrength(guardianPassword).score === 2 ? 'bg-amber-500 w-2/3' : 'bg-emerald-500 w-full') 
                          : 'w-0'
                      }`} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-muted-foreground">Password strength:</span>
                      <span className={
                        getPasswordStrength(guardianPassword).label === "Weak" ? "text-red-500" :
                        getPasswordStrength(guardianPassword).label === "Medium" ? "text-amber-500" : "text-emerald-500"
                      }>
                        {getPasswordStrength(guardianPassword).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Confirm Password</label>
                <input
                  type="password"
                  value={guardianConfirmPassword}
                  onChange={(e) => setGuardianConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
                {guardianConfirmPassword && (
                  <div className="text-[10px] font-bold pt-1">
                    {guardianPassword === guardianConfirmPassword ? (
                      <span className="text-emerald-500">✓ Passwords match</span>
                    ) : (
                      <span className="text-red-500">✗ Passwords do not match</span>
                    )}
                  </div>
                )}
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
                  disabled={guardianPassword !== guardianConfirmPassword}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Guardian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TEACHER */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">Register New Teacher</h2>
              <button 
                onClick={handleCloseTeacherModal}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddTeacher} className="space-y-4 mt-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Full Name</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Email Address</label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="e.g. teacher@fcu.edu"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Password</label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="Choose password (min 6 characters)"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
                
                {/* Password Strength Indicator */}
                {teacherPassword && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-neutral/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        strength.score >= 1 ? (strength.score === 1 ? 'bg-red-500 w-1/3' : strength.score === 2 ? 'bg-amber-500 w-2/3' : 'bg-emerald-500 w-full') : 'w-0'
                      }`} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-muted-foreground">Password strength:</span>
                      <span className={
                        strength.label === "Weak" ? "text-red-500" :
                        strength.label === "Medium" ? "text-amber-500" : "text-emerald-500"
                      }>
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Confirm Password</label>
                <input
                  type="password"
                  value={teacherConfirmPassword}
                  onChange={(e) => setTeacherConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
                {teacherConfirmPassword && (
                  <div className="text-[10px] font-bold pt-1">
                    {teacherPassword === teacherConfirmPassword ? (
                      <span className="text-emerald-500">✓ Passwords match</span>
                    ) : (
                      <span className="text-red-500">✗ Passwords do not match</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseTeacherModal}
                  className="flex-1 py-2.5 rounded-lg border border-border text-xs font-bold bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={teacherPassword !== teacherConfirmPassword}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Register Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT SECTION */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">
                {editingSectionId ? "Edit Section Details" : "Register New Section"}
              </h2>
              <button 
                onClick={handleCloseSectionModal}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSectionSubmit} className="space-y-4 mt-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Year Level</label>
                <select
                  value={sectionYearLevel}
                  onChange={(e) => setSectionYearLevel(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                >
                  <option value="K-1">K-1</option>
                  <option value="K-2">K-2</option>
                  <option value="Nursery">Nursery</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Section Name</label>
                <input
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. Apple, Sun, Daisy"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Assign Class Teacher</label>
                <select
                  value={sectionTeacherId}
                  onChange={(e) => setSectionTeacherId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                >
                  <option value="">-- Select Teacher (Optional) --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseSectionModal}
                  className="flex-1 py-2.5 rounded-lg border border-border text-xs font-bold bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none font-sans"
                >
                  {editingSectionId ? "Update Section" : "Save Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Registration