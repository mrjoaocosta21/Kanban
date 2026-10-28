# Lista de Afazeres React

Uma aplicação de gerenciamento de tarefas com visualização em estilo Kanban, desenvolvida com React e Vite.

## Funcionalidades

- Criação de tarefas
- Edição e exclusão de tarefas
- Organização por status: To do, Doing e Done
- Filtragem por busca, tag e prioridade
- Persistência local com `localStorage`
- Interface visual em painel tipo Kanban

## Tecnologias

- React
- Vite
- JavaScript

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
│       ├── taskData.js
│       ├── taskReducer.js
│       ├── taskStorage.js
│       └── ...
└── ...
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
