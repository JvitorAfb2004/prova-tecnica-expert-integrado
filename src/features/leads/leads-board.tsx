import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  LeadCard,
  type LeadItem,
} from "@/features/leads/lead-card"
import {
  LeadForm,
  type FunnelStage,
  type LeadFormValues,
} from "@/features/leads/lead-form"
import { supabase } from "@/lib/supabase"

type FunnelStageWithOrder = FunnelStage & {
  sort_order: number
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
  const [stages, setStages] = React.useState<FunnelStageWithOrder[]>([])
  const [leads, setLeads] = React.useState<LeadItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [createResetToken, setCreateResetToken] = React.useState(0)

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
        .select(
          "id, name, company, job_title, stage_id, email, phone, lead_source, notes"
        )
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

  const defaultStageId = stages[0]?.id ?? null

  const createInitialValues = React.useMemo<LeadFormValues>(
    () => ({
      name: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
      leadSource: "",
      notes: "",
      stageId: defaultStageId,
    }),
    [defaultStageId]
  )

  const handleCreateLead = async (values: LeadFormValues) => {
    const name = values.name.trim()
    if (!name) {
      return "Informe o nome do lead."
    }

    const payload = {
      workspace_id: workspaceId,
      stage_id: values.stageId,
      name,
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      company: values.company.trim() || null,
      job_title: values.jobTitle.trim() || null,
      lead_source: values.leadSource.trim() || null,
      notes: values.notes.trim() || null,
    }

    const { error } = await supabase.from("leads").insert(payload)

    if (error) {
      return error.message
    }

    setCreateResetToken((current) => current + 1)
    await loadBoard()
    return null
  }

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
        <>
          <Card>
            <CardHeader>
              <CardTitle>Novo lead</CardTitle>
              <CardDescription>
                Cadastre leads rapidamente no funil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadForm
                stages={stages}
                initialValues={createInitialValues}
                submitLabel="Adicionar lead"
                busyLabel="Adicionando..."
                resetToken={createResetToken}
                onSubmit={handleCreateLead}
              />
            </CardContent>
          </Card>

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
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        stages={stages}
                        onChanged={loadBoard}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
