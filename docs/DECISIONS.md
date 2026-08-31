# Registro de Decisões Arquiteturais - StudioFlow

**Versão:** 1.0  
**Status:** Ativo

---

## Objetivo

Este documento registra as principais decisões arquiteturais tomadas durante o desenvolvimento do **StudioFlow**.

Seu objetivo é documentar o contexto, a justificativa, os impactos e o motivo de cada decisão importante, preservando o histórico técnico do projeto e facilitando futuras evoluções.

---

## Índice

- DEC-001 — Arquitetura Frontend SPA
- DEC-002 — Backend Express Integrado ao Vite
- DEC-003 — Persistência Local em JSON
- DEC-004 — Multi-Tenancy por `salao_id`
- DEC-005 — Autenticação Híbrida
- DEC-006 — Validação Centralizada da Agenda
- DEC-007 — Isolamento de Sessões entre Salões
- DEC-008 — Reutilização da Lógica de Disponibilidade da Agenda
- DEC-009 — Snapshot para Clientes sem Cadastro

---

## DEC-001 — Arquitetura Frontend SPA

### Título

Arquitetura Frontend baseada em Single Page Application (SPA).

### Contexto

O StudioFlow possui quatro portais distintos:

- Diretório de Salões
- Portal do Cliente
- Portal do Profissional
- Portal Administrativo

Era necessário permitir transições extremamente rápidas entre telas, evitando recarregamentos completos da aplicação.

### Decisão

Centralizar toda a interface em um único componente raiz (`src/App.tsx`), utilizando estados internos (`currentView` e `portalMode`) para controlar a navegação.

### Justificativa

Essa abordagem reduz a complexidade do projeto, elimina dependências de roteadores externos e facilita o compartilhamento de estados globais entre os diferentes portais.

### Impactos

#### Pontos Positivos

- Navegação instantânea.
- Menor complexidade.
- Compartilhamento simples de estados.
- Menor quantidade de dependências.

#### Pontos de Atenção

- Crescimento do arquivo `App.tsx`.
- Necessidade de organização rigorosa do código.

### Status

✅ Vigente

### Data

Julho de 2026

---

## DEC-002 — Backend Express Integrado ao Vite

### Título

Servidor único para Frontend e Backend.

### Contexto

Separar frontend e backend em servidores distintos aumenta a complexidade durante o desenvolvimento devido a problemas de CORS, proxies e múltiplas portas.

### Decisão

Utilizar um único servidor Express (`server.ts`) responsável por:

- Hospedar as APIs.
- Integrar o Vite durante o desenvolvimento.
- Servir os arquivos compilados em produção.

### Justificativa

Reduz significativamente a configuração do ambiente de desenvolvimento.

### Impactos

#### Pontos Positivos

- Eliminação de problemas de CORS.
- Apenas uma porta de execução.
- Deploy simplificado.
- Estrutura mais fácil de manter.

#### Pontos de Atenção

- Necessidade de manter corretamente a rota fallback para o `index.html`.

### Status

✅ Vigente

### Data

Julho de 2026

---

## DEC-003 — Persistência Local em JSON

### Título

Persistência em memória com gravação sincronizada em `database.json`.

### Contexto

Durante o MVP era importante possuir persistência simples, rápida e sem dependências externas.

### Decisão

Armazenar os dados em memória e persisti-los no arquivo `database.json` através de gravação síncrona.

### Justificativa

Essa estratégia permite:

- Desenvolvimento extremamente rápido.
- Backup simples.
- Baixa complexidade.
- Zero dependências de banco externo.

### Impactos

#### Pontos Positivos

- Excelente desempenho.
- Simplicidade.
- Fácil transporte do projeto.

#### Pontos de Atenção

Não é indicado para ambientes distribuídos ou produção com múltiplas instâncias.

### Evolução Prevista

A arquitetura prevê migração futura para:

1. SQLite
2. PostgreSQL

