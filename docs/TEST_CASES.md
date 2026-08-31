# Casos de Teste - StudioFlow

**Versão:** 1.0  
**Status:** MVP

---

## CT-001 - Login do Cliente

**Prioridade:** CRÍTICA

**Relacionado:** API-006 • E2E-001

### Objetivo

Validar que um cliente consiga acessar sua conta.

### Pré-condições

- Cliente previamente cadastrado.
- Senha válida.

### Passos

1. Abrir o portal do salão.
2. Clicar em **Entrar na minha Conta**.
3. Informar telefone.
4. Informar senha.
5. Clicar em **Entrar**.

### Resultado Esperado

- Login realizado com sucesso.
- Sessão criada.
- Cliente direcionado para a tela de serviços.
- Histórico de agendamentos carregado.

---

## CT-002 - Cadastro do Cliente

**Prioridade:** CRÍTICA

**Relacionado:** API-001 • E2E-001

### Objetivo

Validar o cadastro de um novo cliente.

### Pré-condições

- Nenhuma.

### Passos

1. Abrir o portal do salão.
2. Clicar em **Criar Nova Conta**.
3. Informar nome.
4. Informar telefone.
5. Informar CPF.
6. Informar senha.
7. Confirmar senha.
8. Finalizar cadastro.

### Resultado Esperado

- Cliente cadastrado com sucesso.
- Login automático realizado.
- Sessão criada.

---

## CT-003 - Recuperação de Senha

**Prioridade:** ALTA

**Relacionado:** API-008 • E2E-005

### Objetivo

Validar o fluxo completo de recuperação de senha.

### Pré-condições

- Cliente previamente cadastrado.

### Passos

1. Clicar em **Esqueci minha senha**.
2. Informar telefone.
3. Confirmar os últimos quatro dígitos do CPF.
4. Informar a nova senha.
5. Confirmar.

### Resultado Esperado

- Senha alterada com sucesso.
- Cliente consegue realizar login utilizando a nova senha.

---

## CT-004 - Novo Agendamento

**Prioridade:** CRÍTICA

**Relacionado:** API-003 • E2E-001

### Objetivo

Validar o fluxo completo de criação de um novo agendamento.

### Pré-condições

- Cliente autenticado.
- Serviço disponível.

### Passos

1. Selecionar um serviço.
2. Escolher uma data.
3. Escolher um horário disponível.
4. Confirmar o agendamento.

### Resultado Esperado

- Agendamento salvo com sucesso.
- Cliente visualiza imediatamente o novo agendamento.
- Profissional visualiza imediatamente o novo agendamento.
- Horário deixa de aparecer como disponível.
- Registro salvo corretamente no banco de dados.

---

## CT-005 - Cancelamento de Agendamento

**Prioridade:** CRÍTICA

**Relacionado:** API-004 • E2E-001

### Objetivo

Validar o cancelamento de um agendamento.

### Pré-condições

- Cliente possui um agendamento ativo.

### Passos

1. Abrir **Meus Agendamentos**.
2. Selecionar **Cancelar**.

### Resultado Esperado

- Agendamento cancelado.
- Horário liberado novamente.
- Profissional visualiza a atualização.

---

## CT-006 - Remarcação de Agendamento

**Prioridade:** CRÍTICA

**Relacionado:** API-005 • E2E-001

### Objetivo

Validar a remarcação de um agendamento.

### Pré-condições

- Cliente possui um agendamento ativo.

### Passos

1. Abrir **Meus Agendamentos**.
2. Selecionar **Remarcar**.
3. Escolher novo horário.
4. Confirmar.

### Resultado Esperado

- Novo horário salvo.
- Horário anterior liberado.

---

## CT-007 - Logout do Cliente

**Prioridade:** MÉDIA

**Relacionado:** E2E-001

### Objetivo

Validar o encerramento da sessão do cliente.

### Resultado Esperado

- Sessão encerrada.
- Cliente retorna ao portal do salão.

---

## CT-008 - Login do Profissional

**Prioridade:** CRÍTICA

