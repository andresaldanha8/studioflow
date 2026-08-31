# Registro de Bugs - StudioFlow

**Versão:** 1.0  
**Status:** Em andamento

---

## BUG-001 - Histórico de agendamentos do cliente não era carregado após login

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 20/07/2026 |
| **Módulo** | Portal do Cliente |
| **Relacionado** | CT-001 • API-006 • E2E-001 |
| **Severidade** | Alta |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v0.9 |

### Descrição

O cliente realizava login corretamente, porém a tela **Meus Agendamentos** permanecia vazia quando já existiam agendamentos anteriores. Os agendamentos somente apareciam após a criação de um novo agendamento.

### Causa

Os dados do salão não eram recarregados após a autenticação do cliente.

### Solução

Executar `loadSalonWorkspaceData(selectedSalon.id)` imediatamente após o login do cliente.

---

## BUG-002 - Logout da profissional redirecionava para o Portal do Cliente

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 20/07/2026 |
| **Módulo** | Portal da Profissional |
| **Relacionado** | CT-009 • E2E-002 |
| **Severidade** | Crítica |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v0.9 |

### Descrição

Após realizar logout, a profissional era enviada para a interface do cliente, exibindo o formulário de login e cadastro de clientes.

### Causa

O roteador priorizava o `pathname` em vez do `hash`, fazendo com que o link do salão fosse interpretado como rota principal.

### Solução

- Alterada a prioridade do roteamento para utilizar o `hash` quando presente.
- Realizado o reset de `selectedSalon` durante o procedimento de logout.

---

## BUG-003 - Atualização automática do Vite ao salvar database.json

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 20/07/2026 |
| **Módulo** | Ambiente de Desenvolvimento |
| **Relacionado** | CT-025 |
| **Severidade** | Média |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v0.9 |

### Descrição

Sempre que um agendamento era criado, o arquivo `database.json` era salvo. O Vite detectava a alteração e realizava a recarga automática da aplicação em todas as abas abertas.

### Causa

O arquivo `database.json` estava sendo monitorado pelo watcher do Vite.

### Solução

Configurado o `vite.config.ts` para ignorar alterações no arquivo `database.json` durante o desenvolvimento.

---

## BUG-004 - Histórico do cliente não atualizava imediatamente após autenticação

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 20/07/2026 |
| **Módulo** | Portal do Cliente |
| **Relacionado** | CT-001 • API-006 |
| **Severidade** | Alta |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v0.9 |

### Descrição

Mesmo com os dados existentes no banco, o histórico não era exibido imediatamente após o login.

### Causa

O workspace era carregado antes da conclusão do processo de autenticação.

### Solução

Recarregar os dados do workspace imediatamente após a autenticação do cliente.

---

## BUG-005 - Exposição do termo técnico "Slug" para profissionais

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 21/07/2026 |
| **Módulo** | Portal da Profissional |
| **Relacionado** | CT-024 |
| **Severidade** | Baixa |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v0.9 |

### Descrição

O sistema exibia o termo técnico **Slug** na interface da profissional, gerando dúvidas para as usuárias.

### Causa

Uso do nome interno da variável de rota diretamente na interface.

### Solução

Substituído o termo por **Link de Agendamento**, acompanhado de um botão **Copiar Link**, preservando toda a lógica interna do sistema.

---

## BUG-006 - Busca de clientes utilizava lista global em vez da lista filtrada do salão

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 24/07/2026 |
| **Módulo** | Portal da Profissional |
| **Relacionado** | CT-XXX |
| **Severidade** | Alta |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v1.0 |

### Descrição

Durante o Agendamento Presencial, a busca de clientes podia utilizar uma lista global de clientes em vez da lista pertencente ao salão ativo. Em um ambiente Multi-Tenant, esse comportamento poderia resultar na localização incorreta de clientes.

### Causa

A rotina de busca não reutilizava a coleção de clientes já filtrada pelo `salao_id`, realizando a pesquisa sobre uma lista mais abrangente do que a necessária.

### Solução

A busca passou a utilizar exclusivamente a lista de clientes previamente filtrada para o salão ativo, garantindo o isolamento lógico dos dados e preservando a arquitetura Multi-Tenant do sistema.

---

## BUG-007 - Associação incorreta de clientes por comparação parcial do telefone

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 24/07/2026 |
| **Módulo** | Backend |
| **Relacionado** | CT-XXX |
| **Severidade** | Crítica |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v1.0 |

### Descrição

Durante o Agendamento Presencial, quando o telefone informado não correspondia exatamente a um cliente cadastrado, o sistema podia associar incorretamente outro cliente que possuísse os mesmos últimos dígitos do número de telefone.

