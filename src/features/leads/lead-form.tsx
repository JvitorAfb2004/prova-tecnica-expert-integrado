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
import { getFieldLabel } from "@/features/leads/lead-fields"
import { getMissingFields } from "@/features/leads/lead-validation"
import type { FunnelStage } from "@/features/funnel/use-funnel-stages"
import type { LeadFieldDefinition } from "@/features/leads/use-lead-field-definitions"

export type LeadFormValues = {
  name: string
  email: string
  phone: string
  company: string
  jobTitle: string
  leadSource: string
  notes: string
  stageId: string | null
  customFields: Record<string, string | boolean | null>
  ownerId: string | null
}

type LeadFormProps = {
  stages: FunnelStage[]
  customFieldDefinitions?: LeadFieldDefinition[]
  owners?: OwnerOption[]
  initialValues: LeadFormValues
  submitLabel: string
  busyLabel?: string
  showStage?: boolean
  resetToken?: number
  onSubmit: (values: LeadFormValues) => Promise<string | null>
  onCancel?: () => void
}

export type OwnerOption = {
  id: string
  email: string
}

export function LeadForm({
  stages,
  customFieldDefinitions = [],
  owners = [],
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

  const selectedStage = React.useMemo(
    () => stages.find((stage) => stage.id === values.stageId) ?? null,
    [stages, values.stageId]
  )

  const requiredFields = React.useMemo(() => {
    const stageFields = selectedStage?.required_fields ?? []
    return Array.from(new Set(["name", ...stageFields]))
  }, [selectedStage])

  const isRequired = (key: string) => requiredFields.includes(key)

  const formatRequiredMessage = (missing: string[]) => {
    if (missing.length === 0) return null
    return `Preencha os campos obrigatorios: ${missing.join(", ")}`
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length === 0) return ""
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const handleChange = (field: keyof LeadFormValues, value: string | null) => {
    setValues((current) => ({
      ...current,
      [field]: value ?? "",
    }))
  }

  const handleCustomFieldChange = (
    key: string,
    value: string | boolean | null
  ) => {
    setValues((current) => ({
      ...current,
      customFields: {
        ...current.customFields,
        [key]: value,
      },
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const missing = getMissingFields(
      requiredFields,
      {
        name: values.name,
        email: values.email,
        phone: values.phone,
        company: values.company,
        job_title: values.jobTitle,
        lead_source: values.leadSource,
        notes: values.notes,
        custom_fields: values.customFields,
      },
      customFieldDefinitions
    )

    if (missing.length > 0) {
      setErrorMessage(formatRequiredMessage(missing))
      setIsSubmitting(false)
      return
    }

    const error = await onSubmit(values)
    if (error) {
      const marker = "missing_required_fields:"
      if (error.includes(marker)) {
        const raw = error.slice(error.indexOf(marker) + marker.length)
        const labels = raw
          .split(",")
          .map((key) => key.trim())
          .filter(Boolean)
          .map((key) => getFieldLabel(key, customFieldDefinitions))
        const formatted = formatRequiredMessage(labels)
        setErrorMessage(formatted ?? "Preencha os campos obrigatorios.")
      } else {
        setErrorMessage(error)
      }
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lead-name">
            Nome{isRequired("name") ? " *" : ""}
          </Label>
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
          <Label htmlFor="lead-email">
            Email{isRequired("email") ? " *" : ""}
          </Label>
          <Input
            id="lead-email"
            type="email"
            placeholder="lead@empresa.com"
            value={values.email}
            onChange={(event) => handleChange("email", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-phone">
            Telefone{isRequired("phone") ? " *" : ""}
          </Label>
          <Input
            id="lead-phone"
            placeholder="+55 11 99999-9999"
            value={values.phone}
            onChange={(event) =>
              handleChange("phone", formatPhone(event.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-company">
            Empresa{isRequired("company") ? " *" : ""}
          </Label>
          <Input
            id="lead-company"
            placeholder="Empresa"
            value={values.company}
            onChange={(event) => handleChange("company", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lead-job-title">
            Cargo{isRequired("job_title") ? " *" : ""}
          </Label>
          <Input
            id="lead-job-title"
            placeholder="Cargo"
            value={values.jobTitle}
            onChange={(event) => handleChange("jobTitle", event.target.value)}
          />
        </div>
        {owners.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="lead-owner">Responsavel</Label>
            <Select
              value={values.ownerId ?? "unassigned"}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  ownerId: value === "unassigned" ? null : value,
                }))
              }
            >
              <SelectTrigger id="lead-owner" className="w-full">
                <SelectValue placeholder="Sem responsavel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sem responsavel</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="lead-source">
            Origem do lead{isRequired("lead_source") ? " *" : ""}
          </Label>
          <Input
            id="lead-source"
            placeholder="Origem"
            value={values.leadSource}
            onChange={(event) => handleChange("leadSource", event.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="lead-notes">
            Observacoes{isRequired("notes") ? " *" : ""}
          </Label>
          <Textarea
            id="lead-notes"
            placeholder="Observacoes"
            value={values.notes}
            onChange={(event) => handleChange("notes", event.target.value)}
          />
        </div>
        {customFieldDefinitions.length > 0 ? (
          <div className="space-y-3 md:col-span-2">
            <p className="text-sm font-medium">Campos personalizados</p>
            <div className="grid gap-4 md:grid-cols-2">
              {customFieldDefinitions.map((field) => {
                const rawValue = values.customFields[field.key]
                const inputValue =
                  rawValue === null || rawValue === undefined
                    ? ""
                    : String(rawValue)

                if (field.field_type === "boolean") {
                  const boolValue =
                    rawValue === null || rawValue === undefined
                      ? "unset"
                      : rawValue === true
                        ? "true"
                        : "false"
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label>
                        {field.label}
                        {isRequired(field.key) ? " *" : ""}
                      </Label>
                      <Select
                        value={boolValue}
                        onValueChange={(value) =>
                          handleCustomFieldChange(
                            field.key,
                            value === "unset" ? null : value === "true"
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unset">Selecionar</SelectItem>
                          <SelectItem value="true">Sim</SelectItem>
                          <SelectItem value="false">Nao</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }

                return (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={`custom-${field.key}`}>
                      {field.label}
                      {isRequired(field.key) ? " *" : ""}
                    </Label>
                    <Input
                      id={`custom-${field.key}`}
                      type={field.field_type === "number" ? "number" : "text"}
                      value={inputValue}
                      onChange={(event) =>
                        handleCustomFieldChange(field.key, event.target.value)
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
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
