# StudioFlow - Plataforma de Beleza & Estética

Plataforma SaaS multi-inquilino (multi-tenant) completa para agendamento e gerenciamento de estabelecimentos de beleza e estética, tais como salões de beleza, clínicas de estética, manicures/nail designers, designers de sobrancelhas e barbearias.

## 🎯 Objetivo

O **StudioFlow** simplifica a ponte entre clientes finais e profissionais da beleza. Ele centraliza o controle operacional de salões em uma única plataforma estruturada de ponta a ponta, permitindo que donos de estabelecimentos gerenciem suas agendas, fluxos de caixa, bloqueios de horários e base de clientes, ao passo que os clientes ganham uma interface intuitiva para agendar serviços em tempo real.

---

## 🛠️ Tecnologias Utilizadas

A aplicação foi estruturada utilizando uma stack moderna, robusta e de alta performance:

### Frontend (SPA)

***React 19**: Biblioteca declarativa e baseada em componentes para a construção de interfaces reativas.
***TypeScript**: Tipagem estática garantindo robustez e prevenção de erros em tempo de compilação.
***Tailwind CSS v4**: Framework utilitário de CSS de alta performance com carregamento otimizado.
***Lucide React**: Biblioteca de ícones vetoriais modernos e leves.
***Motion**: Biblioteca de animações fluidas para transições de tela e interações ricas.

### Backend (API REST)

***Node.js & Express**: Servidor HTTP robusto estruturando toda a lógica de negócio, persistência e roteamento.
***TSX**: Executor TypeScript ultrarrápido para execução do ambiente de desenvolvimento.
***Esbuild**: Compilador de alta velocidade para empacotamento do servidor TypeScript em um único arquivo CommonJS de produção (`dist/server.cjs`).

### Banco de Dados & Persistência

***JSON Database**: Persistência local baseada em database.json, utilizada durante o MVP. Os dados permanecem em memória durante a execução da aplicação e são sincronizados com o arquivo local, permitindo simplicidade de desenvolvimento e futura migração para SQLite ou PostgreSQL.

---

## 📂 Estrutura do Projeto

Abaixo está o mapeamento das pastas e arquivos do ecossistema StudioFlow:

```text
/
├── docs/                          # Documentação técnica oficial do projeto
│   ├── README.md                  # Visão geral, instalação e utilização do projeto
│   ├── PRD.md                     # Documento de Requisitos do Produto
│   ├── SAD.md                     # Documento de Arquitetura de Software
│   ├── RDD.md                     # Documento de Design de Requisitos
│   ├── CHANGELOG.md               # Histórico de alterações do sistema
│   ├── DECISIONS.md               # Registro de decisões arquiteturais
│   ├── TEST_PLAN.md               # Planejamento da estratégia de testes
│   ├── TEST_CASES.md              # Casos de teste funcionais, API e E2E
│   ├── TEST_REPORT.md             # Relatório da execução dos testes
│   └── BUG_LOG.md                 # Histórico de bugs encontrados e correções
├── src/                           # Código-fonte da aplicação Frontend (React SPA)
│   ├── components/                # Componentes reutilizáveis da interface
│   ├── App.tsx                    # Componente principal da aplicação
│   ├── types.ts                   # Interfaces e tipos TypeScript compartilhados
│   ├── index.css                  # Estilos globais (Tailwind CSS v4)
│   └── main.tsx                   # Ponto de entrada da aplicação React
├── server.ts                      # Servidor Express e API REST
├── database.json                  # Persistência local dos dados do MVP
├── package.json                   # Dependências e scripts do projeto
├── vite.config.ts                 # Configuração do Vite
├── tsconfig.json                  # Configuração do TypeScript
└── .env.example                   # Exemplo de variáveis de ambiente
```

---

## 👥 Perfis de Acesso Existentes

O sistema opera sob três níveis rígidos de acesso e visualização:

1.**Administrador Master (admin)**: Acesso global ao ecossistema. Permite gerenciar (criar, editar, excluir) os inquilinos (salões), visualizar métricas financeiras consolidadas do ecossistema e realizar o fluxo de personificação (impersonation), entrando na visão de qualquer estabelecimento para fins de suporte e configuração.
2.**Profissional/Dono do Salão (professional)**: Acesso administrativo exclusivo ao seu salão. Permite gerenciar a agenda, realizar Agendamentos Presenciais para clientes cadastrados ou não cadastrados, remarcar atendimentos utilizando apenas horários disponíveis, cadastrar serviços, controlar horários de expediente e almoço, bloquear horários, registrar pagamentos, acompanhar o fluxo de caixa e administrar as configurações do estabelecimento.
3.**Cliente (client)**: Usuário final que acessa o portal público do salão através do seu endereço/slug personalizado. Permite realizar cadastro, efetuar login, visualizar serviços oferecidos com preços e tempos de duração, escolher horários livres na agenda e gerenciar seu próprio histórico de agendamentos.

---

## 🚀 Como Executar Localmente

### Pré-requisitos

Certifique-se de possuir o **Node.js (versão 18 ou superior)** instalado em sua máquina.

### 1. Instalação das Dependências

No diretório raiz do projeto, execute o comando abaixo para instalar as bibliotecas do Frontend e do Backend:

```bash
npm install
```

### 2. Execução em Ambiente de Desenvolvimento

Para iniciar o servidor backend juntamente com o frontend reativo do Vite com suporte a atualização automática:

```bash

npm run dev
```

O servidor será executado e estará disponível em: `http://localhost:3000`

### 3. Compilação para Produção

Para compilar tanto os assets estáticos do frontend quanto o arquivo bundled do servidor backend:

```bash
npm run build
```

Os arquivos gerados serão salvos na pasta `/dist`.

### 4. Inicialização do Servidor de Produção

Para rodar a aplicação em modo de produção utilizando o build otimizado:

```bash
npm run start
```

---

## 📌 Status do Projeto

**Versão atual:** 1.0.0

**Situação:** MVP em Homologação

### Funcionalidades concluídas

- Multi-Tenant
- Portal do Cliente
- Portal da Profissional
- Portal Administrativo
- Gestão de Agenda
- Gestão Financeira
- Agendamento Presencial
- Clientes sem Cadastro
- Remarcação Inteligente
- Controle de Expediente
- Controle de Almoço
- Bloqueios de Agenda
- Recuperação de Senha
- Histórico de Agendamentos

### Próxima etapa

- Homologação completa do MVP.
- Execução da suíte de testes documentada.
- Preparação da versão de produção.

## 🔒 Licença

Este projeto é de propriedade reservada para fins de validação mercadológica e uso exclusivo sob o framework **Saldanha AI Dev (FSAD)**. Todos os direitos são reservados.
