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
import { supabase } from "@/lib/supabase"

type AuthMode = "sign-in" | "sign-up"

export function AuthScreen() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Carregando</CardTitle>
            <CardDescription>Verificando sua sessao...</CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    )
  }

  if (!session) {
    return (
      <AuthShell>
        <AuthForm />
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <SignedInCard session={session} />
    </AuthShell>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            SDR CRM
          </p>
          <h1 className="text-2xl font-semibold">Acesso ao workspace</h1>
          <p className="text-sm text-muted-foreground">
            Entre com email e senha para continuar.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

function AuthForm() {
  const [mode, setMode] = React.useState<AuthMode>("sign-in")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    setNotice(null)

    const action =
      mode === "sign-in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })

    const { data, error } = await action

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (mode === "sign-up") {
      if (data.session) {
        setNotice("Conta criada. Voce ja esta logado.")
      } else {
        setNotice("Conta criada. Verifique seu email para confirmar.")
      }
    }

    setPassword("")
    setIsSubmitting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "sign-in" ? "Entrar" : "Criar conta"}
        </CardTitle>
        <CardDescription>
          {mode === "sign-in"
            ? "Use suas credenciais para acessar."
            : "Crie sua conta com email e senha."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
          {notice ? (
            <p className="text-sm text-muted-foreground">{notice}</p>
          ) : null}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Processando..."
              : mode === "sign-in"
                ? "Entrar"
                : "Criar conta"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-between text-sm text-muted-foreground">
        <span>
          {mode === "sign-in"
            ? "Nao tem conta?"
            : "Ja possui uma conta?"}
        </span>
        <Button
          type="button"
          variant="link"
          onClick={() =>
            setMode((current) =>
              current === "sign-in" ? "sign-up" : "sign-in"
            )
          }
        >
          {mode === "sign-in" ? "Criar conta" : "Entrar"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function SignedInCard({ session }: { session: Session }) {
  const userEmail = session.user.email ?? "usuario"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectado</CardTitle>
        <CardDescription>Voce ja possui sessao ativa.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Email: {userEmail}</p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="button" variant="outline" onClick={() => supabase.auth.signOut()}>
          Sair
        </Button>
      </CardFooter>
    </Card>
  )
}

function useSession() {
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