mantendo a mesma estrutura lógica dos dados.

### Status

✅ Vigente (MVP)

### Data

Julho de 2026

---

## DEC-004 — Multi-Tenancy por `salao_id`

### Título

Isolamento lógico de dados entre salões.

### Contexto

O StudioFlow hospeda diversos salões dentro da mesma aplicação.

Era obrigatório impedir qualquer compartilhamento de informações entre estabelecimentos.

### Decisão

Toda entidade de negócio possui obrigatoriamente o campo:

- `salao_id`

Todas as consultas do backend devem obrigatoriamente filtrar por esse identificador.

### Justificativa

Permite oferecer uma arquitetura SaaS simples, econômica e escalável.

### Impactos

#### Pontos Positivos

- Isolamento entre clientes.
- Isolamento entre profissionais.
- Escalabilidade.
- Facilidade para criação de novos salões.

#### Pontos de Atenção

Qualquer consulta sem filtro por `salao_id` representa um risco de segurança.

### Status

✅ Vigente

### Data

Julho de 2026

---

## DEC-005 — Autenticação Híbrida

### Título

Sessão baseada em LocalStorage e cabeçalhos HTTP.

### Contexto

Durante o desenvolvimento foi necessário garantir funcionamento mesmo em ambientes que bloqueiam cookies de terceiros.

### Decisão

Armazenar a sessão no navegador utilizando:

- LocalStorage

Enviar as informações do usuário através dos cabeçalhos:

- `x-user-role`
- `x-user-email`

### Justificativa

Simplifica a autenticação durante o desenvolvimento e elimina dependência de cookies.

### Impactos

#### Pontos Positivos

- Compatível com AI Studio.
- Compatível com ambientes embarcados.
- Baixa complexidade.

#### Pontos de Atenção

Para produção recomenda-se migração para autenticação baseada em JWT.

### Status

✅ Vigente (MVP)

### Evolução Prevista

- JWT
- Refresh Token
- Expiração automática
- Revogação de sessões

### Data

Julho de 2026

---

## DEC-006 — Validação Centralizada da Agenda

### Título

Toda validação de disponibilidade ocorre no servidor.

### Contexto

Era necessário impedir:

- Overbooking.
- Manipulação pelo navegador.
- Agendamentos durante bloqueios.
- Agendamentos no horário de almoço.

### Decisão

Centralizar toda a validação da agenda no backend através do algoritmo de colisão de horários.

### Justificativa

A disponibilidade da agenda deve possuir uma única fonte de verdade.

### Impactos

#### Pontos Positivos

- Agenda consistente.
- Segurança.
- Integridade dos horários.

#### Pontos de Atenção

Todo horário enviado deve estar padronizado em formato ISO.

### Status

✅ Vigente

### Data

Julho de 2026

---

## DEC-007 — Isolamento de Sessões entre Salões

### Título

Encerramento automático da sessão ao trocar de salão.

### Contexto

Um profissional autenticado em um salão poderia navegar para outro estabelecimento mantendo sua sessão ativa.

### Decisão

Sempre que o usuário acessar um salão diferente daquele associado à sua sessão:

- limpar `localStorage`;
- executar `handleSetUser(null)`;
- limpar `selectedSalon`;
- exigir novo login.

### Justificativa

Garantir isolamento completo entre estabelecimentos concorrentes.

### Impactos

#### Pontos Positivos

- Maior segurança.
- Eliminação de vazamento de dados.
- Sessões totalmente isoladas.

#### Pontos de Atenção

Ao retornar ao salão anterior será necessário realizar novo login.

### Status

✅ Vigente

### Data

Julho de 2026

---

## Histórico de Alterações

