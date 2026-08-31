# Changelog - StudioFlow

Todas as alterações relevantes deste projeto serão registradas neste documento.

---

# Versão 1.0.0 — Em Homologação

## PR-01 — Cadastro do Cliente ✅ HOMOLOGADA

### Objetivo

Implementar o cadastro completo de clientes garantindo integridade dos dados e validações obrigatórias.

### Implementações

- Cadastro completo de clientes.
- Validação obrigatória de CPF.
- Validação obrigatória de telefone.
- Validação de confirmação de senha.
- Normalização dos dados de entrada.
- Persistência correta no banco de dados.

### Homologação

- ✅ Cadastro de novo cliente.
- ✅ Validação de CPF inválido.
- ✅ Validação de telefone inválido.
- ✅ Validação de confirmação de senha.
- ✅ Persistência correta no `database.json`.

---

## PR-02 — Recuperação de Senha do Cliente ✅ HOMOLOGADA

### Objetivo

Implementar fluxo seguro de recuperação de senha baseado em CPF e telefone.

### Implementações

- Recuperação utilizando telefone.
- Validação dos quatro últimos dígitos do CPF.
- Definição de nova senha.
- Persistência da nova senha.

### Homologação

- ✅ Recuperação utilizando telefone.
- ✅ Validação dos quatro últimos dígitos do CPF.
- ✅ Alteração da senha.
- ✅ Login utilizando a nova senha.
- ✅ Rejeição da senha antiga.

---

## PR-03 — Módulo Profissional ✅ HOMOLOGADA

### Objetivo

Concluir a migração completa do módulo Profissional para autenticação segura utilizando bcrypt e homologar todas as funcionalidades do Portal da Profissional.

### Implementações

#### Segurança

- Login migrado para `verifyPassword()`.
- Alteração de senha migrada para `verifyPassword()`.
- Recuperação de senha migrada para `verifyPassword()`.
- Gravação de novas senhas utilizando `hashPassword()`.

#### Perfil

- Persistência das alterações do perfil.
- Persistência da pergunta de segurança.
- Persistência da resposta de segurança utilizando bcrypt.

#### Correções

- Correção da validação do horário de almoço para ocorrer apenas quando houver alteração real dos horários.
- Correção do bloqueio indevido da atualização do perfil.
- Remoção dos logs temporários utilizados durante a homologação.

### Homologação

#### Login

- ✅ Bella
- ✅ Glamour

#### Alteração de Senha

- ✅ Alteração realizada com sucesso.
- ✅ Login com senha antiga rejeitado.
- ✅ Login com nova senha realizado.

#### Perfil

- ✅ Persistência das alterações.
- ✅ Persistência no `database.json`.

#### Recuperação de Senha

- ✅ Cadastro da pergunta de segurança.
- ✅ Persistência da resposta criptografada.
- ✅ Recuperação utilizando pergunta de segurança.
- ✅ Validação de resposta incorreta.
- ✅ Geração de novo hash.
- ✅ Login após redefinição da senha.

### Resultado

**PR-03 HOMOLOGADA.**

---

# Resumo da Versão 1.0.0

## Adicionado

- Estrutura Multi-Tenant (Multi-Tenancy).
- Portal do Cliente.
- Portal do Profissional.
- Portal Administrativo Master.
- Cadastro de Clientes.
- Cadastro de Serviços.
- Cadastro de Salões.
- Sistema de Agendamentos.
- Histórico de Agendamentos.
- Recuperação de Senha.
- Gestão Financeira (Caixa).
- Dashboard Financeiro.
- Controle de Bloqueios da Agenda.
- Controle de Horário de Expediente.
- Controle de Horário de Almoço.
- Link Público de Agendamento.
- Impersonação do Administrador.
- Sistema de Sessões.
- Controle de Permissões.
- Isolamento entre Salões.
- Estrutura de Testes (CT, API e E2E).
- Documentação técnica do projeto.
- Agendamento Presencial / Avulso realizado pela Profissional.
- Suporte para clientes sem cadastro utilizando snapshot de nome e telefone.
- Identificação visual **Cliente sem cadastro** na agenda da profissional.
- Persistência de snapshots de nome e telefone.
- Suporte ao campo `cliente_telefone_informado`.

## Alterado

- Interface da Profissional substituindo **Slug** por **Link de Agendamento**.
- Fluxo de logout da Profissional.
- Fluxo de autenticação do Cliente.
- Carregamento automático do histórico.
- Organização da documentação técnica.
- Fluxo de Agendamento Presencial reutilizando clientes existentes.
- Modal de Remarcação reutilizando a mesma lógica do Novo Agendamento.
- Centralização da geração de horários disponíveis através da função `computeAvailableSlots()`.
- Organização visual da identificação de clientes sem cadastro.
- Interface da agenda exibindo corretamente nome, telefone e identificação.

## Corrigido

- Carregamento do histórico após login.
- Logout da profissional.
- Prioridade do roteamento utilizando `hash`.
- Reset do `selectedSalon`.
- Reload provocado pelo monitoramento do `database.json`.
- Busca de clientes no Agendamento Presencial.
- Associação de clientes por telefone normalizado.
- Remoção da associação por suffix match.
- Exibição de clientes sem cadastro.
- Fluxo de remarcação.
- Tipagem TypeScript para clientes sem cadastro.
- Remoção dos logs temporários de homologação.
- Validação do horário de almoço considerando apenas alterações reais.
- Bloqueio da alteração do horário de almoço quando existirem conflitos.

## Observações

- MVP funcionalmente concluído.
- Projeto em fase de homologação final.
- Documentação sincronizada entre:
  - README
  - PRD
  - SAD
  - RDD
  - DECISIONS
  - TEST_PLAN
  - TEST_CASES
  - TEST_REPORT
  - BUG_LOG
- Preparação da suíte de testes automatizados (Vitest).
- Fluxo de Agendamento Presencial homologado.
- Fluxo de Remarcação homologado.

## Observação Técnica

Durante a recuperação de senha do Administrador, quando ocorre erro na resposta de segurança, o painel ao fundo apresenta um pequeno repaint visual.

### Auditoria

- sem reload
- sem navegação
- sem novo fetch
- sem alteração do `currentUser`
- sem remount

### Conclusão

O comportamento é apenas um re-render do componente `App` causado por `setErrorMessage()`.

Não representa falha de segurança nem de lógica.

# FASE AUTENTICAÇÃO

## PR-11.1 — Infraestrutura
**Status:** ✅ HOMOLOGADA

**Objetivo**
Preparar toda a infraestrutura da autenticação JWT sem alterar regras de negócio.

**Resultado**
- JWT implementado
- Crypto implementado
- Tipagens implementadas
- Documentação criada
- Nenhuma alteração em server.ts
- Nenhuma alteração em database.json
- Nenhuma dependência adicionada

**Próxima etapa**
➡ PR-11.2 — Implementação do Login

---

# Versão 0.1.0 — Início do Projeto

## Adicionado

- Primeira arquitetura do StudioFlow.
- Estrutura inicial do backend.
- Estrutura inicial do frontend.
- Definição da arquitetura Multi-Tenant.
- Criação do Framework FSAD.

## Observações

Primeira versão oficialmente documentada utilizando o **Framework Saldanha AI Dev (FSAD)**.
