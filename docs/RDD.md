# Documento de Design de Requisitos (RDD) - StudioFlow

Versão: 1.0  
Status: MVP Homologado

---

## Objetivo

Este documento descreve detalhadamente todos os requisitos técnicos do StudioFlow, servindo como referência para desenvolvimento, manutenção, testes e evolução do sistema.

O RDD complementa os demais documentos de engenharia do projeto:

- PRD.md
- SAD.md
- TEST_PLAN.md
- TEST_CASES.md
- TEST_REPORT.md
- BUG_LOG.md
- DECISIONS.md
- CHANGELOG.md

Seu objetivo é detalhar a implementação técnica de cada módulo do sistema, permitindo que qualquer desenvolvedor compreenda rapidamente sua arquitetura e funcionamento.

---

# 1. Visão Geral

StudioFlow é um sistema SaaS de gerenciamento de salões de beleza desenvolvido utilizando arquitetura Full Stack baseada em React + Express.

O sistema possui arquitetura Multi-Tenant, permitindo que vários salões utilizem a mesma aplicação com completo isolamento lógico de dados.

Cada salão possui:

- cadastro próprio;
- profissionais;
- clientes;
- serviços;
- agenda;
- financeiro;
- configurações independentes.

O sistema suporta dois fluxos de agendamento:

- Agendamento realizado pelo próprio cliente através do Link de Agendamento;
- Agendamento Presencial realizado pela profissional, permitindo utilizar clientes já cadastrados ou clientes sem cadastro.

Todo acesso do cliente acontece através do Link de Agendamento exclusivo de cada salão.

# 2. Objetivos Técnicos

Os principais objetivos técnicos do projeto são:

- arquitetura simples;
- fácil manutenção;
- alta legibilidade;
- baixo custo de hospedagem;
- baixo consumo de memória;
- alta escalabilidade futura;
- segurança entre salões;
- experiência Mobile First.

---

# 3. Stack Tecnológica

## Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Motion
- Lucide React

---

## Backend

- Node.js
- Express
- TypeScript
- ESBuild

---

## Persistência

Atualmente o sistema utiliza um arquivo JSON como banco de dados durante o MVP.

Arquivo utilizado:

```
database.json
```

Durante a evolução do projeto está prevista migração para:

- SQLite
- PostgreSQL

sem alterações significativas na arquitetura do frontend.

---

## Ferramentas

Desenvolvimento:

- VS Code
- Git
- GitHub
- Vitest
- npm

Documentação:

- Markdown
- Markdownlint

---

# 4. Estrutura do Projeto

A organização do StudioFlow segue uma divisão simples entre frontend, backend, documentação e testes.

