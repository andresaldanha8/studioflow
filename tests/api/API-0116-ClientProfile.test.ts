import fs from "fs";
import path from "path";
import request from "supertest";
import { signJwt } from "../../src/auth/jwt";
import { beforeAll, afterAll, describe, test, expect } from "vitest";

// Backup originals so we can always restore
const dbPath = path.join(process.cwd(), "database.json");
const origDbExists = fs.existsSync(dbPath);
const origDbText = origDbExists ? fs.readFileSync(dbPath, "utf8") : null;
const origJwtSecret = process.env.JWT_SECRET;
const origNodeEnv = process.env.NODE_ENV;

let app: any;

beforeAll(async () => {
  // create a temp copy for the test and overwrite the project's database.json
  const tmpPath = path.join(process.cwd(), `database.json.test.${process.pid}.${Date.now()}`);
  fs.writeFileSync(tmpPath, origDbText ?? JSON.stringify({ clientes: [], saloes: [], administrador_sistema: [] }, null, 2), "utf8");
  fs.copyFileSync(tmpPath, dbPath);

  // set env for predictable JWT behavior and avoid dev middleware
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  try {
    // import server module without assuming export shape
    const serverModule = await import("../../server");
    app = (serverModule as any).default || (serverModule as any).app || serverModule;
  } catch (err) {
    // restore before rethrowing
    if (origDbText !== null) fs.writeFileSync(dbPath, origDbText, "utf8");
    if (origJwtSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = origJwtSecret;
    if (origNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = origNodeEnv;
    throw err;
  }
});

afterAll(() => {
  // restore original DB
  if (origDbText !== null) {
    fs.writeFileSync(dbPath, origDbText, "utf8");
  } else {
    try { fs.unlinkSync(dbPath); } catch (e) { /* ignore */ }
  }

  // restore env
  if (origJwtSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = origJwtSecret;
  if (origNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = origNodeEnv;
});

describe("PUT /api/clients/profile - PR-11.6.1", () => {
  test("sem token -> 401", async () => {
    const res = await request(app).put("/api/clients/profile").send({ id: "cli-bella-1", nome: "X" });
    expect(res.status).toBe(401);
  });

  test("token inválido -> 401", async () => {
    const res = await request(app)
      .put("/api/clients/profile")
      .set("Authorization", "Bearer invalid.token.here")
      .send({ nome: "X" });
    expect(res.status).toBe(401);
  });

  test("role professional -> 403", async () => {
    const token = signJwt({ sub: "salao-bella", role: "professional" } as any, process.env.JWT_SECRET || "dev_jwt_secret");
    const res = await request(app)
      .put("/api/clients/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "X" });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  test("role admin -> 403", async () => {
    const token = signJwt({ sub: "admin-1", role: "admin" } as any, process.env.JWT_SECRET || "dev_jwt_secret");
    const res = await request(app)
      .put("/api/clients/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "X" });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  test("role client -> atualiza próprio perfil e ignora body.id diferente", async () => {
    const clientId = "cli-bella-1";
    const token = signJwt({ sub: clientId, role: "client" } as any, process.env.JWT_SECRET || "dev_jwt_secret");

    const res = await request(app)
      .put("/api/clients/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ id: "cli-bella-2", nome: "Nome Atualizado Pelo Token" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("id", clientId);
    expect(res.body.user).toHaveProperty("nome", "Nome Atualizado Pelo Token");

    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    const client = (db.clientes || []).find((c: any) => c.id === clientId);
    expect(client).toBeTruthy();
    expect(client.nome).toBe("Nome Atualizado Pelo Token");
  });
});
