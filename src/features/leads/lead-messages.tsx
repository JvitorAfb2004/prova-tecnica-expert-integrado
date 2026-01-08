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
  onGenerated: () => Promise<void>
}

type LeadMessageRow = {
  id: string
  variants: string[]
  created_at: string | null
}

export function LeadMessages({
  workspaceId,
  lead,
  campaigns,
  onGenerated,
}: LeadMessagesProps) {
  const activeCampaigns = campaigns.filter((campaign) => campaign.is_active)
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(
    null
  )
  const [variations, setVariations] = React.useState(3)
  const [messages, setMessages] = React.useState<string[]>([])
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
      .select("id, variants, created_at")
      .eq("lead_id", lead.id)
      .eq("campaign_id", selectedCampaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    const row = data as LeadMessageRow | null
    setMessages(row?.variants ?? [])
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

    const { error: insertError } = await supabase.from("lead_messages").insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      campaign_id: campaign.id,
      variants: nextMessages,
      source: "manual",
      status: "draft",
    })

    if (insertError) {
      setErrorMessage(insertError.message)
      setLoading(false)
      return
    }

    setMessages(nextMessages)
    setNotice("Mensagens geradas.")
    setLoading(false)
    await onGenerated()
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
          {messages.map((message, index) => (
            <div
              key={`${lead.id}-${index}`}
              className="rounded-md border border-border/60 bg-muted/30 p-2 text-xs"
            >
              <p>{message}</p>
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => handleCopy(message)}
                >
                  Copiar
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma mensagem gerada para este lead.
        </p>
      )}
    </div>
  )
}
