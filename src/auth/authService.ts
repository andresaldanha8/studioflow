import crypto from "crypto";
import bcrypt from "bcrypt";
import { signJwt } from "./jwt";
import { generateRefreshToken, hashRefreshToken } from "./crypto";
import { addRefreshToken, getRefreshTokenByHash, rotateRefreshToken, revokeRefreshToken } from "./authRepository";
import { JwtClaims, LoginPayload, AdminRecord, SalonRecord, ClientRecord, UserPublic, RefreshTokenRecord } from "./types";
import { AuthError } from "./AuthError";
import { loadDatabaseSafe } from "../persistence";

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
const REFRESH_HASH_SECRET = process.env.REFRESH_TOKEN_HASH_SECRET || JWT_SECRET;
const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL || 60 * 10); // 10 minutes
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL || 60 * 60 * 24 * 14); // 14 days

function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function buildClaims(userId: string, role: string, salonId?: string, deviceId?: string) {
  const jti = crypto.randomUUID();
  const claims: JwtClaims = {
    sub: userId,
    role,
    jti
  };
  if (salonId) claims.salao_id = salonId;
  if (deviceId) claims.device_id = deviceId;
  return claims;
}

export async function performLogin(payload: LoginPayload) {
  const { role, email, telefone, senha, salao_id, device_id } = payload || {};
  const db = loadDatabaseSafe() as ({ administrador_sistema?: AdminRecord[]; saloes?: SalonRecord[]; clientes?: ClientRecord[] } | null);
  if (!db) throw new Error("Database not initialized");

  let user: AdminRecord | SalonRecord | ClientRecord | null = null;
  let userPublic: UserPublic | null = null;

  if (role === "admin") {
    const admin = (db.administrador_sistema || []).find((a) => a.email === email);
    if (!admin || !verifyPassword(senha || "", admin.senha_hash)) {
      throw new AuthError(401, "Credenciais inválidas.");
    }
    user = admin;
    userPublic = {
      id: admin.id,
      email: admin.email,
      nome: admin.nome || "Master Admin",
      avatar_emoji: admin.avatar_emoji || "👑",
      avatar_url: admin.avatar_url || "",
      telefone: admin.telefone || "",
      nivel_acesso: admin.nivel_acesso,
      role: "admin"
    };
  } else if (role === "professional") {
    const salon = (db.saloes || []).find((s) => !!s.email && s.email.toLowerCase() === (email || "").toLowerCase());
    if (!salon || !salon.senha_hash || !verifyPassword(senha || "", salon.senha_hash)) {
      throw new AuthError(401, "Credenciais de profissional incorretas.");
    }
    user = salon;
    userPublic = {
      id: salon.id,
      email: salon.email,
      nome: salon.dono,
      salao: salon,
      role: "professional",
      telefone: salon.telefone,
      avatar_emoji: salon.avatar_emoji || "💅",
      avatar_url: salon.avatar_url || ""
    };
  } else if (role === "client") {
    if (!salao_id || !telefone || !senha) {
      throw new AuthError(400, "salao_id, telefone e senha são obrigatórios para login de cliente.");
    }
    const client = (db.clientes || []).find((c) => c.salao_id === salao_id && c.telefone && c.telefone.replace(/\D/g, "") === telefone.replace(/\D/g, ""));
    if (!client || !verifyPassword(senha, client.senha_hash)) {
      throw new AuthError(401, "Telefone ou senha inválidos para este salão.");
    }
    user = client;
    const { senha_hash, ...clientPublic } = client;
    userPublic = { ...(clientPublic as unknown as Record<string, unknown>), role: "client" } as UserPublic;
  } else {
    throw new AuthError(400, "Role inválido. Use 'admin', 'professional' ou 'client'.");
  }

  const salonId = userPublic && userPublic.salao ? userPublic.salao.id : (user && 'salao_id' in user ? (user as ClientRecord).salao_id : undefined);
  const userId = user!.id;
  const claims = buildClaims(userId, userPublic!.role, salonId, device_id);
  const accessToken = signJwt(claims, JWT_SECRET, ACCESS_TTL);

  // Refresh token
  const refreshRaw = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshRaw, REFRESH_HASH_SECRET);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TTL * 1000).toISOString();

  const newRefreshRecord = {
    id: crypto.randomUUID(),
    user_id: user.id,
    device_id: device_id || null,
    token_hash: refreshHash,
    token_family: crypto.randomUUID(),
    created_at: now.toISOString(),
    expires_at: expiresAt,
    revoked_at: null,
    replaced_by_token_id: null,
    last_used_at: now.toISOString(),
    last_used_ip: null,
    user_agent: null,
    note: null,
    blocked_reason: null
  };

  await addRefreshToken(newRefreshRecord);

  return {
    user: userPublic,
    accessToken,
    refreshRaw,
    refreshExpiresAt: expiresAt
  };
}

