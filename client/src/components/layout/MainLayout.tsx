import { useState, Suspense } from "react"
import { Outlet } from "react-router-dom"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"
import Footer from "./Footer"
import LoadingScreen from "../LoadingScreen"

export function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-tertiary text-neutral">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        {/* Right Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="relative flex-1 overflow-y-auto p-6 md:p-8 bg-tertiary">
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
