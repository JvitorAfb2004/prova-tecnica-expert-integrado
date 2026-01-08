import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  const [drafts, setDrafts] = React.useState<LeadMessageRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)
  const copyTimeoutRef = React.useRef<number | null>(null)

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

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setDrafts((data ?? []) as LeadMessageRow[])
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

    const { error: insertError } = await supabase
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

    setNotice("Mensagens geradas.")
    setLoading(false)
    await loadMessages()
    await onGenerated()
  }

  const handleSend = async (messageId: string, index: number) => {
    setNotice(null)
    setErrorMessage(null)
    setLoading(true)

    if (!selectedCampaignId) {
      setErrorMessage("Selecione uma campanha.")
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

    setNotice("Mensagem enviada.")
    setLoading(false)
    await loadMessages()
    await onSend()
  }

  const handleDeleteMessages = async (targetId: string) => {
    if (!targetId) return

    setErrorMessage(null)
    setNotice(null)
    setLoading(true)

    const { error } = await supabase
      .from("lead_messages")
      .delete()
      .eq("id", targetId)

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setNotice("Mensagens excluidas.")
    setLoading(false)
    setDeleteTargetId(null)
    await loadMessages()
    await onGenerated()
  }
  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice("Mensagem copiada.")
      setCopiedKey(key)
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedKey(null)
      }, 1500)
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
      {drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-lg border border-border/60 bg-muted/10 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="font-medium text-foreground">
                  Gerado em{" "}
                  {draft.created_at
                    ? new Date(draft.created_at).toLocaleString("pt-BR")
                    : "data indefinida"}
                </p>
                <AlertDialog
                  open={deleteTargetId === draft.id}
                  onOpenChange={(open) =>
                    setDeleteTargetId(open ? draft.id : null)
                  }
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setDeleteTargetId(draft.id)}
                    >
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir mensagens?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso remove este lote de mensagens geradas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteMessages(draft.id)}
                        disabled={loading}
                      >
                        {loading ? "Excluindo..." : "Excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="mt-3 space-y-2">
                {draft.variants.map((message, index) => {
                  const key = `${draft.id}-${index}`
                  return (
                    <div
                      key={key}
                      className="rounded-md border border-border/60 bg-muted/30 p-2 text-xs"
                    >
                      <p>{message}</p>
                      <div className="mt-2 flex justify-end gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => handleCopy(message, key)}
                        >
                          {copiedKey === key ? "Copiado" : "Copiar"}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          onClick={() => handleSend(draft.id, index)}
                          disabled={loading}
                        >
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )
                })}
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
