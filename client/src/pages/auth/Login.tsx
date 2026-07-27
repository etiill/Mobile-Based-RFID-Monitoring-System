import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Shield, User, Lock, Eye, EyeOff, Globe, HelpCircle, ArrowRight, ShieldCheck } from "lucide-react"
import { PATHS } from "../../routes/path"
import lobbyImage from "../../assets/kindergarten_rfid_lobby.png"
import ApiHandler from "../../api/ApiHandler"
import { toast } from "../../components/ui/toast"

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Retrieve path to redirect to after successful login (default is Dashboard)
  const from = (location.state as any)?.from?.pathname || PATHS.APP.DASHBOARD

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await ApiHandler.post<{ token: string; user: any }>("/login", {
        email,
        password,
      })

      localStorage.setItem("authenticated", "true")
      localStorage.setItem("token", response.token)
      localStorage.setItem("user", JSON.stringify(response.user))

      setIsLoading(false)

      toast.add({
        title: "Welcome Back!",
        description: `Successfully signed in as ${response.user.name}.`,
        type: "success",
      })

      navigate(from, { replace: true })
    } catch (err: any) {
      setIsLoading(false)
      const errorMsg = err.message || "Failed to sign in. Please verify credentials."
      setError(errorMsg)

      toast.add({
        title: "Sign In Failed",
        description: errorMsg,
        type: "error",
      })
    }
  }

  return (
    <div className="relative flex min-h-screen w-screen flex-col bg-primary text-white font-sans overflow-x-hidden">
      {/* Background Dot Pattern Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />

      {/* Top Navbar */}
      <header className="relative z-10 flex h-16 w-full items-center justify-between px-6 md:px-12 border-b border-white/10 bg-primary/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-wide">RFID Monitoring System</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-white/70">
          <button className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors bg-transparent border-none p-0 outline-none">
            <HelpCircle className="h-4 w-4" />
            <span>Support</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors bg-transparent border-none p-0 outline-none">
            <Globe className="h-4 w-4" />
            <span>Language</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 md:py-16">
        <div className="flex w-full max-w-5xl flex-col gap-8 md:flex-row md:items-stretch md:justify-center">
          
          {/* Left Column: Sign In Form */}
          <div className="w-full max-w-md rounded-3xl bg-white text-neutral p-8 md:p-10 shadow-xl flex flex-col justify-between">
            <div>
              {/* Shield Icon & Header */}
              <div className="flex flex-col items-center mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <Shield className="h-6 w-6 fill-primary/10" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-primary">RFID Monitor</h1>
                <p className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase mt-1">
                  Kindergarten Safety First
                </p>
              </div>

              {/* Form content */}
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
                    {error}
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral/80">Email or Username</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your ID or email"
                      className="w-full rounded-xl border border-border bg-tertiary py-3 pl-10 pr-4 text-xs font-semibold text-neutral outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral/80">Password</label>
                    <a href="#" className="text-xs font-bold text-primary hover:underline">
                      Forgot?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-border bg-tertiary py-3 pl-10 pr-10 text-xs font-semibold text-neutral outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-neutral bg-transparent border-none outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Keep me signed in */}
                <div className="flex items-center gap-2 text-xs pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="rounded border-border text-primary focus:ring-primary/20 h-4.5 w-4.5"
                  />
                  <label htmlFor="remember" className="font-semibold text-muted-foreground cursor-pointer select-none">
                    Keep me signed in
                  </label>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-4"
                >
                  <span>{isLoading ? "Signing in..." : "Sign In"}</span>
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>

            {/* Bottom Link */}
            <div className="text-center text-xs font-semibold mt-6 pt-2 border-t border-border/50 text-muted-foreground">
              Don't have an account?{" "}
              <a href="#" className="text-primary hover:underline font-bold">
                Sign up
              </a>
            </div>
          </div>

          {/* Right Column: Info Showcase Card */}
          <div className="hidden w-full max-w-sm rounded-3xl bg-white text-neutral p-4 shadow-xl md:flex flex-col justify-between">
            <div className="h-full flex flex-col justify-between">
              {/* Image Section */}
              <div className="overflow-hidden rounded-2xl w-full flex-1 min-h-[220px] bg-tertiary relative">
                <img 
                  src={lobbyImage} 
                  alt="Kindergarten RFID Lobby" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              {/* Text Info */}
              <div className="p-4 pt-5">
                <h3 className="text-base font-bold text-primary">Real-time Monitoring</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Instant notifications for every student entry and exit. Security you can trust.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Footer Badges */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-8 text-xs text-white/80">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4.5 py-1.5 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-secondary" />
            <span>Secure Authentication</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4.5 py-1.5 backdrop-blur-sm">
            <Lock className="h-4 w-4 text-secondary" />
            <span>Encrypted Data</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Login
