import fs from "node:fs/promises";
import path from "node:path";
import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";

const CONFIRMATION_FLAG = "--confirm-production-migration";
const EXPECTED_COLLECTIONS = [
  "clientes",
  "saloes",
  "administrador_sistema",
  "servicos",
  "agendamentos",
  "caixa",
  "bloqueios_agenda",
  "refresh_tokens"
] as const;

type StudioFlowState = Record<string, unknown> & {
  refresh_tokens: unknown[];
};

interface StateRow extends RowDataPacket {
  data: unknown;
}

class SafeMigrationError extends Error {}

type MigrationStage =
  | "VALIDACAO_CONFIGURACAO"
  | "CONEXAO_MYSQL"
  | "LEITURA_ESTADO_ATUAL"
  | "BACKUP_LOCAL"
  | "LEITURA_DATABASE_LOCAL"
  | "VALIDACAO_DATABASE_LOCAL"
  | "INICIO_TRANSACAO"
  | "BLOQUEIO_E_CONFERENCIA"
  | "ATUALIZACAO_ID_1"
  | "VALIDACAO_ESCRITA"
  | "COMMIT"
  | "ROLLBACK"
  | "ENCERRAMENTO_CONEXAO";

class SanitizedMigrationFailure extends Error {
  constructor(
    readonly stage: MigrationStage,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const SAFE_TECHNICAL_CODES = new Set([
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ER_ACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "ER_NO_SUCH_TABLE",
  "ER_LOCK_WAIT_TIMEOUT",
  "ER_LOCK_DEADLOCK",
  "EACCES",
  "EPERM",
  "ENOENT",
  "EEXIST",
  "ENOSPC"
]);

function technicalCode(error: unknown): string {
  if (error !== null && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    if (SAFE_TECHNICAL_CODES.has(code)) return code;
  }
  return "CODIGO_INDISPONIVEL";
}

function announceStage(stage: MigrationStage, description: string): MigrationStage {
  console.log(`[ETAPA] ${description}`);
  return stage;
}

function sanitizeFailure(error: unknown, stage: MigrationStage): SanitizedMigrationFailure {
  if (error instanceof SanitizedMigrationFailure) return error;
  if (error instanceof SafeMigrationError) {
    return new SanitizedMigrationFailure(stage, "VALIDACAO_ABORTADA", error.message);
  }
  return new SanitizedMigrationFailure(
    stage,
    technicalCode(error),
    "Falha externa; detalhes sensíveis foram omitidos."
  );
}

function requireConfirmation(): void {
  if (!process.argv.slice(2).includes(CONFIRMATION_FLAG)) {
    throw new SafeMigrationError(
      `Confirmação obrigatória ausente. Use ${CONFIRMATION_FLAG} para autorizar a conexão.`
    );
  }
}

function requireEnvironment() {
  const names = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;
  const values = Object.fromEntries(
    names.map((name) => {
      const value = process.env[name];
      if (!value) throw new SafeMigrationError(`Variável de ambiente obrigatória ausente: ${name}`);
      return [name, value];
    })
  ) as Record<(typeof names)[number], string>;

  const port = Number(values.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new SafeMigrationError("DB_PORT deve ser um número inteiro válido.");
  }

  return { ...values, DB_PORT: port };
}

function parseState(value: unknown, source: string): StudioFlowState {
  let parsed = value;
  if (Buffer.isBuffer(parsed)) parsed = parsed.toString("utf8");
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new SafeMigrationError(`${source} não contém JSON válido.`);
    }
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SafeMigrationError(`${source} deve ter um objeto JSON na raiz.`);
  }
  return parsed as StudioFlowState;
}

