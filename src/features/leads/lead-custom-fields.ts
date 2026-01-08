import type { LeadFieldDefinition } from "@/features/leads/use-lead-field-definitions"

export type LeadCustomFieldValues = Record<string, string | boolean | null>

export function normalizeCustomFields(
  definitions: LeadFieldDefinition[],
  current: Record<string, unknown> | null | undefined
) {
  const result: LeadCustomFieldValues = {}

  definitions.forEach((definition) => {
    const rawValue = current?.[definition.key]
    if (definition.field_type === "boolean") {
      result[definition.key] =
        typeof rawValue === "boolean" ? rawValue : null
      return
    }

    if (definition.field_type === "number") {
      if (typeof rawValue === "number") {
        result[definition.key] = String(rawValue)
      } else if (typeof rawValue === "string") {
        result[definition.key] = rawValue
      } else {
        result[definition.key] = null
      }
      return
    }

    if (typeof rawValue === "string") {
      result[definition.key] = rawValue
    } else {
      result[definition.key] = null
    }
  })

  return result
}

export function buildCustomFieldsPayload(
  values: LeadCustomFieldValues,
  definitions: LeadFieldDefinition[]
) {
  const payload: Record<string, string | number | boolean | null> = {}

  definitions.forEach((definition) => {
    const rawValue = values[definition.key]

    if (definition.field_type === "number") {
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        payload[definition.key] = null
        return
      }
      const parsed = Number(rawValue)
      payload[definition.key] = Number.isFinite(parsed) ? parsed : null
      return
    }

    if (definition.field_type === "boolean") {
      if (typeof rawValue === "boolean") {
        payload[definition.key] = rawValue
        return
      }
      if (rawValue === "true") {
        payload[definition.key] = true
        return
      }
      if (rawValue === "false") {
        payload[definition.key] = false
        return
      }
      payload[definition.key] = null
      return
    }

    if (rawValue === null || rawValue === undefined) {
      payload[definition.key] = null
      return
    }

    const textValue = String(rawValue).trim()
    payload[definition.key] = textValue.length > 0 ? textValue : null
  })

  return payload
}
