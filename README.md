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

## Migrations

- SQL versionado em `supabase/migrations`

## Funcionalidades

### Obrigatorias (MVP)

- [x] Autenticacao email/senha (Supabase Auth)
- [x] Workspaces com isolamento de dados
- [ ] Gestao de leads (CRUD + campos padrao e personalizados)
- [x] CRUD basico de leads (campos padrao)
- [ ] Funil de pre-vendas com etapas e Kanban
- [x] Visualizacao de leads por etapas (sem drag and drop)
- [ ] Campanhas de abordagem
- [ ] Geracao de mensagens (2 a 3 variacoes)
- [ ] RLS no banco
- [ ] Dashboard com metricas basicas

### Diferenciais

- [ ] Geracao automatica por etapa gatilho
- [ ] Edicao de funil (criar/editar etapas)
- [x] Multi-workspace por usuario
- [x] Convite de usuarios com papeis
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
- `GEMINI_MODEL` (opcional, default `gemini-2.5-flash`)

## Edge Function: generate-messages

- Endpoint: `POST /functions/v1/generate-messages`
- Request JSON:
  - `lead.name` (string, obrigatorio)
  - `lead.email`, `lead.phone`, `lead.company`, `lead.job_title`, `lead.lead_source`, `lead.notes` (opcional)
  - `lead.custom_fields` (objeto, opcional)
  - `campaign.name` (string, obrigatorio)
  - `campaign.context` (string ou objeto, obrigatorio)
  - `campaign.prompt` (string ou objeto, obrigatorio)
  - `variations` (number, opcional, 1-5)
- Response JSON:
  - `messages` (string[])

## Deploy

- Link: (pendente)

## Video

- Link: (pendente)
