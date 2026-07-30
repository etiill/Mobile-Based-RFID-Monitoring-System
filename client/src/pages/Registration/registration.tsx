import { useState, useEffect } from "react"
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
  Search
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
}

export function Registration() {
  // Students List State
  const [students, setStudents] = useState<Student[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)
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
    fetchStudents()
  }, [])

  // Search State
  const [searchQuery, setSearchQuery] = useState("")

  // Filter and sort students dynamically based on search query (alphabetically by name)
  const filteredStudents = students
    .filter((student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.grade.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Modal State Variables
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null)
  const [editingStudentId, setEditingStudentId] = useState<string | number | null>(null)

  // Tab State
  const [activeTab, setActiveTab] = useState<"students" | "teachers">("students")

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
  const [studentGrade, setStudentGrade] = useState("K-1")
  const [studentRfid, setStudentRfid] = useState("")

  // Guardian Form State
  const [guardianName, setGuardianName] = useState("")
  const [guardianRelation, setGuardianRelation] = useState("Mother")
  const [guardianPhone, setGuardianPhone] = useState("")
  const [guardianEmail, setGuardianEmail] = useState("")
  const [guardianPassword, setGuardianPassword] = useState("")
  const [guardianConfirmPassword, setGuardianConfirmPassword] = useState("")

  // Actions
  useEffect(() => {
    if (activeTab === "teachers") {
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

  const handleCloseTeacherModal = () => {
    setIsTeacherModalOpen(false)
    setTeacherName("")
    setTeacherEmail("")
    setTeacherPassword("")
    setTeacherConfirmPassword("")
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
    setStudentGrade("K-1")
    setStudentRfid("")
  }

  const handleEditStudentClick = (student: Student) => {
    setEditingStudentId(student.id)
    setStudentName(student.name)
    // Strip "Grade: " prefix if present to match dropdown options
    const cleanGrade = student.grade.startsWith("Grade: ") 
      ? student.grade.replace("Grade: ", "") 
      : student.grade
    setStudentGrade(cleanGrade)
    // Strip "RFID-" prefix if present to match standard input format
    const cleanRfid = student.rfid.startsWith("RFID-") 
      ? student.rfid.replace("RFID-", "") 
      : student.rfid
    setStudentRfid(cleanRfid)
    setIsStudentModalOpen(true)
  }

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentName.trim() || !studentRfid.trim()) return

    const formattedRfid = studentRfid.startsWith("RFID-") ? studentRfid : `RFID-${studentRfid}`
    const formattedGrade = `Grade: ${studentGrade}`

    if (editingStudentId) {
      try {
        const response = await ApiHandler.put<Student>(`/students/${editingStudentId}`, {
          name: studentName,
          grade: formattedGrade,
          rfid: formattedRfid,
        })

        setStudents(
          students.map((student) => (student.id === editingStudentId ? { ...student, ...response } : student))
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
        const response = await ApiHandler.post<Student>("/students", {
          name: studentName,
          grade: formattedGrade,
          rfid: formattedRfid,
        })

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
              {activeTab === "students" ? "Student & Guardian Registration" : "Teacher Account Registration"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {activeTab === "students" 
                ? "Step 2: Register students and authorized guardians to ensure secure entry and exit protocols."
                : "Manage and register teacher accounts to access the daily attendance workspaces."
              }
            </p>
          </div>
        </div>
        
        {/* Dynamic CTA */}
        {activeTab === "students" ? (
          <button
            onClick={() => {
              setEditingStudentId(null)
              setStudentName("")
              setStudentGrade("K-1")
              setStudentRfid("")
              setIsStudentModalOpen(true)
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-xs font-bold text-neutral shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border-none shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        ) : (
          <button
            onClick={() => setIsTeacherModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-xs font-bold text-neutral shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border-none shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Teacher</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-6 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "students"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-neutral"
          }`}
        >
          Students & Guardians
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`px-6 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "teachers"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-neutral"
          }`}
        >
          Class Teachers
        </button>
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

          {/* Main List of Student Cards */}
          {isLoadingStudents ? (
            <div className="min-h-[350px] flex items-center justify-center bg-card border border-border rounded-2xl p-8">
              <LoadingScreen fullScreen={false} />
            </div>
          ) : (
            <div className="space-y-6">
              {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-2xl bg-card text-center space-y-3">
                <Search className="h-10 w-10 text-muted-foreground opacity-40 animate-pulse" />
                <h3 className="text-sm font-bold text-primary">No search results</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  We couldn't find any students matching "{searchQuery}". Try searching for another name, grade, or RFID code.
                </p>
              </div>
            ) : (
              filteredStudents.map((student) => (
              <div key={student.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                
                {/* Student Info Bar */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
                      <span className="text-base font-bold select-none">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-primary">{student.name}</h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">{student.grade}</p>
                    </div>
                  </div>

                  {/* Tag & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 rounded-full border border-border bg-tertiary px-3.5 py-1 text-[11px] font-bold text-muted-foreground select-none">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>{student.rfid}</span>
                    </div>
                    <button
                      onClick={() => handleEditStudentClick(student)}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer hover:bg-tertiary rounded-lg border-none bg-transparent"
                      title="Edit Student"
                    >
                      <Pencil className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer hover:bg-destructive/10 rounded-lg border-none bg-transparent"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Guardians Drawer */}
                <div className="bg-[#FAFBFD] dark:bg-neutral/5 p-5">
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    Authorized Guardians
                  </span>
                  
                  <div className="grid gap-4 mt-3 sm:grid-cols-2 md:grid-cols-3">
                    {student.guardians.map((guardian, gIdx) => (
                      <div key={gIdx} className="group relative rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-neutral">{guardian.name}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {guardian.relation} • {guardian.phone}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-600 select-none">
                            AUTHORIZED
                          </span>
                          <button 
                            onClick={() => guardian.id && handleDeleteGuardian(student.id, guardian.id)}
                            className="hidden group-hover:flex p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors border-none bg-transparent text-muted-foreground cursor-pointer"
                            title="Remove Guardian"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Guardian Trigger */}
                    <button
                      onClick={() => {
                        setSelectedStudentId(student.id)
                        setIsGuardianModalOpen(true)
                      }}
                      className="flex h-[70px] items-center justify-center gap-2.5 rounded-xl border border-dashed border-border hover:border-primary/40 bg-white/50 dark:bg-card/50 text-xs font-bold text-muted-foreground hover:text-primary transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Guardian</span>
                    </button>
                  </div>
                </div>

              </div>
                )))}
              </div>
            )}

          {/* Pagination Load Button */}
          <div className="flex justify-center pt-2">
            <button className="flex items-center gap-2 rounded-xl border border-primary px-6 py-3 text-xs font-bold text-primary bg-transparent hover:bg-primary/5 transition-all cursor-pointer">
              <ChevronDown className="h-4 w-4" />
              <span>Load More Students</span>
            </button>
          </div>
        </>
      ) : (
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
                {editingStudentId ? "Edit Student Details" : "Register New Student"}
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
                <label className="text-xs font-bold text-neutral/80">Student Name</label>
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
                <label className="text-xs font-bold text-neutral/80">Grade Level</label>
                <select
                  value={studentGrade}
                  onChange={(e) => setStudentGrade(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                >
                  <option value="K-1">K-1</option>
                  <option value="K-2">K-2</option>
                  <option value="Nursery">Nursery</option>
                  <option value="Grade 1">Grade 1</option>
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

    </div>
  )
}

export default Registration