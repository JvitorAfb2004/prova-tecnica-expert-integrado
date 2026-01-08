import * as React from "react"
import type { Session } from "@supabase/supabase-js"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"

type WorkspaceRole = "admin" | "member"

type WorkspaceInviteProps = {
  session: Session
  workspaceId: string | null
  isAdmin: boolean
  onRefresh: () => Promise<void>
}

export function WorkspaceInvites({
  session,
  workspaceId,
  isAdmin,
  onRefresh,
}: WorkspaceInviteProps) {
  return (
    <div className="space-y-6">
      {isAdmin ? (
        <CreateInviteCard
          session={session}
          workspaceId={workspaceId}
          onRefresh={onRefresh}
        />
      ) : null}
      <AcceptInviteCard onRefresh={onRefresh} />
    </div>
  )
}

type CreateInviteProps = {
  session: Session
  workspaceId: string | null
  onRefresh: () => Promise<void>
}

function CreateInviteCard({
  session,
  workspaceId,
  onRefresh,
}: CreateInviteProps) {
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<WorkspaceRole>("member")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [invites, setInvites] = React.useState<WorkspaceInviteRow[]>([])
  const [invitesLoading, setInvitesLoading] = React.useState(true)
  const [invitesError, setInvitesError] = React.useState<string | null>(null)

  const loadInvites = React.useCallback(async () => {
    if (!workspaceId) {
      setInvites([])
      setInvitesLoading(false)
      return
    }

    setInvitesLoading(true)
    setInvitesError(null)

    const { data, error } = await supabase
      .from("workspace_invites")
      .select("id, email, role, status, token, created_at, expires_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      setInvitesError(error.message)
      setInvitesLoading(false)
      return
    }

    setInvites((data ?? []) as WorkspaceInviteRow[])
    setInvitesLoading(false)
  }, [workspaceId])

  React.useEffect(() => {
    loadInvites()
  }, [loadInvites])

  const handleCreateInvite = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    setNotice(null)
    setErrorMessage(null)
    setToken(null)
    setIsSubmitting(true)

    const trimmedEmail = email.trim().toLowerCase()
    if (!workspaceId) {
      setErrorMessage("Selecione um workspace antes de convidar.")
      setIsSubmitting(false)
      return
    }

    if (!trimmedEmail) {
      setErrorMessage("Informe o email do convidado.")
      setIsSubmitting(false)
      return
    }

    const { data, error } = await supabase
      .from("workspace_invites")
      .insert({
        workspace_id: workspaceId,
        email: trimmedEmail,
        role,
        invited_by: session.user.id,
      })
      .select("token")
      .single()

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setToken(data?.token ?? null)
    setNotice("Convite criado.")
    setEmail("")
    setIsSubmitting(false)
    await onRefresh()
    await loadInvites()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar convite</CardTitle>
        <CardDescription>
          Gere um token e compartilhe com o convidado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleCreateInvite}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email do convidado</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="convidado@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Perfil</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as WorkspaceRole)}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue placeholder="Selecione o papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
          {notice ? (
            <p className="text-sm text-muted-foreground">{notice}</p>
          ) : null}
          {token ? (
            <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs">
              Token: <span className="font-mono">{token}</span>
            </div>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Gerar convite"}
          </Button>
        </form>
        <div className="mt-6 border-t border-border/70 pt-4">
          <p className="text-sm font-medium">Historico de convites</p>
          {invitesError ? (
            <p className="mt-2 text-sm text-destructive">{invitesError}</p>
          ) : null}
          {invitesLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : invites.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum convite criado ainda.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-lg border border-border/60 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{invite.email}</p>
                    <span className="text-muted-foreground">{invite.status}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-muted-foreground">
                    <span>Papel: {invite.role}</span>
                    <span>
                      Criado em{" "}
                      {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <span>
                      Expira{" "}
                      {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-2 rounded-md bg-muted/40 px-2 py-1 font-mono">
                    {invite.token}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

type AcceptInviteProps = {
  onRefresh: () => Promise<void>
}

function AcceptInviteCard({ onRefresh }: AcceptInviteProps) {
  const [token, setToken] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleAcceptInvite = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    setNotice(null)
    setErrorMessage(null)
    setIsSubmitting(true)

    const trimmedToken = token.trim()
    if (!trimmedToken) {
      setErrorMessage("Informe o token do convite.")
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase.rpc("accept_workspace_invite", {
      p_token: trimmedToken,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setNotice("Convite aceito.")
    setToken("")
    setIsSubmitting(false)
    await onRefresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aceitar convite</CardTitle>
        <CardDescription>
          Cole o token recebido para entrar em outro workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleAcceptInvite}>
          <div className="space-y-2">
            <Label htmlFor="invite-token">Token do convite</Label>
            <Input
              id="invite-token"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
          </div>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
          {notice ? (
            <p className="text-sm text-muted-foreground">{notice}</p>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Validando..." : "Aceitar convite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

type WorkspaceInviteRow = {
  id: string
  email: string
  role: WorkspaceRole
  status: string
  token: string
  created_at: string
  expires_at: string
}
