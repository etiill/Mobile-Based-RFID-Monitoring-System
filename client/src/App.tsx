import { RouterProvider } from "react-router-dom"
import { router } from "./routes/Routes"
import { Toaster } from "./components/ui/toast"

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}

export default App
