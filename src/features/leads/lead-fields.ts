import type { LeadFieldDefinition } from "@/features/leads/use-lead-field-definitions"

export type LeadFieldOption = {
  key: string
  label: string
}

export const standardLeadFields: LeadFieldOption[] = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "company", label: "Empresa" },
  { key: "job_title", label: "Cargo" },
  { key: "lead_source", label: "Origem do lead" },
  { key: "notes", label: "Observacoes" },
]

export const reservedLeadFieldKeys = new Set(
  standardLeadFields.map((field) => field.key)
)

export function listAvailableFields(definitions: LeadFieldDefinition[]) {
  const custom = definitions.map((def) => ({
    key: def.key,
    label: def.label,
  }))
  return [...standardLeadFields, ...custom]
}

export function getFieldLabel(
  key: string,
  definitions: LeadFieldDefinition[]
) {
  const standard = standardLeadFields.find((field) => field.key === key)
  if (standard) return standard.label
  const custom = definitions.find((field) => field.key === key)
  return custom?.label ?? key
}
