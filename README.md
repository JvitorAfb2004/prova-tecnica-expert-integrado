# Prova tecnica — SDR CRM com IA

Mini CRM para equipes de SDR com funil de pre-vendas, campanhas e geracao de mensagens personalizadas via IA. O foco e entregar um MVP funcional com multi-workspace, RLS e fluxo de convites.

## Stack

- Frontend: React + Vite + TypeScript
- UI: Tailwind v4 + shadcn/ui
- Backend: Supabase (Postgres, Auth, Edge Functions)
- IA: Google Gemini 2.5 Flash

## Decisoes tecnicas

- Multi-workspace com isolamento por `workspace_id` e RLS nas tabelas principais.
- Convite interno: admin cria convite para um email; o convidado aceita e vira membro do workspace.
- Campos personalizados de leads em JSONB para flexibilidade por workspace.
- Geracao de mensagens via Edge Function; chave da Gemini armazenada em secret do Supabase.
- Seed de etapas do funil via trigger ao criar workspace.

## Modelo de dados (Supabase)

- workspaces
- workspace_members
- workspace_invites
- funnel_stages
- leads
- campaigns
- lead_messages

## Seguranca (RLS)

- workspaces: membro pode ler; admin atualiza/remove.
- workspace_members: admin gerencia; membros podem ler.
- workspace_invites: admin cria/gerencia; convidado le se email do JWT bater.
- funnel_stages, leads, campaigns, lead_messages: acesso por membro do workspace.

## Funcoes/Triggers

- `is_workspace_member`, `is_workspace_admin`
- `handle_workspace_created` (membership admin + etapas default)
- `accept_workspace_invite(token)` (convite interno)

## Funcionalidades

### Obrigatorias (MVP)

- [x] Autenticacao email/senha (Supabase Auth)
- [ ] Workspaces com isolamento de dados
- [ ] Gestao de leads (CRUD + campos padrao e personalizados)
- [ ] Funil de pre-vendas com etapas e Kanban
- [ ] Campanhas de abordagem
- [ ] Geracao de mensagens (2 a 3 variacoes)
- [ ] RLS no banco
- [ ] Dashboard com metricas basicas

### Diferenciais

- [ ] Geracao automatica por etapa gatilho
- [ ] Edicao de funil (criar/editar etapas)
- [ ] Multi-workspace por usuario
- [ ] Convite de usuarios com papeis
- [ ] Historico de atividades
- [ ] Historico de mensagens enviadas
- [ ] Filtros e busca de leads
- [ ] Metricas avancadas

## Como rodar localmente

1) Instalar dependencias
```bash
npm install
```

2) Variaveis de ambiente (frontend)
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

3) Rodar
```bash
npm run dev
```

## Variaveis de ambiente (Edge Functions)

- `GEMINI_API_KEY` (secret no Supabase)

## Deploy

- Link: (pendente)

## Video

- Link: (pendente)