```text
studioflow/

├── src/
│
├── tests/
│   ├── api/
│   └── e2e/
│
├── docs/
│
├── server.ts
├── database.json
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

# 5. Portais do Sistema

O StudioFlow é composto por três portais distintos, cada um destinado a um perfil específico de usuário.

---

## 5.1 Portal do Cliente

Responsável pelo relacionamento do cliente com o salão.

Permite:

- realizar cadastro;
- autenticar-se no sistema;
- recuperar senha;
- visualizar serviços disponíveis;
- realizar agendamentos;
- remarcar agendamentos;
- cancelar agendamentos;
- consultar histórico de atendimentos;
- acompanhar o status dos agendamentos.

---

## 5.2 Portal da Profissional

Responsável pela gestão operacional do salão.

Permite:

- visualizar agenda diária;
- confirmar atendimentos;
- finalizar atendimentos;
- cancelar agendamentos;
- remarcar horários;
- realizar Agendamentos Presenciais;
- utilizar clientes já cadastrados;
- atender clientes sem cadastro;
- gerenciar serviços;
- controlar bloqueios da agenda;
- controlar horários de expediente;
- controlar horário de almoço;
- registrar pagamentos;
- acompanhar indicadores financeiros;
- editar o perfil do salão;
- copiar o Link de Agendamento.

---

## 5.3 Portal Administrativo

Responsável pela administração de todo o ecossistema StudioFlow.

Permite:

- login do administrador;
- cadastro de novos salões;
- edição de salões;
- ativação de salões;
- inativação de salões;
- alteração de senhas;
- impersonação de profissionais;
- acompanhamento das métricas gerais.

---

# 6. API REST

Responsável por toda comunicação entre frontend e backend.

Toda comunicação ocorre utilizando requisições HTTP.

Métodos utilizados:

- GET
- POST
- PUT
- DELETE

As respostas são retornadas em formato JSON.

Todas as regras de negócio são processadas no backend, garantindo consistência entre os diferentes portais da aplicação.

---

# 7. Arquitetura Multi-Tenant

O StudioFlow utiliza arquitetura **Multi-Tenant**, permitindo que diversos salões utilizem a mesma aplicação de forma totalmente isolada.

Cada registro de negócio pertence obrigatoriamente a um salão por meio do campo:

```text
salao_id
```

Todas as consultas realizadas pelo backend devem considerar esse identificador, impedindo o compartilhamento de informações entre estabelecimentos.

O isolamento é aplicado em entidades como:

- clientes;
- profissionais;
- serviços;
- agendamentos;
- bloqueios da agenda;
- movimentações financeiras;
- configurações do salão.

Essa abordagem garante segurança, escalabilidade e reutilização da mesma infraestrutura para múltiplos salões.

# 8. Arquitetura Multi-Tenant

O StudioFlow foi desenvolvido utilizando o conceito de Multi-Tenant.

Isso significa que vários salões compartilham a mesma aplicação sem compartilhar informações entre si.

Cada registro possui um identificador do salão.

Exemplo:

```text
salao_id
```

Todas as consultas realizadas pela API utilizam esse identificador para filtrar os dados corretamente.

As seguintes entidades utilizam obrigatoriamente o campo:

- Clientes
- Serviços
- Agendamentos
- Caixa
- Bloqueios
- Configurações

---

## Isolamento de Dados

Nenhum cliente pode acessar dados de outro salão.

Nenhum profissional pode acessar dados de outro estabelecimento.

O administrador possui acesso global por possuir perfil diferenciado.

Todo isolamento é realizado antes do retorno das informações.

---

## Link de Agendamento

Cada salão possui um endereço exclusivo.

Exemplo:

```text
http://localhost:3000/#bella-sobrancelha
```

Esse endereço identifica automaticamente qual salão será carregado.

Internamente o sistema continua utilizando o campo técnico:

```text
slug_url
```

Entretanto, na interface do usuário, o termo exibido é:

**Link de Agendamento**

Essa alteração reduz dúvidas para profissionais que não possuem conhecimento técnico.

---

# 9. Fluxo Geral da Aplicação

O StudioFlow possui dois fluxos principais de agendamento.

## Fluxo 1 — Agendamento pelo Cliente

Cliente acessa o Link de Agendamento

↓

Sistema identifica o salão

↓

Carrega serviços ativos

↓

Cliente realiza login ou cadastro

↓

Seleciona serviço

↓

Seleciona data

↓

Seleciona horário disponível

↓

Confirma agendamento

↓

API grava o agendamento

↓

Agenda da profissional é atualizada

↓

Histórico do cliente é atualizado

---

## Fluxo 2 — Agendamento Presencial

Profissional acessa sua agenda

↓

Seleciona Novo Agendamento

↓

Pesquisa cliente por nome ou telefone

↓

Cliente encontrado?

• Sim → utiliza o cadastro existente.

• Não → registra um cliente sem cadastro utilizando snapshot de nome e telefone.

↓

Seleciona serviço

↓

Seleciona horário disponível

↓

API valida disponibilidade

↓

Agendamento é registrado

↓

Agenda é atualizada.

# 10. Fluxo de Autenticação

O StudioFlow utiliza autenticação baseada em sessão.

Fluxo:

1. Usuário informa credenciais.

2. API valida os dados.

3. Sessão é criada.

4. Dados são armazenados no navegador.

5. Requisições posteriores utilizam a sessão existente.

---

## Perfis Existentes

O sistema possui três perfis.

### Cliente

Pode:

- realizar agendamentos;
- cancelar;
- remarcar;
- visualizar histórico;
- atualizar seus dados.

### Profissional

Pode:

- administrar seu salão;
- visualizar agenda;
- confirmar atendimentos;
- cadastrar serviços;
- bloquear horários;
- registrar pagamentos.

### Administrador

Pode:

- administrar todos os salões;
- cadastrar novos estabelecimentos;
- alterar configurações;
- impersonar profissionais;
- acompanhar métricas globais.

---

# 11. Gerenciamento de Sessão

Após autenticação, o sistema mantém uma sessão ativa.

As informações armazenadas incluem:

- identificador do usuário;
- perfil;
- salão ativo;
- nome;
- permissões.

Ao realizar logout:

- sessão é removida;
- estados React são limpos;
- usuário retorna para a tela inicial correspondente.

O sistema impede reutilização de sessões inválidas.

---

# 12. Estrutura das Entidades

Todas as entidades seguem tipagem TypeScript.

As interfaces ficam centralizadas em:

```text
src/types.ts
```

Isso garante padronização entre frontend e backend.

As principais entidades serão detalhadas na próxima seção.

# 13. Modelagem das Entidades

A modelagem de dados do StudioFlow foi projetada para manter simplicidade durante o MVP e permitir evolução futura sem grandes alterações estruturais.

Cada entidade possui responsabilidade única e relacionamentos bem definidos.

---

## Entidade: Salão (Salon)

Representa um estabelecimento cadastrado na plataforma.

Principais atributos:

- id
- nome
- slug_url
- telefone
- endereço
- descrição
- profissional_responsavel
- email
- senha
- ativo
- hora_inicio_expediente
- hora_fim_expediente
- hora_inicio_almoco
- hora_fim_almoco

Relacionamentos:

- 1 salão possui vários clientes.
- 1 salão possui vários serviços.
- 1 salão possui vários agendamentos.
- 1 salão possui vários bloqueios.
- 1 salão possui vários registros financeiros.

---

## Regras de Negócio

Um salão somente poderá:

- receber novos agendamentos quando estiver ativo;
- exibir serviços ativos;
- permitir login do profissional quando ativo.

Caso esteja inativo:

- não aparecerá no diretório;
- não aceitará novos agendamentos;
- profissionais não poderão acessar a área operacional.

---

## Entidade: Cliente (Client)

Representa um usuário final que agenda serviços.

Principais atributos:

- id
- salao_id
- nome
- telefone
- cpf
- senha
- criado_em

Relacionamentos:

- pertence a um único salão;
- pode possuir vários agendamentos.

---

## Regras do Cliente

O sistema não permite:

- CPF duplicado dentro do mesmo salão;
- telefone duplicado;
- cadastro incompleto;
- senha diferente da confirmação.

Após o cadastro:

- o login é realizado automaticamente;
- a sessão é criada;
- o histórico permanece vazio até existir um agendamento.

---

## Entidade: Serviço (Service)

Representa um serviço oferecido pelo salão.

Principais atributos:

- id
- salao_id
- nome
- duração
- preço
- ativo

Relacionamentos:

- pertence a um salão;
- pode estar presente em diversos agendamentos.

---

## Regras dos Serviços

Serviços inativos:

- não aparecem para clientes;
- continuam existindo para fins históricos;
- permanecem vinculados aos agendamentos antigos.

Essa estratégia evita perda de informações financeiras.

---

## Entidade: Agendamento (Booking)

É a principal entidade do sistema.

Representa um horário reservado.

Principais atributos:

- id
- salao_id
- cliente_id (pode ser nulo)
- servico_id
- data_hora_inicio
- data_hora_fim
- status
- nome_cliente_avulso
- telefone_cliente_avulso
- cliente_telefone_informado

Quando o atendimento é realizado para um cliente sem cadastro, o sistema mantém um snapshot das informações informadas pela profissional.

- nome_cliente_avulso armazena o nome informado no momento do agendamento;
- telefone_cliente_avulso armazena o telefone exibido posteriormente na agenda;
- cliente_telefone_informado preserva o telefone originalmente enviado durante a criação do agendamento, permitindo futuras vinculações com um cadastro de cliente.

Esses dados permanecem vinculados ao agendamento mesmo sem existir um registro na entidade Cliente, preservando o histórico completo do atendimento.

Status possíveis:

- Agendado
- Confirmado
- Concluído
- Cancelado

---

## Regras do Agendamento

O sistema valida automaticamente:

- horário disponível;
- expediente do salão;
- horário de almoço;
- conflitos de agenda;
- bloqueios cadastrados.

Caso qualquer validação falhe, o agendamento é rejeitado.

Também são permitidos agendamentos presenciais para clientes ainda não cadastrados.

Nesses casos:

- não é criado um cadastro de cliente;
- o sistema armazena um snapshot do nome e telefone informados;
- o histórico permanece preservado mesmo antes do cadastro do cliente.

A geração dos horários disponíveis é compartilhada entre todos os fluxos do sistema:

- Portal do Cliente;
- Novo Agendamento da Profissional;
- Remarcação.

Dessa forma, todos utilizam exatamente as mesmas regras de disponibilidade, garantindo consistência entre criação e remarcação de agendamentos.

## Remarcação

Durante a remarcação, o sistema reutiliza exatamente a mesma rotina de cálculo de disponibilidade utilizada pelo fluxo de Novo Agendamento.

Isso garante que todos os fluxos utilizem uma única fonte de verdade para cálculo de horários disponíveis.

São consideradas automaticamente:

- expediente do salão;
- horário de almoço;
- bloqueios de agenda;
- duração do serviço;
- conflitos com outros agendamentos.

Durante a remarcação, o próprio agendamento em edição é desconsiderado na verificação de conflito, permitindo manter seu horário atual caso desejado.

Após a seleção do novo horário, o backend executa novamente todas as validações antes de confirmar a alteração.

Essa estratégia garante consistência entre todos os fluxos de agendamento.

## Cancelamento

Quando um agendamento é cancelado:

- o histórico permanece registrado;
- o status muda para Cancelado;
- o horário torna-se disponível novamente;
- nenhum dado histórico é removido.

Essa estratégia mantém rastreabilidade completa.
Os dados históricos do atendimento, incluindo informações de clientes avulsos, permanecem preservados.

---

## Entidade: Caixa (Cash)

Responsável pelo controle financeiro.

Principais atributos:

- id
- salao_id
- agendamento_id
- valor
- forma_pagamento
- data
- observação

Relacionamentos:

- pertence a um salão;
- pode estar vinculado a um atendimento.

---

## Regras Financeiras

Um pagamento somente poderá ser registrado quando:

- o atendimento estiver Concluído.

O sistema impede:

- pagamentos duplicados;
- registros sem atendimento concluído;
- lançamentos inconsistentes.

Essas validações foram implementadas durante o PR-04.

---

## Entidade: Bloqueio de Agenda

Representa períodos indisponíveis.

Exemplos:

- férias;
- reunião;
- almoço;
- manutenção;
- bloqueios personalizados.

Cada bloqueio possui:

- data;
- hora inicial;
- hora final;
- motivo.

Durante a geração dos horários disponíveis, todos os bloqueios são considerados automaticamente.

---

## Entidade: Administrador

Representa o administrador global da plataforma.

Possui acesso completo ao ecossistema.

Permissões:

- cadastrar salões;
- editar salões;
- ativar;
- inativar;
- redefinir senhas;
- visualizar estatísticas;
- impersonar profissionais.

O administrador não realiza atendimentos nem possui agenda própria.

---

# 14. Relacionamentos

A estrutura lógica do sistema pode ser representada da seguinte forma:

Administrador

↓

Salões

↓

Clientes

↓

Agendamentos

↓

Caixa

Cada salão mantém isolamento completo em relação aos demais.

Nenhuma entidade pode acessar registros pertencentes a outro salão sem autorização administrativa.

# 15. APIs REST

Toda comunicação entre o frontend e o backend ocorre através de uma API REST desenvolvida em Express.

As respostas são retornadas em formato JSON utilizando códigos HTTP padronizados.

---

## Padrões da API

### Método GET

Utilizado para consulta de informações.

Exemplos:

- listar clientes;
- listar serviços;
- listar agendamentos;
- consultar estatísticas.

---

### Método POST

Utilizado para criação de registros.

Exemplos:

- cadastro de cliente;
- login;
- criação de agendamento;
- cadastro de serviço.

---

### Método PUT

Utilizado para atualização de informações.

Exemplos:

- editar perfil;
- remarcar atendimento;
- alterar status;
- atualizar serviço.

---

### Método DELETE

Utilizado para exclusão lógica ou física de registros quando permitido.

Sempre que possível, o StudioFlow prefere utilizar inativação ao invés de exclusão permanente.

---

# 16. Endpoints Públicos

## Listar Salões

GET

```text
/api/public/salons
```

### Objetivo

Retornar todos os salões ativos cadastrados.

### Resposta

```json
[
  {
    "id": "...",
    "nome": "...",
    "slug_url": "..."
  }
]
```

---

## Buscar Salão pelo Link de Agendamento

GET

```text
/api/salons/by-slug/:slug
```

### Objetivo

Carregar os dados públicos de um salão.

### Retorna

- informações do salão;
- serviços ativos;
- horários disponíveis.

---

# 17. APIs do Cliente

## Cadastro

POST

```text
/api/clients/signup
```

### Dados enviados

- nome
- telefone
- cpf
- senha
- salao_id

### Validações

- CPF obrigatório;
- telefone obrigatório;
- senha obrigatória;
- confirmação de senha;
- cliente não duplicado.

### Resultado

Cliente criado com sucesso.

---

## Login

POST

```text
/api/clients/login
```

### Dados enviados

- telefone
- senha

### Resultado

Retorna:

- dados do cliente;
- sessão;
- permissões.

---

## Recuperação de Senha

PUT

```text
/api/clients/reset-password
```

Fluxo:

1. localizar telefone;
2. validar CPF;
3. informar nova senha;
4. salvar.

---

## Atualizar Perfil

PUT

```text
/api/clients/profile
```

Permite alterar:

- nome;
- telefone;
- senha.

---

## Histórico de Agendamentos

GET

```text
/api/clients/:id/bookings
```

Retorna exclusivamente os agendamentos do cliente autenticado.

Nenhum cliente consegue visualizar registros pertencentes a outro usuário.

---

# 18. APIs da Profissional

## Login

POST

```text
/api/professional/login
```

Retorna:

- dados do salão;
- dados da profissional;
- permissões.

---

## Dashboard

GET

```text
/api/salons/:id/stats
```

Retorna indicadores como:

- receita do dia;
- quantidade de clientes;
- atendimentos do dia;
- faturamento.

---

## Agenda

GET

```text
/api/salons/:id/bookings
```

Retorna todos os agendamentos pertencentes ao salão.

Filtros disponíveis:

- data;
- status;
- cliente;
- profissional.

---

## Atualizar Perfil

PUT

```text
/api/professional/profile
```

Permite alterar:

- nome do salão;
- telefone;
- descrição;
- expediente;
- horário de almoço;
- Link de Agendamento.

---

## Serviços

GET

```text
/api/salons/:id/services
```

Lista todos os serviços cadastrados.

---

POST

```text
/api/services
```

Cria novo serviço.

---

PUT

```text
/api/services/:id
```

Atualiza informações do serviço.

---

DELETE

```text
/api/services/:id
```

Realiza inativação quando permitido.

---

## Financeiro

GET

```text
/api/salons/:id/finance-reports
```

Retorna:

- faturamento;
- serviços mais vendidos;
- formas de pagamento;
- evolução financeira.

---

## Caixa

GET

```text
/api/salons/:id/caixa
```

Lista todos os lançamentos financeiros.

---

POST

```text
/api/caixa
```

Cria novo lançamento financeiro.

Validação obrigatória:

- atendimento concluído.

---

# 19. APIs do Administrador

## Login

POST

```text
/api/admin/login
```

Autentica o administrador master.

---

## Dashboard Geral

GET

```text
/api/admin/stats
```

Retorna indicadores globais do StudioFlow.

Exemplos:

- total de salões;
- total de clientes;
- total de atendimentos;
- faturamento geral.

---

## Cadastro de Salões

POST

```text
/api/admin/salons
```

Cria um novo salão.

---

## Atualização de Salões

PUT

```text
/api/admin/salons/:id
```

Permite:

- editar informações;
- ativar;
- inativar;
- redefinir senha.

---

## Exclusão de Salões

DELETE

```text
/api/admin/salons/:id
```

Remoção definitiva quando autorizada.

---

## Impersonação

POST

```text
/api/admin/impersonate
```

Permite ao administrador assumir temporariamente a sessão de uma profissional para fins de suporte.

Ao finalizar a impersonação:

- a sessão original do administrador é restaurada;
- nenhuma informação é perdida;
- toda ação permanece registrada em log.

# 20. Regras de Negócio

As regras de negócio garantem a integridade dos dados e o correto funcionamento do StudioFlow.

Toda alteração realizada no sistema deve respeitar as validações descritas nesta seção.

---

## Cadastro de Clientes

Para que um cliente seja cadastrado, o sistema exige obrigatoriamente:

- Nome preenchido.
- Telefone válido.
- CPF válido.
- Senha.
- Confirmação da senha.

O cadastro será rejeitado quando:

- CPF já existir para o mesmo salão.
- Telefone já estiver cadastrado.
- Senhas forem diferentes.
- Campos obrigatórios estiverem vazios.

Após o cadastro:

- a sessão é iniciada automaticamente;
- o cliente é direcionado ao portal do salão;
- o histórico de agendamentos inicia vazio.

---

## Login

O login somente será permitido quando:

- telefone existir;
- senha estiver correta;
- usuário estiver ativo.

Após autenticação:

- sessão criada;
- dados armazenados localmente;
- permissões carregadas;
- histórico atualizado.

---

## Recuperação de Senha

Fluxo obrigatório:

1. Informar telefone.
2. Confirmar os últimos dígitos do CPF.
3. Informar nova senha.
4. Confirmar nova senha.

Caso qualquer etapa falhe:

- a senha permanece inalterada.

---

## Cadastro de Serviços

Somente profissionais autenticadas podem:

- cadastrar;
- editar;
- inativar serviços.

Clientes nunca possuem acesso a esse módulo.

---

## Serviços Inativos

Serviços marcados como inativos:

- não aparecem para novos clientes;
- permanecem vinculados aos atendimentos antigos;
- continuam compondo os relatórios financeiros.

---

## Agendamento

Para que um agendamento seja criado, todas as condições abaixo devem ser verdadeiras:

- cliente autenticado;
- salão ativo;
- serviço ativo;
- horário disponível;
- dentro do expediente;
- fora do horário de almoço;
- sem bloqueios;
- sem conflito de agenda.

Caso qualquer validação falhe:

- nenhum registro será salvo.

---

## Cancelamento

Ao cancelar um atendimento:

- o status muda para Cancelado;
- o histórico permanece disponível;
- o horário volta a ficar livre.

Nenhum dado histórico é removido.

---

## Remarcação

Durante a remarcação:

- o horário antigo é liberado;
- o novo horário passa por todas as validações;
- somente após aprovação ocorre a alteração.

Isso impede conflitos entre horários.

---

## Confirmação do Atendimento

Somente profissionais podem confirmar um atendimento.

Status permitido:

Agendado

↓

Confirmado

---

## Finalização

Somente atendimentos confirmados podem ser finalizados.

Fluxo:

Agendado

↓

Confirmado

↓

Concluído

Após conclusão:

- pagamento poderá ser registrado.

---

## Registro Financeiro

Um lançamento financeiro somente poderá existir quando:

- atendimento concluído.

O sistema impede:

- pagamentos duplicados;
- pagamentos de atendimentos cancelados;
- pagamentos de atendimentos ainda agendados.

---

# 21. Regras de Segurança

A segurança é baseada em isolamento de dados e controle de permissões.

---

## Cliente

Pode acessar apenas:

- seus dados;
- seus agendamentos;
- seu perfil.

Nunca poderá visualizar:

- clientes de outros salões;
- agenda completa;
- caixa financeiro.

---

## Profissional

Pode acessar apenas dados pertencentes ao próprio salão.

Nunca poderá visualizar:

- dados de outro salão;
- caixa de outro estabelecimento;
- clientes externos.

---

## Administrador

Possui acesso global.

Entretanto, toda ação administrativa deve ser registrada para auditoria futura.

---

## Isolamento entre Salões

Toda consulta obrigatoriamente utiliza o campo:

```text
salao_id
```

Essa validação impede vazamento de informações.

É considerada uma das principais regras de segurança do StudioFlow.

---

# 22. Atualização Automática da Agenda

Durante o MVP, a atualização das telas ocorre manualmente através do botão "Atualizar".

Essa abordagem simplifica o desenvolvimento inicial e reduz a complexidade da infraestrutura.

---

## Evolução Planejada

Está prevista a substituição da atualização manual por atualização em tempo real utilizando Server-Sent Events (SSE).

Fluxo esperado:

Cliente agenda

↓

Servidor registra

↓

Servidor envia evento

↓

Profissional recebe atualização

↓

Agenda atualiza automaticamente

↓

Cliente visualiza imediatamente

Sem necessidade de atualizar a página.

---

## Benefícios

- menor consumo que WebSocket;
- implementação simples;
- excelente compatibilidade;
- ideal para comunicação unidirecional.

Caso futuramente seja necessário envio bidirecional de eventos, poderá ser adotado WebSocket.

---

# 23. Performance

O StudioFlow foi projetado priorizando rapidez de resposta.

Objetivos:

- baixo consumo de memória;
- poucas dependências;
- inicialização rápida;
- respostas em milissegundos.

---

## Frontend

Boas práticas utilizadas:

- componentes reutilizáveis;
- estados mínimos;
- renderizações controladas;
- tipagem TypeScript.

---

## Backend

Boas práticas:

- rotas REST simples;
- validações centralizadas;
- persistência leve;
- baixo tempo de resposta.

---

## Persistência

Durante o MVP utiliza-se:

database.json

Vantagens:

- simplicidade;
- fácil backup;
- fácil depuração.

Limitações:

- concorrência;
- escrita síncrona;
- baixa escalabilidade.

Essas limitações justificam a futura migração para SQLite ou PostgreSQL.

---

# 24. Estratégia de Testes

Todo desenvolvimento deverá possuir cobertura por testes.

A estrutura oficial encontra-se em:

```text
tests/

