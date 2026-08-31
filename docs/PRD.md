# Documento de Requisitos de Produto (PRD) - StudioFlow

Versão: 1.0  
Status: MVP Homologado

---

# Objetivo

Este documento define os requisitos funcionais e de negócio do StudioFlow, servindo como referência oficial para desenvolvimento, homologação, manutenção e evolução do produto.

O PRD descreve:

- visão do produto;
- objetivos;
- público-alvo;
- funcionalidades;
- regras de negócio;
- requisitos funcionais;
- requisitos não funcionais;
- critérios de aceitação.

Este documento complementa os demais documentos de engenharia do projeto:

- README.md
- SAD.md
- RDD.md
- TEST_PLAN.md
- TEST_CASES.md
- TEST_REPORT.md
- BUG_LOG.md
- DECISIONS.md
- CHANGELOG.md

---

# 1. Visão Geral do Produto

O StudioFlow é uma plataforma SaaS desenvolvida para automatizar a gestão operacional de salões de beleza, barbearias, estúdios de estética e profissionais autônomos da área da beleza.

A plataforma centraliza em um único sistema:

- cadastro de clientes;
- agenda;
- serviços;
- financeiro;
- histórico;
- administração do salão;
- gestão da operação diária.

O objetivo é substituir controles realizados em papel, planilhas ou aplicativos genéricos, oferecendo uma solução especializada para o segmento.

---

# 2. Problema que o Produto Resolve

Grande parte dos profissionais da área da beleza ainda utiliza processos manuais para controlar sua rotina.

Os principais problemas identificados são:

- perda de horários;
- conflitos de agenda;
- esquecimentos;
- dificuldade para acompanhar o histórico dos clientes;
- ausência de indicadores financeiros;
- atendimento por diversos canais simultaneamente (WhatsApp, telefone e redes sociais).

Esses fatores reduzem a produtividade e dificultam o crescimento do negócio.

O StudioFlow foi criado para eliminar essas dificuldades através da automação dos processos mais importantes do salão.

---

# 3. Objetivos do Produto

O StudioFlow possui os seguintes objetivos estratégicos:

- digitalizar a operação do salão;
- reduzir conflitos de horários;
- facilitar o agendamento pelos clientes;
- organizar o histórico de atendimentos;
- melhorar o controle financeiro;
- aumentar a produtividade do profissional;
- fornecer indicadores para tomada de decisão;
- permitir crescimento escalável através do modelo SaaS.

---

# 4. Público-Alvo

O StudioFlow atende dois mercados distintos.

## B2B

Profissionais e empresas da área da beleza.

Exemplos:

- salões de beleza;
- barbearias;
- estúdios de sobrancelhas;
- estúdios de manicure;
- clínicas de estética;
- profissionais autônomos.

---

## B2C

Clientes finais que desejam agendar serviços de forma simples e rápida.

O cliente pode:

- localizar o salão;
- visualizar serviços;
- escolher horários;
- realizar agendamentos;
- acompanhar seu histórico.

---

# 5. Personas

## Persona 01 — Cliente

Características:

- utiliza principalmente smartphone;
- deseja agendar rapidamente;
- prefere atendimento sem necessidade de ligações;
- valoriza praticidade.

Objetivos:

- encontrar horários disponíveis;
- agendar em poucos passos;
- acompanhar seus atendimentos.

Principais dores:

- demora no atendimento;
- falta de resposta pelo WhatsApp;
- esquecimento de horários.

---

## Persona 02 — Profissional

Características:

- administra a agenda diariamente;
- realiza atendimentos durante todo o dia;
- possui pouco tempo para atividades administrativas.

Objetivos:

- organizar os atendimentos;
- controlar clientes;
- controlar receitas;
- reduzir faltas.

Principais dores:

- agenda manual;
- conflitos de horários;
- dificuldade para acompanhar pagamentos;
- perda de informações.

---

## Persona 03 — Administrador

Responsável pela administração da plataforma StudioFlow.

Objetivos:

- cadastrar novos salões;
- acompanhar métricas gerais;
- prestar suporte;
- administrar todo o ecossistema.

---

# 6. Proposta de Valor

O StudioFlow oferece uma solução simples, moderna e especializada para o segmento da beleza.

Seus principais diferenciais são:

- plataforma totalmente online;
- arquitetura Multi-Tenant;
- interface Mobile First;
- agendamento em poucos cliques;
- controle financeiro integrado;
- histórico completo de clientes;
- painel administrativo exclusivo;
- baixo custo operacional.

---

# 7. Escopo do MVP

A versão MVP contempla todas as funcionalidades essenciais para operação de um salão.

Os módulos implementados são:

