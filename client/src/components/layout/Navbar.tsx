import { Link, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { LogOut, UserRound } from "lucide-react"
import { PATHS } from "../../routes/path"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../ui/toast"
import { useEffect, useState, useRef } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

export function Navbar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const name = user.name || "Administrator"
  const role = user.role || "admin"
  const teacherId = user.id



  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  const roleLabel = role === "teacher" ? "Class Teacher" : role === "guardian" ? "Parent/Guardian" : "System"

  const handleLogout = async () => {
    try {
      await ApiHandler.post("/logout")
    } catch (error) {
      console.error("Failed to invalidate token on server:", error)
    } finally {
      localStorage.removeItem("authenticated")
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      navigate(PATHS.LOGIN, { replace: true })
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Side: Brand Details */}
        <div className="flex items-center gap-3">
          <img 
            src="/images/Filamer_Logo.png" 
            alt="Filamer Logo" 
            className="h-9 w-9 object-contain select-none"
          />
          <div className="flex flex-col justify-center">
            <Link to="/" className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-primary leading-tight">
                FCU Kindergarten
              </span>
              <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                RFID Monitoring System
              </span>
            </Link>
          </div>
        </div>

        {/* Right Side: User Menu Dropdown */}
        <div className="flex items-center gap-6">


          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer outline-none hover:opacity-80 transition-opacity text-left bg-transparent border-0 p-0">
              <Avatar className="h-9 w-9 bg-accent border border-border">
                <AvatarFallback className="text-xs font-semibold text-neutral bg-accent">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col md:flex">
                <span className="text-sm font-semibold text-neutral leading-none">
                  {name}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                  {roleLabel}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mt-1">
              <DropdownMenuItem
                onClick={() => {
                  if (role === "guardian") {
                    navigate("/app/dashboard?tab=profile")
                  } else {
                    navigate(PATHS.APP.PROFILE)
                  }
                }}
                className="cursor-pointer flex items-center gap-2"
              >
                <UserRound className="h-4 w-4" />
                <span>{role === "admin" ? "Admin Profile" : role === "teacher" ? "Teacher Profile" : "Guardian Profile"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Navbar