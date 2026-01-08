import * as React from "react"

import { NavLink } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  to: string
}

type AppShellProps = {
  userEmail: string
  workspaceName?: string | null
  workspaceRole?: string | null
  workspaces?: { id: string; name: string }[]
  activeWorkspaceId?: string | null
  onWorkspaceChange?: (id: string) => void
  navItems: NavItem[]
  onSignOut: () => void
  children: React.ReactNode
}

export function AppShell({
  userEmail,
  workspaceName,
  workspaceRole,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  navItems,
  onSignOut,
  children,
}: AppShellProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const sidebar = (
    <div className="flex h-full flex-col gap-6">
      <div className="px-4 pt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          SDR CRM
        </p>
        <p className="text-lg font-semibold">Painel</p>
        {workspaces && workspaces.length > 0 && onWorkspaceChange ? (
          <div className="mt-3 space-y-2">
            <Select
              value={activeWorkspaceId ?? undefined}
              onValueChange={onWorkspaceChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {workspaceRole ? (
              <Badge variant="secondary">{workspaceRole}</Badge>
            ) : null}
          </div>
        ) : workspaceName ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium">{workspaceName}</p>
            {workspaceRole ? (
              <Badge variant="secondary">{workspaceRole}</Badge>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhum workspace ativo.
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/80",
                isActive && "bg-foreground text-background font-medium"
              )
            }
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/60 px-4 py-4">
        <p className="text-xs text-muted-foreground">Conta</p>
        <p className="text-sm font-medium">{userEmail}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          onClick={onSignOut}
        >
          Sair
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-56 border-r border-border/60 bg-background/90 lg:flex">
          {sidebar}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(true)}>
              Menu
            </Button>
            <div className="text-sm font-semibold">SDR CRM</div>
            {workspaceName ? (
              <Badge variant="secondary" className="max-w-[120px] truncate">
                {workspaceName}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Sem workspace</span>
            )}
          </header>

          <main className="flex-1 px-4 py-8 lg:px-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setIsOpen(false)}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 border-r border-border/60 bg-background/95 shadow-lg transition-transform lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-sm font-semibold">Menu</p>
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </div>
        {sidebar}
      </aside>
    </div>
  )
}
