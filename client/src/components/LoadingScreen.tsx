import { Loader2 } from "lucide-react"

interface LoadingScreenProps {
  fullScreen?: boolean
}

export function LoadingScreen({ fullScreen = true }: LoadingScreenProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-tertiary text-neutral animate-fade-in ${
        fullScreen ? "h-screen w-screen" : "absolute inset-0 h-full w-full min-h-[300px]"
      }`}
    >
      <div className="relative flex flex-col items-center gap-4">
        {/* Outer pulse indicator */}
        <div className="absolute -inset-4 rounded-full bg-primary/5 animate-pulse" />

        {/* Loading Spinner */}
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          {/* Central dot using accent color */}
          <div className="absolute h-2.5 w-2.5 rounded-full bg-secondary" />
        </div>

        {/* Brand Details */}
        <div className="text-center mt-2 z-10">
          <h2 className="text-sm font-bold tracking-wider text-primary uppercase">
            FCU Kindergarten
          </h2>
          <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mt-0.5">
            Loading System Panel...
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
