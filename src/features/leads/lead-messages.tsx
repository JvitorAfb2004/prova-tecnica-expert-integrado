import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Campaign } from "@/features/campaigns/use-campaigns"
import type { LeadItem } from "@/features/leads/lead-types"
import { supabase } from "@/lib/supabase"

type LeadMessagesProps = {
  workspaceId: string
  lead: LeadItem
  campaigns: Campaign[]
  onSend: () => Promise<void>
  onGenerated: () => Promise<void>
}

type LeadMessageRow = {
  id: string
  variants: string[]
  selected_index: number | null
  created_at: string | null
}

export function LeadMessages({
  workspaceId,
  lead,
  campaigns,
  onSend,
  onGenerated,
}: LeadMessagesProps) {
  const activeCampaigns = campaigns.filter((campaign) => campaign.is_active)
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(
    null
  )
  const [variations, setVariations] = React.useState(3)
  const [messages, setMessages] = React.useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null)
  const [messageId, setMessageId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (selectedCampaignId) return
    if (activeCampaigns.length > 0) {
      setSelectedCampaignId(activeCampaigns[0].id)
    }
  }, [activeCampaigns, selectedCampaignId])

  const loadMessages = React.useCallback(async () => {
    if (!selectedCampaignId) return
    setLoading(true)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from("lead_messages")
      .select("id, variants, selected_index, created_at")
      .eq("lead_id", lead.id)
      .eq("campaign_id", selectedCampaignId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setMessages([])
      setSelectedIndex(null)
      setMessageId(null)
      setLoading(false)
      return
    }

    const row = data as LeadMessageRow
    setMessages(row.variants ?? [])
    setSelectedIndex(row.selected_index ?? null)
    setMessageId(row.id)
    setLoading(false)
  }, [lead.id, selectedCampaignId])

  React.useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const handleGenerate = async () => {
    setNotice(null)
    setErrorMessage(null)

    if (!selectedCampaignId) {
      setErrorMessage("Selecione uma campanha.")
      return
    }

    const campaign = activeCampaigns.find(
      (item) => item.id === selectedCampaignId
    )
    if (!campaign) {
      setErrorMessage("Campanha invalida.")
      return
    }

    setLoading(true)

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession()
    if (sessionError || !sessionData.session?.access_token) {
      setErrorMessage("Sessao expirada. Faça login novamente.")
      setLoading(false)
      return
    }

    const { data, error } = await supabase.functions.invoke("generate-messages", {
      body: {
        lead: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          job_title: lead.job_title,
          lead_source: lead.lead_source,
          notes: lead.notes,
          custom_fields: lead.custom_fields ?? {},
        },
        campaign: {
          name: campaign.name,
          context: campaign.context,
          prompt: campaign.prompt,
        },
        variations,
        locale: "pt-BR",
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    const nextMessages = (data as { messages?: string[] })?.messages ?? []
    if (nextMessages.length === 0) {
      setErrorMessage("Nenhuma mensagem retornada.")
      setLoading(false)
      return
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("lead_messages")
      .insert({
        workspace_id: workspaceId,
        lead_id: lead.id,
        campaign_id: campaign.id,
        variants: nextMessages,
        source: "manual",
        status: "draft",
      })
      .select("id")
      .single()

    if (insertError) {
      setErrorMessage(insertError.message)
      setLoading(false)
      return
    }

    setMessages(nextMessages)
    setSelectedIndex(null)
    setMessageId(insertedRow?.id ?? null)
    setNotice("Mensagens geradas.")
    setLoading(false)
    await onGenerated()
  }

  const handleSend = async (message: string, index: number) => {
    setNotice(null)
    setErrorMessage(null)
    setLoading(true)

    if (!selectedCampaignId) {
      setErrorMessage("Selecione uma campanha.")
      setLoading(false)
      return
    }

    if (!messageId) {
      setErrorMessage("Nenhuma mensagem gerada para enviar.")
      setLoading(false)
      return
    }

    const { data: updatedRow, error } = await supabase
      .from("lead_messages")
      .update({ status: "sent", selected_index: index })
      .eq("id", messageId)
      .eq("status", "draft")
      .select("id, selected_index")
      .maybeSingle()

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (!updatedRow) {
      setErrorMessage("Nenhuma mensagem pendente para envio.")
      setLoading(false)
      return
    }

    setSelectedIndex(updatedRow?.selected_index ?? index)
    setNotice("Mensagem enviada.")
    setLoading(false)
    await onSend()
  }
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice("Mensagem copiada.")
    } catch (_error) {
      setErrorMessage("Nao foi possivel copiar.")
    }
  }

  if (activeCampaigns.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma campanha ativa disponivel.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Resumo do lead</p>
        <div className="mt-2 grid gap-1">
          <p>Nome: {lead.name}</p>
          {lead.company ? <p>Empresa: {lead.company}</p> : null}
          {lead.job_title ? <p>Cargo: {lead.job_title}</p> : null}
          {lead.email ? <p>Email: {lead.email}</p> : null}
          {lead.phone ? <p>Telefone: {lead.phone}</p> : null}
          {lead.lead_source ? <p>Origem: {lead.lead_source}</p> : null}
          {lead.notes ? <p>Observacoes: {lead.notes}</p> : null}
          {lead.custom_fields &&
          Object.keys(lead.custom_fields).length > 0 ? (
            <p>
              Campos personalizados:{" "}
              {Object.entries(lead.custom_fields)
                .filter(([, value]) => value !== null && value !== "")
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join(", ")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedCampaignId ?? ""}
          onValueChange={(value) => setSelectedCampaignId(value)}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent>
            {activeCampaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(variations)}
          onValueChange={(value) => setVariations(Number(value))}
        >
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Variacoes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 variacoes</SelectItem>
            <SelectItem value="3">3 variacoes</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={handleGenerate} disabled={loading}>
          {loading ? "Gerando..." : "Gerar mensagens"}
        </Button>
      </div>
      {errorMessage ? (
        <p className="text-xs text-destructive">{errorMessage}</p>
      ) : null}
      {notice ? (
        <p className="text-xs text-muted-foreground">{notice}</p>
      ) : null}
      {messages.length > 0 ? (
        <div className="space-y-2">
          {messages.map((message, index) => {
            const isSent = selectedIndex === index
            return (
            <div
              key={`${lead.id}-${index}`}
              className="rounded-md border border-border/60 bg-muted/30 p-2 text-xs"
            >
              <p>{message}</p>
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => handleCopy(message)}
                >
                  Copiar
                </Button>
                <Button
                  type="button"
                  size="xs"
                  onClick={() => handleSend(message, index)}
                  disabled={loading || isSent}
                >
                  {isSent ? "Enviado" : "Enviar"}
                </Button>
              </div>
            </div>
          )})}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma mensagem gerada para este lead.
        </p>
      )}
    </div>
  )
}