**Relacionado:** API-007 • E2E-002

### Objetivo

Validar o login do profissional.

### Resultado Esperado

- Dashboard carregado.
- Agenda exibida corretamente.

---

## CT-009 - Logout do Profissional

**Prioridade:** CRÍTICA

**Relacionado:** E2E-002

### Objetivo

Validar o logout do profissional.

### Resultado Esperado

- Sessão encerrada.
- Redirecionamento para **#pro**.

---

## CT-010 - Cadastro de Serviço

**Prioridade:** ALTA

**Relacionado:** E2E-002

### Objetivo

Validar o cadastro de um serviço.

### Resultado Esperado

- Serviço disponível para agendamento.

---

## CT-011 - Editar Serviço

**Prioridade:** ALTA

**Relacionado:** E2E-002

### Objetivo

Validar a edição de um serviço.

### Resultado Esperado

- Alterações salvas corretamente.

---

## CT-012 - Desativar Serviço

**Prioridade:** ALTA

**Relacionado:** API-003

### Objetivo

Validar a desativação de um serviço.

### Resultado Esperado

- Serviço deixa de aparecer para novos agendamentos.

---

## CT-013 - Bloqueio de Agenda

**Prioridade:** CRÍTICA

**Relacionado:** E2E-002

### Objetivo

Validar o bloqueio manual da agenda.

### Resultado Esperado

- Horários bloqueados não podem ser agendados.

---

## CT-014 - Horário de Almoço

**Prioridade:** ALTA

**Relacionado:** PR-05

### Objetivo

Validar o bloqueio automático do horário de almoço.

### Resultado Esperado

- Horários do almoço permanecem indisponíveis.

---

## CT-015 - Expediente

**Prioridade:** ALTA

**Relacionado:** PR-05

### Objetivo

Validar os horários de funcionamento.

### Resultado Esperado

- Apenas horários dentro do expediente podem ser agendados.

---

## CT-016 - Confirmar Atendimento

**Prioridade:** ALTA

**Relacionado:** E2E-002

### Objetivo

Validar a confirmação de atendimento.

### Resultado Esperado

- Status alterado para **Confirmado**.

---

## CT-017 - Finalizar Atendimento

**Prioridade:** CRÍTICA

**Relacionado:** E2E-004

### Objetivo

Validar a conclusão do atendimento.

### Resultado Esperado

- Status alterado para **Concluído**.

---

## CT-018 - Registrar Pagamento

**Prioridade:** CRÍTICA

**Relacionado:** PR-04

### Objetivo

Validar o registro de pagamento.

### Resultado Esperado

- Caixa atualizado corretamente.

---

## CT-019 - Evitar Pagamento Duplicado

**Prioridade:** CRÍTICA

**Relacionado:** PR-04

### Objetivo

Validar a prevenção de pagamentos duplicados.

### Resultado Esperado

- Sistema impede registros duplicados.

---

## CT-020 - Dashboard Financeiro

**Prioridade:** ALTA

**Relacionado:** PR-04

### Objetivo

Validar os indicadores financeiros.

### Resultado Esperado

- Totais exibidos corretamente.

---

## CT-021 - Cadastro de Salão

**Prioridade:** CRÍTICA

**Relacionado:** E2E-007

### Objetivo

Validar o cadastro de um novo salão.

### Resultado Esperado

- Salão criado corretamente.

---

## CT-022 - Ativar/Inativar Salão

**Prioridade:** CRÍTICA

**Relacionado:** E2E-003

### Objetivo

Validar a alteração do status do salão.

### Resultado Esperado

- Salão respeita o status configurado.

---

## CT-023 - Impersonação do Administrador

**Prioridade:** ALTA

**Relacionado:** E2E-006

### Objetivo

Validar a impersonação do profissional pelo administrador.

### Resultado Esperado

- Administrador assume a sessão do profissional.
- Retorno ao painel administrativo preserva a sessão original.

---

## CT-024 - Link de Agendamento

**Prioridade:** ALTA

**Relacionado:** PR-05

### Objetivo

Validar o compartilhamento do link de agendamento.

