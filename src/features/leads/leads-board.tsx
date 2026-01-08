import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useCampaigns } from "@/features/campaigns/use-campaigns"
import { MetricsSummary } from "@/features/dashboard/metrics-summary"
import { useFunnelStages } from "@/features/funnel/use-funnel-stages"
import { LeadCard } from "@/features/leads/lead-card"
import { buildCustomFieldsPayload, normalizeCustomFields } from "@/features/leads/lead-custom-fields"
import { LeadForm, type LeadFormValues, type OwnerOption } from "@/features/leads/lead-form"
import type { LeadItem } from "@/features/leads/lead-types"
import { getMissingFields } from "@/features/leads/lead-validation"
import { useLeadFieldDefinitions } from "@/features/leads/use-lead-field-definitions"
import { supabase } from "@/lib/supabase"

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
  const [leads, setLeads] = React.useState<LeadItem[]>([])
  const [leadsLoading, setLeadsLoading] = React.useState(true)
  const [leadsError, setLeadsError] = React.useState<string | null>(null)
  const [createResetToken, setCreateResetToken] = React.useState(0)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  const {
    stages,
    loading: stagesLoading,
    errorMessage: stagesError,
    refresh: refreshStages,
  } = useFunnelStages(workspaceId)
  const {
    definitions,
    loading: fieldsLoading,
    errorMessage: fieldsError,
    refresh: refreshFields,
  } = useLeadFieldDefinitions(workspaceId)
  const {
    campaigns,
    loading: campaignsLoading,
    errorMessage: campaignsError,
    refresh: refreshCampaigns,
  } = useCampaigns(workspaceId)
  const [owners, setOwners] = React.useState<OwnerOption[]>([])
  const [ownersLoading, setOwnersLoading] = React.useState(true)
  const [ownersError, setOwnersError] = React.useState<string | null>(null)

  const loadLeads = React.useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setLeadsLoading(true)
    }
    setLeadsError(null)

    const { data, error } = await supabase
      .from("leads")
      .select(
        "id, name, company, job_title, stage_id, email, phone, lead_source, notes, custom_fields, owner_id"
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      setLeadsError(error.message)
      if (!silent) {
        setLeadsLoading(false)
      }
      return
    }

    setLeads((data ?? []) as LeadItem[])
    if (!silent) {
      setLeadsLoading(false)
    }
  }, [workspaceId])

  React.useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const loadOwners = React.useCallback(async () => {
    setOwnersLoading(true)
    setOwnersError(null)

    const { data: members, error: membersError } = await supabase
      .rpc("list_workspace_members", { p_workspace_id: workspaceId })

    if (membersError) {
      setOwnersError(membersError.message)
      setOwnersLoading(false)
      return
    }

    const mapped = ((members ?? []) as { user_id: string; email: string | null }[])
      .map((member): OwnerOption => ({
        id: member.user_id,
        email: member.email ?? "usuario",
      }))
      .sort((a: OwnerOption, b: OwnerOption) => a.email.localeCompare(b.email))

    setOwners(mapped)
    setOwnersLoading(false)
  }, [workspaceId])

  React.useEffect(() => {
    loadOwners()
  }, [loadOwners])

  const defaultStageId = stages[0]?.id ?? null
  const customFieldsInitial = React.useMemo(
    () => normalizeCustomFields(definitions, null),
    [definitions]
  )

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
      customFields: customFieldsInitial,
      ownerId: null,
    }),
    [customFieldsInitial, defaultStageId]
  )

  const handleCreateLead = async (values: LeadFormValues) => {
    const name = values.name.trim()
    if (!name) {
      return "Informe o nome do lead."
    }

    const customPayload = buildCustomFieldsPayload(values.customFields, definitions)

    if (values.stageId) {
      const stage = stages.find((item) => item.id === values.stageId)
      const missing = getMissingFields(
        stage?.required_fields,
        {
          name,
          email: values.email,
          phone: values.phone,
          company: values.company,
          job_title: values.jobTitle,
          lead_source: values.leadSource,
          notes: values.notes,
          custom_fields: customPayload,
        },
        definitions
      )

      if (missing.length > 0) {
        return `Campos obrigatorios: ${missing.join(", ")}`
      }
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
      custom_fields: customPayload,
      owner_id: values.ownerId,
    }

    const { error } = await supabase.from("leads").insert(payload)

    if (error) {
      return error.message
    }

    setCreateResetToken((current) => current + 1)
    await loadLeads({ silent: true })
    setIsCreateOpen(false)
    return null
  }

  const handleRefresh = async () => {
    await Promise.all([
      refreshStages(),
      refreshFields(),
      refreshCampaigns(),
      loadLeads(),
      loadOwners(),
    ])
  }

  const loading =
    leadsLoading ||
    stagesLoading ||
    fieldsLoading ||
    campaignsLoading ||
    ownersLoading
  const errorMessage =
    leadsError ??
    stagesError ??
    fieldsError ??
    campaignsError ??
    ownersError ??
    null

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

  const refreshLeadsSilently = React.useCallback(
    () => loadLeads({ silent: true }),
    [loadLeads]
  )

  const updateLeadStage = async (leadId: string, stageId: string | null) => {
    const lead = leads.find((item) => item.id === leadId)
    if (!lead) return

    if (stageId) {
      const stage = stages.find((item) => item.id === stageId)
      const missing = getMissingFields(
        stage?.required_fields,
        {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          job_title: lead.job_title,
          lead_source: lead.lead_source,
          notes: lead.notes,
          custom_fields: lead.custom_fields,
        },
        definitions
      )

      if (missing.length > 0) {
        setLeadsError(`Campos obrigatorios: ${missing.join(", ")}`)
        return
      }
    }

    const { error } = await supabase
      .from("leads")
      .update({ stage_id: stageId })
      .eq("id", leadId)

    if (error) {
      setLeadsError(error.message)
      return
    }

    await loadLeads({ silent: true })
  }

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    leadId: string
  ) => {
    event.dataTransfer.setData("text/plain", leadId)
    event.dataTransfer.effectAllowed = "move"
  }

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    stageId: string | null
  ) => {
    event.preventDefault()
    const leadId = event.dataTransfer.getData("text/plain")
    if (!leadId) return
    void updateLeadStage(leadId, stageId)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

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
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button">Novo lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo lead</DialogTitle>
                <DialogDescription>
                  Cadastre leads rapidamente no funil.
                </DialogDescription>
              </DialogHeader>
              <LeadForm
                stages={stages}
                customFieldDefinitions={definitions}
                owners={owners}
                initialValues={createInitialValues}
                submitLabel="Adicionar lead"
                busyLabel="Adicionando..."
                resetToken={createResetToken}
                onSubmit={handleCreateLead}
              />
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="grid gap-4 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="flex min-h-[240px] flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-8" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <MetricsSummary stages={stages} leads={leads} loading={loading} />

          <div className="grid gap-4 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex min-h-[240px] flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
                onDragOver={handleDragOver}
                onDrop={(event) =>
                  handleDrop(
                    event,
                    column.id === "unassigned" ? null : column.id
                  )
                }
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
                        workspaceId={workspaceId}
                        lead={lead}
                        stages={stages}
                        campaigns={campaigns}
                        customFieldDefinitions={definitions}
                        owners={owners}
                        onChanged={refreshLeadsSilently}
                        onDragStart={handleDragStart}
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
