import * as React from "react"

import { supabase } from "@/lib/supabase"

export type FunnelStage = {
  id: string
  name: string
  sort_order: number
  required_fields: string[] | null
}

export function useFunnelStages(workspaceId: string | null) {
  const [stages, setStages] = React.useState<FunnelStage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const loadStages = React.useCallback(async () => {
    if (!workspaceId) {
      setStages([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from("funnel_stages")
      .select("id, name, sort_order, required_fields")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setStages(data ?? [])
    setLoading(false)
  }, [workspaceId])

  React.useEffect(() => {
    loadStages()
  }, [loadStages])

  return {
    stages,
    loading,
    errorMessage,
    refresh: loadStages,
  }
}
