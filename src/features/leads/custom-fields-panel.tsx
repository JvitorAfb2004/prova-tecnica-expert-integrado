import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { reservedLeadFieldKeys } from "@/features/leads/lead-fields"
import {
  type LeadFieldType,
  useLeadFieldDefinitions,
} from "@/features/leads/use-lead-field-definitions"
import { supabase } from "@/lib/supabase"

type CustomFieldsPanelProps = {
  workspaceId: string
  isAdmin: boolean
  onUpdated?: () => void
}

export function CustomFieldsPanel({
  workspaceId,
  isAdmin,
  onUpdated,
}: CustomFieldsPanelProps) {
  const { definitions, loading, errorMessage, refresh } =
    useLeadFieldDefinitions(workspaceId)
  const [key, setKey] = React.useState("")
  const [label, setLabel] = React.useState("")
  const [fieldType, setFieldType] = React.useState<LeadFieldType>("text")
  const [notice, setNotice] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleCreateField = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(null)
    setSubmitError(null)

    const trimmedKey = key.trim().toLowerCase()
    const trimmedLabel = label.trim()

    if (!trimmedKey || !trimmedLabel) {
      setSubmitError("Informe chave e nome do campo.")
      return
    }

    if (!/^[a-z0-9_]+$/.test(trimmedKey)) {
      setSubmitError("Use apenas letras minusculas, numeros e _ na chave.")
      return
    }

    if (reservedLeadFieldKeys.has(trimmedKey)) {
      setSubmitError("Esta chave esta reservada para campos padrao.")
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.from("lead_field_definitions").insert({
      workspace_id: workspaceId,
      key: trimmedKey,
      label: trimmedLabel,
      field_type: fieldType,
    })

    if (error) {
      setSubmitError(error.message)
      setIsSubmitting(false)
      return
    }

    setKey("")
    setLabel("")
    setFieldType("text")
    setNotice("Campo criado.")
    setIsSubmitting(false)
    await refresh()
    onUpdated?.()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este campo personalizado?")) return
    setSubmitError(null)

    const { error } = await supabase
      .from("lead_field_definitions")
      .delete()
      .eq("id", id)

    if (error) {
      setSubmitError(error.message)
      return
    }

    await refresh()
    onUpdated?.()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campos personalizados</CardTitle>
        <CardDescription>
          Defina campos extras para todos os leads do workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}
        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}
        {notice ? (
          <p className="text-sm text-muted-foreground">{notice}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : definitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum campo personalizado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {definitions.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{field.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {field.key} · {field.field_type}
                  </p>
                </div>
                {isAdmin ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(field.id)}
                  >
                    Excluir
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {isAdmin ? (
          <form className="space-y-3" onSubmit={handleCreateField}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="field-key">Chave</Label>
                <Input
                  id="field-key"
                  placeholder="segmento"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-label">Nome do campo</Label>
                <Input
                  id="field-label"
                  placeholder="Segmento"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="field-type">Tipo</Label>
                <Select
                  value={fieldType}
                  onValueChange={(value) => setFieldType(value as LeadFieldType)}
                >
                  <SelectTrigger id="field-type" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="number">Numero</SelectItem>
                    <SelectItem value="boolean">Booleano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Adicionar campo"}
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Apenas admins podem criar campos personalizados.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
