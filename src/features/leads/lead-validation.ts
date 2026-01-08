import type { LeadFieldDefinition } from "@/features/leads/use-lead-field-definitions"
import { getFieldLabel } from "@/features/leads/lead-fields"

export type LeadValidationInput = {
  name?: string | null
  email?: string | null
  phone?: string | null
  company?: string | null
  job_title?: string | null
  lead_source?: string | null
  notes?: string | null
  custom_fields?: Record<string, unknown> | null
}

export function getMissingFields(
  requiredFields: string[] | null | undefined,
  lead: LeadValidationInput,
  definitions: LeadFieldDefinition[]
) {
  if (!requiredFields || requiredFields.length === 0) {
    return []
  }

  const missing: string[] = []

  requiredFields.forEach((fieldKey) => {
    if (isStandardField(fieldKey)) {
      const value = lead[fieldKey as keyof LeadValidationInput]
      if (isEmpty(value)) {
        missing.push(getFieldLabel(fieldKey, definitions))
      }
      return
    }

    const customValue = lead.custom_fields?.[fieldKey]
    if (isEmpty(customValue)) {
      missing.push(getFieldLabel(fieldKey, definitions))
    }
  })

  return missing
}

function isEmpty(value: unknown) {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim().length === 0
  return false
}

function isStandardField(key: string) {
  return [
    "name",
    "email",
    "phone",
    "company",
    "job_title",
    "lead_source",
    "notes",
  ].includes(key)
}
