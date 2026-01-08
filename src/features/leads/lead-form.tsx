import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type FunnelStage = {
  id: string
  name: string
}

export type LeadFormValues = {
  name: string
  email: string
  phone: string
  company: string
  jobTitle: string
  leadSource: string
  notes: string
  stageId: string | null
}

type LeadFormProps = {
  stages: FunnelStage[]
  initialValues: LeadFormValues
  submitLabel: string
  busyLabel?: string
  showStage?: boolean
  resetToken?: number
  onSubmit: (values: LeadFormValues) => Promise<string | null>
  onCancel?: () => void
}

export function LeadForm({
  stages,
  initialValues,
  submitLabel,
  busyLabel,
  showStage = true,
  resetToken,
  onSubmit,
  onCancel,
}: LeadFormProps) {
  const [values, setValues] = React.useState<LeadFormValues>(initialValues)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    setValues(initialValues)
  }, [initialValues, resetToken])

  const handleChange = (field: keyof LeadFormValues, value: string | null) => {
    setValues((current) => ({
      ...current,
      [field]: value ?? "",
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const error = await onSubmit(values)
    if (error) {
      setErrorMessage(error)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lead-name">Nome</Label>
          <Input
            id="lead-name"
            placeholder="Nome do lead"
            value={values.name}
            onChange={(event) => handleChange("name", event.target.value)}
            required
          />
        </div>
        {showStage ? (
          <div className="space-y-2">
            <Label htmlFor="lead-stage">Etapa</Label>
            <Select
              value={values.stageId ?? "unassigned"}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  stageId: value === "unassigned" ? null : value,
                }))
              }
            >
              <SelectTrigger id="lead-stage" className="w-full">
                <SelectValue placeholder="Selecionar etapa" />
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
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="lead-email">Email</Label>
          <Input
            id="lead-email"
            type="email"
            placeholder="lead@empresa.com"
            value={values.email}
            onChange={(event) => handleChange("email", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-phone">Telefone</Label>
          <Input
            id="lead-phone"
            placeholder="+55 11 99999-9999"
            value={values.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-company">Empresa</Label>
          <Input
            id="lead-company"
            placeholder="Empresa"
            value={values.company}
            onChange={(event) => handleChange("company", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-job-title">Cargo</Label>
          <Input
            id="lead-job-title"
            placeholder="Cargo"
            value={values.jobTitle}
            onChange={(event) => handleChange("jobTitle", event.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="lead-source">Origem do lead</Label>
          <Input
            id="lead-source"
            placeholder="Origem"
            value={values.leadSource}
            onChange={(event) => handleChange("leadSource", event.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="lead-notes">Observacoes</Label>
          <Textarea
            id="lead-notes"
            placeholder="Observacoes"
            value={values.notes}
            onChange={(event) => handleChange("notes", event.target.value)}
          />
        </div>
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? busyLabel ?? submitLabel : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
