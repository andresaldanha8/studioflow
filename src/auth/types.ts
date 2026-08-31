export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  device_id?: string | null;
  token_hash: string;
  token_family?: string | null;
  created_at: string; // ISO
  expires_at: string; // ISO
  revoked_at?: string | null; // ISO
  replaced_by_token_id?: string | null;
  last_used_at?: string | null;
  last_used_ip?: string | null;
  user_agent?: string | null;
  note?: string | null;
  blocked_reason?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string; // raw token (only returned to client)
}

export interface JwtClaims {
  sub: string; // user id
  role: string; // client|professional|admin
  salao_id?: string;
  device_id?: string;
  jti?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface AuthConfig {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  jwtSecret: string;
  refreshTokenHashSecret?: string;
}

// Database shape for authentication-related storage inside database.json
export interface AuthDatabase {
  refresh_tokens?: RefreshTokenRecord[];
}

export interface LoginPayload {
  role?: string;
  email?: string;
  telefone?: string;
  senha?: string;
  salao_id?: string;
  device_id?: string;
}

export interface AdminRecord {
  id: string;
  email: string;
  senha_hash: string;
  nome?: string;
  avatar_emoji?: string;
  avatar_url?: string;
  telefone?: string;
  nivel_acesso?: number;
}

export interface SalonRecord {
  id: string;
  email?: string;
  senha_hash?: string;
  dono?: string;
  telefone?: string;
  avatar_emoji?: string;
  avatar_url?: string;
  slug_url?: string;
}

export interface ClientRecord {
  id: string;
  salao_id: string;
  telefone: string;
  senha_hash: string;
  [key: string]: unknown;
}

export type UserRecord = AdminRecord | SalonRecord | ClientRecord;

export interface UserPublic {
  id: string;
  email?: string;
  nome?: string;
  role: "admin" | "professional" | "client";
  telefone?: string;
  salao?: SalonRecord;
  avatar_emoji?: string;
  avatar_url?: string;
  nivel_acesso?: number;
}

export interface RequestUser {
  id: string;
  role: "admin" | "professional" | "client";
  salao_id?: string;
  jti?: string;
  iat?: number;
}
