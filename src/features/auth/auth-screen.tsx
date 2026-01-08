import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

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
  return (
    <AuthShell>
      <AuthForm />
    </AuthShell>
  )
}

export function AuthLoading() {
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
  const [showPassword, setShowPassword] = React.useState(false)
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

    if (data?.session) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      if (sessionError) {
        setErrorMessage(sessionError.message)
        setIsSubmitting(false)
        return
      }
    }

    if (mode === "sign-up") {
      setNotice("Conta criada. Voce ja esta logado.")
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </div>
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
