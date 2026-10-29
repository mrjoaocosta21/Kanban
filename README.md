# React Kanban

Aplicação Kanban multiusuário com frontend React, API Node.js, PostgreSQL, autenticação por sessão e autorização por workspace.

## Situação atual

O projeto possui dois modos de execução:

- `local`: preserva o MVP original com `localStorage` e sessão demonstrativa;
- `api`: usa login real, cookie HttpOnly, PostgreSQL e autorização validada no servidor.

No modo API:

- Gestores criam, editam, atribuem, excluem e organizam todas as tarefas;
- Colaboradores visualizam somente suas atribuições e alteram apenas o status delas;
- alterações concorrentes usam versão otimista e retornam conflito em vez de sobrescrever dados;
- eventos de auditoria são append-only no PostgreSQL.

## Funcionalidades

- Kanban com To do, In Progress e Done;
- criação, edição, exclusão, movimentação e ordenação;
- filtros por busca, tag, prioridade e responsável;
- progresso geral e individual;
- responsáveis e papéis por workspace;
- histórico de criação, atualização, movimentação e exclusão;
- feedback de sucesso, erro, carregamento, salvamento, estado vazio e offline;
- backup JSON no modo local e exportação no modo API;
- recuperação de dados inválidos no armazenamento local;
- interface responsiva e navegação por teclado.

> A importação em massa permanece desabilitada no modo API até existir um endpoint transacional específico. Isso evita contornar RBAC e auditoria por meio de substituição completa do quadro.

## Arquitetura

```text
React/Vite
   │ HTTPS + cookie HttpOnly
   ▼
Express API
   ├── AuthService
   ├── TaskService + RBAC
   ├── repositórios PostgreSQL
   └── validação e erros HTTP
            │
            ▼
       PostgreSQL
       ├── users
       ├── workspaces
       ├── workspace_members
       ├── tasks
       ├── task_events
       └── sessions
```

O frontend continua dependendo do contrato `TaskRepository`. `LocalStorageTaskRepository` atende ao modo local e `ApiTaskRepository` traduz comandos atômicos para a API.

## Segurança implementada

- senhas derivadas com `scrypt` e salt individual;
- tokens de sessão aleatórios armazenados somente como hash no banco;
- cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- validação de origem para requisições mutáveis;
- limite básico de tentativas de login;
- RBAC aplicado no serviço do servidor;
- tarefas de colaboradores filtradas pelo servidor;
- controle de concorrência por `version`;
- eventos de auditoria protegidos contra `UPDATE` e `DELETE` por trigger;
- limite de tamanho para JSON e respostas de erro sem detalhes internos;
- headers básicos de segurança na API e no Nginx.

Em múltiplas instâncias da API, o rate limit em memória deve ser substituído por uma solução compartilhada, como Redis ou o recurso equivalente do provedor.

## Requisitos

- Node.js 22 ou superior;
- npm;
- Docker com o daemon ativo, ou uma instância PostgreSQL 17 acessível.

## Desenvolvimento com PostgreSQL

Crie a configuração local:

```bash
cp .env.example .env
```

Inicie o banco, aplique o schema e crie os usuários demonstrativos:

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

Inicie frontend e API:

```bash
npm run dev
```

Com `VITE_BASE_PATH=/`, o frontend fica em `http://localhost:5173` e a API em `http://localhost:3001`.

Credenciais do seed de desenvolvimento:

- Gestor: `joao@kanban.local` / `Manager123!`
- Colaborador: `marina@kanban.local` / `Collaborator123!`
- Colaborador: `lucas@kanban.local` / `Collaborator123!`

As senhas são configuráveis por `DEMO_MANAGER_PASSWORD` e `DEMO_COLLABORATOR_PASSWORD`. Não use as credenciais demonstrativas em um ambiente público.

## Execução completa com Docker

Com o daemon Docker ativo:

```bash
docker compose up --build -d
```

Depois, execute o seed informando senhas próprias:

```bash
docker compose run --rm \
  -e DEMO_MANAGER_PASSWORD='troque-esta-senha' \
  -e DEMO_COLLABORATOR_PASSWORD='troque-esta-senha' \
  api node server/scripts/seed.js
```

A aplicação fica disponível em `http://localhost:8080`.

## Modo local

Para executar sem API e preservar o comportamento baseado em `localStorage`:

```bash
VITE_DATA_MODE=local npm run dev:web
```

O build sem `.env` também utiliza o modo local e mantém compatibilidade com a publicação estática existente no GitHub Pages.

## Scripts

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia Vite e API juntos |
| `npm run dev:web` | Inicia somente o frontend |
| `npm run dev:api` | Inicia somente a API com reload |
| `npm run db:migrate` | Aplica migrations pendentes |
| `npm run db:seed` | Cria workspace e usuários demonstrativos |
| `npm run lint` | Executa análise estática |
| `npm test` | Executa testes de domínio e persistência |
| `npm run build` | Gera a build do frontend |

## Testes

O conjunto atual cobre:

- validação e migração do armazenamento local;
- backups e recuperação parcial;
- permissões no frontend e no servidor;
- hashing e validação de senhas;
- rate limit de login;
- serviços de tarefas;
- tradução de comandos para a API;
- cookies e proteção de origem;
- integração real com PostgreSQL e auditoria imutável na CI.

Os testes HTTP locais que abrem uma porta são habilitados com:

```bash
RUN_HTTP_TESTS=true node --test server/tests/app.test.js
```

O teste PostgreSQL é habilitado com:

```bash
TEST_DATABASE_URL=postgres://kanban:kanban@localhost:5432/kanban_test npm test
```

O workflow em `.github/workflows/ci.yml` provisiona PostgreSQL, executa testes, lint e build.

## API principal

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session
GET    /api/workspaces/:workspaceId/members
GET    /api/workspaces/:workspaceId/tasks
POST   /api/workspaces/:workspaceId/tasks
PATCH  /api/workspaces/:workspaceId/tasks/:taskId
POST   /api/workspaces/:workspaceId/tasks/:taskId/move
DELETE /api/workspaces/:workspaceId/tasks/:taskId
GET    /api/health
```

## Preparação para produção

Antes de expor o sistema publicamente:

1. configure TLS no proxy ou load balancer;
2. use credenciais fortes e secret manager para o PostgreSQL;
3. use `COOKIE_SECURE=true` sempre que a aplicação estiver atrás de HTTPS;
4. defina `APP_ORIGIN` com a origem HTTPS exata;
5. execute migrations como etapa controlada do deploy;
6. configure backups e recuperação do banco;
7. substitua o rate limit em memória quando houver mais de uma instância;
8. conecte logs estruturados, métricas e rastreamento de erros;
9. faça revisão de segurança e teste de carga antes do lançamento.

## Estrutura resumida

```text
server/
├── db/migrations/
├── scripts/seed.js
├── src/
│   ├── domain/
│   ├── http/
│   ├── repositories/
│   ├── security/
│   └── services/
└── tests/

src/
├── features/auth/
├── features/tasks/
└── shared/

tests/
deploy/
.github/workflows/ci.yml
```

## Autor

João
