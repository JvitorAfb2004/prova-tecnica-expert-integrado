import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadForm, type FunnelStage, type LeadFormValues } from "@/features/leads/lead-form"
import { supabase } from "@/lib/supabase"

export type LeadItem = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  lead_source: string | null
  notes: string | null
  stage_id: string | null
}

type LeadCardProps = {
  lead: LeadItem
  stages: FunnelStage[]
  onChanged: () => Promise<void>
}

export function LeadCard({ lead, stages, onChanged }: LeadCardProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [isUpdatingStage, setIsUpdatingStage] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleStageChange = async (value: string) => {
    setErrorMessage(null)
    setIsUpdatingStage(true)

    const nextStageId = value === "unassigned" ? null : value
    const { error } = await supabase
      .from("leads")
      .update({ stage_id: nextStageId })
      .eq("id", lead.id)

    if (error) {
      setErrorMessage(error.message)
      setIsUpdatingStage(false)
      return
    }

    setIsUpdatingStage(false)
    await onChanged()
  }

  const handleDelete = async () => {
    if (!window.confirm("Excluir este lead?")) return
    setErrorMessage(null)
    setIsDeleting(true)

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", lead.id)

    if (error) {
      setErrorMessage(error.message)
      setIsDeleting(false)
      return
    }

    setIsDeleting(false)
    await onChanged()
  }

  const handleUpdate = async (values: LeadFormValues) => {
    setErrorMessage(null)

    const payload = {
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      company: values.company.trim() || null,
      job_title: values.jobTitle.trim() || null,
      lead_source: values.leadSource.trim() || null,
      notes: values.notes.trim() || null,
    }

    if (!payload.name) {
      return "Informe o nome do lead."
    }

    const { error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", lead.id)

    if (error) {
      return error.message
    }

    setIsEditing(false)
    await onChanged()
    return null
  }

  const initialValues: LeadFormValues = {
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    jobTitle: lead.job_title ?? "",
    leadSource: lead.lead_source ?? "",
    notes: lead.notes ?? "",
    stageId: lead.stage_id,
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{lead.name}</p>
            <p className="text-xs text-muted-foreground">
              {lead.company ?? "Sem empresa"}
            </p>
          </div>
          <Select
            value={lead.stage_id ?? "unassigned"}
            onValueChange={handleStageChange}
            disabled={isUpdatingStage}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Sem etapa</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {lead.job_title ? (
          <p className="text-xs text-muted-foreground">{lead.job_title}</p>
        ) : null}
        {lead.email ? (
          <p className="text-xs text-muted-foreground">Email: {lead.email}</p>
        ) : null}
        {lead.phone ? (
          <p className="text-xs text-muted-foreground">Tel: {lead.phone}</p>
        ) : null}
        {lead.lead_source ? (
          <p className="text-xs text-muted-foreground">
            Origem: {lead.lead_source}
          </p>
        ) : null}
        {lead.notes ? (
          <p className="text-xs text-muted-foreground">{lead.notes}</p>
        ) : null}
        {errorMessage ? (
          <p className="text-xs text-destructive">{errorMessage}</p>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <LeadForm
            stages={stages}
            initialValues={initialValues}
            submitLabel="Salvar"
            busyLabel="Salvando..."
            showStage={false}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Editar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      )}
    </div>
  )
}
