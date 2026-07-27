import { Link, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { LogOut } from "lucide-react"
import { PATHS } from "../../routes/path"
import ApiHandler from "../../api/ApiHandler"
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

        {/* Right Side: User Menu Dropdown */}
        <div className="flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer outline-none hover:opacity-80 transition-opacity text-left bg-transparent border-0 p-0">
              <Avatar className="h-9 w-9 bg-accent border border-border">
                <AvatarFallback className="text-xs font-semibold text-neutral bg-accent">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col md:flex">
                <span className="text-sm font-semibold text-neutral leading-none">
                  Administrator
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                  System Root
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mt-1">
              <DropdownMenuGroup>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
              </DropdownMenuGroup>
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