- Portal do Cliente;
- Portal da Profissional;
- Portal Administrativo;
- Agenda;
- Cadastro de Clientes;
- Cadastro de Serviços;
- Financeiro;
- Bloqueios de Agenda;
- Recuperação de Senha;
- Controle de Expediente;
- Horário de Almoço;
- Link de Agendamento;
- Multi-Tenant.

Todos esses módulos encontram-se documentados e cobertos pelos documentos de testes do projeto.

---

# 8. Benefícios Esperados

Para o profissional:

- redução do tempo gasto organizando a agenda;
- maior controle financeiro;
- melhor acompanhamento dos clientes;
- diminuição de conflitos de horários.

Para o cliente:

- facilidade para agendar;
- acesso ao histórico;
- praticidade;
- melhor experiência de atendimento.

Para a plataforma:

- facilidade de expansão;
- baixo custo de infraestrutura;
- arquitetura preparada para evolução futura.

# 9. Funcionalidades do Portal do Cliente

O Portal do Cliente foi desenvolvido para proporcionar uma experiência simples, rápida e intuitiva durante todo o processo de agendamento.

Todo o fluxo foi projetado priorizando dispositivos móveis (Mobile First).

---

## Cadastro de Cliente

Permite que novos clientes criem sua conta no salão.

Informações obrigatórias:

- Nome
- Telefone
- CPF
- Senha
- Confirmação da senha

Após o cadastro:

- a conta é criada;
- o login é realizado automaticamente;
- a sessão é iniciada;
- o cliente é direcionado para o portal do salão.

---

## Login

O cliente pode acessar sua conta utilizando:

- telefone;
- senha.

Após autenticação, o sistema carrega automaticamente:

- histórico;
- dados pessoais;
- agendamentos futuros.

---

## Recuperação de Senha

Caso o cliente esqueça sua senha, poderá redefini-la utilizando:

- telefone cadastrado;
- confirmação dos últimos dígitos do CPF;
- definição de uma nova senha.

Todo o processo ocorre sem intervenção do profissional.

---

## Atualização do Perfil

O cliente poderá alterar:

- nome;
- telefone;
- senha.

O CPF permanece bloqueado após o cadastro.

---

## Catálogo de Serviços

O cliente visualiza apenas serviços ativos.

Cada serviço apresenta:

- nome;
- duração;
- preço.

Serviços desativados deixam de aparecer automaticamente.

---

## Agendamento

O processo de agendamento ocorre em poucos passos.

Fluxo:

Escolher serviço

↓

Escolher data

↓

Escolher horário

↓

Confirmar

↓

Agendamento criado

Durante esse processo o sistema verifica automaticamente:

- disponibilidade;
- expediente;
- horário de almoço;
- bloqueios;
- conflitos de agenda.

---

## Histórico de Agendamentos

O cliente possui acesso apenas aos seus próprios atendimentos.

Cada registro apresenta:

- serviço;
- data;
- horário;
- profissional;
- status.

Status possíveis:

- Agendado
- Confirmado
- Concluído
- Cancelado

---

## Cancelamento

O cliente poderá cancelar atendimentos futuros.

Após o cancelamento:

- o horário volta a ficar disponível;
- o histórico permanece registrado.

---

## Remarcação

O cliente poderá alterar o horário de um agendamento existente.

Antes da alteração, o sistema utiliza exatamente a mesma lógica de disponibilidade empregada no Novo Agendamento.

São novamente validados:

- expediente;
- horário de almoço;
- bloqueios;
- conflitos de agenda.

Somente horários realmente disponíveis são apresentados ao cliente.

---

## Logout

Permite encerrar a sessão.

Ao realizar logout:

- sessão removida;
- dados locais apagados;
- retorno para o portal do salão.

---

# 10. Funcionalidades do Portal da Profissional

O Portal da Profissional concentra toda a operação do salão.

Todas as funcionalidades administrativas são executadas neste ambiente.

---

## Login

A profissional realiza autenticação utilizando:

- e-mail;
- senha.

Após autenticação são carregados:

- agenda;
- clientes;
- serviços;
- financeiro;
- configurações.

---

## Dashboard

O Dashboard apresenta indicadores operacionais em tempo real.

Principais informações:

- agendamentos do dia;
- clientes ativos;
- faturamento;
- próximos atendimentos.

Esse painel é a tela inicial da profissional.

---

## Agenda

A agenda apresenta todos os atendimentos do salão.

Permite:

- visualizar horários;
- localizar clientes;
- alterar status;
- remarcar atendimentos;
- cancelar atendimentos;
- cadastrar atendimentos presenciais.
- realizar Agendamentos Presenciais para clientes cadastrados;
- realizar Agendamentos Presenciais para clientes sem cadastro.

