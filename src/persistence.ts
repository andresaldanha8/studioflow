import fs from "fs";
import path from "path";
import { initMysql, getState, upsertState } from "./db/mysql";

const DB_FILE = path.join(process.cwd(), "database.json");

function makeTmpName(base: string) {
  return `${base}.tmp.${process.pid}.${Date.now()}`;
}

function readAndParse(filePath: string) {
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

let inMemoryDb: any = null;
let mysqlInitialized = false;

export async function initPersistence(): Promise<void> {
  // Initialize MySQL and migrate seed if necessary
  const pool = await initMysql();
  mysqlInitialized = true;

  // Try to read state from MySQL
  const state = await getState();
  if (state) {
    inMemoryDb = state;
    return;
  }

  // No record in MySQL: try to seed from database.json if present
  if (fs.existsSync(DB_FILE)) {
    const fileDb = readAndParse(DB_FILE);
    // insert into MySQL as source of truth
    await upsertState(fileDb);
    inMemoryDb = fileDb;
    return;
  }

  // No DB file either. Leave inMemoryDb null — server will create seed and call saveDatabase.
  inMemoryDb = null;
}

export function loadDatabaseSafe(): any {
  // If MySQL was initialized and inMemoryDb is present, return it
  if (mysqlInitialized && inMemoryDb !== null) return inMemoryDb;

  // Fallback to local file if present (used only during initial migration when MySQL not yet set)
  if (fs.existsSync(DB_FILE)) {
    try {
      return readAndParse(DB_FILE);
    } catch (err) {
      const bakPath = `${DB_FILE}.bak`;
      try {
        if (fs.existsSync(bakPath)) {
          const bakData = readAndParse(bakPath);
          const tmpPath = makeTmpName(DB_FILE);
          const fd = fs.openSync(tmpPath, "w");
          try {
            fs.writeSync(fd, JSON.stringify(bakData, null, 2), null, "utf-8");
            fs.fsyncSync(fd);
          } finally {
            try {
              fs.closeSync(fd);
            } catch (e) {
              // ignore
            }
          }
          fs.renameSync(tmpPath, DB_FILE);
          return bakData;
        }
      } catch (e) {
        // fallthrough
      }
      throw err;
    }
  }

  return null;
}

export async function saveDatabase(db: any): Promise<void> {
  // Update in-memory immediately
  inMemoryDb = db;

  // Always write local file as backup copy (atomic)
  const data = JSON.stringify(db, null, 2);
  const dbPath = DB_FILE;
  const bakPath = `${dbPath}.bak`;
  const tmpPath = makeTmpName(dbPath);

  try {
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, bakPath);
      } catch (e) {
        // ignore
      }
    }

    const fd = fs.openSync(tmpPath, "w");
    try {
      fs.writeSync(fd, data, null, "utf-8");
      fs.fsyncSync(fd);
    } finally {
      try {
        fs.closeSync(fd);
      } catch (e) {
        // ignore
      }
    }

    fs.renameSync(tmpPath, dbPath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (e) {
      // ignore
    }
    throw err;
  }

  // If MySQL initialized, persist there as source of truth
  if (mysqlInitialized) {
    // ensure errors bubble so callers can react
    await upsertState(db);
  }
}
