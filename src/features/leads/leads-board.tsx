import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

type FunnelStage = {
  id: string
  name: string
  sort_order: number
}

type LeadItem = {
  id: string
  name: string
  company: string | null
  job_title: string | null
  stage_id: string | null
}

type LeadsBoardProps = {
  workspaceId: string
  workspaceName: string
}

type StageColumn = {
  id: string
  name: string
  leads: LeadItem[]
}

export function LeadsBoard({ workspaceId, workspaceName }: LeadsBoardProps) {
  const [stages, setStages] = React.useState<FunnelStage[]>([])
  const [leads, setLeads] = React.useState<LeadItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const loadBoard = React.useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    const [stagesResponse, leadsResponse] = await Promise.all([
      supabase
        .from("funnel_stages")
        .select("id, name, sort_order")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("leads")
        .select("id, name, company, job_title, stage_id")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
    ])

    if (stagesResponse.error) {
      setErrorMessage(stagesResponse.error.message)
      setLoading(false)
      return
    }

    if (leadsResponse.error) {
      setErrorMessage(leadsResponse.error.message)
      setLoading(false)
      return
    }

    setStages(stagesResponse.data ?? [])
    setLeads(leadsResponse.data ?? [])
    setLoading(false)
  }, [workspaceId])

  React.useEffect(() => {
    loadBoard()
  }, [loadBoard])

  const columns = React.useMemo<StageColumn[]>(() => {
    const baseColumns = stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      leads: [] as LeadItem[],
    }))
    const columnsById = new Map(baseColumns.map((column) => [column.id, column]))
    const unassigned: LeadItem[] = []

    leads.forEach((lead) => {
      if (lead.stage_id && columnsById.has(lead.stage_id)) {
        columnsById.get(lead.stage_id)?.leads.push(lead)
      } else {
        unassigned.push(lead)
      }
    })

    if (unassigned.length > 0) {
      baseColumns.push({
        id: "unassigned",
        name: "Sem etapa",
        leads: unassigned,
      })
    }

    return baseColumns
  }, [leads, stages])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            CRM — {workspaceName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Leads organizados por etapa do funil.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={loadBoard} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando funil...</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex min-h-[240px] flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{column.name}</p>
                <Badge variant="secondary">{column.leads.length}</Badge>
              </div>
              {column.leads.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem leads.</p>
              ) : (
                <div className="space-y-2">
                  {column.leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-lg border border-border/60 bg-card px-3 py-2"
                    >
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.company ?? "Sem empresa"}
                      </p>
                      {lead.job_title ? (
                        <p className="text-xs text-muted-foreground">
                          {lead.job_title}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
