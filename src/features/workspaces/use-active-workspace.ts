import * as React from "react"

export function useActiveWorkspaceId() {
  const [activeWorkspaceId, setActiveWorkspaceId] = React.useState<string | null>(
    null
  )

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("active_workspace_id")
    if (stored) {
      setActiveWorkspaceId(stored)
    }
  }, [])

  const handleSetActiveWorkspace = React.useCallback((next: string | null) => {
    setActiveWorkspaceId(next)
    if (typeof window === "undefined") return
    if (next) {
      window.localStorage.setItem("active_workspace_id", next)
    } else {
      window.localStorage.removeItem("active_workspace_id")
    }
  }, [])

  return {
    activeWorkspaceId,
    setActiveWorkspaceId: handleSetActiveWorkspace,
  }
}
