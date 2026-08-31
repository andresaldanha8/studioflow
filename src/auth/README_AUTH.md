# Autenticação (Infraestrutura) — PR-11.1

Este diretório contém utilitários e tipos necessários para a futura implementação da arquitetura JWT + Refresh Token rotativo.

Conteúdo resumido:

- `types.ts`: interfaces para `RefreshTokenRecord`, `TokenPair`, `JwtClaims` e configuração.
- `crypto.ts`: geração de refresh tokens e hash HMAC-SHA256 para armazenamento seguro.
- `jwt.ts`: funções mínimas para assinar e verificar JWTs usando `HS256`.
Observação importante sobre persistência:

- Nesta PR-11.1 NÃO será criada nenhuma estrutura no banco de dados atual (`database.json`).
- Não serão executadas migrações, nem será alterado `persistence.ts`.
- A criação do nó `refresh_tokens` em `database.json` e qualquer migração acontecerá somente na PR-11.2 ou em PRs posteriores, quando começarmos a ativar o novo fluxo de autenticação.

Regras importantes para PR-11.1:

Regras importantes para PR-11.1:

- Nada aqui é usado ainda. Não modifique `server.ts` nem rotas existentes.
- Este PR apenas prepara a infra; testes e validações não devem alterar comportamento atual.

Arquivos incluídos nesta PR-11.1 (infra somente): `types.ts`, `crypto.ts`, `jwt.ts`, `README_AUTH.md`.

Nenhuma dependência nova será adicionada ao `package.json`.