├── api/
└── e2e/
```

Cada funcionalidade deverá possuir:

- Caso de Teste (CT);
- Teste de API;
- Teste End-to-End;
- Registro no TEST_REPORT;
- Registro no BUG_LOG quando aplicável.

Essa estratégia reduz regressões e aumenta a confiabilidade das novas versões.

# 25. Padrões de Desenvolvimento

Todo código desenvolvido para o StudioFlow deverá seguir os padrões definidos neste documento.

## TypeScript

Todo novo código deverá utilizar tipagem explícita.

Evitar:

- any
- variáveis sem tipo
- funções sem retorno definido

Sempre que possível utilizar interfaces centralizadas em:

```text
src/types.ts
```

---

## React

Os componentes deverão seguir os princípios de:

- Responsabilidade única
- Componentização
- Reutilização
- Facilidade de manutenção

Boas práticas:

- evitar componentes excessivamente grandes;
- manter estados próximos de onde são utilizados;
- utilizar funções puras sempre que possível.

---

## Backend

As regras de negócio deverão permanecer concentradas no backend.

O frontend nunca deverá ser responsável por validar regras críticas como:

- conflitos de agenda;
- permissões;
- pagamentos;
- isolamento entre salões.

Toda validação deverá ocorrer novamente na API.

---

## Convenções de Nomenclatura

### Variáveis

Utilizar:

camelCase

Exemplo:

```typescript
clienteLogado
```

---

### Interfaces

Utilizar PascalCase.

Exemplo:

```typescript
Booking
```

---

### Arquivos

Componentes React:

PascalCase

Exemplo:

```text
BookingCard.tsx
```

Arquivos auxiliares:

camelCase

Exemplo:

```text
bookingService.ts
```

---

### Endpoints

Sempre utilizar substantivos.

Exemplo:

```text
/api/bookings
/api/services
/api/clients
```

Evitar verbos nas URLs.

---

# 26. Roadmap Técnico

## MVP (Concluído)

- Cadastro de clientes
- Login
- Recuperação de senha
- Portal do Cliente
- Portal da Profissional
- Portal Administrativo
- Financeiro
- Agenda
- Bloqueios
- Horário de almoço
- Expediente
- Multi-Tenant
- Link de Agendamento
- Testes documentados

Status:

✅ Concluído

---

## Versão 1.1

Planejamento:

- Atualização automática da agenda (SSE)
- Notificações em tempo real
- Melhorias no dashboard
- Histórico de notificações

---

## Versão 1.2

Planejamento:

- Migração para SQLite
- Camada Repository
- Logs estruturados
- Auditoria

---

## Versão 2.0

Planejamento:

- PostgreSQL
- Docker
- Cache Redis
- WebSocket (caso necessário)
- API pública
- Aplicativo Mobile
- Multi-profissionais
- Agenda compartilhada
- Integrações externas

---

# 27. Rastreabilidade

Toda funcionalidade deverá possuir rastreabilidade completa.

Fluxo obrigatório:

```text
Requisito