Como consequência, o atendimento era registrado para a pessoa errada, comprometendo a integridade do histórico de agendamentos.

### Causa

O backend utilizava uma rotina de comparação parcial do telefone (*suffix match*), considerando apenas os últimos dígitos do número quando não encontrava uma correspondência exata.

Essa estratégia permitia associações incorretas entre clientes que possuíam números semelhantes, porém com códigos de área diferentes.

### Solução

A lógica de comparação parcial foi removida completamente.

A identificação de clientes passou a utilizar exclusivamente a comparação exata do telefone normalizado, preservando a integridade dos dados e eliminando associações indevidas entre clientes distintos.

---

## BUG-008 - Agenda da profissional não identificava corretamente clientes sem cadastro

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 24/07/2026 |
| **Módulo** | Portal da Profissional |
| **Relacionado** | CT-XXX |
| **Severidade** | Média |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v1.0 |

### Descrição

Os agendamentos realizados para clientes sem cadastro eram exibidos na agenda da profissional sem a identificação correta do cliente, dificultando o reconhecimento do atendimento e comprometendo a usabilidade da agenda.

Além disso, o sistema não preservava de forma adequada as informações informadas durante o Agendamento Presencial.

### Causa

O agendamento armazenava apenas a referência ao cliente cadastrado (`cliente_id`). Quando o atendimento era realizado para um cliente sem cadastro, não existia um mecanismo para manter um snapshot das informações informadas pela profissional.

Como consequência, a interface não possuía dados suficientes para identificar corretamente esses atendimentos.

### Solução

Foi implementado o armazenamento de um snapshot das informações do cliente no próprio agendamento, utilizando os campos:

- `nome_cliente_avulso`;
- `telefone_cliente_avulso`;
- `cliente_telefone_informado`.

A agenda da profissional passou a utilizar esses dados para identificar corretamente os atendimentos de clientes sem cadastro, exibindo também o indicador visual **Cliente sem cadastro**, preservando o histórico e facilitando a identificação dos agendamentos.

---

## BUG-009 - Modal de remarcação permitia seleção de horários indisponíveis

| Propriedade | Detalhe |
| :---------- | :------ |
| **Data** | 25/07/2026 |
| **Módulo** | Portal da Profissional |
| **Relacionado** | CT-XXX |
| **Severidade** | Alta |
| **Status** | ✅ Resolvido |
| **Versão** | StudioFlow v1.0 |

### Descrição

O modal de remarcação permitia que a profissional selecionasse manualmente qualquer data e horário, inclusive horários já ocupados, bloqueados ou fora da disponibilidade calculada pelo sistema.

Embora o backend impedisse a gravação de remarcações inválidas, a interface apresentava opções que nunca poderiam ser concluídas, comprometendo a experiência do usuário.

### Causa

O fluxo de remarcação utilizava campos livres de data e horário (`input`), sem reutilizar a mesma lógica de disponibilidade aplicada ao fluxo de Novo Agendamento.

Como consequência, a interface não refletia a disponibilidade real da agenda.

### Solução

O modal de remarcação passou a reutilizar integralmente a rotina de cálculo de horários disponíveis utilizada no fluxo de Novo Agendamento.

A interface agora apresenta apenas horários realmente disponíveis para seleção, considerando automaticamente:

- expediente do salão;
- horário de almoço;
- bloqueios cadastrados;
- conflitos com outros agendamentos;
- duração do serviço;
- exclusão do próprio agendamento durante a remarcação.

O backend permanece como fonte única de validação, realizando todas as verificações novamente antes de confirmar a alteração do agendamento.

## Resumo

| Status | Quantidade |
| :------ | ---------: |
| ✅ Resolvidos | 9 |
| 🟡 Em análise | 0 |
| 🔴 Abertos | 0 |

**Total de Bugs Registrados:** **9**

---

## Observações

Todo novo bug deverá conter obrigatoriamente:

- Identificador único (BUG-XXX).
- Data de identificação.
- Módulo afetado.
- Caso de Teste (CT) relacionado.
- Teste Automatizado (API ou E2E) relacionado, quando existir.
- Severidade.
- Descrição detalhada.
- Causa raiz.
- Solução aplicada.
- Status.
- Versão em que foi corrigido.

Durante a fase de homologação, todos os bugs corrigidos devem possuir vínculo com o **CHANGELOG.md**, os **Casos de Teste (TEST_CASES.md)** e, quando aplicável, com o **TEST_REPORT.md**, garantindo rastreabilidade completa entre identificação, correção e validação.
