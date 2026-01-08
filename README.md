# Prova tecnica - SDR CRM com IA

Mini CRM para equipes de SDR com funil de pre-vendas, campanhas e geracao de mensagens personalizadas via IA. O foco e entregar um MVP funcional com multi-workspace, RLS e fluxo de convites.

## Links

- Repositorio: https://github.com/JvitorAfb2004/prova-tecnica-expert-integrado
- Aplicacao publicada: https://prova-tecnica-expert-integrado.vercel.app
- Video: https://drive.google.com/file/d/1gJlieLEVFfL_hnDLVJXXL_ophlQRwVgs/view?usp=sharing

## Stack

- Frontend: React + Vite + TypeScript
- UI: Tailwind v4 + shadcn/ui
- Roteamento: React Router
- Backend: Supabase (Postgres, Auth, Edge Functions)
- IA: Google Gemini 2.5 Flash

## Funcionalidades

### MVP (implementado)

- [x] Autenticacao email/senha (Supabase Auth)
- [x] Workspaces com isolamento de dados
- [x] Multi-workspace por usuario
- [x] Convites de usuarios com papeis (admin/membro)
- [x] CRUD de leads (campos padrao)
- [x] Campos personalizados por workspace (JSONB)
- [x] Responsavel pelo lead (opcional)
- [x] Funil com etapas e visualizacao em Kanban
- [x] Drag and drop de leads entre etapas
- [x] Campanhas de abordagem
- [x] Geracao de mensagens IA (2-3 variacoes)
- [x] Envio simulado movendo para "Tentando Contato"
- [x] Regras de transicao por etapa (campos obrigatorios)
- [x] Dashboard com metricas basicas por etapa
- [x] RLS para isolamento por workspace

## Decisoes tecnicas

- Multi-workspace com isolamento por `workspace_id` e RLS nas tabelas principais.
- Convite interno e seguro: admin gera token, convidado aceita via RPC com validacao de email.
- Campos personalizados de leads em `jsonb` para flexibilidade por workspace.
- Definicoes de campos personalizados em `lead_field_definitions`.
- Regras de transicao por etapa: configuracao de campos obrigatorios por etapa, validacao no front e trigger no banco.
- Criacao de workspace via RPC `create_workspace` (security definer) para evitar falha de RLS no insert.
- Geracao de mensagens via Edge Function; chave da Gemini armazenada em secret do Supabase.

## Arquitetura e dados (Supabase)

### Tabelas principais

- `workspaces`: empresas/equipes.
- `workspace_members`: usuarios vinculados ao workspace com papel (admin/member).
- `workspace_invites`: convites com token e status.
- `funnel_stages`: etapas do funil com `required_fields`.
- `lead_field_definitions`: definicoes de campos customizados.
- `leads`: leads do workspace com `custom_fields` em JSONB.
- `campaigns`: campanhas de abordagem.
- `lead_messages`: sugestoes geradas (draft/sent).

### Funcoes/Triggers

- `is_workspace_member`, `is_workspace_admin`: controle de acesso.
- `handle_workspace_created`: cria membership admin e etapas padrao.
- `create_workspace(p_name)`: cria workspace via RPC.
- `accept_workspace_invite(p_token)`: aceita convite por token.
- `list_workspace_members(p_workspace_id)`: lista membros para atribuir responsavel.
- `validate_lead_stage_requirements`: bloqueia mudanca de etapa sem campos obrigatorios.

### RLS (resumo)

- `workspaces`: membro le; admin atualiza/remove.
- `workspace_members`: admin gerencia; membros leem.
- `workspace_invites`: admin gerencia; convidado le se email do JWT bater.
- `funnel_stages`, `leads`, `campaigns`, `lead_messages`, `lead_field_definitions`: acesso por membro do workspace.

## Edge Functions

### generate-messages

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
- Limite: a funcao faz 1 requisicao ao Gemini por geracao; no free tier ha limite diario de requests.

## Como rodar localmente

1. Instalar dependencias

```bash
npm install
```

2. Variaveis de ambiente (frontend)

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

3. Rodar

```bash
npm run dev
```

## Variaveis de ambiente (Edge Functions)

- `GEMINI_API_KEY` (secret no Supabase)
- `GEMINI_MODEL` (opcional, default `gemini-2.5-flash`)

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Deploy

- Link: https://prova-tecnica-expert-integrado.vercel.app

## Video

- Link: https://drive.google.com/file/d/1gJlieLEVFfL_hnDLVJXXL_ophlQRwVgs/view?usp=sharing
- Observacao: houve um corte no trecho de teste da IA porque o Gemini estourou o limite de quota; precisei gerar outra chave e finalizei assim por estar no fim do prazo da prova.
