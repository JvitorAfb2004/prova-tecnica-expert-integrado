import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { FunnelStage } from "@/features/funnel/use-funnel-stages"
import { useCampaigns } from "@/features/campaigns/use-campaigns"
import { supabase } from "@/lib/supabase"

type CampaignsPanelProps = {
  workspaceId: string
  stages: FunnelStage[]
}

type CampaignFormValues = {
  name: string
  context: string
  prompt: string
  triggerStageId: string | null
}

export function CampaignsPanel({ workspaceId, stages }: CampaignsPanelProps) {
  const { campaigns, loading, errorMessage, refresh } =
    useCampaigns(workspaceId)
  const [values, setValues] = React.useState<CampaignFormValues>({
    name: "",
    context: "",
    prompt: "",
    triggerStageId: null,
  })
  const [notice, setNotice] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleChange = (field: keyof CampaignFormValues, value: string | null) => {
    setValues((current) => ({
      ...current,
      [field]: value ?? "",
    }))
  }

  const handleCreateCampaign = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    setNotice(null)
    setSubmitError(null)

    const name = values.name.trim()
    if (!name) {
      setSubmitError("Informe o nome da campanha.")
      return
    }

    const context = values.context.trim()
    const prompt = values.prompt.trim()
    if (!context || !prompt) {
      setSubmitError("Preencha contexto e prompt.")
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.from("campaigns").insert({
      workspace_id: workspaceId,
      name,
      context,
      prompt,
      trigger_stage_id: values.triggerStageId,
      is_active: true,
    })

    if (error) {
      setSubmitError(error.message)
      setIsSubmitting(false)
      return
    }

    setValues({
      name: "",
      context: "",
      prompt: "",
      triggerStageId: null,
    })
    setNotice("Campanha criada.")
    setIsSubmitting(false)
    await refresh()
  }

  const handleDelete = async (campaignId: string) => {
    if (!window.confirm("Excluir esta campanha?")) return

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)

    if (error) {
      setSubmitError(error.message)
      return
    }

    await refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campanhas</CardTitle>
        <CardDescription>
          Crie campanhas com contexto e prompt para gerar mensagens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}
        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}
        {notice ? (
          <p className="text-sm text-muted-foreground">{notice}</p>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha cadastrada.
          </p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.is_active ? "Ativa" : "Inativa"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(campaign.id)}
                  >
                    Excluir
                  </Button>
                </div>
                {campaign.trigger_stage_id ? (
                  <p className="text-xs text-muted-foreground">
                    Gatilho:{" "}
                    {stages.find((stage) => stage.id === campaign.trigger_stage_id)
                      ?.name ?? "Etapa removida"}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <form className="space-y-3" onSubmit={handleCreateCampaign}>
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nome</Label>
            <Input
              id="campaign-name"
              placeholder="Black Friday 2024"
              value={values.name}
              onChange={(event) => handleChange("name", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-context">Contexto</Label>
            <Textarea
              id="campaign-context"
              placeholder="Descricao da oferta, produto, empresa, condicoes..."
              value={values.context}
              onChange={(event) => handleChange("context", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-prompt">Prompt</Label>
            <Textarea
              id="campaign-prompt"
              placeholder="Persona, tom de voz, formato, exemplos..."
              value={values.prompt}
              onChange={(event) => handleChange("prompt", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-trigger">Etapa gatilho (opcional)</Label>
            <Select
              value={values.triggerStageId ?? "none"}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  triggerStageId: value === "none" ? null : value,
                }))
              }
            >
              <SelectTrigger id="campaign-trigger" className="w-full">
                <SelectValue placeholder="Sem gatilho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem gatilho</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar campanha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
