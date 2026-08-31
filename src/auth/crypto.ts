import crypto from "crypto";

// Generate a cryptographically secure random token (base64url)
export function generateRefreshToken(rawBytes = 48): string {
  const buf = crypto.randomBytes(rawBytes);
  // base64url
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Hash the token with a server-side secret to store in DB (HMAC-SHA256)
export function hashRefreshToken(raw: string, secret: string): string {
  const h = crypto.createHmac("sha256", secret);
  h.update(raw);
  return h.digest("hex");
}

// Constant-time compare
export function verifyRefreshTokenHash(raw: string, secret: string, hash: string): boolean {
  const candidate = hashRefreshToken(raw, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, "utf8"), Buffer.from(hash, "utf8"));
  } catch (err) {
    return false;
  }
}
