import crypto from "crypto";
import { JwtClaims } from "./types";

function base64url(input: string | Buffer) {
  const b = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return b.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string) {
  // pad
  const pad = input.length % 4 === 2 ? "==" : input.length % 4 === 3 ? "=" : "";
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64").toString("utf8");
}

export function signJwt(payload: JwtClaims, secret: string, expiresInSeconds?: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const body: JwtClaims & { iat: number; exp?: number } = { ...payload, iat } as JwtClaims & { iat: number };
  if (expiresInSeconds && expiresInSeconds > 0) {
    body.exp = iat + Math.floor(expiresInSeconds);
  }

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(body));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest();
  const encodedSig = base64url(signature);
  return `${signingInput}.${encodedSig}`;
}

export function verifyJwt(token: string, secret: string): { valid: boolean; payload?: JwtClaims; reason?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, reason: "malformed" };
    const [h, p, s] = parts;
    const signingInput = `${h}.${p}`;
    const expectedSig = base64url(crypto.createHmac("sha256", secret).update(signingInput).digest());
    // constant-time compare
    const sigBuf = Buffer.from(s, "utf8");
    const expBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expBuf.length) return { valid: false, reason: "invalid signature" };
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return { valid: false, reason: "invalid signature" };

    const payloadJson = base64urlDecode(p);
    const payload = JSON.parse(payloadJson) as JwtClaims;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now >= payload.exp) return { valid: false, reason: "expired" };
    return { valid: true, payload };
  } catch (err: unknown) {
    if (err instanceof Error) return { valid: false, reason: err.message };
    return { valid: false, reason: "verify error" };
  }
}
