import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listAvailableFields } from "@/features/leads/lead-fields"
import { useLeadFieldDefinitions } from "@/features/leads/use-lead-field-definitions"
import { useFunnelStages } from "@/features/funnel/use-funnel-stages"
import { supabase } from "@/lib/supabase"

type StageRequirementsPanelProps = {
  workspaceId: string
  isAdmin: boolean
}

export function StageRequirementsPanel({
  workspaceId,
  isAdmin,
}: StageRequirementsPanelProps) {
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
  } = useLeadFieldDefinitions(workspaceId)

  const availableFields = React.useMemo(
    () => listAvailableFields(definitions),
    [definitions]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requisitos por etapa</CardTitle>
        <CardDescription>
          Defina campos obrigatorios antes de mover o lead para uma etapa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stagesError ? (
          <p className="text-sm text-destructive">{stagesError}</p>
        ) : null}
        {fieldsError ? (
          <p className="text-sm text-destructive">{fieldsError}</p>
        ) : null}
        {stagesLoading || fieldsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma etapa encontrada.
          </p>
        ) : (
          <div className="space-y-4">
            {stages.map((stage) => (
              <StageRequirementCard
                key={stage.id}
                stageId={stage.id}
                stageName={stage.name}
                requiredFields={stage.required_fields ?? []}
                availableFields={availableFields}
                isAdmin={isAdmin}
                onSaved={refreshStages}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type StageRequirementCardProps = {
  stageId: string
  stageName: string
  requiredFields: string[]
  availableFields: { key: string; label: string }[]
  isAdmin: boolean
  onSaved: () => Promise<void>
}

function StageRequirementCard({
  stageId,
  stageName,
  requiredFields,
  availableFields,
  isAdmin,
  onSaved,
}: StageRequirementCardProps) {
  const [selected, setSelected] = React.useState<string[]>(requiredFields)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSelected(requiredFields)
  }, [requiredFields])

  const toggleField = (key: string) => {
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)

    const { error } = await supabase
      .from("funnel_stages")
      .update({ required_fields: selected })
      .eq("id", stageId)

    if (error) {
      setErrorMessage(error.message)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    await onSaved()
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{stageName}</p>
        {isAdmin ? (
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="text-xs text-destructive">{errorMessage}</p>
      ) : null}
      <div className="grid gap-2 md:grid-cols-2">
        {availableFields.map((field) => (
          <label key={field.key} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="size-3"
              checked={selected.includes(field.key)}
              onChange={() => toggleField(field.key)}
              disabled={!isAdmin}
            />
            {field.label}
          </label>
        ))}
      </div>
      {!isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Apenas admins podem editar requisitos.
        </p>
      ) : null}
    </div>
  )
}