| Data | Decisão | Alteração |
| :--- | :--- | :--- |
| Jul/2026 | DEC-001 | Arquitetura SPA definida |
| Jul/2026 | DEC-002 | Backend Express unificado |
| Jul/2026 | DEC-003 | Persistência em JSON |
| Jul/2026 | DEC-004 | Multi-Tenancy implementado |
| Jul/2026 | DEC-005 | Autenticação híbrida |
| Jul/2026 | DEC-006 | Algoritmo centralizado da agenda |
| Jul/2026 | DEC-007 | Isolamento automático de sessões |
| Jul/2026 | DEC-008 | Reutilização da lógica de disponibilidade da agenda |
| Jul/2026 | DEC-009 | Snapshot para clientes sem cadastro |

---

## Observações

Toda nova decisão arquitetural deverá:

- Receber um identificador sequencial (`DEC-008`, `DEC-009`, ...).
- Registrar o contexto que motivou a decisão.
- Informar a justificativa técnica.
- Registrar impactos positivos e pontos de atenção.
- Informar a data da decisão.
- Atualizar o histórico deste documento.

## DEC-008 — Reutilização da Lógica de Disponibilidade da Agenda

### Título

Centralização da geração de horários disponíveis para Agendamento e Remarcação.

### Contexto

Inicialmente o StudioFlow utilizava dois fluxos distintos para seleção de horários:

- Novo Agendamento
- Remarcação

Embora ambos devessem utilizar as mesmas regras de negócio, existiam implementações distintas para geração dos horários disponíveis.

### Decisão

Centralizar o cálculo de disponibilidade na função reutilizável:

- `computeAvailableSlots()`

Essa função passa a ser utilizada tanto pelo fluxo de Novo Agendamento quanto pelo fluxo de Remarcação.

### Justificativa

Manter uma única implementação para cálculo dos horários disponíveis reduz inconsistências, elimina duplicação de código e garante que ambos os fluxos obedeçam exatamente às mesmas regras de negócio.

### Impactos

#### Pontos Positivos

- Eliminação de código duplicado.
- Consistência entre Novo Agendamento e Remarcação.
- Manutenção simplificada.
- Redução de falhas futuras.

#### Pontos de Atenção

Qualquer alteração nas regras de disponibilidade deverá ocorrer exclusivamente na função `computeAvailableSlots()`.

### Status

✅ Vigente

### Data

Julho de 2026

## DEC-009 — Snapshot para Clientes sem Cadastro

### Título

Persistência de informações de clientes avulsos diretamente no agendamento.

### Contexto

Profissionais frequentemente realizam atendimentos para clientes que ainda não possuem cadastro na plataforma.

Criar automaticamente um cadastro foi considerado inadequado, pois nem todo atendimento avulso representa um cliente recorrente.

### Decisão

Quando não existir um cliente cadastrado, o agendamento armazenará diretamente um snapshot das informações informadas pela profissional através dos campos:

- `nome_cliente_avulso`
- `telefone_cliente_avulso`
- `cliente_telefone_informado`

Esses dados permanecem vinculados ao próprio agendamento, preservando as informações originalmente registradas mesmo sem existir um cadastro na entidade Cliente.

### Justificativa

Preservar a identificação do cliente durante todo o histórico do atendimento, mantendo a simplicidade do cadastro e permitindo futura vinculação caso o cliente venha a se cadastrar posteriormente.

### Impactos

#### Pontos Positivos

- Histórico completo dos atendimentos avulsos.
- Melhor identificação na agenda da profissional.
- Não gera cadastros desnecessários.
- Compatível com futura vinculação automática por telefone.

#### Pontos de Atenção

Os dados armazenados representam um snapshot do momento do agendamento e não acompanham alterações futuras realizadas pelo cliente.

### Status

✅ Vigente

### Data

Julho de 2026

### DEC-009 — Identificadores do banco

Entidades de Seed utilizam IDs legíveis (salao-bella, srv-bella-1, cli-bella-1) para facilitar desenvolvimento, testes e depuração.
Entidades criadas em produção utilizam UUID v4.
Ambas são válidas e coexistem intencionalmente.
