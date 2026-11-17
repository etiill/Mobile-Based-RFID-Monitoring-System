import { useState, useEffect, Suspense } from "react"
import { Outlet } from "react-router-dom"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"
import Footer from "./Footer"
import LoadingScreen from "../LoadingScreen"

export function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1150 : false
  )

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1150) {
        setIsCollapsed(true)
      } else {
        setIsCollapsed(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-tertiary text-neutral">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Body */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        {/* Right Content Area */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <main className="relative flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 md:p-5 lg:p-6 pb-24 md:pb-6 bg-tertiary">
            <Suspense fallback={<LoadingScreen fullScreen={false} />}>
              <Outlet />
            </Suspense>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

export default MainLayout