export async function performRefresh(rawRefreshToken: string) {
  if (!rawRefreshToken) throw new AuthError(401, "Refresh token missing");
  // DIAGNOSTIC: compute hash and log masked evidence (do NOT print raw token)
  const hash = hashRefreshToken(rawRefreshToken, REFRESH_HASH_SECRET);
  const existing = getRefreshTokenByHash(hash);
  if (!existing) throw new AuthError(401, "Refresh token inválido ou revogado.");

  // Check revoked
  if (existing.revoked_at) {
    // replay detected
    throw new AuthError(401, "Refresh token revogado.");
  }

  // Check expired
  if (existing.expires_at && new Date(existing.expires_at) <= new Date()) {
    throw new AuthError(401, "Refresh token expirado.");
  }

  // Rotate: create new refresh and revoke old atomically via repository
  const now = new Date();
  const newRaw = generateRefreshToken();
  const newHash = hashRefreshToken(newRaw, REFRESH_HASH_SECRET);
  const newExpiresAt = new Date(now.getTime() + REFRESH_TTL * 1000).toISOString();

  const newRecord: RefreshTokenRecord = {
    id: crypto.randomUUID(),
    user_id: existing.user_id,
    device_id: existing.device_id || null,
    token_hash: newHash,
    token_family: existing.token_family || crypto.randomUUID(),
    created_at: now.toISOString(),
    expires_at: newExpiresAt,
    revoked_at: null,
    replaced_by_token_id: null,
    last_used_at: now.toISOString(),
    last_used_ip: null,
    user_agent: null,
    note: null,
    blocked_reason: null
  } as RefreshTokenRecord;

  const r = await rotateRefreshToken(existing.id, newRecord);
  if (!r) {
    // old token not found during rotation -> treat as invalid/replay
    throw new AuthError(401, "Refresh token inválido.");
  }

  // Resolve user and role from DB to build correct claims
  const db = loadDatabaseSafe() as ({ administrador_sistema?: AdminRecord[]; saloes?: SalonRecord[]; clientes?: ClientRecord[] } | null);
  let role = "client";
  let salonId: string | undefined = undefined;
  if (db) {
    const admin = (db.administrador_sistema || []).find((a) => a.id === existing.user_id);
    if (admin) {
      role = "admin";
    } else {
      const salon = (db.saloes || []).find((s) => s.id === existing.user_id);
      if (salon) {
        role = "professional";
        salonId = salon.id;
      } else {
        const client = (db.clientes || []).find((c) => c.id === existing.user_id);
        if (client) {
          role = "client";
          salonId = client.salao_id;
        }
      }
    }
  }

  const claims = buildClaims(existing.user_id, role, salonId, existing.device_id || undefined);
  const accessToken = signJwt(claims, JWT_SECRET, ACCESS_TTL);

  return { accessToken, refreshRaw: newRaw, refreshExpiresAt: newExpiresAt };
}

export async function performLogout(rawRefreshToken?: string) {
  // Idempotent logout: do not throw, just ensure token is revoked if valid
  if (!rawRefreshToken) return { revoked: false };

  const hash = hashRefreshToken(rawRefreshToken, REFRESH_HASH_SECRET);
  const existing = getRefreshTokenByHash(hash);
  if (!existing) return { revoked: false };

  // If already revoked or expired, nothing to do
  if (existing.revoked_at) return { revoked: false };
  if (existing.expires_at && new Date(existing.expires_at) <= new Date()) return { revoked: false };

  // Revoke current token
  const rec = await revokeRefreshToken(existing.id, "logout");
  return { revoked: !!rec };
}
