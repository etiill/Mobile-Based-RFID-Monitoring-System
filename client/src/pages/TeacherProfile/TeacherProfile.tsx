import React, { useState } from "react"
import { Mail, Phone, MapPin, Pencil, Lock, Shield, Check, X, User, Users } from "lucide-react"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../../components/ui/toast"

export function TeacherProfile() {
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user") || "{}")
  })

  const isAdmin = user.role === "admin"

  // Profile details states (with default fallback values if empty, matching the role)
  const name = user.name || (isAdmin ? "Administrator" : "Ana Maria Reyes")
  const email = user.email || (isAdmin ? "admin@fcu.edu.ph" : "ana.reyes@fcu.edu.ph")
  const phone = user.phone || "0917 555 1234"
  const birthDate = user.birth_date || "March 15, 1992"
  const facultyClassification = user.faculty_classification || (isAdmin ? "System Administrator" : "Regular Faculty")
  const location = user.location || "Quezon City, PH"
  const title = user.title || (isAdmin ? "SYSTEM ADMINISTRATOR" : "KINDERGARTEN LEAD TEACHER")

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editName, setEditName] = useState(name)
  const [editEmail, setEditEmail] = useState(email)
  const [editPhone, setEditPhone] = useState(phone)
  const [editBirthDate, setEditBirthDate] = useState(birthDate)
  const [editFacultyClassification, setEditFacultyClassification] = useState(facultyClassification)
  const [editLocation, setEditLocation] = useState(location)
  const [editTitle, setEditTitle] = useState(title)

  // Change Password States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [assignedSections, setAssignedSections] = useState<string[]>([])

  React.useEffect(() => {
    const fetchStudentCount = async () => {
      try {
        const [studentsData, sectionsData] = await Promise.all([
          ApiHandler.get<any[]>("/students"),
          ApiHandler.get<any[]>("/sections")
        ])
        
        let count = 0
        let sectionsList: string[] = []
        if (user.role === "admin") {
          count = studentsData.length
          sectionsList = sectionsData.map((sec: any) => `${sec.year_level} - ${sec.section_name}`)
        } else {
          const teacherSections = sectionsData.filter((sec: any) => sec.teacher_id?.toString() === user.id?.toString())
          sectionsList = teacherSections.map((sec: any) => `${sec.year_level} - ${sec.section_name}`)
          const sectionIds = teacherSections.map((sec: any) => sec.id.toString())
          const assignedStudents = studentsData.filter((student: any) => {
            const sectId = student.section_id?.toString()
            if (sectId && sectionIds.includes(sectId)) return true
            if (student.section?.teacher_id?.toString() === user.id?.toString()) return true
            return false
          })
          count = assignedStudents.length
        }
        setStudentCount(count)
        setAssignedSections(sectionsList)
      } catch (err) {
        console.error("Failed to fetch assigned students count:", err)
        setStudentCount(0)
      }
    }
    
    if (user && user.id && (user.role === "teacher" || user.role === "admin")) {
      fetchStudentCount()
    }
  }, [user.id, user.role])

  const handleOpenEdit = () => {
    setEditName(name)
    setEditEmail(email)
    setEditPhone(phone)
    setEditBirthDate(birthDate)
    setEditFacultyClassification(facultyClassification)
    setEditLocation(location)
    setEditTitle(title)
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await ApiHandler.put<{ message: string; user: any }>("/user/profile", {
        name: editName,
        email: editEmail,
        phone: editPhone,
        birth_date: editBirthDate,
        faculty_classification: editFacultyClassification,
        location: editLocation,
        title: editTitle,
      })

      // Update local storage and component state
      const updatedUser = {
        ...user,
        name: response.user.name,
        email: response.user.email,
        phone: response.user.phone,
        birth_date: response.user.birth_date,
        faculty_classification: response.user.faculty_classification,
        location: response.user.location,
        title: response.user.title,
      }
      localStorage.setItem("user", JSON.stringify(updatedUser))
      setUser(updatedUser)
      setIsEditModalOpen(false)

      toast.add({
        title: "Profile Updated",
        description: "Your professional profile has been updated successfully.",
        type: "success",
      })

      // Trigger a storage event to notify Navbar and other components that user details changed
      window.dispatchEvent(new Event("storage"))
    } catch (err: any) {
      toast.add({
        title: "Update Failed",
        description: err.message || "Failed to update profile details. Please try again.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== newPasswordConfirmation) {
      toast.add({
        title: "Validation Error",
        description: "New passwords do not match.",
        type: "error",
      })
      return
    }

    setIsLoading(true)
    try {
      await ApiHandler.put("/user/password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      })

      setIsPasswordModalOpen(false)
      setCurrentPassword("")
      setNewPassword("")
      setNewPasswordConfirmation("")

      toast.add({
        title: "Password Changed",
        description: "Your account password has been changed successfully.",
        type: "success",
      })
    } catch (err: any) {
      toast.add({
        title: "Change Password Failed",
        description: err.message || "Failed to change password. Please verify your current password.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans pb-12">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary dark:text-foreground">
          {isAdmin ? "Admin Profile" : "Teacher Profile"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isAdmin 
            ? "Manage system administrator account security, credentials, and details." 
            : "Manage your professional information and account security."}
        </p>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Profile & Action Buttons) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card 1: Avatar & Personal Info Overview */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center relative overflow-hidden">
            {/* Circular Avatar Framing */}
            <div className="relative inline-block mt-4">
              <div className="w-28 h-28 rounded-full p-1 border-2 border-emerald-600 overflow-hidden flex items-center justify-center bg-muted">
                <img
                  src="/images/teacher_avatar.png"
                  alt={name}
                  onError={(e) => {
                    e.currentTarget.src = "/images/filamerp.jpg"
                  }}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              {/* Checked/Verified Badge */}
              <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-bold text-neutral leading-tight">{name}</h2>
              <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mt-1">
                {title}
              </p>
            </div>

            {/* Separator line */}
            <div className="border-t border-border/60 my-5"></div>

            {/* Quick Contact Links */}
            <div className="space-y-3.5 text-left text-xs text-neutral/80 font-medium px-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{location}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Column */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <button
              onClick={handleOpenEdit}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs border-none"
            >
              <Pencil className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full bg-transparent hover:bg-muted border border-border text-neutral font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
            >
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {/* Right Column (Personal Details Card & Data Privacy Warning) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 2: Details */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="p-2 bg-amber-50 rounded-xl">
                <User className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-base font-bold text-primary dark:text-foreground">
                {isAdmin ? "Admin Details" : "Teacher Details"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs font-sans">
              <div className="space-y-1">
                <span className="font-bold text-muted-foreground tracking-wider uppercase text-[10px]">
                  Full Legal Name
                </span>
                <p className="text-neutral font-bold text-sm mt-0.5">{name}</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-muted-foreground tracking-wider uppercase text-[10px]">
                  Birth Date
                </span>
                <p className="text-neutral font-bold text-sm mt-0.5">{birthDate}</p>
              </div>

              {!isAdmin && (
                <>
                  <div className="space-y-1">
                    <span className="font-bold text-muted-foreground tracking-wider uppercase text-[10px]">
                      Assigned Section
                    </span>
                    <p className="text-neutral font-bold text-sm mt-0.5">
                      {assignedSections.length > 0 ? assignedSections.join(", ") : "No assigned section"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-muted-foreground tracking-wider uppercase text-[10px]">
                      Assigned Students
                    </span>
                    <p className="text-neutral font-bold text-sm mt-0.5 font-sans">
                      {studentCount !== null ? `${studentCount} Pupils` : "Loading..."}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#1e40af]/10 text-[#1e40af] border border-[#1e40af]/20 select-none">
                RFID Verified
              </span>
            </div>
          </div>

          {/* Dotted Box: Data Privacy & Security */}
          <div className="border border-dashed border-border rounded-2xl p-5 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 dark:bg-card border border-blue-100 rounded-xl shrink-0 mt-0.5">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-neutral">Data Privacy & Security</h4>
                <p className="text-muted-foreground text-[11px] leading-relaxed max-w-lg">
                  Your profile is only visible to the Administration. Ensure your credentials are updated every 90 days.
                </p>
              </div>
            </div>
            <a
              href="#protocols"
              onClick={(e) => {
                e.preventDefault()
                toast.add({
                  title: "Security Protocols",
                  description: "For security, profile adjustments are audited and monitored. System protocols are up to date.",
                  type: "info",
                })
              }}
              className="text-xs font-bold text-primary hover:text-primary/80 underline whitespace-nowrap md:mr-2"
            >
              View Protocols
            </a>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary">
                {isAdmin ? "Edit Admin Profile" : "Edit Teacher Profile"}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Full Legal Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Job Title / Assignment</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. KINDERGARTEN LEAD TEACHER"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-neutral/80">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral/80">Birth Date</label>
                  <input
                    type="text"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    placeholder="March 15, 1992"
                    className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Quezon City, PH"
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none font-bold disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border animate-in scale-in duration-200 text-neutral">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <span>Change Password</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 hover:bg-tertiary rounded-lg text-muted-foreground hover:text-neutral cursor-pointer border-none bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral/80">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral/80">Confirm New Password</label>
                <input
                  type="password"
                  value={newPasswordConfirmation}
                  onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                  className="w-full rounded-lg border border-border bg-tertiary px-3.5 py-2.5 font-semibold outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border bg-transparent text-muted-foreground hover:bg-tertiary transition-all cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white shadow-sm hover:opacity-90 transition-all cursor-pointer border-none font-bold disabled:opacity-50"
                >
                  {isLoading ? "Changing..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherProfile
