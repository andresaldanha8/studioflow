# Plano de Testes - StudioFlow

**Versão:** 1.0  
**Status:** MVP

---

## Objetivo

Garantir que todas as funcionalidades do StudioFlow operem corretamente antes da liberação de qualquer nova versão, reduzindo riscos de regressão, falhas de segurança, inconsistências de dados e problemas de usabilidade.

---

## Escopo

Este plano contempla testes dos seguintes módulos:

- Portal do Cliente
- Portal do Profissional
- Portal Administrativo
- Agendamentos
- Agendamento Presencial
- Clientes sem Cadastro
- Gestão da Agenda
- Financeiro
- Cadastro de Serviços
- Cadastro de Clientes
- Cadastro de Salões
- Autenticação
- Recuperação de Senha
- Configurações do Salão
- Controle de Permissões

---

## Estratégia de Testes

Toda funcionalidade nova deverá obrigatoriamente passar pelas seguintes etapas:

1. Desenvolvimento
2. Teste Unitário
3. Teste Manual
4. Teste Automatizado
5. Homologação
6. Aprovação Final

Nenhuma funcionalidade poderá ser considerada concluída sem aprovação em todas as etapas.

---

## Tipos de Testes

### Testes Funcionais

Validam se a funcionalidade atende ao comportamento esperado.

**Exemplos:**

- Login
- Cadastro
- Agendamento
- Agendamento Presencial
- Clientes sem Cadastro
- Cancelamento
- Remarcação
- Financeiro

---

### Testes de Regressão

Executados após qualquer alteração no sistema.

**Objetivo:**

Especial atenção deve ser dada aos fluxos que compartilham regras de disponibilidade da agenda, garantindo comportamento consistente entre:

- Portal do Cliente;
- Novo Agendamento da Profissional;
- Remarcação de Agendamentos.

---

### Testes de Permissões

Validar corretamente os níveis de acesso.

**Perfis:**

- Cliente
- Profissional
- Administrador

Também validar:

- Isolamento entre salões
- Isolamento entre clientes
- Controle de sessões

---

### Testes de Interface

Executar validações em:

- Desktop
- Tablet
- Smartphone

**Itens avaliados:**

- Responsividade
- Navegação
- Componentes
- Layout

---

### Testes de Performance

Avaliar:

- Tempo de carregamento
- Tempo de resposta da API
- Atualização automática da agenda
- Consumo de recursos

---

### Testes de Segurança

Validar:

- Login
- Logout
- Sessões
- Recuperação de senha
- Permissões
- Acesso indevido
- Isolamento entre salões

---

## Critérios de Aprovação

Uma versão somente poderá ser homologada quando:

- ✅ Todos os Casos de Teste Críticos aprovados.
- ✅ Todos os testes de API aprovados.
- ✅ Todos os testes E2E aprovados.
- ✅ Nenhum Bug Crítico aberto.
- ✅ Nenhum Bug de Segurança aberto.
- ✅ Todos os fluxos principais funcionando.

---

## Fluxos Obrigatórios

### Cliente

- Cadastro
- Login
- Recuperação de Senha
- Agendamento
- Cancelamento
- Remarcação
- Histórico
- Logout

---

### Profissional

- Login
- Dashboard
- Agenda
- Agendamento Presencial
- Remarcação
- Bloqueios
- Serviços
- Clientes
- Financeiro
- Perfil
- Logout

---

### Administrador

- Login
- Cadastro de Salão
- Alteração
- Ativação
- Inativação
- Impersonação
- Relatórios
- Logout

---

## Cobertura dos Testes

### Casos de Teste (CT)

| Item | Quantidade |
| :--- | ---------: |
| Casos de Teste | 30 |

---

### Testes de API

| Código | Descrição |
| :------ | :-------- |
| API-001 | Cliente visualiza somente seus agendamentos |
| API-002 | Profissional visualiza todos os agendamentos |
| API-003 | Criar agendamento |
| API-004 | Cancelar agendamento |
| API-005 | Remarcar agendamento |
| API-006 | Login do Cliente |
| API-007 | Login do Profissional |
| API-008 | Recuperação de Senha |

---

### Testes End-to-End (E2E)

| Código | Descrição |
| :------ | :-------- |
| E2E-001 | Fluxo Completo do Cliente |
| E2E-002 | Fluxo do Profissional |
| E2E-003 | Ativar/Inativar Salão |
| E2E-004 | Fluxo Financeiro |
| E2E-005 | Recuperação de Senha |
| E2E-006 | Impersonação do Administrador |
| E2E-007 | Cadastro de Salão |

---

## Evidências

Toda execução de teste deverá possuir:

- Data
- Responsável
- Ambiente
- Resultado
- Evidências
- Captura de tela (quando necessário)

---

## Registro de Bugs

Toda falha deverá ser registrada no **BUG_LOG.md**, contendo:

- Identificador do Bug
- Caso de Teste relacionado
- Teste Automatizado relacionado
- Descrição
- Passos para reprodução
- Resultado esperado
- Resultado encontrado
- Severidade
- Status
- Responsável
- Data

---

## Critérios de Encerramento

Uma Sprint somente poderá ser encerrada quando:

- Todos os Casos de Teste Críticos aprovados.
- Todos os testes automatizados executados.
- Nenhum Bug Crítico aberto.
- Nenhum Bug Bloqueador aberto.

---

## Objetivo Final

Manter o StudioFlow com cobertura completa dos fluxos críticos, garantindo estabilidade, segurança e confiabilidade em todas as versões do sistema.
Todos os fluxos que compartilham regras de negócio deverão ser testados em conjunto, assegurando consistência entre o Portal do Cliente, o Agendamento Presencial e a Remarcação de Agendamentos.
