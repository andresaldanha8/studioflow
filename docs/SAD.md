# Documento de Arquitetura de Software (SAD) - StudioFlow

**Versão:** 1.0  
**Status:** Ativo

---

## Objetivo

Este documento descreve a arquitetura de software do **StudioFlow**, apresentando sua organização técnica, componentes, responsabilidades, fluxo de dados e decisões arquiteturais que sustentam o sistema.

Seu objetivo é servir como referência para manutenção, evolução e onboarding de novos desenvolvedores.

---

## Índice

- Visão Geral da Arquitetura
- Estrutura em Camadas
- Fluxo de Comunicação
- Autenticação
- Multi-Tenancy
- Componentes Principais
- Arquitetura dos Dados
- Rotas da API
- Segurança
- Escalabilidade
- Evolução Prevista

---

# Visão Geral da Arquitetura

O StudioFlow utiliza uma arquitetura **Full Stack Monolítica**, composta por:

- Frontend React (SPA)
- Backend Express
- API REST
- Persistência em JSON (MVP)

```text
┌──────────────────────────────────────────────────────────────┐
│                  FRONTEND (React SPA)                        │
│                                                              │
│ React 19                                                     │
│ Tailwind CSS                                                 │
│ Fetch API                                                    │
│ LocalStorage                                                 │
└───────────────────────────┬──────────────────────────────────┘
                            │
                      HTTP / REST
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                    BACKEND (Express)                         │
│                                                              │
│ API REST                                                     │
│ Regras de Negócio                                            │
│ Validações                                                   │
│ Autorização                                                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                     Persistência
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                 database.json (MVP)                          │
│                                                              │
│ Persistência Local                                           │
│ Memória + Arquivo                                            │
└──────────────────────────────────────────────────────────────┘
```

---

# Estrutura em Camadas

## Camada de Apresentação

Responsável por toda interação com o usuário.

Principais tecnologias:

- React 19
- TypeScript
- Tailwind CSS
- Fetch API

Principais arquivos:

```text
src/
├── App.tsx
├── main.tsx
├── types.ts
└── index.css
```

Responsabilidades:

- Renderização das telas
- Controle de sessão
- Navegação
- Consumo da API
- Atualização dos estados

---

## Camada de Negócio

Implementada em:

```text
server.ts
```

Responsável por:

- APIs REST
- Regras de negócio
- Validação
- Autorização
- Persistência
- Integração entre módulos

---

## Camada de Persistência

Atualmente composta por:

```
database.json
```

Estratégia:

- Banco carregado em memória.
- Escrita síncrona após alterações.
- Backup simples.

### Evolução prevista

A arquitetura prevê migração para:

1. SQLite
2. PostgreSQL

sem alteração das regras de negócio.

---

# Fluxo de Comunicação

O sistema utiliza comunicação HTTP REST.

Fluxo padrão:

```text
Cliente / Profissional

↓

React

↓

Fetch API

↓

Express

↓

Validação

↓

Regras de disponibilidade da agenda

↓

Persistência

↓

Resposta JSON
```

---

# Autenticação

O StudioFlow utiliza autenticação híbrida baseada em:

- LocalStorage
- Headers HTTP

Fluxo:

1. Usuário realiza login.
2. Backend valida as credenciais.
3. Sessão armazenada no LocalStorage.
4. Requisições enviam:

```
x-user-role
x-user-email
```

5. Middleware valida permissões.

---

# Multi-Tenancy

Cada salão representa um inquilino independente.

Toda entidade possui obrigatoriamente:

```
salao_id
```

Exemplos:

- Cliente
- Serviço
- Agendamento
- Caixa
- Bloqueio
- Financeiro

Todas as consultas utilizam esse identificador como filtro obrigatório.

---

# Componentes Principais

## Portal Público

Responsável por:

- Diretório de salões
- Link de Agendamento
- Cadastro
- Login
- Agendamento

---

## Portal do Cliente

Responsável por:

- Histórico
- Perfil
- Agendamentos
- Cancelamentos
- Remarcações

---

## Portal do Profissional

Responsável por:

- Dashboard
- Agenda
- Agendamentos Presenciais
- Remarcação de atendimentos
- Gestão de Serviços
- Gestão de Clientes
- Atendimento de clientes sem cadastro
- Caixa
- Financeiro
- Controle de bloqueios
- Controle de horário de expediente
- Controle de horário de almoço
- Perfil
- Configurações

---

## Portal Administrativo

Responsável por:

- Cadastro de salões
- Estatísticas
- Impersonação
- Relatórios

---

# Arquitetura dos Dados

Principais entidades:

```text
Salon

Cliente

Servico

Agendamento

BloqueioAgenda

Caixa

Administrador
```

Relacionamentos:

```text
Salão
│
├── Clientes
├── Serviços
├── Agendamentos
├── Caixa
└── Bloqueios
```

---

# Rotas da API

## Públicas

```
GET    /api/public/salons

GET    /api/salons/by-slug/:slug
```

---

## Cliente

```
POST   /api/clients/signup

POST   /api/clients/login

PUT    /api/clients/profile

GET    /api/clients/:id/bookings
```

---

## Profissional

```
POST   /api/professional/login

PUT    /api/professional/profile

GET    /api/salons/:id/stats

GET    /api/salons/:id/bookings

GET    /api/salons/:id/clients

GET    /api/salons/:id/caixa

GET    /api/salons/:id/finance-reports

POST   /api/caixa
```

---

## Administrador

```
POST   /api/admin/login

GET    /api/admin/stats

POST   /api/admin/salons

PUT    /api/admin/salons/:id

DELETE /api/admin/salons/:id
```

---

# Segurança

A arquitetura contempla:

- Controle de Sessão
- Isolamento entre Salões
- Isolamento entre Clientes
- Controle por Papéis (Roles)
- Validação de Headers
- Validação de Agenda
- Proteção contra Overbooking
- Validação de expediente
- Validação de horário de almoço
- Validação de bloqueios da agenda

---

# Escalabilidade

O projeto foi concebido para evolução gradual.

Evoluções previstas:

- SQLite
- PostgreSQL
- JWT
- Refresh Token
- WebSockets ou Server-Sent Events para atualização em tempo real
- Upload de imagens
- Notificações Push
- Cache Redis

---

# Considerações Arquiteturais

Durante o MVP foi priorizada:

- Simplicidade
- Facilidade de manutenção
- Baixo custo de infraestrutura
- Alta produtividade
- Facilidade para homologação

As decisões arquiteturais detalhadas encontram-se registradas no documento **DECISIONS.md**.

---

# Documentos Relacionados

- PRD.md
- RDD.md
- DECISIONS.md
- CHANGELOG.md
- TEST_PLAN.md
- TEST_CASES.md
- TEST_REPORT.md
- BUG_LOG.md
