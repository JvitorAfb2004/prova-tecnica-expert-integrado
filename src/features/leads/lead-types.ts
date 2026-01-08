export type LeadCustomFields = Record<string, unknown> | null

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
  custom_fields: LeadCustomFields
}
