import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthLoading, AuthScreen } from "@/features/auth/auth-screen"
import { useSession } from "@/features/auth/use-session"
import { WorkspaceScreen } from "@/features/workspaces/workspace-screen"

export function App() {
  const { session, loading } = useSession()

  if (loading) {
    return <AuthLoading />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            session ? <Navigate to="/app/workspaces" replace /> : <AuthScreen />
          }
        />
        <Route
          path="/login"
          element={
            session ? <Navigate to="/app/workspaces" replace /> : <AuthScreen />
          }
        />
        <Route
          path="/app/*"
          element={
            session ? (
              <WorkspaceScreen session={session} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