↓

Caso de Teste (CT)

↓

Teste de API

↓

Teste E2E

↓

Homologação

↓

Produção
```

---

## Exemplo

Novo Agendamento

↓

CT-004

↓

API-003

↓

E2E-001

↓

TEST_REPORT

↓

Produção

---

## Benefícios

- fácil manutenção;
- identificação rápida de regressões;
- histórico completo de alterações;
- maior confiabilidade.

---

# 28. Qualidade de Software

O StudioFlow adota os seguintes pilares de qualidade.

## Confiabilidade

Todas as regras críticas devem possuir testes.

---

## Manutenibilidade

Código simples.

Documentação atualizada.

Arquitetura organizada.

---

## Escalabilidade

O projeto foi preparado para crescer sem necessidade de reescrita completa.

---

## Usabilidade

Interface simples.

Fluxo intuitivo.

Mobile First.

---

## Segurança

Isolamento entre salões.

Controle de permissões.

Validações no backend.

---

## Performance

Baixo tempo de resposta.

Baixo consumo de memória.

Infraestrutura simplificada.

---

# 29. Documentação Relacionada

Este documento deve ser utilizado em conjunto com:

- PRD.md
- SAD.md
- TEST_PLAN.md
- TEST_CASES.md
- TEST_REPORT.md
- BUG_LOG.md
- DECISIONS.md
- CHANGELOG.md
- README.md

Cada documento possui uma responsabilidade específica.

Nenhum documento substitui outro.

---

# 30. Considerações Finais

O RDD estabelece os requisitos técnicos necessários para garantir que o StudioFlow mantenha uma arquitetura consistente, segura e de fácil evolução.

Todas as novas funcionalidades deverão respeitar as diretrizes aqui definidas.

Alterações arquiteturais significativas deverão ser registradas também no **DECISIONS.md**, enquanto novas funcionalidades deverão atualizar simultaneamente:

- CHANGELOG.md
- TEST_CASES.md
- TEST_PLAN.md
- TEST_REPORT.md
- BUG_LOG.md (quando houver falhas)
- SAD.md (quando houver alteração arquitetural)

Dessa forma, mantém-se rastreabilidade completa entre requisitos, implementação, testes e documentação.

---

# Histórico do Documento

| Versão | Data | Responsável | Descrição |
|---------|------------|----------------|--------------------------------|
| 1.0 | 21/07/2026 | André Saldanha | Criação do RDD do StudioFlow |
| 1.1 | Futuro | Equipe | Atualizações arquiteturais |

---

# Aprovação

Documento revisado conforme o padrão do Framework Saldanha AI Dev (FSAD).

Status do documento:

**✅ APROVADO**

---

**Fim do Documento**
