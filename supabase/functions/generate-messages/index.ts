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

  let messages: string[] = []
  try {
    messages = await generateMessages({
      apiKey,
      model,
      prompt,
      variations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error"
    return jsonResponse({ error: "gemini_error", details: message }, 500)
  }

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
    `Responda apenas com um JSON valido.`,
    `Formato obrigatorio: ["Mensagem 1.","Mensagem 2.","Mensagem 3."].`,
    `Nao inclua markdown, comentarios, nem texto fora do JSON.`,
    `Nao envolva o JSON em uma string.`,
    `Nao adicione texto antes ou depois do JSON.`,
    `Nao use quebras de linha no JSON.`,
    `Nao use placeholders como "[Seu Nome]" ou "[Sua Empresa]".`,
    `Use apenas os dados fornecidos no contexto e do lead.`,
    `Finalize cada mensagem com pontuacao.`,
    `Cada mensagem deve ter no maximo 220 caracteres.`,
    `Nao use reticencias.`,
    `Nao invente informacoes ausentes.`,
    `Nao use colchetes dentro das mensagens.`,
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
  return parseMessagesInternal(rawText, variations, 0)
}

function parseMessagesInternal(rawText: string, variations: number, depth: number) {
  if (!rawText) return []

  const cleaned = stripCodeFences(rawText).trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (typeof parsed === "string") {
      if (depth >= 2) return []
      return parseMessagesInternal(parsed, variations, depth + 1)
    }
    if (Array.isArray(parsed)) {
      return sanitizeMessages(parsed, variations)
    }
    if (parsed && Array.isArray(parsed.messages)) {
      return sanitizeMessages(parsed.messages, variations)
    }
  } catch (_error) {
    // ignored
  }

  const extracted = extractJsonArray(cleaned)
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted)
      if (typeof parsed === "string") {
        if (depth >= 2) return []
        return parseMessagesInternal(parsed, variations, depth + 1)
      }
      if (Array.isArray(parsed)) {
        return sanitizeMessages(parsed, variations)
      }
    } catch (_error) {
      // ignored
    }
  }

  const quoted = extractQuotedStrings(cleaned)
  if (quoted.length > 0) {
    return sanitizeMessages(quoted, variations)
  }

  const fallback = cleaned
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line && line !== "[" && line !== "]")

  return fallback.slice(0, variations)
}

function stripCodeFences(text: string) {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
}

function extractJsonArray(text: string) {
  const match = text.match(/\[[\s\S]*\]/)
  return match ? match[0] : null
}

function extractQuotedStrings(text: string) {
  const matches = text.match(/"([^"]+)"/g) ?? []
  return matches.map((match) => match.replace(/"/g, "")).filter(Boolean)
}

function sanitizeMessages(messages: unknown[], variations: number) {
  return messages
    .filter((item) => typeof item === "string")
    .map((item) =>
      item
        .trim()
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .replace(/^"+/, "")
        .replace(/"+$/, "")
        .trim()
    )
    .filter((item) => item && item !== "[" && item !== "]")
    .slice(0, variations)
}

function collectMessages(texts: string[], variations: number) {
  const collected: string[] = []

  for (const text of texts) {
    const parsed = parseMessages(text, variations)
    for (const message of parsed) {
      if (collected.includes(message)) continue
      collected.push(message)
      if (collected.length >= variations) {
        return collected.slice(0, variations)
      }
    }
  }

  return collected.slice(0, variations)
}

async function generateMessages({
  apiKey,
  model,
  prompt,
  variations,
}: {
  apiKey: string
  model: string
  prompt: string
  variations: number
}) {
  const candidateTexts = await callGemini({
    apiKey,
    model,
    prompt,
    variations,
    temperature: 0.4,
  })
  const messages = filterMessages(
    collectMessages(candidateTexts.length > 0 ? candidateTexts : [""], variations)
  )

  return messages.slice(0, variations)
}

async function callGemini({
  apiKey,
  model,
  prompt,
  variations,
  temperature,
}: {
  apiKey: string
  model: string
  prompt: string
  variations: number
  temperature: number
}) {
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
          temperature,
          maxOutputTokens: 512,
          candidateCount: variations,
          responseMimeType: "application/json",
        },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`gemini_error:${errorBody}`)
  }

  const data = await response.json()
  return (data?.candidates ?? [])
    .map((candidate: { content?: { parts?: { text?: string }[] } }) => {
      const parts = candidate?.content?.parts ?? []
      const text = parts.map((part) => part?.text ?? "").join("").trim()
      return text
    })
    .filter((text: string) => text && text.trim().length > 0)
}

function filterMessages(messages: string[]) {
  return messages
    .map((message) => normalizeMessage(message))
    .filter((message) => message.length > 0)
    .filter((message) => !message.includes("[") && !message.includes("]"))
    .filter((message) => !/seu\s+nome|sua\s+empresa|seu\s+cargo/i.test(message))
    .filter((message) => /[.!?]$/.test(message))
    .filter((message) => message.length <= 220)
}

function normalizeMessage(message: string) {
  return message
    .trim()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/^"+/, "")
    .replace(/"+$/, "")
    .replace(/\s+/g, " ")
    .trim()
}
