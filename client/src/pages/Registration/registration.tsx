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
  Loader2,
  Eye,
  AlertTriangle,
  Phone,
  Mail,
  GraduationCap,
  DoorClosed,
  User
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

  // View Pupil Detail Modal State
  const [isViewPupilModalOpen, setIsViewPupilModalOpen] = useState(false)
  const [viewingPupil, setViewingPupil] = useState<Student | null>(null)

  // View Guardian Detail Modal State
  const [isViewGuardianModalOpen, setIsViewGuardianModalOpen] = useState(false)
  const [viewingGuardianData, setViewingGuardianData] = useState<{
    guardian: Guardian
    student: Student
  } | null>(null)

  // Edit Guardian Modal State
  const [isEditGuardianModalOpen, setIsEditGuardianModalOpen] = useState(false)
  const [editingGuardianStudentId, setEditingGuardianStudentId] = useState<string | number | null>(null)
  const [editingGuardianId, setEditingGuardianId] = useState<string | number | null>(null)
  const [editGuardianName, setEditGuardianName] = useState("")
  const [editGuardianRelation, setEditGuardianRelation] = useState("Mother")
  const [editGuardianPhone, setEditGuardianPhone] = useState("")
  const [editGuardianEmail, setEditGuardianEmail] = useState("")
  const [editGuardianPassword, setEditGuardianPassword] = useState("")
  const [editGuardianConfirmPassword, setEditGuardianConfirmPassword] = useState("")

  // Delete Confirmation Modal States
  const [guardianToDelete, setGuardianToDelete] = useState<{
    studentId: string | number
    guardianId: string | number
    guardianName: string
  } | null>(null)

  const [studentToDelete, setStudentToDelete] = useState<{ id: string | number; name: string } | null>(null)
  const [teacherToDelete, setTeacherToDelete] = useState<{ id: string | number; name: string } | null>(null)
  const [sectionToDelete, setSectionToDelete] = useState<{ id: string | number; name: string } | null>(null)

  const promptDeleteStudent = (id: string | number, name: string) => {
    setStudentToDelete({ id, name })
  }

  const promptDeleteTeacher = (id: string | number, name: string) => {
    setTeacherToDelete({ id, name })
  }

  const promptDeleteSection = (id: string | number, name: string) => {
    setSectionToDelete({ id, name })
  }

  // Multiple Guardians Dropdown State
  const [openGuardianDropdownId, setOpenGuardianDropdownId] = useState<string | number | null>(null)
  const [isInlineAddGuardianOpen, setIsInlineAddGuardianOpen] = useState(false)

  const handleOpenViewPupil = (student: Student) => {
    setViewingPupil(student)
    setIsViewPupilModalOpen(true)
  }

  const handleCloseViewPupil = () => {
    setIsViewPupilModalOpen(false)
    setViewingPupil(null)
  }

  const promptDeleteGuardian = (studentId: string | number, guardianId: string | number, guardianName: string) => {
    setGuardianToDelete({ studentId, guardianId, guardianName })
  }

  // Teachers State
  const [teachers, setTeachers] = useState<any[]>([])
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false)

  // Teacher Modal & Form State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false)
  const [editingTeacherId, setEditingTeacherId] = useState<string | number | null>(null)
  const [teacherName, setTeacherName] = useState("")
  const [teacherEmail, setTeacherEmail] = useState("")
  const [teacherPhone, setTeacherPhone] = useState("")
  const [teacherGender, setTeacherGender] = useState("Female")
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
  const [sectionYearLevel, setSectionYearLevel] = useState("Nursery")
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
    setEditingTeacherId(null)
    setTeacherName("")
    setTeacherEmail("")
    setTeacherPhone("")
    setTeacherGender("Female")
    setTeacherPassword("")
    setTeacherConfirmPassword("")
  }

  const handleEditTeacherClick = (teacher: any) => {
    setEditingTeacherId(teacher.id)
    setTeacherName(teacher.name || "")
    setTeacherEmail(teacher.email || "")
    setTeacherPhone(teacher.phone || "")
    setTeacherGender(teacher.gender || "Female")
    setTeacherPassword("")
    setTeacherConfirmPassword("")
    setIsTeacherModalOpen(true)
  }

  const handleCloseSectionModal = () => {
    setIsSectionModalOpen(false)
    setEditingSectionId(null)
    setSectionYearLevel("Nursery")
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
    let yl = sec.year_level
    if (yl === "K-1" || yl === "K1") yl = "Kindergarten 1"
    if (yl === "K-2" || yl === "K2") yl = "Kindergarten 2"
    setSectionYearLevel(yl || "Nursery")
    setSectionName(sec.section_name)
    setSectionTeacherId(sec.teacher_id || "")
    setIsSectionModalOpen(true)
  }

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return
    const { id } = sectionToDelete
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
    } finally {
      setSectionToDelete(null)
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
    if (!teacherName.trim() || !teacherEmail.trim() || !teacherPhone.trim() || !teacherGender || !teacherPassword.trim()) {
      toast.add({
        title: "Validation Error",
        description: "Please fill out all required fields, including cellphone number and gender.",
        type: "error",
      })
      return
    }

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
        phone: teacherPhone,
        gender: teacherGender,
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

  const handleConfirmDeleteTeacher = async () => {
    if (!teacherToDelete) return
    const { id } = teacherToDelete
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
    } finally {
      setTeacherToDelete(null)
    }
  }

  const handleOpenViewGuardian = (guardian: Guardian, student: Student) => {
    setViewingGuardianData({ guardian, student })
    setIsViewGuardianModalOpen(true)
  }

  const handleCloseViewGuardian = () => {
    setIsViewGuardianModalOpen(false)
    setViewingGuardianData(null)
  }

  const handleOpenEditGuardian = (guardian: Guardian, studentId: string | number) => {
    if (!guardian.id) return
    setEditingGuardianStudentId(studentId)
    setEditingGuardianId(guardian.id)
    setEditGuardianName(guardian.name)
    setEditGuardianRelation(guardian.relation || "Mother")
    setEditGuardianPhone(guardian.phone || "")
    setEditGuardianEmail(guardian.email || "")
    setEditGuardianPassword("")
    setEditGuardianConfirmPassword("")
    setIsEditGuardianModalOpen(true)
  }

  const handleCloseEditGuardian = () => {
    setIsEditGuardianModalOpen(false)
    setEditingGuardianStudentId(null)
    setEditingGuardianId(null)
    setEditGuardianName("")
    setEditGuardianRelation("Mother")
    setEditGuardianPhone("")
    setEditGuardianEmail("")
    setEditGuardianPassword("")
    setEditGuardianConfirmPassword("")
  }

  const handleSaveEditGuardian = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGuardianStudentId || !editingGuardianId || !editGuardianName.trim() || !editGuardianEmail.trim() || !editGuardianPhone.trim()) {
      toast.add({
        title: "Validation Error",
        description: "Please fill in all required guardian fields (Name, Phone & Email).",
        type: "error",
      })
      return
    }

    if (editGuardianPassword && editGuardianPassword !== editGuardianConfirmPassword) {
      toast.add({
        title: "Validation Failed",
        description: "Passwords do not match.",
        type: "error",
      })
      return
    }

    const payload: any = {
      name: editGuardianName,
      relation: editGuardianRelation,
      phone: editGuardianPhone,
      email: editGuardianEmail,
    }

    if (editGuardianPassword) {
      payload.password = editGuardianPassword
    }

    try {
      const updatedGuardian = await ApiHandler.put<Guardian>(
        `/students/${editingGuardianStudentId}/guardians/${editingGuardianId}`,
        payload
      )

      setStudents(
        students.map((student) => {
          if (student.id === editingGuardianStudentId) {
            return {
              ...student,
              guardians: student.guardians.map((g) => (g.id === editingGuardianId ? updatedGuardian : g)),
            }
          }
          return student
        })
      )

      if (viewingPupil && viewingPupil.id === editingGuardianStudentId) {
        setViewingPupil({
          ...viewingPupil,
          guardians: viewingPupil.guardians.map((g) => (g.id === editingGuardianId ? updatedGuardian : g)),
        })
      }

      if (viewingGuardianData && viewingGuardianData.guardian.id === editingGuardianId) {
        setViewingGuardianData({
          ...viewingGuardianData,
          guardian: updatedGuardian,
        })
      }

      toast.add({
        title: "Guardian Updated",
        description: `${editGuardianName}'s information updated successfully.`,
        type: "success",
      })

      handleCloseEditGuardian()
    } catch (err: any) {
      toast.add({
        title: "Error Updating Guardian",
        description: err.message || "Failed to update guardian.",
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
    setIsInlineAddGuardianOpen(false)
    setGuardianName("")
    setGuardianRelation("Mother")
    setGuardianPhone("")
    setGuardianEmail("")
    setGuardianPassword("")
    setGuardianConfirmPassword("")
  }

  const handleEditStudentClick = (student: Student, targetGuardianId?: string | number) => {
    setEditingStudentId(student.id)
    setSelectedStudentId(student.id)
    setStudentName(student.name)
    setStudentRfid(student.rfid)
    setStudentSectionId(student.section_id || "")
    setIsInlineAddGuardianOpen(false)

    if (targetGuardianId) {
      const targetG = student.guardians.find(g => g.id === targetGuardianId)
      if (targetG) {
        handleOpenEditGuardian(targetG, student.id)
      } else {
        setIsStudentModalOpen(true)
      }
    } else {
      setIsStudentModalOpen(true)
    }
  }

  const handleAddGuardianFromEditModal = async () => {
    if (!editingStudentId || !guardianName.trim() || !guardianEmail.trim() || !guardianPassword.trim()) {
      toast.add({
        title: "Validation Error",
        description: "Please fill in all required guardian fields.",
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
      const response = await ApiHandler.post<Guardian>(`/students/${editingStudentId}/guardians`, {
        name: guardianName,
        relation: guardianRelation,
        phone: guardianPhone,
        email: guardianEmail,
        password: guardianPassword,
      })

      setStudents(
        students.map((student) => {
          if (student.id === editingStudentId) {
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

      // Reset guardian form
      setGuardianName("")
      setGuardianRelation("Mother")
      setGuardianPhone("")
      setGuardianEmail("")
      setGuardianPassword("")
      setGuardianConfirmPassword("")
      setIsInlineAddGuardianOpen(false)
    } catch (err: any) {
      toast.add({
        title: "Error Adding Guardian",
        description: err.message || "Failed to add guardian.",
        type: "error",
      })
    }
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

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return
    const { id } = studentToDelete
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
    } finally {
      setStudentToDelete(null)
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
    } finally {
      setGuardianToDelete(null)
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

      {/* Header Panel with Full-Width Title and Top Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between w-full">
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary whitespace-nowrap">
              {activeTab === "students"
                ? "Guardian Registration"
                : activeTab === "teachers"
                  ? "Teacher Account Registration"
                  : "Year Level & Section Registration"
              }
            </h1>
          </div>
        </div>

        {/* Top Search Input Bar for Guardians Tab */}
        {activeTab === "students" && (
          <div className="relative flex-1 max-w-xl w-full">
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
        )}

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
              setSectionYearLevel("Nursery")
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
                      <th className="px-4 py-3.5 font-bold bg-inherit">Pupil</th>
                      <th className="px-4 py-3.5 font-bold bg-inherit">Class & Section</th>
                      <th className="px-4 py-3.5 font-bold bg-inherit">RFID Tag</th>
                      <th className="px-4 py-3.5 font-bold bg-inherit">Authorized Guardians</th>
                      <th className="px-4 py-3.5 font-bold text-center bg-inherit">Status</th>
                      <th className="px-4 py-3.5 font-bold text-center bg-inherit">Actions</th>
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
                            {/* 1. Pupil Column */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs shrink-0">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-primary text-xs">{student.name}</div>
                                  <div className="text-[10px] text-muted-foreground font-semibold">ID: S{String(student.id).padStart(3, "0")}</div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Class & Section Column */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
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

                            {/* 3. RFID Tag Column */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-tertiary px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground select-none">
                                <CreditCard className="h-3 w-3" />
                                <span>{student.rfid}</span>
                              </div>
                            </td>

                            {/* 4. Authorized Guardians Column */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {hasGuardians ? (
                                  student.guardians.length === 1 ? (
                                    /* Single Guardian: Show Name Only + Edit & Remove Buttons */
                                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white dark:bg-card px-3 py-1 shadow-xs">
                                      <span className="text-xs font-bold text-neutral">
                                        {student.guardians[0].name}
                                      </span>
                                      {student.guardians[0].id && (
                                        <div className="flex items-center gap-0.5">
                                          <button
                                            onClick={() => handleOpenViewGuardian(student.guardians[0], student)}
                                            className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-colors border-none bg-transparent cursor-pointer"
                                            title="View Information"
                                          >
                                            <Eye className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => handleOpenEditGuardian(student.guardians[0], student.id)}
                                            className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-colors border-none bg-transparent cursor-pointer"
                                            title="Edit Guardian Information"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => promptDeleteGuardian(student.id, student.guardians[0].id!, student.guardians[0].name)}
                                            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground transition-colors border-none bg-transparent cursor-pointer"
                                            title="Remove Guardian"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    /* Multiple Guardians: Dropdown */
                                    <div className="relative">
                                      <button
                                        onClick={() =>
                                          setOpenGuardianDropdownId(
                                            openGuardianDropdownId === student.id ? null : student.id
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-white dark:bg-card px-3 py-1 text-xs font-bold text-neutral shadow-xs hover:border-primary/40 transition-all cursor-pointer"
                                      >
                                        <span>{student.guardians[0].name}</span>
                                        <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                                          +{student.guardians.length - 1} more
                                        </span>
                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>

                                      {/* Dropdown Menu Popup */}
                                      {openGuardianDropdownId === student.id && (
                                        <div className="absolute left-0 top-full mt-1.5 z-40 w-64 rounded-2xl border border-border bg-white dark:bg-card p-2 shadow-xl animate-in fade-in duration-150">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 border-b border-border/60 mb-1">
                                            Authorized Guardians ({student.guardians.length})
                                          </div>
                                          <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {student.guardians.map((g, gIdx) => (
                                              <div
                                                key={gIdx}
                                                className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-tertiary/40 transition-colors"
                                              >
                                                <div className="flex flex-col overflow-hidden">
                                                  <span className="text-xs font-bold text-neutral truncate">
                                                    {g.name}
                                                  </span>
                                                  <span className="text-[10px] text-muted-foreground">
                                                    {g.relation} • {g.phone}
                                                  </span>
                                                </div>
                                                {g.id && (
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                      onClick={() => {
                                                        setOpenGuardianDropdownId(null)
                                                        handleOpenViewGuardian(g, student)
                                                      }}
                                                      className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-colors border-none bg-transparent cursor-pointer"
                                                      title="View Information"
                                                    >
                                                      <Eye className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setOpenGuardianDropdownId(null)
                                                        handleOpenEditGuardian(g, student.id)
                                                      }}
                                                      className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-colors border-none bg-transparent cursor-pointer"
                                                      title="Edit Guardian Information"
                                                    >
                                                      <Pencil className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setOpenGuardianDropdownId(null)
                                                        promptDeleteGuardian(student.id, g.id!, g.name)
                                                      }}
                                                      className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground transition-colors border-none bg-transparent cursor-pointer"
                                                      title="Remove Guardian"
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    No guardian linked
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 5. Status Column (Beside Actions) */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-center">
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

                            {/* 6. Actions Column */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenViewPupil(student)}
                                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer hover:bg-tertiary rounded-lg border-none bg-transparent"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4 text-primary" />
                                </button>
                                <button
                                  onClick={() => handleEditStudentClick(student)}
                                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer hover:bg-tertiary rounded-lg border-none bg-transparent"
                                  title="Edit Student & Guardians"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => promptDeleteStudent(student.id, student.name)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer hover:bg-destructive/10 rounded-lg border-none bg-transparent"
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
                          className={`h-8 min-w-[32px] px-2 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${isActive
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
                <div className="space-y-4 animate-fade-in">
                  {teachers
                    .filter(
                      (teacher) =>
                        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (teacher.phone && teacher.phone.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((teacher, index) => {
                      const initials = teacher.name
                        ? teacher.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .substring(0, 2)
                        : "T"

                      // Fetch section data linked to this teacher
                      const teacherSections = teacher.sections && teacher.sections.length > 0
                        ? teacher.sections
                        : sections.filter((s) => s.teacher_id && String(s.teacher_id) === String(teacher.id))

                      // Section Display Text
                      const sectionDisplay =
                        teacherSections.length > 0
                          ? teacherSections.map((s: any) => `${s.year_level} ${s.section_name}`).join(" & ")
                          : "Unassigned"

                      // Room Display Text
                      const roomDisplay =
                        teacherSections.length > 0
                          ? teacherSections.map((s: any, idx: number) => s.room_number || `Rm ${idx + 1}`).join(", ")
                          : "N/A"

                      // Total Pupils count
                      let totalPupils = 0
                      if (teacher.sections && teacher.sections.length > 0) {
                        totalPupils = teacher.sections.reduce((acc: number, sec: any) => acc + (sec.students ? sec.students.length : 0), 0)
                      }
                      if (totalPupils === 0) {
                        const teacherSecIds = new Set(teacherSections.map((s: any) => String(s.id)))
                        totalPupils = students.filter((st) => st.section_id && teacherSecIds.has(String(st.section_id))).length
                      }

                      // Color variant accents for avatar / card border
                      const colorStyles = [
                        { avatarBg: "bg-blue-600 text-white", borderAccent: "border-l-blue-600", textAccent: "text-blue-900 dark:text-blue-300" },
                        { avatarBg: "bg-emerald-600 text-white", borderAccent: "border-l-emerald-600", textAccent: "text-emerald-900 dark:text-emerald-300" },
                        { avatarBg: "bg-purple-600 text-white", borderAccent: "border-l-purple-600", textAccent: "text-purple-900 dark:text-purple-300" },
                        { avatarBg: "bg-indigo-600 text-white", borderAccent: "border-l-indigo-600", textAccent: "text-indigo-900 dark:text-indigo-300" },
                      ]
                      const style = colorStyles[index % colorStyles.length]

                      return (
                        <div
                          key={teacher.id}
                          className={`rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md border-l-4 ${style.borderAccent}`}
                        >
                          {/* Left: Avatar Circle & Contact Info (No Class Teacher or Gender text) */}
                          <div className="flex items-center gap-4 min-w-[280px]">
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-full ${style.avatarBg} font-bold text-base shrink-0 select-none shadow-sm`}
                            >
                              {initials}
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-base font-bold text-primary dark:text-foreground leading-snug">
                                {teacher.name}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                <span>{teacher.phone || "No phone provided"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                <span className="truncate max-w-[220px]">{teacher.email}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Inner Shaded Row Container (Year Level / Section, Room, Total Pupils) */}
                          <div className="flex-1 rounded-2xl bg-tertiary/40 border border-border/60 p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                            {/* Year Level / Section */}
                            <div className="flex items-center gap-3 pr-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <GraduationCap className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  Year Level / Section
                                </div>
                                <div className={`text-xs sm:text-sm font-extrabold ${style.textAccent} leading-snug`}>
                                  {sectionDisplay}
                                </div>
                              </div>
                            </div>

                            {/* Room */}
                            <div className="flex items-center gap-3 sm:border-l sm:border-border/60 sm:pl-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <DoorClosed className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  Room
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-neutral dark:text-foreground">
                                  {roomDisplay}
                                </div>
                              </div>
                            </div>

                            {/* Total of Pupils */}
                            <div className="flex items-center gap-3 sm:border-l sm:border-border/60 sm:pl-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <Users className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  Total of Pupils
                                </div>
                                <div className={`text-base sm:text-lg font-black ${style.textAccent}`}>
                                  {totalPupils}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: Edit & Delete */}
                          <div className="flex items-center gap-1 justify-end shrink-0">
                            <button
                              onClick={() => handleEditTeacherClick(teacher)}
                              className="p-2.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer hover:bg-tertiary rounded-xl border-none bg-transparent"
                              title="Edit Teacher Profile"
                            >
                              <Pencil className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => promptDeleteTeacher(teacher.id, teacher.name)}
                              className="p-2.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer hover:bg-destructive/10 rounded-xl border-none bg-transparent"
                              title="Remove Teacher Account"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
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
                  {[...sections]
                    .filter((sec) =>
                      sec.year_level.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      sec.section_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (sec.teacher && sec.teacher.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .sort((a, b) => {
                      const getPriority = (yl: string) => {
                        const y = (yl || "").toLowerCase()
                        if (y.includes("nursery")) return 1
                        if (y.includes("k-1") || y.includes("kindergarten 1") || y.includes("kinder 1") || y === "k1") return 2
                        if (y.includes("k-2") || y.includes("kindergarten 2") || y.includes("kinder 2") || y === "k2") return 3
                        if (y.includes("grade 1") || y === "g1") return 4
                        if (y.includes("grade 2") || y === "g2") return 5
                        return 10
                      }
                      const pA = getPriority(a.year_level)
                      const pB = getPriority(b.year_level)
                      if (pA !== pB) return pA - pB
                      return a.section_name.localeCompare(b.section_name)
                    })
                    .map((sec) => {
                      const getMeta = (yl: string) => {
                        const y = (yl || "").toLowerCase()
                        if (y.includes("nursery")) {
                          return { code: "N", title: "Nursery", bg: "bg-blue-700 text-white" }
                        } else if (y.includes("k-1") || y.includes("kindergarten 1") || y.includes("kinder 1") || y === "k1") {
                          return { code: "K1", title: "Kindergarten 1", bg: "bg-blue-600 text-white" }
                        } else if (y.includes("k-2") || y.includes("kindergarten 2") || y.includes("kinder 2") || y === "k2") {
                          return { code: "K2", title: "Kindergarten 2", bg: "bg-emerald-600 text-white" }
                        } else if (y.includes("grade 1") || y === "g1") {
                          return { code: "G1", title: "Grade 1", bg: "bg-purple-600 text-white" }
                        } else if (y.includes("grade 2") || y === "g2") {
                          return { code: "G2", title: "Grade 2", bg: "bg-indigo-600 text-white" }
                        }
                        return { code: yl ? yl.substring(0, 2).toUpperCase() : "SEC", title: yl || "Section", bg: "bg-primary text-white" }
                      }

                      const meta = getMeta(sec.year_level)

                      return (
                        <div
                          key={sec.id}
                          className="rounded-3xl border border-border bg-card shadow-sm p-5 space-y-4 transition-all hover:shadow-md hover:border-border/80 text-neutral flex flex-col justify-between"
                        >
                          {/* Card Header: Circle Badge + Year Level Title + Actions */}
                          <div className="flex items-center justify-between border-b border-border/50 pb-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-full ${meta.bg} font-black text-base shrink-0 select-none shadow-sm`}
                              >
                                {meta.code}
                              </div>
                              <h3 className="text-base font-extrabold text-primary dark:text-foreground">
                                {meta.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditSectionClick(sec)}
                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer hover:bg-tertiary rounded-lg border-none bg-transparent"
                                title="Edit Section"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => promptDeleteSection(sec.id, `${sec.year_level} - ${sec.section_name}`)}
                                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer hover:bg-destructive/10 rounded-lg border-none bg-transparent"
                                title="Remove Section"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Shaded Content Box: Section at top, Teacher at bottom */}
                          <div className="rounded-2xl bg-tertiary/40 border border-border/60 p-4 space-y-3.5">
                            {/* Top: Section */}
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <Users className="h-4.5 w-4.5" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  Section
                                </div>
                                <div className="text-xs sm:text-sm font-extrabold text-neutral dark:text-foreground">
                                  {sec.section_name}
                                </div>
                              </div>
                            </div>

                            {/* Bottom: Teacher */}
                            <div className="flex items-center gap-3 border-t border-border/40 pt-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                <User className="h-4.5 w-4.5" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  Teacher
                                </div>
                                <div className="text-xs sm:text-sm font-extrabold text-primary dark:text-foreground">
                                  {sec.teacher ? sec.teacher.name : "Unassigned"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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

      {/* MODAL: ADD / EDIT STUDENT */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">
                {editingStudentId ? "Edit Pupil Details & Guardians" : "Register New Pupils"}
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
                <label className="text-xs font-bold text-neutral/80">Pupils Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Emma Johnson"
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Class Section</label>
                <select
                  value={studentSectionId}
                  onChange={(e) => setStudentSectionId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all cursor-pointer"
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
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              {/* Show Linked Guardians & Add Guardian Section if editing */}
              {editingStudentId && (() => {
                const currentStudent = students.find(s => s.id === editingStudentId)
                const guardians = currentStudent?.guardians || []

                return (
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                        Authorized Guardians ({guardians.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsInlineAddGuardianOpen(!isInlineAddGuardianOpen)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{isInlineAddGuardianOpen ? "Close Add Form" : "Add Guardian"}</span>
                      </button>
                    </div>

                    {/* List of current guardians */}
                    {guardians.length > 0 ? (
                      <div className="space-y-2">
                        {guardians.map((g, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-tertiary/20"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-neutral">{g.name}</span>
                                <span className="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 text-[9px] font-bold border border-emerald-100 uppercase select-none">
                                  {g.relation}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-semibold">
                                Phone: {g.phone} {g.email ? `• Email: ${g.email}` : ""}
                              </div>
                            </div>
                            {g.id && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenViewGuardian(g, currentStudent!)}
                                  className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg border-none bg-transparent cursor-pointer"
                                  title="View Information"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditGuardian(g, editingStudentId!)}
                                  className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg border-none bg-transparent cursor-pointer"
                                  title="Edit Guardian Information"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => promptDeleteGuardian(editingStudentId!, g.id!, g.name)}
                                  className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg border-none bg-transparent cursor-pointer"
                                  title="Remove Guardian"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground font-semibold">
                        No authorized guardians linked to this pupil yet.
                      </div>
                    )}

                    {/* Inline Form to Add Guardian */}
                    {isInlineAddGuardianOpen && (
                      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-200 mt-2">
                        <h4 className="text-xs font-bold text-primary">New Authorized Guardian Details</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral">Full Name</label>
                            <input
                              type="text"
                              value={guardianName}
                              onChange={(e) => setGuardianName(e.target.value)}
                              placeholder="e.g. Maria Reyes"
                              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral">Relationship</label>
                            <select
                              value={guardianRelation}
                              onChange={(e) => setGuardianRelation(e.target.value)}
                              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-primary cursor-pointer"
                            >
                              <option value="Mother">Mother</option>
                              <option value="Father">Father</option>
                              <option value="Grandparent">Grandparent</option>
                              <option value="Aunt/Uncle">Aunt/Uncle</option>
                              <option value="Authorized Representative">Authorized Representative</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral">Phone Number</label>
                            <input
                              type="text"
                              value={guardianPhone}
                              onChange={(e) => setGuardianPhone(e.target.value)}
                              placeholder="e.g. 0917 123 4567"
                              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral">Email Address</label>
                            <input
                              type="email"
                              value={guardianEmail}
                              onChange={(e) => setGuardianEmail(e.target.value)}
                              placeholder="e.g. maria@fcu.edu"
                              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral">Password</label>
                            <input
                              type="password"
                              value={guardianPassword}
                              onChange={(e) => setGuardianPassword(e.target.value)}
                              placeholder="Set login password"
                              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral">Confirm Password</label>
                            <input
                              type="password"
                              value={guardianConfirmPassword}
                              onChange={(e) => setGuardianConfirmPassword(e.target.value)}
                              placeholder="Confirm login password"
                              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={handleAddGuardianFromEditModal}
                            className="px-4 py-2 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                          >
                            Save Guardian
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseStudentModal}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                >
                  {editingStudentId ? "Save Pupil Details" : "Save Student"}
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
                      <div className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength(guardianPassword).score >= 1
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral/80">Gender</label>
                  <select
                    value={teacherGender}
                    onChange={(e) => setTeacherGender(e.target.value)}
                    className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all cursor-pointer font-sans"
                    required
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral/80">Cellphone Number</label>
                  <input
                    type="text"
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    placeholder="e.g. 0917 123 4567"
                    className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                    required
                  />
                </div>
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
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 1 ? (strength.score === 1 ? 'bg-red-500 w-1/3' : strength.score === 2 ? 'bg-amber-500 w-2/3' : 'bg-emerald-500 w-full') : 'w-0'
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
                  <option value="Nursery">Nursery</option>
                  <option value="Kindergarten 1">Kindergarten 1</option>
                  <option value="Kindergarten 2">Kindergarten 2</option>
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

      {/* MODAL: VIEW PUPIL INFORMATION DETAILS (Matches Reference Image) */}
      {isViewPupilModalOpen && viewingPupil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <h2 className="text-base font-bold text-primary">Pupil Information Details</h2>
              <button
                onClick={handleCloseViewPupil}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-5 mt-4 font-sans text-xs">

              {/* Pupil Details Card */}
              <div className="flex items-center gap-4 p-4 border border-border/80 rounded-2xl bg-tertiary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0 select-none font-bold text-base">
                  {viewingPupil.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary leading-snug">{viewingPupil.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-muted-foreground font-semibold text-xs">
                    <span>ID: S{String(viewingPupil.id).padStart(3, "0")}</span>
                    <span>•</span>
                    <span>Grade: {viewingPupil.section?.year_level || viewingPupil.grade.replace("Grade: ", "") || "K-1"}</span>
                  </div>
                </div>
              </div>

              {/* Class & Class Teacher Details */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  CLASS & CLASS TEACHER DETAILS
                </h4>
                <div className="rounded-2xl border border-border/80 p-4 bg-white dark:bg-card space-y-3">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2.5">
                    <span className="text-muted-foreground font-semibold">Assigned Section:</span>
                    <span className="font-bold text-neutral">
                      {viewingPupil.section
                        ? `${viewingPupil.section.year_level} - ${viewingPupil.section.section_name}`
                        : viewingPupil.grade.replace("Grade: ", "") || "Unassigned"}
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

              {/* RFID Tracking Code */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  RFID TRACKING CODE
                </h4>
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 p-3.5 bg-white dark:bg-card font-mono font-bold text-neutral text-xs">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{viewingPupil.rfid}</span>
                </div>
              </div>

              {/* Authorized Guardians */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  AUTHORIZED GUARDIANS ({viewingPupil.guardians.length})
                </h4>
                {viewingPupil.guardians.length === 0 ? (
                  <div className="p-4 border border-dashed border-border rounded-2xl text-center text-muted-foreground font-semibold">
                    No authorized guardians associated with this pupil.
                  </div>
                ) : (
                  <div className="max-h-[175px] overflow-y-auto scrollbar-thin space-y-2.5 pr-1">
                    {viewingPupil.guardians.map((g, idx) => (
                      <div key={idx} className="rounded-2xl border border-border/80 p-3.5 bg-white dark:bg-card space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-neutral text-sm">{g.name}</span>
                          <span className="rounded-full bg-emerald-50 text-emerald-600 px-2.5 py-0.5 text-[9px] font-bold border border-emerald-100 uppercase select-none tracking-wider">
                            {g.relation}
                          </span>
                        </div>
                        <div className="text-muted-foreground font-semibold text-[11px]">
                          Phone: {g.phone}
                        </div>
                        {g.email && (
                          <div className="text-muted-foreground font-semibold text-[11px] truncate">
                            Email: {g.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-3 border-t border-border/60">
                <button
                  onClick={handleCloseViewPupil}
                  className="px-6 py-2.5 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                >
                  Close Detail
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW AUTHORIZED GUARDIAN DETAILS */}
      {isViewGuardianModalOpen && viewingGuardianData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <h2 className="text-base font-bold text-primary">Authorized Guardian Details</h2>
              <button
                onClick={handleCloseViewGuardian}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-5 mt-4 font-sans text-xs">

              {/* Guardian Card */}
              <div className="flex items-center gap-4 p-4 border border-border/80 rounded-2xl bg-tertiary/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shrink-0 select-none font-bold text-base">
                  {viewingGuardianData.guardian.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary leading-snug">{viewingGuardianData.guardian.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-muted-foreground font-semibold text-xs">
                    <span className="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 text-[10px] font-bold border border-emerald-100 uppercase select-none">
                      {viewingGuardianData.guardian.relation || "Guardian"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guardian Contact Information */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  GUARDIAN CONTACT DETAILS
                </h4>
                <div className="rounded-2xl border border-border/80 p-4 bg-white dark:bg-card space-y-3">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2.5">
                    <span className="text-muted-foreground font-semibold">Phone Number:</span>
                    <span className="font-bold text-neutral">{viewingGuardianData.guardian.phone || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Email Address:</span>
                    <span className="font-bold text-neutral">{viewingGuardianData.guardian.email || "Not provided"}</span>
                  </div>
                </div>
              </div>

              {/* Linked Pupil Information */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  LINKED PUPIL / STUDENT
                </h4>
                <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3.5 bg-white dark:bg-card text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {viewingGuardianData.student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-primary">{viewingGuardianData.student.name}</div>
                      <div className="text-[10px] text-muted-foreground">ID: S{String(viewingGuardianData.student.id).padStart(3, "0")}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold border border-primary/20">
                    RFID: {viewingGuardianData.student.rfid}
                  </span>
                </div>
              </div>

              {/* Pickup Status */}
              <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3 text-xs">
                <UserCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">Verified Pickup Authorization</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">Authorized to scan RFID QR for student check-out.</div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    const { guardian, student } = viewingGuardianData
                    handleCloseViewGuardian()
                    handleOpenEditGuardian(guardian, student.id)
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-primary text-xs font-bold text-primary hover:bg-primary/10 transition-all cursor-pointer bg-transparent flex items-center justify-center gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Guardian Info</span>
                </button>
                <button
                  onClick={handleCloseViewGuardian}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT AUTHORIZED GUARDIAN ONLY */}
      {isEditGuardianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div>
                <h2 className="text-base font-bold text-primary">Edit Authorized Guardian</h2>
                <p className="text-[11px] text-muted-foreground font-semibold">Update contact details and credentials for {editGuardianName}</p>
              </div>
              <button
                onClick={handleCloseEditGuardian}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGuardian} className="space-y-4 mt-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Full Name</label>
                <input
                  type="text"
                  value={editGuardianName}
                  onChange={(e) => setEditGuardianName(e.target.value)}
                  placeholder="e.g. Maria Reyes"
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Relationship</label>
                <select
                  value={editGuardianRelation}
                  onChange={(e) => setEditGuardianRelation(e.target.value)}
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Aunt/Uncle">Aunt/Uncle</option>
                  <option value="Authorized Representative">Authorized Representative</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Phone Number</label>
                <input
                  type="text"
                  value={editGuardianPhone}
                  onChange={(e) => setEditGuardianPhone(e.target.value)}
                  placeholder="e.g. 0917 123 4567"
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Email Address</label>
                <input
                  type="email"
                  value={editGuardianEmail}
                  onChange={(e) => setEditGuardianEmail(e.target.value)}
                  placeholder="e.g. maria@fcu.edu"
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">New Password (Optional)</label>
                <input
                  type="password"
                  value={editGuardianPassword}
                  onChange={(e) => setEditGuardianPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral/80">Confirm Password</label>
                <input
                  type="password"
                  value={editGuardianConfirmPassword}
                  onChange={(e) => setEditGuardianConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all font-sans"
                />
                {editGuardianConfirmPassword && (
                  <div className="text-[10px] font-bold pt-1">
                    {editGuardianPassword === editGuardianConfirmPassword ? (
                      <span className="text-emerald-500">✓ Passwords match</span>
                    ) : (
                      <span className="text-red-500">✗ Passwords do not match</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={handleCloseEditGuardian}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editGuardianPassword !== editGuardianConfirmPassword}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
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
              Are you sure you want to permanently delete authorized guardian <strong className="text-neutral font-bold">{guardianToDelete.guardianName}</strong>? They will no longer be authorized for pickup verification.
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

      {/* MODAL: CONFIRM STUDENT / PUPIL DELETION */}
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

      {/* MODAL: CONFIRM TEACHER DELETION */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Remove Teacher Account?</h3>
                <p className="text-xs text-muted-foreground">This action requires confirmation</p>
              </div>
            </div>

            <p className="text-xs text-neutral/80 font-medium leading-relaxed">
              Are you sure you want to permanently delete teacher account <strong className="text-neutral font-bold">{teacherToDelete.name}</strong>? Their section assignments will be unassigned.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setTeacherToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-tertiary transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteTeacher}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM SECTION DELETION */}
      {sectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-card p-6 shadow-2xl border border-border animate-in scale-in duration-200 text-neutral space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Remove Section?</h3>
                <p className="text-xs text-muted-foreground">This action requires confirmation</p>
              </div>
            </div>

            <p className="text-xs text-neutral/80 font-medium leading-relaxed">
              Are you sure you want to permanently delete section <strong className="text-neutral font-bold">{sectionToDelete.name}</strong>? Associated students will be marked as unassigned.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSectionToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-tertiary transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteSection}
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

export default Registration