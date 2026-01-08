import * as React from "react"

import { supabase } from "@/lib/supabase"

export type LeadFieldType = "text" | "number" | "boolean"

export type LeadFieldDefinition = {
  id: string
  workspace_id: string
  key: string
  label: string
  field_type: LeadFieldType
}

export function useLeadFieldDefinitions(workspaceId: string | null) {
  const [definitions, setDefinitions] = React.useState<LeadFieldDefinition[]>([])
  const [loading, setLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const loadDefinitions = React.useCallback(async () => {
    if (!workspaceId) {
      setDefinitions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from("lead_field_definitions")
      .select("id, workspace_id, key, label, field_type")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setDefinitions(data ?? [])
    setLoading(false)
  }, [workspaceId])

  React.useEffect(() => {
    loadDefinitions()
  }, [loadDefinitions])

  return {
    definitions,
    loading,
    errorMessage,
    refresh: loadDefinitions,
  }
}
