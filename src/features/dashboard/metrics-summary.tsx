import * as React from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type StageItem = {
  id: string
  name: string
}

type LeadItem = {
  stage_id: string | null
}

type MetricsSummaryProps = {
  stages: StageItem[]
  leads: LeadItem[]
  loading: boolean
}

export function MetricsSummary({ stages, leads, loading }: MetricsSummaryProps) {
  const total = leads.length

  const counts = React.useMemo(() => {
    const map = new Map<string, number>()
    stages.forEach((stage) => map.set(stage.id, 0))
    let unassigned = 0

    leads.forEach((lead) => {
      if (lead.stage_id && map.has(lead.stage_id)) {
        map.set(lead.stage_id, (map.get(lead.stage_id) ?? 0) + 1)
      } else {
        unassigned += 1
      }
    })

    return { map, unassigned }
  }, [leads, stages])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>Metricas basicas do workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando metricas...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Total de leads</p>
              <p className="text-2xl font-semibold">{total}</p>
            </div>
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <p className="text-xs text-muted-foreground">{stage.name}</p>
                <Badge variant="secondary">{counts.map.get(stage.id) ?? 0}</Badge>
              </div>
            ))}
            {counts.unassigned > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Sem etapa</p>
                <Badge variant="secondary">{counts.unassigned}</Badge>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
