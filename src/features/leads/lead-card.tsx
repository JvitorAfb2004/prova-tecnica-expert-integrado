import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Campaign } from "@/features/campaigns/use-campaigns"
import { LeadForm, type LeadFormValues, type OwnerOption } from "@/features/leads/lead-form"
import { LeadMessages } from "@/features/leads/lead-messages"
import type { LeadItem } from "@/features/leads/lead-types"
import { buildCustomFieldsPayload, normalizeCustomFields } from "@/features/leads/lead-custom-fields"
import { getMissingFields } from "@/features/leads/lead-validation"
import type { LeadFieldDefinition } from "@/features/leads/use-lead-field-definitions"
import type { FunnelStage } from "@/features/funnel/use-funnel-stages"
import { supabase } from "@/lib/supabase"

type LeadCardProps = {
  workspaceId: string
  lead: LeadItem
  stages: FunnelStage[]
  campaigns: Campaign[]
  customFieldDefinitions: LeadFieldDefinition[]
  owners: OwnerOption[]
  onChanged: () => Promise<void>
}

export function LeadCard({
  workspaceId,
  lead,
  stages,
  campaigns,
  customFieldDefinitions,
  owners,
  onChanged,
}: LeadCardProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [isUpdatingStage, setIsUpdatingStage] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleStageChange = async (value: string) => {
    setErrorMessage(null)
    setIsUpdatingStage(true)

    const nextStageId = value === "unassigned" ? null : value
    if (nextStageId) {
      const stage = stages.find((item) => item.id === nextStageId)
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
        customFieldDefinitions
      )

      if (missing.length > 0) {
        setErrorMessage(`Campos obrigatorios: ${missing.join(", ")}`)
        setIsUpdatingStage(false)
        return
      }
    }

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

  const moveToContact = async () => {
    const contactStage = stages.find(
      (item) => item.name.toLowerCase() === "tentando contato"
    )

    if (!contactStage) {
      setErrorMessage("Etapa 'Tentando Contato' nao encontrada.")
      return
    }

    const missing = getMissingFields(
      contactStage.required_fields,
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
      customFieldDefinitions
    )

    if (missing.length > 0) {
      setErrorMessage(`Campos obrigatorios: ${missing.join(", ")}`)
      return
    }

    const { error } = await supabase
      .from("leads")
      .update({ stage_id: contactStage.id })
      .eq("id", lead.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

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
      owner_id: values.ownerId,
      custom_fields: buildCustomFieldsPayload(
        values.customFields,
        customFieldDefinitions
      ),
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
    customFields: normalizeCustomFields(
      customFieldDefinitions,
      lead.custom_fields
    ),
    ownerId: lead.owner_id ?? null,
  }

  const ownerLabel = owners.find((owner) => owner.id === lead.owner_id)?.email

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
        {ownerLabel ? (
          <p className="text-xs text-muted-foreground">
            Responsavel: {ownerLabel}
          </p>
        ) : null}
        {lead.notes ? (
          <p className="text-xs text-muted-foreground">{lead.notes}</p>
        ) : null}
        {lead.custom_fields &&
        Object.keys(lead.custom_fields).length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Campos personalizados preenchidos.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-xs text-destructive">{errorMessage}</p>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <LeadForm
            stages={stages}
            customFieldDefinitions={customFieldDefinitions}
            initialValues={initialValues}
            submitLabel="Salvar"
            busyLabel="Salvando..."
            showStage={false}
            owners={owners}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
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
          <div>
            <p className="text-xs font-medium">Mensagens IA</p>
            <LeadMessages
              workspaceId={workspaceId}
              lead={lead}
              campaigns={campaigns}
              onSend={moveToContact}
              onGenerated={onChanged}
            />
          </div>
        </div>
      )}
    </div>
  )
}
