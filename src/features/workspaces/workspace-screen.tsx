import * as React from "react"
import type { Session } from "@supabase/supabase-js"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CampaignsPanel } from "@/features/campaigns/campaigns-panel"
import { LeadsBoard } from "@/features/leads/leads-board"
import { CustomFieldsPanel } from "@/features/leads/custom-fields-panel"
import { StageRequirementsPanel } from "@/features/leads/stage-requirements-panel"
import { useFunnelStages } from "@/features/funnel/use-funnel-stages"
import { WorkspaceInvites } from "@/features/workspaces/workspace-invites"
import { useActiveWorkspaceId } from "@/features/workspaces/use-active-workspace"
import { supabase } from "@/lib/supabase"

type WorkspaceRole = "admin" | "member"

type WorkspaceItem = {
  id: string
  name: string
  role: WorkspaceRole
  createdAt: string | null
}

type WorkspaceMemberRow = {
  workspace_id: string
  role: WorkspaceRole
  workspaces:
    | {
        id: string
        name: string
        created_at: string | null
      }
    | {
        id: string
        name: string
        created_at: string | null
      }[]
    | null
}

export function WorkspaceScreen({ session }: { session: Session }) {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspaceId()
  const { stages } = useFunnelStages(activeWorkspaceId)

  const loadWorkspaces = React.useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces (id, name, created_at)")
      .order("created_at", { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    const mapped = (data ?? [])
      .map((row) => mapWorkspaceRow(row as WorkspaceMemberRow))
      .filter(Boolean) as WorkspaceItem[]

    setWorkspaces(mapped)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  React.useEffect(() => {
    if (loading || workspaces.length === 0) return

    const hasActive = workspaces.some((item) => item.id === activeWorkspaceId)
    if (!hasActive) {
      setActiveWorkspaceId(workspaces[0].id)
    }
  }, [activeWorkspaceId, loading, setActiveWorkspaceId, workspaces])

  const handleCreateWorkspace = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    setIsSubmitting(true)
    setNotice(null)
    setErrorMessage(null)

    const name = newWorkspaceName.trim()
    if (!name) {
      setErrorMessage("Informe um nome para o workspace.")
      setIsSubmitting(false)
      return
    }

    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        name,
        created_by: session.user.id,
      })
      .select("id, name, created_at")
      .single()

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setNewWorkspaceName("")
    setActiveWorkspaceId(data.id)
    setNotice("Workspace criado.")
    setIsSubmitting(false)
    await loadWorkspaces()
  }

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId
  )

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            SDR CRM
          </p>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Selecione um workspace para continuar ou crie um novo.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace ativo</CardTitle>
            <CardDescription>
              {activeWorkspace
                ? "Voce ja pode seguir para o CRM."
                : "Nenhum workspace selecionado ainda."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeWorkspace ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{activeWorkspace.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Papel: {activeWorkspace.role}
                  </p>
                </div>
                <Badge variant="secondary">Ativo</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Escolha um workspace abaixo para ativar.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seus workspaces</CardTitle>
            <CardDescription>
              {loading
                ? "Carregando workspaces..."
                : "Gerencie os workspaces que voce participa."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            {notice ? (
              <p className="text-sm text-muted-foreground">{notice}</p>
            ) : null}
            {loading ? (
              <p className="text-sm text-muted-foreground">Aguarde...</p>
            ) : workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum workspace encontrado. Crie o primeiro abaixo.
              </p>
            ) : (
              <div className="space-y-3">
                {workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{workspace.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Papel: {workspace.role}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={
                        workspace.id === activeWorkspaceId ? "secondary" : "outline"
                      }
                      onClick={() => setActiveWorkspaceId(workspace.id)}
                    >
                      {workspace.id === activeWorkspaceId
                        ? "Selecionado"
                        : "Selecionar"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" variant="outline" onClick={() => supabase.auth.signOut()}>
              Sair
            </Button>
          </CardFooter>
        </Card>

        {activeWorkspace ? (
          <>
            <WorkspaceInvites
              session={session}
              workspaceId={activeWorkspace.id}
              isAdmin={activeWorkspace.role === "admin"}
              onRefresh={loadWorkspaces}
            />
            <CustomFieldsPanel
              workspaceId={activeWorkspace.id}
              isAdmin={activeWorkspace.role === "admin"}
            />
            <StageRequirementsPanel
              workspaceId={activeWorkspace.id}
              isAdmin={activeWorkspace.role === "admin"}
            />
            <CampaignsPanel workspaceId={activeWorkspace.id} stages={stages} />
            <LeadsBoard
              workspaceId={activeWorkspace.id}
              workspaceName={activeWorkspace.name}
            />
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Criar workspace</CardTitle>
            <CardDescription>
              Defina o nome da empresa ou equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateWorkspace}>
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Nome do workspace</Label>
                <Input
                  id="workspace-name"
                  placeholder="Ex: Vibe Sales"
                  value={newWorkspaceName}
                  onChange={(event) => setNewWorkspaceName(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function mapWorkspaceRow(row: WorkspaceMemberRow): WorkspaceItem | null {
  if (!row.workspaces) return null
  const workspace = Array.isArray(row.workspaces)
    ? row.workspaces[0]
    : row.workspaces

  if (!workspace) return null

  return {
    id: workspace.id ?? row.workspace_id,
    name: workspace.name,
    role: row.role,
    createdAt: workspace.created_at,
  }
}
