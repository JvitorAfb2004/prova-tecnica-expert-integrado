import "jsr:@supabase/functions-js/edge-runtime.d.ts"

type LeadPayload = {
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  job_title?: string | null
  lead_source?: string | null
  notes?: string | null
  custom_fields?: Record<string, string | number | boolean | null>
}

type CampaignPayload = {
  name: string
  context: string | Record<string, unknown>
  prompt: string | Record<string, unknown>
}

type GenerateRequest = {
  lead: LeadPayload
  campaign: CampaignPayload
  variations?: number
  locale?: string
}

type GenerateResponse = {
  messages: string[]
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY")
  if (!apiKey) {
    return jsonResponse({ error: "missing_gemini_api_key" }, 500)
  }

  let payload: GenerateRequest
  try {
    payload = await req.json()
  } catch (_error) {
    return jsonResponse({ error: "invalid_json" }, 400)
  }

  const validationError = validatePayload(payload)
  if (validationError) {
    return jsonResponse({ error: validationError }, 400)
  }

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash"
  const variations = clampVariations(payload.variations ?? 3)
  const prompt = buildPrompt(payload.lead, payload.campaign, variations, payload.locale)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()
    return jsonResponse({ error: "gemini_error", details: errorBody }, 500)
  }

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  const messages = parseMessages(rawText, variations)

  if (messages.length === 0) {
    return jsonResponse({ error: "empty_generation" }, 502)
  }

  const result: GenerateResponse = { messages }
  return jsonResponse(result, 200)
})

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function validatePayload(payload: GenerateRequest | undefined) {
  if (!payload) return "missing_payload"
  if (!payload.lead?.name) return "missing_lead_name"
  if (!payload.campaign?.name) return "missing_campaign_name"
  if (!payload.campaign?.context) return "missing_campaign_context"
  if (!payload.campaign?.prompt) return "missing_campaign_prompt"
  return null
}

function clampVariations(value: number) {
  if (!Number.isFinite(value)) return 3
  return Math.min(5, Math.max(1, Math.round(value)))
}

function buildPrompt(
  lead: LeadPayload,
  campaign: CampaignPayload,
  variations: number,
  locale?: string
) {
  const contextText = normalizeValue(campaign.context)
  const promptText = normalizeValue(campaign.prompt)
  const customFields = formatCustomFields(lead.custom_fields)
  const language = locale ?? "pt-BR"

  const leadLines = [
    `Nome: ${lead.name}`,
    lead.company ? `Empresa: ${lead.company}` : null,
    lead.job_title ? `Cargo: ${lead.job_title}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.phone ? `Telefone: ${lead.phone}` : null,
    lead.lead_source ? `Origem: ${lead.lead_source}` : null,
    lead.notes ? `Observacoes: ${lead.notes}` : null,
    customFields ? `Campos personalizados: ${customFields}` : null,
  ].filter(Boolean)

  return [
    `Voce e um SDR escrevendo mensagens de prospeccao.`,
    `Idioma: ${language}.`,
    `Campanha: ${campaign.name}.`,
    `Contexto da campanha: ${contextText}.`,
    `Instrucoes adicionais: ${promptText}.`,
    `Dados do lead:\n${leadLines.join("\n")}`,
    `Gere ${variations} variacoes curtas e objetivas.`,
    `Responda apenas com um JSON array de strings.`,
  ].join("\n")
}

function normalizeValue(value: string | Record<string, unknown>) {
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

function formatCustomFields(fields?: Record<string, string | number | boolean | null>) {
  if (!fields) return ""
  const entries = Object.entries(fields)
    .filter(([, val]) => val !== null && val !== undefined && val !== "")
    .map(([key, val]) => `${key}: ${String(val)}`)

  if (entries.length === 0) return ""
  return entries.join(", ")
}

function parseMessages(rawText: string, variations: number) {
  if (!rawText) return []

  try {
    const parsed = JSON.parse(rawText)
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string").slice(0, variations)
    }
    if (parsed && Array.isArray(parsed.messages)) {
      return parsed.messages
        .filter((item: unknown) => typeof item === "string")
        .slice(0, variations)
    }
  } catch (_error) {
    // ignored
  }

  const fallback = rawText
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)

  return fallback.slice(0, variations)
}
