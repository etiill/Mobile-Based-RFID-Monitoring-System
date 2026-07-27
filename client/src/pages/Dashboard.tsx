import { ShieldAlert, FileText, CalendarClock, Users, CheckCircle, Clock } from "lucide-react"

export function Dashboard() {
  const stats = [
    {
      label: "Total Registered Pupils",
      value: "148",
      change: "+12 this week",
      icon: Users,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      label: "Active Readers online",
      value: "4 / 4",
      change: "All systems nominal",
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
    },
    {
      label: "System Uptime",
      value: "99.9%",
      change: "Live monitoring active",
      icon: Clock,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
  ]

  const modules = [
    {
      title: "Safety Alerts & Exceptions",
      description: "Manage real-time security events and access logs.",
      icon: ShieldAlert,
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      borderHover: "hover:border-red-200",
    },
    {
      title: "Reports & History",
      description: "Download automated check-in and check-out logs.",
      icon: FileText,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      borderHover: "hover:border-amber-200",
    },
    {
      title: "Time-Bound Authorization",
      description: "Configure scheduled permission windows for visitors.",
      icon: CalendarClock,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-50",
      borderHover: "hover:border-purple-200",
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Welcome back to the RFID Monitoring System dashboard. Here is today's overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <div className={`rounded-lg p-2 ${stat.iconBg} ${stat.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold tracking-tight text-neutral">{stat.value}</span>
                <p className="text-xs text-muted-foreground mt-1 font-semibold">{stat.change}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modules Actions Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          System Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod, idx) => {
            const Icon = mod.icon
            return (
              <div
                key={idx}
                className={`group cursor-pointer rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${mod.borderHover}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${mod.iconBg} ${mod.iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral group-hover:text-primary transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
