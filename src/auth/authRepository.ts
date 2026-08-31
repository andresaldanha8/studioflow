import { loadDatabaseSafe, saveDatabase } from "../persistence";
import { RefreshTokenRecord, AuthDatabase } from "./types";

export async function addRefreshToken(record: RefreshTokenRecord): Promise<RefreshTokenRecord> {
  const db = (loadDatabaseSafe() || {}) as AuthDatabase;
  if (!Array.isArray(db.refresh_tokens)) {
    db.refresh_tokens = [];
  }
  db.refresh_tokens.push(record);
  await saveDatabase(db);
  return record;
}

export function findRefreshTokenByHash(hash: string): RefreshTokenRecord | null {
  const db = loadDatabaseSafe() as AuthDatabase | null;
  if (!db || !Array.isArray(db.refresh_tokens)) return null;
  return db.refresh_tokens.find((r) => r.token_hash === hash && !r.revoked_at) || null;
}

export function getRefreshTokenByHash(hash: string): RefreshTokenRecord | null {
  const db = loadDatabaseSafe() as AuthDatabase | null;
  if (!db || !Array.isArray(db.refresh_tokens)) return null;
  return db.refresh_tokens.find((r) => r.token_hash === hash) || null;
}

export async function rotateRefreshToken(oldId: string, newRecord: RefreshTokenRecord): Promise<{ old?: RefreshTokenRecord; added: RefreshTokenRecord } | null> {
  const db = (loadDatabaseSafe() || {}) as AuthDatabase;
  if (!Array.isArray(db.refresh_tokens)) db.refresh_tokens = [];

  const idx = db.refresh_tokens.findIndex((r) => r.id === oldId);
  if (idx === -1) {
    // old token not found — do NOT create a new token here for security reasons
    return null;
  }

  const old = db.refresh_tokens[idx];
  // mark old as revoked and point to replacement
  old.revoked_at = new Date().toISOString();
  old.replaced_by_token_id = newRecord.id;

  // keep token_family from old
  newRecord.token_family = old.token_family || newRecord.token_family;
  db.refresh_tokens.push(newRecord);

  await saveDatabase(db);
  return { old, added: newRecord };
}

export async function revokeRefreshToken(id: string, reason?: string) {
  const db = (loadDatabaseSafe() || {}) as AuthDatabase;
  if (!Array.isArray(db.refresh_tokens)) db.refresh_tokens = [];
  const rec = db.refresh_tokens.find((r) => r.id === id);
  if (!rec) return null;
  rec.revoked_at = new Date().toISOString();
  if (reason) rec.note = (rec.note ? `${rec.note} | ` : "") + reason;
  await saveDatabase(db);
  return rec;
}
