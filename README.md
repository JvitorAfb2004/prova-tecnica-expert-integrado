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

## Funcionalidades

### Obrigatorias (MVP)

- [ ] Autenticacao email/senha (Supabase Auth)
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
