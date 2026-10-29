# Lista de Afazeres React

Uma aplicação de gerenciamento de tarefas com visualização em estilo Kanban, desenvolvida com React e Vite.

## Funcionalidades

- Criação de tarefas
- Edição e exclusão de tarefas
- Organização por status: To do, In progress e Done
- Filtragem por busca, tag e prioridade
- Atribuição e filtragem por responsável
- Progresso geral do quadro
- Feedback visual para as principais ações
- Persistência assíncrona com repositório local
- Recuperação parcial de dados inválidos
- Exportação e importação de backups JSON
- Estados de carregamento, salvamento, erro e offline
- Interface visual em painel tipo Kanban
- Perfis de Gestor e Colaborador por workspace
- Visão “Minhas tarefas” para colaboradores
- Permissões centralizadas por ação e por responsável
- Histórico de criação, edição e movimentação em cada tarefa
- Sessão demonstrativa para validar os dois fluxos sem autenticação externa

## Perfis e permissões

| Ação | Gestor | Colaborador |
| --- | --- | --- |
| Visualizar tarefas | Todas | Somente as atribuídas a ele |
| Criar, editar e excluir | Sim | Não |
| Atribuir responsáveis | Sim | Não |
| Alterar status | Sim | Somente nas próprias tarefas |
| Reordenar na mesma coluna | Sim | Não |
| Importar e exportar backup | Sim | Não |

O seletor no cabeçalho simula a sessão de cada integrante e existe para demonstração do frontend. As mesmas regras são aplicadas na camada de operações, portanto não dependem apenas de esconder botões.

> Para produção, o usuário e o papel precisam vir de autenticação real, e a API deve repetir a autorização em todas as rotas. `localStorage` e sessão simulada não são uma barreira de segurança.

## Tecnologias

- React
- Vite
- JavaScript
- Node Test Runner
- GitHub Actions

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

- Node.js
- npm

## Instalação

```bash
npm install
```

## Executando o projeto

```bash
npm run dev
```

O projeto será aberto em uma aba do navegador, geralmente em:

```bash
http://localhost:5173
```

## Build para produção

```bash
npm run build
```

Para visualizar a build final:

```bash
npm run preview
```

## Testes

```bash
npm test
```

Os testes cobrem migrações, validação, recuperação do `localStorage`, backups, autorização por perfil, auditoria e operações do reducer. O workflow em `.github/workflows/ci.yml` executa testes e build em pushes e pull requests.

## Armazenamento

O frontend depende do contrato `TaskRepository`. A implementação atual usa `LocalStorageTaskRepository`, que:

- valida e migra os dados ao carregar;
- isola tarefas inválidas sem descartar os registros válidos;
- mantém uma cópia de recuperação;
- confirma a persistência antes de apresentar feedback de sucesso;
- restaura o último estado persistido quando uma gravação falha.

Uma futura integração com API pode implementar o mesmo contrato sem alterar os componentes do Kanban.

## Estrutura do projeto

```bash
src/
├── App.jsx
├── main.jsx
├── index.css
├── App.css
├── features/
│   └── tasks/
│       ├── components/
│       ├── hooks/
│       ├── repositories/
│       ├── taskBackup.js
│       ├── taskAccess.js
│       ├── taskActivity.js
│       ├── taskData.js
│       ├── taskReducer.js
│       ├── taskStorage.js
│       └── ...
└── ...
tests/
.github/workflows/ci.yml
```

## Publicando no GitHub

1. Crie um novo repositório no GitHub
2. No terminal do projeto, execute:

```bash
git init
git branch -M main
git add .
git commit -m "Primeiro commit"
git remote add origin https://github.com/mrjoaocosta21/Kanban.git
git push -u origin main
```

## Licença

Este projeto está disponível para fins educacionais e pessoais.

## Autor

João 