---

## Alteração de Status

A profissional pode alterar o andamento do atendimento.

Fluxo permitido:

Agendado

↓

Confirmado

↓

Concluído

O sistema impede transições inválidas.

---

## Cadastro de Serviços

Permite cadastrar novos serviços.

Cada serviço possui:

- nome;
- valor;
- duração;
- status.

---

## Edição de Serviços

Permite alterar:

- nome;
- valor;
- duração;
- disponibilidade.

As alterações ficam imediatamente disponíveis para novos agendamentos.

---

## Ativação e Inativação

Serviços podem ser ativados ou desativados.

Quando desativado:

- desaparece do portal do cliente;
- permanece disponível para consultas históricas.

---

## Cadastro de Clientes

A profissional poderá cadastrar clientes presencialmente.

Esse recurso facilita atendimentos realizados diretamente no salão.

---

## Cadastro Manual de Agendamentos

Também conhecido como Walk-In.

Permite registrar atendimentos realizados sem utilização do portal do cliente.

Exemplos:

- atendimento presencial;
- telefone;
- WhatsApp.

Quando o cliente já estiver cadastrado no salão, o sistema reutiliza automaticamente o cadastro existente.
Quando não existir cadastro correspondente, o agendamento é criado utilizando um snapshot das informações informadas pela profissional, sem criar um novo cliente automaticamente.

---

## Bloqueios da Agenda

Permite bloquear períodos indisponíveis.

Exemplos:

- férias;
- reuniões;
- cursos;
- eventos;
- manutenção.

Os horários bloqueados deixam automaticamente de aparecer para os clientes.

---

## Expediente

A profissional configura:

- horário inicial;
- horário final.

Somente horários dentro desse intervalo poderão ser reservados.

---

## Horário de Almoço

Permite definir um intervalo fixo de almoço.

Durante esse período:

- nenhum cliente poderá realizar agendamentos.

Caso existam atendimentos no intervalo selecionado, o sistema impede a alteração até que o conflito seja resolvido.
Essa validação garante que nenhum atendimento existente seja afetado por alterações no horário de almoço.

---

## Link de Agendamento

Cada salão possui um endereço exclusivo.

A profissional pode:

- visualizar;
- copiar;
- compartilhar.

O termo técnico "Slug" foi substituído na interface por **Link de Agendamento**, tornando a experiência mais intuitiva.

---

## Financeiro

A profissional possui acesso ao módulo financeiro completo.

Permite visualizar:

- faturamento;
- lançamentos;
- pagamentos;
- métodos de pagamento;
- indicadores financeiros.
Os lançamentos financeiros são gerados somente após a conclusão do atendimento, impedindo registros antecipados ou duplicados.

---

## Registro de Pagamentos

Somente atendimentos concluídos podem receber pagamento.

O sistema impede:

- pagamentos duplicados;
- pagamentos em atendimentos cancelados;
- pagamentos antes da conclusão.

---

## Perfil do Salão

Permite editar:

- nome;
- telefone;
- descrição;
- expediente;
- almoço;
- Link de Agendamento.

---

## Logout

Finaliza a sessão da profissional.

Após o logout:

- dados locais são removidos;
- sessão encerrada;
- retorno automático ao portal correspondente.

---

# 11. Funcionalidades do Portal Administrativo

O Portal Administrativo é exclusivo para administradores do StudioFlow.

Seu objetivo é controlar todo o ecossistema da plataforma.

---

## Login Administrativo

Permite autenticação do administrador master.

---

## Dashboard Geral

Apresenta indicadores consolidados.

Exemplos:

- quantidade de salões;
- quantidade de clientes;
- faturamento global;
- total de atendimentos.

---

## Cadastro de Salões

Permite criar novos salões na plataforma.

Cada salão recebe:

- identificação única;
- usuário administrador;
- senha inicial;
- Link de Agendamento exclusivo.

---

## Administração de Salões

Permite:

- editar informações;
- ativar;
- inativar;
- redefinir senha.

---

## Impersonação

Permite que o administrador assuma temporariamente a sessão de uma profissional.

Objetivos:

- suporte técnico;
- diagnóstico de problemas;
- homologação.

Ao finalizar a impersonação, a sessão original do administrador é restaurada automaticamente.

---

## Segurança

Todas as ações administrativas deverão ser registradas para futura auditoria.

Nenhuma alteração crítica poderá ocorrer sem autenticação válida.
Todo acesso respeita o isolamento Multi-Tenant, impedindo que profissionais visualizem ou alterem informações pertencentes a outros salões.