### Resultado Esperado

- Link copiado corretamente.
- Cliente acessa o salão utilizando o link.

---

## CT-025 - Atualização Automática da Agenda

**Prioridade:** CRÍTICA

**Relacionado:** API-003 • E2E-001

### Objetivo

Garantir que novos agendamentos apareçam automaticamente para profissional e cliente.

### Resultado Esperado

- Cliente realiza o agendamento.
- Profissional recebe a atualização automaticamente.
- Cliente visualiza o novo agendamento imediatamente.
- Nenhum refresh manual é necessário.

---

## Resumo

| Prioridade | Quantidade |
| :---------- | ---------: |
| CRÍTICA | 16 |
| ALTA | 11 |
| MÉDIA | 3 |

**Total de Casos de Teste:** **30**

---

## Observações

Todos os casos de teste deverão possuir:

- Caso de teste documentado (CT).
- Teste automatizado correspondente (API ou E2E).
- Registro no `TEST_REPORT.md` após execução.
- Registro no `BUG_LOG.md` em caso de falha.

## CT-026 - Agendamento Presencial para Cliente sem Cadastro

**Prioridade:** CRÍTICA

**Relacionado:** PR-05

### Objetivo

Validar a criação de um agendamento presencial para um cliente que ainda não possui cadastro no sistema.

### Pré-condições

- Profissional autenticada.
- Serviço ativo.

### Passos

1. Acessar a Agenda.
2. Selecionar Novo Agendamento.
3. Informar nome e telefone do cliente.
4. Não selecionar um cliente cadastrado.
5. Escolher serviço, data e horário.
6. Confirmar.

### Resultado Esperado

- Agendamento criado com sucesso.
- Nenhum cadastro de cliente é criado.
- O sistema salva o snapshot contendo nome e telefone informados.
- O atendimento aparece normalmente na agenda.

## CT-027 - Remarcação respeitando regras de disponibilidade

**Prioridade:** CRÍTICA

**Relacionado:** PR-05

### Objetivo

Garantir que a remarcação utilize exatamente as mesmas regras de disponibilidade do Novo Agendamento.

### Pré-condições

- Agendamento existente.

### Passos

1. Selecionar Remarcar.
2. Tentar escolher horário bloqueado.
3. Tentar escolher horário durante o almoço.
4. Tentar escolher horário fora do expediente.
5. Selecionar um horário disponível.

### Resultado Esperado

- Apenas horários válidos são exibidos.
- Horários inválidos não podem ser selecionados.
- A remarcação é concluída apenas para horários disponíveis.

## CT-028 - Alteração do Horário de Almoço

**Prioridade:** ALTA

**Relacionado:** PR-05

### Objetivo

Validar a alteração do horário de almoço do salão.

### Pré-condições

- Profissional autenticada.

### Passos

1. Alterar o horário de almoço.
2. Salvar.

### Resultado Esperado

- Alteração salva corretamente.
- Os novos horários deixam de aparecer para novos agendamentos.

## CT-029 - Impedir alteração do Horário de Almoço com agendamentos existentes

**Prioridade:** CRÍTICA

**Relacionado:** PR-05

### Objetivo

Garantir que o sistema impeça alterações do horário de almoço quando existirem atendimentos já marcados no intervalo informado.

### Pré-condições

- Existir um atendimento agendado durante o novo intervalo de almoço.

### Passos

1. Alterar o horário de almoço para um período que contenha um atendimento.
2. Salvar.

### Resultado Esperado

- Alteração rejeitada.
- Sistema informa a existência de conflito.
- Nenhuma configuração é alterada.

## CT-030 - Copiar Link de Agendamento

**Prioridade:** MÉDIA

**Relacionado:** PR-05

### Objetivo

Validar a funcionalidade de copiar o Link de Agendamento.

### Pré-condições

- Profissional autenticada.

### Passos

1. Acessar Perfil.
2. Clicar em Copiar Link.

### Resultado Esperado

- Link copiado para a área de transferência.
- O endereço direciona corretamente para o salão correspondente.
