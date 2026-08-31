import express, { CookieOptions } from "express";
import { performLogin, performRefresh } from "./authService";
import { LoginPayload } from "./types";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const payload = req.body as LoginPayload;
    const result = await performLogin(payload);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
      expires: new Date(result.refreshExpiresAt)
    };

    res.cookie("refresh_token", result.refreshRaw, cookieOptions);
    return res.json({ success: true, user: result.user, accessToken: result.accessToken });
  } catch (err: unknown) {
    const maybe = err as { status?: number; message?: string } | undefined;
    if (maybe && typeof maybe.status === "number") return res.status(maybe.status).json({ error: maybe.message });
    return res.status(500).json({ error: "Erro ao processar login." });
  }
});

export default router;

// Refresh endpoint
router.post("/refresh", async (req, res) => {
  try {
    // read cookie manually to avoid new dependency
    const cookieHeader = req.get("cookie") || "";
    // read cookie (no diagnostic logs)
    const match = cookieHeader.split(/; */).map((c) => c.split("=")).find((p) => p[0] === "refresh_token");
    const raw = match ? decodeURIComponent(match[1]) : undefined;
    if (!raw) return res.status(401).json({ error: "refresh token missing" });

    const result = await performRefresh(raw);
    // performRefresh executed successfully

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
      expires: new Date(result.refreshExpiresAt)
    };

    res.cookie("refresh_token", result.refreshRaw, cookieOptions);
    return res.json({ accessToken: result.accessToken });
  } catch (err: unknown) {
    const maybe = err as { status?: number; message?: string } | undefined;
    if (maybe && typeof maybe.status === "number") return res.status(maybe.status).json({ error: maybe.message });
    return res.status(401).json({ error: "refresh invalido" });
  }
});

// Logout endpoint (idempotent)
router.post("/logout", async (req, res) => {
  try {
    const cookieHeader = req.get("cookie") || "";
    const match = cookieHeader.split(/; */).map((c) => c.split("=")).find((p) => p[0] === "refresh_token");
    const raw = match ? decodeURIComponent(match[1]) : undefined;

    if (!raw) return res.status(204).send();

    const result = await (require("./authService") as any).performLogout(raw);

    // Clear cookie by setting expired value (same options as login/refresh)
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
      expires: new Date(0)
    };
    res.cookie("refresh_token", "", cookieOptions);
    return res.status(204).send();
  } catch (err: unknown) {
    // Idempotent: any error should still result in 204 to avoid leaking info
    return res.status(204).send();
  }
});