function validateLocalState(state: StudioFlowState): void {
  for (const collectionName of EXPECTED_COLLECTIONS) {
    const collection = state[collectionName];
    if (!Array.isArray(collection)) {
      throw new SafeMigrationError(`Coleção obrigatória inválida: ${collectionName}`);
    }

    const ids = new Set<string>();
    for (const record of collection) {
      if (record === null || typeof record !== "object" || Array.isArray(record)) {
        throw new SafeMigrationError(`Registro inválido na coleção ${collectionName}.`);
      }
      const id = (record as Record<string, unknown>).id;
      if (typeof id !== "string" || id.trim() === "") {
        throw new SafeMigrationError(`Registro sem ID válido na coleção ${collectionName}.`);
      }
      if (ids.has(id)) {
        throw new SafeMigrationError(`ID duplicado detectado na coleção ${collectionName}.`);
      }
      ids.add(id);
    }
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

function statesAreEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

async function selectState(
  connection: mysql.Connection,
  forUpdate = false
): Promise<StudioFlowState | null> {
  const suffix = forUpdate ? " FOR UPDATE" : "";
  const [rows] = await connection.query<StateRow[]>(
    `SELECT data FROM studioflow_state WHERE id = 1 LIMIT 1${suffix}`
  );
  if (rows.length === 0) return null;
  return parseState(rows[0].data, "studioflow_state.data");
}

function backupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `studioflow-production-before-migration-${timestamp}.json`;
}

async function main(): Promise<void> {
  let stage = announceStage("VALIDACAO_CONFIGURACAO", "Validando configuração");
  let connection: mysql.Connection | null = null;
  let transactionStarted = false;
  let failure: SanitizedMigrationFailure | null = null;

  try {
    requireConfirmation();
    const env = requireEnvironment();

    stage = announceStage("CONEXAO_MYSQL", "Conectando ao MySQL");
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME
    });

    stage = announceStage("LEITURA_ESTADO_ATUAL", "Lendo estado atual");
    const productionBeforeMigration = await selectState(connection);
    if (!productionBeforeMigration) {
      throw new SafeMigrationError("studioflow_state.id=1 não existe; migração abortada.");
    }

    stage = announceStage("BACKUP_LOCAL", "Criando backup");
    const backupDirectory = path.join(process.cwd(), "migration-backups");
    await fs.mkdir(backupDirectory, { recursive: true });
    const backupPath = path.join(backupDirectory, backupFilename());
    await fs.writeFile(
      backupPath,
      `${JSON.stringify(productionBeforeMigration, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 }
    );
    console.log(`Backup de produção salvo em ${path.relative(process.cwd(), backupPath)}.`);

    stage = announceStage("LEITURA_DATABASE_LOCAL", "Lendo database.json local");
    const localPath = path.join(process.cwd(), "database.json");
    const localRaw = await fs.readFile(localPath, "utf8");
    const localState = parseState(localRaw, "database.json");

    stage = announceStage("VALIDACAO_DATABASE_LOCAL", "Validando database.json local");
    validateLocalState(localState);

    const localRefreshTokenCount = localState.refresh_tokens.length;
    const preparedState: StudioFlowState = {
      ...localState,
      refresh_tokens: []
    };
    console.log(`Refresh tokens locais serão descartados: ${localRefreshTokenCount}`);

    stage = announceStage("INICIO_TRANSACAO", "Iniciando transação");
    await connection.beginTransaction();
    transactionStarted = true;

    stage = announceStage("BLOQUEIO_E_CONFERENCIA", "Bloqueando e conferindo estado atual");
    const lockedProductionState = await selectState(connection, true);
    if (!lockedProductionState) {
      throw new SafeMigrationError("studioflow_state.id=1 deixou de existir; migração abortada.");
    }
    if (!statesAreEqual(lockedProductionState, productionBeforeMigration)) {
      throw new SafeMigrationError("O estado de produção mudou após o backup; migração abortada.");
    }

    stage = announceStage("ATUALIZACAO_ID_1", "Atualizando id=1");
    const [result] = await connection.execute<ResultSetHeader>(
      "UPDATE studioflow_state SET data = ? WHERE id = 1",
      [JSON.stringify(preparedState)]
    );
    if (result.affectedRows !== 1) {
      throw new SafeMigrationError("O UPDATE não alterou exatamente um registro; migração abortada.");
    }

    stage = announceStage("VALIDACAO_ESCRITA", "Validando escrita");
    const persistedState = await selectState(connection);
    if (!persistedState || !statesAreEqual(persistedState, preparedState)) {
      throw new SafeMigrationError("A validação do estado persistido falhou; migração abortada.");
    }

    stage = announceStage("COMMIT", "Commit");
    await connection.commit();
    transactionStarted = false;
    console.log("Migração concluída e validada com sucesso.");
  } catch (error) {
    failure = sanitizeFailure(error, stage);
    if (transactionStarted && connection) {
      announceStage("ROLLBACK", "Rollback");
      try {
        await connection.rollback();
        transactionStarted = false;
      } catch (rollbackError) {
        failure = new SanitizedMigrationFailure(
          "ROLLBACK",
          technicalCode(rollbackError),
          "Falha ao executar rollback; detalhes sensíveis foram omitidos."
        );
      }
    }
  } finally {
    if (connection) {
      announceStage("ENCERRAMENTO_CONEXAO", "Encerrando conexão");
      try {
        await connection.end();
      } catch (endError) {
        if (!failure) {
          failure = new SanitizedMigrationFailure(
            "ENCERRAMENTO_CONEXAO",
            technicalCode(endError),
            "Falha ao encerrar conexão; detalhes sensíveis foram omitidos."
          );
        }
      }
    }
  }

  if (failure) throw failure;
}

main().catch((error: unknown) => {
  const failure =
    error instanceof SanitizedMigrationFailure
      ? error
      : new SanitizedMigrationFailure(
          "VALIDACAO_CONFIGURACAO",
          technicalCode(error),
          "Falha externa; detalhes sensíveis foram omitidos."
        );
  console.error(`Falha na etapa: ${failure.stage}`);
  console.error(`Código: ${failure.code}`);
  console.error(`Migração não executada: ${failure.message}`);
  process.exitCode = 1;
});
