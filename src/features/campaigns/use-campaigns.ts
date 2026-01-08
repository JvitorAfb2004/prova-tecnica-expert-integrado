import * as React from "react"

import { supabase } from "@/lib/supabase"

export type Campaign = {
  id: string
  workspace_id: string
  name: string
  context: string | Record<string, unknown>
  prompt: string | Record<string, unknown>
  trigger_stage_id: string | null
  is_active: boolean
  created_at: string | null
}

export function useCampaigns(workspaceId: string | null) {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const loadCampaigns = React.useCallback(async () => {
    if (!workspaceId) {
      setCampaigns([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from("campaigns")
      .select("id, workspace_id, name, context, prompt, trigger_stage_id, is_active, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setCampaigns(data ?? [])
    setLoading(false)
  }, [workspaceId])

  React.useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  return {
    campaigns,
    loading,
    errorMessage,
    refresh: loadCampaigns,
  }
}
