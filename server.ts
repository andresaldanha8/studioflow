import express, { CookieOptions } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { createServer as createViteServer } from "vite";
import os from "os";

import cors from "cors";
import { initPersistence, saveDatabase, loadDatabaseSafe } from "./src/persistence";
import authRouter from "./src/auth/routes";
import { performLogin, buildClaims } from "./src/auth/authService";
import { signJwt, verifyJwt } from "./src/auth/jwt";
import { LoginPayload } from "./src/auth/types";
import { verifyAccessToken } from "./src/auth/middleware";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DB_FILE = path.join(process.cwd(), "database.json");

app.use(express.json());
// CORS: restrict to official production origins and allow localhost in dev
const allowedOrigins = [
  "https://studioflow.conectavtx.com.br",
  "https://studioflow-api.conectavtx.com.br"
];
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:5173", "http://localhost:3000");
}
app.use(
  cors({
    origin: function (origin, cb) {
      // allow non-browser requests with no origin
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true
  })
);

// ==========================================
// DATA STRUCTURE DEFINITIONS
// ==========================================

interface Cliente {
  id: string;
  salao_id: string; // Isolated per salon
  nome: string;
  telefone: string;
  cpf: string;
  senha_hash: string;
  criado_em: string;
  avatar_emoji?: string;
  avatar_url?: string;
}

interface Salon {
  id: string;
  nome: string;
  dono: string;
  telefone: string;
  slug_url: string; // Unique slug identifier
  criado_em: string;
  email?: string;
  senha_hash?: string;
  avatar_emoji?: string;
  avatar_url?: string;
  pergunta_seguranca?: string;
  resposta_seguranca_hash?: string;
  descricao?: string;
  hora_inicio_expediente?: string;
  hora_fim_expediente?: string;
  hora_inicio_almoco?: string;
  hora_fim_almoco?: string;
  ativo?: boolean;
  endereco?: string;
}

interface AdminSistema {
  id: string;
  email: string;
  senha_hash: string;
  nivel_acesso: "master";
  criado_em: string;
  nome?: string;
  avatar_emoji?: string;
  avatar_url?: string;
  telefone?: string;
  pergunta_seguranca?: string;
  resposta_seguranca_hash?: string;
}

interface Servico {
  id: string;
  salao_id: string;
  nome: string;
  preco: number;
  duracao_estimada_minutos: number;
  ativo: boolean;
  criado_em: string;
  foto_url?: string;
}

interface Agendamento {
  id: string;
  salao_id: string;
  cliente_id: string | null;
  servico_id: string;
  data_hora_inicio: string; // ISO string
  data_hora_fim: string; // ISO string
  status_atendimento: "pendente" | "confirmado" | "concluido" | "cancelado";
  status_financeiro: "pendente" | "pago" | "estornado";
  valor_cobrado: number;
  observacoes?: string;
  cliente_telefone_informado?: string;
  // Snapshot fields for walk-in (avulso) clients when no cliente_id is provided
  nome_cliente_avulso?: string;
  telefone_cliente_avulso?: string;
  criado_em: string;
  // Remarcações: histórico e indicadores leves para consultas rápidas
  remarcacoes?: { de: string; para: string; quando: string; por: string }[];
  quantidade_remarcacoes?: number;
  foi_remarcado?: boolean;
}

interface Caixa {
  id: string;
  salao_id: string;
  agendamento_id?: string;
  valor: number;
  // legacy field kept for backward compatibility with existing seed data
  tipo?: "entrada";
  descricao: string;
  data_pagamento: string; // ISO date string
  criado_em: string;
  // New optional fields to prepare the ledger evolution (all optional for compatibility)
  tipo_movimentacao?: "Entrada" | "Saída" | "Estorno";
  origem?: "Manual" | "Atendimento" | "Sistema";
  forma_pagamento?: string;
  motivo?: string;
  observacao?: string;
  referencia?: string;
  registrado_por?: { id: string; nome?: string; role?: string };
}

interface BloqueioAgenda {
  id: string;
  salao_id: string;
  data_hora_inicio: string; // ISO string
  data_hora_fim: string; // ISO string
  tipo: "almoco" | "folga" | "manual";
  descricao: string;
  criado_em: string;
}

interface DatabaseSchema {
  clientes: Cliente[];
  saloes: Salon[];
  administrador_sistema: AdminSistema[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  caixa: Caixa[];
  bloqueios_agenda: BloqueioAgenda[];
}

// Bcrypt helpers (PR-01)
// Note: using synchronous bcrypt API to avoid changing call-sites in this PR.
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
}

function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Helper to generate a random ID
function generateId(): string {
  return crypto.randomUUID();
}

// Load database with seed data if file is empty/missing
async function loadDatabase(): Promise<DatabaseSchema> {
  const parsed = loadDatabaseSafe();
  if (parsed) {
    // Migrate salons to ensure they have email and password
    if (parsed.saloes && Array.isArray(parsed.saloes)) {
      let changed = false;
      parsed.saloes.forEach((s: any) => {
        if (!s.email) {
          changed = true;
          if (s.id === "salao-bella") {
            s.email = "dono@bella.com";
          } else if (s.id === "salao-glamour") {
            s.email = "dono@glamour.com";
          } else {
            s.email = `contato@${s.slug_url}.com`;
          }
        }
        if (!s.senha_hash) {
          changed = true;
          s.senha_hash = hashPassword("senha");
        }
        if (!s.hora_inicio_expediente) {
          changed = true;
          s.hora_inicio_expediente = "08:00";
        }
        if (!s.hora_fim_expediente) {
          changed = true;
          s.hora_fim_expediente = "18:00";
        }
        if (s.hora_inicio_almoco === undefined) {
          changed = true;
          s.hora_inicio_almoco = "12:00";
        }
        if (s.hora_fim_almoco === undefined) {
          changed = true;
          s.hora_fim_almoco = "13:00";
        }
      });
      if (changed) {
        await saveDatabase(parsed);
      }
    }
    return parsed;
  }

  // Create default mock database (Seed data)
  const defaultDb: DatabaseSchema = {
    clientes: [],
    saloes: [],
    administrador_sistema: [],
    servicos: [],
    agendamentos: [],
    caixa: [],
    bloqueios_agenda: []
  };

  // Seed Admin
  defaultDb.administrador_sistema.push({
    id: "admin-1",
    email: "admin@salao.com",
    senha_hash: hashPassword("admin123"),
    nivel_acesso: "master",
    criado_em: new Date().toISOString()
  });

  // Seed Salons
  const salaoBellaId = "salao-bella";
  const salaoGlamourId = "salao-glamour";

  defaultDb.saloes.push({
    id: salaoBellaId,
    nome: "Bella Sobrancelha & Nail Design",
    dono: "Gabriela Souza",
    telefone: "(11) 98888-7777",
    slug_url: "bella-sobrancelha",
    email: "dono@bella.com",
    senha_hash: hashPassword("senha"),
    criado_em: new Date().toISOString(),
    hora_inicio_expediente: "08:00",
    hora_fim_expediente: "18:00",
    hora_inicio_almoco: "12:00",
    hora_fim_almoco: "13:00",
    ativo: true,
    endereco: "Rua Augusta, 1200 - Consolação, São Paulo"
  });

  defaultDb.saloes.push({
    id: salaoGlamourId,
    nome: "Studio Glamour & Estética",
    dono: "Mariana Alencar",
    telefone: "(11) 97777-6666",
    slug_url: "studio-glamour",
    email: "dono@glamour.com",
    senha_hash: hashPassword("senha"),
    criado_em: new Date().toISOString(),
    hora_inicio_expediente: "08:00",
    hora_fim_expediente: "18:00",
    hora_inicio_almoco: "12:00",
    hora_fim_almoco: "13:00",
    ativo: true,
    endereco: "Av. Paulista, 1000 - Bela Vista, São Paulo"
  });

  // Seed Services
  defaultDb.servicos.push(
    {
      id: "srv-bella-1",
      salao_id: salaoBellaId,
      nome: "Design de Sobrancelha Simples",
      preco: 35.0,
      duracao_estimada_minutos: 30,
      ativo: true,
      criado_em: new Date().toISOString()
    },
    {
      id: "srv-bella-2",
      salao_id: salaoBellaId,
      nome: "Design de Sobrancelha com Henna",
      preco: 50.0,
      duracao_estimada_minutos: 45,
      ativo: true,
      criado_em: new Date().toISOString()
    },
    {
      id: "srv-bella-3",
      salao_id: salaoBellaId,
      nome: "Alongamento em Gel",
      preco: 120.0,
      duracao_estimada_minutos: 90,
      ativo: true,
      criado_em: new Date().toISOString()
    },
    {
      id: "srv-bella-4",
      salao_id: salaoBellaId,
      nome: "Pé e Mão Simples",
      preco: 60.0,
      duracao_estimada_minutos: 60,
      ativo: true,
      criado_em: new Date().toISOString()
    },
    {
      id: "srv-glamour-1",
      salao_id: salaoGlamourId,
      nome: "Limpeza de Pele Profunda",
      preco: 150.0,
      duracao_estimada_minutos: 90,
      ativo: true,
      criado_em: new Date().toISOString()
    },
    {
      id: "srv-glamour-2",
      salao_id: salaoGlamourId,
      nome: "Massagem Relaxante",
      preco: 120.0,
      duracao_estimada_minutos: 60,
      ativo: true,
      criado_em: new Date().toISOString()
    }
  );

  // Seed Customers
  const cliente1Id = "cli-bella-1";
  const cliente2Id = "cli-bella-2";

  // Ana Silva under bella-sobrancelha
  defaultDb.clientes.push({
    id: cliente1Id,
    salao_id: salaoBellaId,
    nome: "Ana Silva",
    telefone: "(11) 99999-1111",
    cpf: "123.456.789-00",
    senha_hash: hashPassword("senha123"),
    criado_em: new Date().toISOString()
  });

  // Bruna Costa under bella-sobrancelha
  defaultDb.clientes.push({
    id: cliente2Id,
    salao_id: salaoBellaId,
    nome: "Bruna Costa",
    telefone: "(11) 99999-2222",
    cpf: "222.333.444-55",
    senha_hash: hashPassword("senha123"),
    criado_em: new Date().toISOString()
  });

  // Mariana Santos (under glamour)
  defaultDb.clientes.push({
    id: "cli-glamour-1",
    salao_id: salaoGlamourId,
    nome: "Mariana Santos",
    telefone: "(11) 98888-3333",
    cpf: "333.444.555-66",
    senha_hash: hashPassword("senha123"),
    criado_em: new Date().toISOString()
  });

  // Seed some historic bookings and cash flows for reports (past 15 days)
  const today = new Date();
  
  for (let i = 15; i >= 1; i--) {
    const bookingDate = new Date();
    bookingDate.setDate(today.getDate() - i);
    // set random hours
    bookingDate.setHours(9 + (i % 6), 0, 0, 0);

    const isBella = i % 2 === 0;
    const sId = isBella ? salaoBellaId : salaoGlamourId;
    const cId = isBella ? (i % 4 === 0 ? cliente2Id : cliente1Id) : "cli-glamour-1";
    const service = isBella 
      ? (i % 4 === 0 ? defaultDb.servicos[2] : defaultDb.servicos[1]) 
      : defaultDb.servicos[4]; // Glamour service

    const duration = service.duracao_estimada_minutos;
    const endDate = new Date(bookingDate.getTime() + duration * 60000);

    const agId = `seed-ag-${i}`;
    defaultDb.agendamentos.push({
      id: agId,
      salao_id: sId,
      cliente_id: cId,
      servico_id: service.id,
      data_hora_inicio: bookingDate.toISOString(),
      data_hora_fim: endDate.toISOString(),
      status_atendimento: "concluido",
      status_financeiro: "pago",
      valor_cobrado: service.preco,
      observacoes: `Atendimento histórico concluído ${i} dias atrás`,
      criado_em: bookingDate.toISOString()
    });

    defaultDb.caixa.push({
      id: `seed-cx-${i}`,
      salao_id: sId,
      agendamento_id: agId,
      valor: service.preco,
      tipo: "entrada",
      descricao: `Serviço concluído: ${service.nome}`,
      data_pagamento: bookingDate.toISOString(),
      criado_em: bookingDate.toISOString()
    });
  }

  // Seed an upcoming appointment for today
  const upcomingToday = new Date();
  upcomingToday.setHours(14, 0, 0, 0);
  const endToday = new Date(upcomingToday.getTime() + 45 * 60 * 1000);

  defaultDb.agendamentos.push({
    id: "upcoming-1",
    salao_id: salaoBellaId,
    cliente_id: cliente1Id,
    servico_id: "srv-bella-2", // Design com Henna (45 min)
    data_hora_inicio: upcomingToday.toISOString(),
    data_hora_fim: endToday.toISOString(),
    status_atendimento: "confirmado",
    status_financeiro: "pendente",
    valor_cobrado: 50.0,
    observacoes: "Prefere henna mais clara.",
    criado_em: new Date().toISOString()
  });

  // Seed another upcoming appointment for tomorrow
  const upcomingTomorrow = new Date();
  upcomingTomorrow.setDate(today.getDate() + 1);
  upcomingTomorrow.setHours(10, 0, 0, 0);
  const endTomorrow = new Date(upcomingTomorrow.getTime() + 90 * 60 * 1000);

  defaultDb.agendamentos.push({
    id: "upcoming-2",
    salao_id: salaoBellaId,
    cliente_id: cliente2Id,
    servico_id: "srv-bella-3", // Alongamento gel (90 min)
    data_hora_inicio: upcomingTomorrow.toISOString(),
    data_hora_fim: endTomorrow.toISOString(),
    status_atendimento: "pendente",
    status_financeiro: "pendente",
    valor_cobrado: 120.0,
    observacoes: "",
    criado_em: new Date().toISOString()
  });

  // Seed lunch break block for both salons
  defaultDb.bloqueios_agenda.push({
    id: "block-lunch-bella",
    salao_id: salaoBellaId,
    data_hora_inicio: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString(),
    data_hora_fim: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0).toISOString(),
    tipo: "almoco",
    descricao: "Almoço diário",
    criado_em: new Date().toISOString()
  });

  await saveDatabase(defaultDb);
  return defaultDb;
}

// Initialize database (will be assigned during startup)
let db: DatabaseSchema | null = null;



// ==========================================
// CONFLICT & SCHEDULE ALGORITHM
// ==========================================

/**
 * Returns the hour and minute in America/Sao_Paulo timezone for a given ISO string
 */
function getLocalTimeParts(isoString: string): { hour: number; minute: number } {
  try {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const formatted = formatter.format(new Date(isoString));
    const [hourStr, minuteStr] = formatted.split(":");
    return {
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10)
    };
  } catch (err) {
    console.error("Error formatting timezone for: " + isoString, err);
    // Fallback to local machine date parsing
    const d = new Date(isoString);
    return {
      hour: d.getHours(),
      minute: d.getMinutes()
    };
  }
}

// Normalize legacy caixa records for read compatibility.
// Ensures each record exposes `tipo_movimentacao` and `origem` with defaults:
// - tipo_movimentacao defaults to "Entrada"
// - origem defaults to "Atendimento" when agendamento_id exists, otherwise "Manual"
function normalizarMovimentacao(mov: any) {
  const out: any = { ...mov };

  if (!out.tipo_movimentacao) {
    // Map legacy 'tipo' if present
    if (out.tipo === "entrada") {
      out.tipo_movimentacao = "Entrada";
    } else {
      out.tipo_movimentacao = "Entrada"; // default for legacy
    }
  }

  if (!out.origem) {
    out.origem = out.agendamento_id ? "Atendimento" : "Manual";
  }

  return out;
}

/**
 * Checks if a requested time interval overlaps with any active bookings or blocks in a salon.
 * An active booking is one that is NOT cancelled.
 */
function isTimeSlotOverlapping(
  salaoId: string,
  start: string,
  end: string,
  excludeBookingId?: string
): { isOverlapping: boolean; reason: string | null } {
  const reqStart = new Date(start).getTime();
  const reqEnd = new Date(end).getTime();

  if (reqStart >= reqEnd) {
    return { isOverlapping: true, reason: "A hora de início deve ser anterior à hora de término." };
  }

  // 1. Check bookings
  const salonBookings = db.agendamentos.filter(
    (b) => b.salao_id === salaoId && b.status_atendimento !== "cancelado" && b.id !== excludeBookingId
  );

  for (const b of salonBookings) {
    const bStart = new Date(b.data_hora_inicio).getTime();
    const bEnd = new Date(b.data_hora_fim).getTime();

    // Overlap formula: start1 < end2 && start2 < end1
    if (reqStart < bEnd && bStart < reqEnd) {
      return {
        isOverlapping: true,
        reason: "O horário entra em conflito com outro agendamento ativo."
      };
    }
  }

  // 2. Check agenda blocks
  const salonBlocks = db.bloqueios_agenda.filter((b) => b.salao_id === salaoId);

  for (const block of salonBlocks) {
    const blStart = new Date(block.data_hora_inicio).getTime();
    const blEnd = new Date(block.data_hora_fim).getTime();

    if (reqStart < blEnd && blStart < reqEnd) {
      return {
        isOverlapping: true,
        reason: `Este horário está bloqueado para: ${block.descricao} (${block.tipo === "almoco" ? "Almoço" : block.tipo === "folga" ? "Folga" : "Bloqueio Manual"}).`
      };
    }
  }

  return { isOverlapping: false, reason: null };
}

// ==========================================
// API REST ENDPOINTS
// ==========================================

// Middleware to check admin access (strict JWT-based)
const checkAdmin = (req: any, res: any, next: any) => {
  const user = req.user as import("./src/auth/types").RequestUser | undefined;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Acesso proibido. Apenas administradores do sistema podem realizar esta ação." });
  }
  const adminExists = db.administrador_sistema.some((a) => a.id === user.id);
  if (!adminExists) {
    return res.status(403).json({ error: "Acesso proibido. Apenas administradores do sistema podem realizar esta ação." });
  }
  next();
};

const normalizeEmail = (email: string | undefined): string => {
  if (!email) return "";
  return email.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const normalizePhone = (phone: string | undefined): string => {
  if (!phone) return "";
  return phone.toString().replace(/\D/g, "");
};
// Normalize CPF to digits-only string (e.g. 12345678900)
const normalizeCPF = (cpf: string | undefined): string => {
  if (!cpf) return "";
  return cpf.toString().replace(/\D/g, "");
};
// Middleware to check professional access with strict multi-tenant isolation (JWT-based)
const checkProfessional = (req: any, res: any, next: any) => {
  const user = req.user as import("./src/auth/types").RequestUser | undefined;
  if (!user || user.role !== "professional") {
    return res.status(403).json({ error: "Acesso proibido. Apenas profissionais do salão podem realizar esta ação." });
  }
  const salon = db.saloes.find((s) => s.id === user.id);
  if (!salon) {
    return res.status(403).json({ error: "Acesso proibido. Apenas profissionais do salão podem realizar esta ação." });
  }

  // Multi-tenant check: if there is an ID in the route parameters, check ownership
  if (req.params && req.params.id) {
    const pId = req.params.id;
    const originalUrl = req.originalUrl || req.url || "";

    // 1. If it's a salon stats, services, blocks, bookings, caixa, clients or finance-reports URL
    if (originalUrl.includes(`/api/salons/${pId}`)) {
      if (salon.id !== pId) {
        return res.status(403).json({ error: "Acesso proibido. Você não tem permissão para acessar dados de outro salão." });
      }
    }

    // 2. If it's a service modification URL (/api/services/)
    if (originalUrl.includes("/api/services/")) {
      const service = db.servicos.find((s) => s.id === pId);
      if (service && service.salao_id !== salon.id) {
        return res.status(403).json({ error: "Acesso proibido. Este serviço pertence a outro salão." });
      }
    }

    // 3. If it's a block modification URL (/api/blocks/)
    if (originalUrl.includes("/api/blocks/")) {
      const block = db.bloqueios_agenda.find((b) => b.id === pId);
      if (block && block.salao_id !== salon.id) {
        return res.status(403).json({ error: "Acesso proibido. Este bloqueio pertence a outro salão." });
      }
    }

    // 4. If it's a booking modification URL (/api/bookings/)
    if (originalUrl.includes("/api/bookings/")) {
      const booking = db.agendamentos.find((b) => b.id === pId);
      if (booking && booking.salao_id !== salon.id) {
        return res.status(403).json({ error: "Acesso proibido. Este agendamento pertence a outro salão." });
      }
    }
  }

  // 5. If salao_id is provided in the body of a creation request
  if (req.body && req.body.salao_id) {
    if (req.body.salao_id !== salon.id) {
      return res.status(403).json({ error: "Acesso proibido. Não é permitido criar ou modificar recursos de outro salão." });
    }
  }

  next();
};

// --- SISTEMA / GLOBAL ADM ENDPOINTS ---

// Admin system Login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  const admin = db.administrador_sistema.find((a) => a.email === email);
  if (!admin || !verifyPassword(password, admin.senha_hash)) {
    return res.status(401).json({ error: "E-mail ou senha do administrador inválidos." });
  }
  res.json({
    success: true,
    user: {
      id: admin.id,
      email: admin.email,
      nome: admin.nome || "Master Admin",
      avatar_emoji: admin.avatar_emoji || "👑",
      avatar_url: admin.avatar_url || "",
      telefone: admin.telefone || "",
      pergunta_seguranca: admin.pergunta_seguranca || "",
      nivel_acesso: admin.nivel_acesso,
      role: "admin"
    }
  });
});

// Update admin profile details
  app.put("/api/admin/profile", verifyAccessToken, checkAdmin, async (req, res) => {
  const { email, nome, avatar_emoji, avatar_url, telefone, pergunta_seguranca, resposta_seguranca } = req.body;
  const admin = db.administrador_sistema.find((a) => a.email === email);
  if (!admin) {
    return res.status(404).json({ error: "Administrador não encontrado." });
  }

  if (nome !== undefined) admin.nome = nome;
  if (avatar_emoji !== undefined) admin.avatar_emoji = avatar_emoji;
  if (avatar_url !== undefined) admin.avatar_url = avatar_url;
  if (telefone !== undefined) admin.telefone = telefone;
  if (pergunta_seguranca !== undefined) admin.pergunta_seguranca = pergunta_seguranca;
  if (resposta_seguranca) {
    admin.resposta_seguranca_hash = hashPassword(resposta_seguranca.trim().toLowerCase());
  }

  await saveDatabase(db);

  res.json({
    success: true,
    user: {
      id: admin.id,
      email: admin.email,
      nome: admin.nome || "Master Admin",
      avatar_emoji: admin.avatar_emoji || "👑",
      avatar_url: admin.avatar_url || "",
      telefone: admin.telefone || "",
      pergunta_seguranca: admin.pergunta_seguranca || "",
      nivel_acesso: admin.nivel_acesso,
      role: "admin"
    }
  });
});

// Change admin password (while logged in)
  app.put("/api/admin/change-password", verifyAccessToken, checkAdmin, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const admin = db.administrador_sistema.find((a) => a.email === email);
  if (!admin) {
    return res.status(404).json({ error: "Administrador não encontrado." });
  }

  if (!verifyPassword(currentPassword, admin.senha_hash)) {
    return res.status(400).json({ error: "Senha atual incorreta." });
  }

  admin.senha_hash = hashPassword(newPassword);
  await saveDatabase(db);

  res.json({ success: true, message: "Senha alterada com sucesso!" });
});

// Admin: Impersonate a salon (returns an access token for the salon)
app.post("/api/admin/impersonate/:salonId", verifyAccessToken, checkAdmin, (req, res) => {
  try {
    const salonId = String(req.params.salonId || "");
    const salon = db.saloes.find((s) => s.id === salonId);
    if (!salon) {
      return res.status(404).json({ error: "Salão não encontrado." });
    }

    const userPublic = {
      id: salon.id,
      email: salon.email,
      nome: salon.dono,
      salao: salon,
      role: "professional",
      telefone: salon.telefone,
      avatar_emoji: salon.avatar_emoji || "💅",
      avatar_url: salon.avatar_url || ""
    };

    const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
    const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL || 60 * 10);
    const claims = buildClaims(salon.id, "professional", salon.id, undefined);
    const accessToken = signJwt(claims, JWT_SECRET, ACCESS_TTL);

    // minimal audit log
    try {
      const adminUser = (req as any).user;
      console.log(`Impersonation: admin=${adminUser?.id || "unknown"} -> salon=${salon.id} at ${new Date().toISOString()}`);
    } catch (e) {
      /* swallow */
    }

    return res.json({ success: true, user: userPublic, accessToken });
  } catch (err) {
    console.error("Erro em /api/admin/impersonate:", err);
    return res.status(500).json({ error: "Erro interno ao processar impersonation." });
  }
});

// Recover: Step 1 - get question
app.post("/api/admin/recover-question", (req, res) => {
  const { email } = req.body;
  const admin = db.administrador_sistema.find((a) => a.email === email);
  if (!admin) {
    return res.status(404).json({ error: "E-mail de administrador não encontrado no sistema." });
  }

  if (!admin.pergunta_seguranca) {
    return res.status(400).json({ 
      error: "Nenhuma pergunta de segurança foi configurada para esta conta ainda. Faça login e defina-a nas configurações de perfil." 
    });
  }

  res.json({
    success: true,
    pergunta_seguranca: admin.pergunta_seguranca
  });
});

// Recover: Step 2 - verify answer and reset password
app.post("/api/admin/recover-reset", (req, res) => {
  const { email, resposta_seguranca, newPassword } = req.body;
  const admin = db.administrador_sistema.find((a) => a.email === email);
  if (!admin) {
    return res.status(404).json({ error: "Administrador não encontrado." });
  }

  if (!admin.resposta_seguranca_hash || !verifyPassword(resposta_seguranca.trim().toLowerCase(), admin.resposta_seguranca_hash)) {
    return res.status(400).json({ error: "Resposta de segurança incorreta." });
  }

  admin.senha_hash = hashPassword(newPassword);
  saveDatabase(db);

  res.json({ success: true, message: "Senha redefinida com sucesso! Você já pode entrar com sua nova senha." });
});

// Admin global stats (consolidated salons, sales, and schedules)
  app.get("/api/admin/stats", verifyAccessToken, checkAdmin, (req, res) => {
  const salonsCount = db.saloes.length;
  const clientsCount = db.clientes.length;
  const totalSchedules = db.agendamentos.length;
  const totalRevenue = db.caixa.reduce((acc, curr) => {
    const m = normalizarMovimentacao(curr);
    const v = Number(curr.valor) || 0;
    if (m.tipo_movimentacao === "Saída" || m.tipo_movimentacao === "Estorno") {
      return acc - v;
    }
    // Entrada
    return acc + v;
  }, 0);

  // Consolidated lists for master view
  res.json({
    stats: {
      salonsCount,
      clientsCount,
      totalSchedules,
      totalRevenue
    },
    saloes: db.saloes,
    clientes: db.clientes.map(({ senha_hash, ...rest }) => rest),
    agendamentos: db.agendamentos
  });
});

// Admin: Create a new Salon
  app.post("/api/admin/salons", verifyAccessToken, checkAdmin, (req, res) => {
  const { nome, dono, telefone, slug_url, descricao, endereco, ativo } = req.body;

  if (!nome || !dono || !telefone || !slug_url) {
    return res.status(400).json({ error: "Todos os campos do salão são obrigatórios." });
  }

  // Check unique slug
  const slugExists = db.saloes.some((s) => s.slug_url === slug_url);
  if (slugExists) {
    return res.status(400).json({ error: "Esta URL/Slug já está em uso por outro salão." });
  }

  const newSalon: Salon = {
    id: generateId(),
    nome,
    dono,
    telefone,
    slug_url,
    email: `dono@${slug_url}.com`,
    senha_hash: hashPassword("senha"),
    hora_inicio_expediente: "08:00",
    hora_fim_expediente: "18:00",
    hora_inicio_almoco: "12:00",
    hora_fim_almoco: "13:00",
    descricao: descricao || "",
    endereco: endereco || "",
    ativo: ativo !== undefined ? ativo : true,
    criado_em: new Date().toISOString()
  };

  db.saloes.push(newSalon);
  saveDatabase(db);

  res.status(201).json(newSalon);
});

// Admin: Edit an existing Salon
  app.put("/api/admin/salons/:id", verifyAccessToken, checkAdmin, (req, res) => {
  const { id } = req.params;
  const { nome, dono, telefone, slug_url, descricao, endereco, ativo } = req.body;

  const salon = db.saloes.find((s) => s.id === id);
  if (!salon) {
    return res.status(404).json({ error: "Salão não encontrado." });
  }

  if (!nome || !dono || !telefone || !slug_url) {
    return res.status(400).json({ error: "Todos os campos do salão são obrigatórios." });
  }

  // Check unique slug
  const slugExists = db.saloes.some((s) => s.slug_url === slug_url && s.id !== id);
  if (slugExists) {
    return res.status(400).json({ error: "Esta URL/Slug já está em uso por outro salão." });
  }

  salon.nome = nome;
  salon.dono = dono;
  salon.telefone = telefone;
  salon.slug_url = slug_url;
  if (descricao !== undefined) {
    salon.descricao = descricao;
  }
  if (endereco !== undefined) {
    salon.endereco = endereco;
  }
  if (ativo !== undefined) {
    salon.ativo = ativo;
  }

  saveDatabase(db);
  res.json(salon);
});

// Admin: Delete a Salon
  app.delete("/api/admin/salons/:id", verifyAccessToken, checkAdmin, (req, res) => {
  const { id } = req.params;
  const index = db.saloes.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Salão não encontrado." });
  }

  const deletedSalon = db.saloes.splice(index, 1)[0];

  // Clean up associated data
  db.servicos = db.servicos.filter((s) => s.salao_id !== id);
  db.agendamentos = db.agendamentos.filter((a) => a.salao_id !== id);
  db.clientes = db.clientes.filter((c) => c.salao_id !== id);
  db.caixa = db.caixa.filter((cx) => cx.salao_id !== id);
  db.bloqueios_agenda = db.bloqueios_agenda.filter((b) => b.salao_id !== id);

  saveDatabase(db);
  res.json({ success: true, message: `Salão ${deletedSalon.nome} e todos os seus dados associados foram excluídos.` });
});

// --- SALON / WORKSPACE GENERAL ENDPOINTS ---

// Get all salons for public directory (safe fields only)
  app.get("/api/public/salons", verifyAccessToken, checkAdmin, (req, res) => {
  const publicSalons = db.saloes.map(({ senha_hash, resposta_seguranca_hash, ...rest }) => rest);
  res.json(publicSalons);
});

// Get Salon info by its unique slug url
app.get("/api/salons/by-slug/:slug", (req, res) => {
  const { slug } = req.params;
  const salon = db.saloes.find((s) => s.slug_url === slug);

  if (!salon) {
    return res.status(404).json({ error: "Salão não encontrado." });
  }

  // Fetch active services under this salon
  const services = db.servicos.filter((s) => s.salao_id === salon.id && s.ativo);

  // Return a sanitized public view of the salon (do not leak hashes or internal fields)
  const publicSalon = {
    id: salon.id,
    nome: salon.nome,
    dono: salon.dono,
    telefone: salon.telefone,
    slug_url: salon.slug_url,
    descricao: salon.descricao,
    endereco: salon.endereco,
    hora_inicio_expediente: salon.hora_inicio_expediente,
    hora_fim_expediente: salon.hora_fim_expediente,
    hora_inicio_almoco: salon.hora_inicio_almoco,
    hora_fim_almoco: salon.hora_fim_almoco,
    ativo: salon.ativo,
    avatar_url: salon.avatar_url,
    avatar_emoji: salon.avatar_emoji
  };

  res.json({ salon: publicSalon, services });
});

// Get salon statistics (for professional dashboard)
  app.get("/api/salons/:id/stats", verifyAccessToken, checkProfessional, (req, res) => {
  const salaoId = req.params.id;

  const activeServices = db.servicos.filter((s) => s.salao_id === salaoId && s.ativo).length;
  const totalClients = db.clientes.filter((c) => c.salao_id === salaoId).length;
  
  const bookings = db.agendamentos.filter((a) => a.salao_id === salaoId);
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status_atendimento === "pendente").length;

  const totalRevenue = db.caixa
    .filter((c) => c.salao_id === salaoId)
    .reduce((sum, item) => {
      const m = normalizarMovimentacao(item);
      const v = Number(item.valor) || 0;
      if (m.tipo_movimentacao === "Saída" || m.tipo_movimentacao === "Estorno") return sum - v;
      return sum + v;
    }, 0);

  res.json({
    activeServices,
    totalClients,
    totalBookings,
    pendingBookings,
    totalRevenue
  });
});

// --- CLIENT AUTH & RECOVERY ENDPOINTS ---

// Client / Customer signup under a salon
app.post("/api/clients/signup", (req, res) => {
  const { salao_id, nome, telefone, cpf, senha } = req.body;

  if (!salao_id || !nome || !telefone || !cpf || !senha) {
    return res.status(400).json({ error: "Todos os campos do cadastro são obrigatórios." });
  }

  // Validate CPF format (must have exactly 11 digits)
  const cleanCPF = cpf.replace(/\D/g, "");
  if (cleanCPF.length !== 11) {
    return res.status(400).json({ error: "O CPF deve conter exatamente 11 dígitos no formato XXX.XXX.XXX-XX." });
  }

  // Validate phone format (must have between 10 and 11 digits)
  const cleanPhone = telefone.replace(/\D/g, "");
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return res.status(400).json({ error: "O telefone deve conter entre 10 e 11 dígitos." });
  }

  // Validate if salon exists
  const salon = db.saloes.find((s) => s.id === salao_id);
  if (!salon) {
    return res.status(404).json({ error: "Salão inválido." });
  }

  // Check if phone already registered in this salon (compare normalized phones)
  const phoneExists = db.clientes.some((c) => c.salao_id === salao_id && normalizePhone(c.telefone) === normalizePhone(telefone));
  if (phoneExists) {
    return res.status(400).json({ error: "Telefone já cadastrado para este salão." });
  }

  // Check if cpf already registered in this salon
  const isNewDummy = cpf === "000.000.000-00" || cpf.toLowerCase().startsWith("dummy") || cpf.toLowerCase().startsWith("walk-");
  if (!isNewDummy) {
    const cpfExists = db.clientes.some((c) => {
      if (c.salao_id !== salao_id) return false;
      const cCpf = c.cpf || "";
      const isThisDummy = cCpf === "000.000.000-00" || cCpf.toLowerCase().startsWith("dummy") || cCpf.toLowerCase().startsWith("walk-");
      return !isThisDummy && normalizeCPF(c.cpf) === cleanCPF;
    });
    if (cpfExists) {
      return res.status(400).json({ error: "CPF já cadastrado para este salão." });
    }
  }

  const newClient: Cliente = {
    id: generateId(),
    salao_id,
    nome,
    telefone,
    cpf,
    senha_hash: hashPassword(senha),
    criado_em: new Date().toISOString()
  };

  db.clientes.push(newClient);
  // Persist new client immediately (original behavior)
  saveDatabase(db);

  // Attempt to link existing walk-in bookings to this new client.
  // Criteria (minimal change): same salon, booking.cliente_id === null,
  // booking.cliente_telefone_informado is not empty, and normalized phones match.
  try {
    const normalizedNewPhone = normalizePhone(newClient.telefone);
    let updatedCount = 0;

    for (const b of db.agendamentos) {
      // Prepare normalized phone for logging and comparison
      const bookingPhoneNorm = normalizePhone(b.cliente_telefone_informado);
      const isMatch = bookingPhoneNorm && bookingPhoneNorm === normalizedNewPhone;

      // (debug logs removed) Evaluating booking for potential linkage

      if (b.salao_id !== salao_id) continue;
      if (b.cliente_id !== null) continue; // only when explicitly null
      if (!b.cliente_telefone_informado) continue; // skip empty/null

      if (isMatch) {
        b.cliente_id = newClient.id; // update only this field
        updatedCount++;
      }
    }

    // Persist DB only if at least one booking was linked (avoid unnecessary writes)
    if (updatedCount > 0) {
      saveDatabase(db);
    }

    // (debug logs removed) Summary of linked bookings available in saved DB
  } catch (err) {
    console.error("Erro ao vincular agendamentos ao novo cliente:", err);
    // Do not fail the signup flow because of linking errors
  }

  const { senha_hash, ...clientPublic } = newClient;
  res.status(201).json({
    success: true,
    user: {
      ...clientPublic,
      role: "client"
    }
  });
});

// Client Login under a salon context
app.post("/api/clients/login", (req, res) => {
  const { salao_id, telefone, senha } = req.body;

  if (!salao_id || !telefone || !senha) {
    return res.status(400).json({ error: "Telefone e senha são obrigatórios." });
  }

  const client = db.clientes.find(
    (c) => c.salao_id === salao_id && normalizePhone(c.telefone) === normalizePhone(telefone)
  );

  if (!client || !verifyPassword(senha, client.senha_hash)) {
    return res.status(401).json({ error: "Telefone ou senha inválidos para este salão." });
  }

  const { senha_hash, ...clientPublic } = client;
  res.json({
    success: true,
    user: {
      ...clientPublic,
      role: "client"
    }
  });
});

// Step 1: Check if phone exists for recovery
app.post("/api/clients/recovery/check-phone", (req, res) => {
  const { salao_id, telefone } = req.body;
  if (!salao_id || !telefone) {
    return res.status(400).json({ error: "O número de telefone é obrigatório." });
  }

  const client = db.clientes.find(
    (c) => c.salao_id === salao_id && normalizePhone(c.telefone) === normalizePhone(telefone)
  );

  if (!client) {
    return res.status(404).json({ error: "Cadastro não localizado. Verifique o número digitado." });
  }

  res.json({ success: true, message: "Cadastro localizado com sucesso!" });
});

// Verify client credentials for recovery
app.post("/api/clients/verify-recovery", (req, res) => {
  const { salao_id, telefone, lastFourCpf } = req.body;

  if (!salao_id || !telefone || !lastFourCpf) {
    return res.status(400).json({ error: "Telefone e os 4 últimos dígitos do CPF são obrigatórios." });
  }

  const client = db.clientes.find(
    (c) => c.salao_id === salao_id && normalizePhone(c.telefone) === normalizePhone(telefone)
  );

  if (!client) {
    return res.status(400).json({ error: "Não foi possível validar as informações informadas." });
  }

  const cleanCpf = client.cpf.replace(/\D/g, "");
  const cleanInputDigits = lastFourCpf.replace(/\D/g, "");
  const actualLastFour = cleanCpf.slice(-4);

  if (actualLastFour !== cleanInputDigits) {
    return res.status(400).json({ error: "Não foi possível validar as informações informadas." });
  }

  res.json({ success: true, message: "Dados confirmados com sucesso!" });
});

// Client password recovery using the last 4 digits of CPF
app.post("/api/clients/recover-password", (req, res) => {
  const { salao_id, telefone, lastFourCpf, novaSenha } = req.body;

  if (!salao_id || !telefone || !lastFourCpf || !novaSenha) {
    return res.status(400).json({ error: "Todos os dados são necessários." });
  }

  const client = db.clientes.find(
    (c) => c.salao_id === salao_id && normalizePhone(c.telefone) === normalizePhone(telefone)
  );

  if (!client) {
    return res.status(400).json({ error: "Não foi possível validar as informações informadas." });
  }

  // Clean raw CPF to compare last digits
  const cleanCpf = client.cpf.replace(/\D/g, "");
  const cleanInputDigits = lastFourCpf.replace(/\D/g, "");

  const actualLastFour = cleanCpf.slice(-4);

  if (actualLastFour !== cleanInputDigits) {
    return res.status(400).json({ error: "Não foi possível validar as informações informadas." });
  }

  // Save new password
  client.senha_hash = hashPassword(novaSenha);
  saveDatabase(db);

  res.json({ success: true, message: "Senha redefinida com sucesso!" });
});

// Update Client Profile details
  app.put("/api/clients/profile", verifyAccessToken, (req, res) => {
  const user = req.user as import("./src/auth/types").RequestUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (user.role !== "client") {
    return res.status(403).json({ error: "Acesso proibido. Credenciais insuficientes." });
  }

  // Ignore any id provided in the body; use authenticated user's id
  const id = user.id;
  const { nome, telefone, cpf, avatar_emoji, avatar_url, senha } = req.body;

  const client = db.clientes.find((c) => c.id === id);
  if (!client) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }

  // Check unique constraints for phone within the same salon if changed
  if (telefone && telefone !== client.telefone) {
    const phoneExists = db.clientes.some((c) => c.salao_id === client.salao_id && normalizePhone(c.telefone) === normalizePhone(telefone) && c.id !== id);
    if (phoneExists) {
      return res.status(400).json({ error: "Este telefone já está em uso por outro cliente neste salão." });
    }
    client.telefone = telefone;
  }

  // Check unique constraints for CPF within the same salon if changed
  if (cpf && cpf !== client.cpf) {
    const isNewDummy = cpf === "000.000.000-00" || cpf.toLowerCase().startsWith("dummy") || cpf.toLowerCase().startsWith("walk-");
    if (!isNewDummy) {
      const newCpfClean = normalizeCPF(cpf);
      const cpfExists = db.clientes.some((c) => c.salao_id === client.salao_id && normalizeCPF(c.cpf) === newCpfClean && c.id !== id);
      if (cpfExists) {
        return res.status(400).json({ error: "Este CPF já está em uso por outro cliente neste salão." });
      }
    }
    client.cpf = cpf;
  }

  if (nome) client.nome = nome;
  if (avatar_emoji) client.avatar_emoji = avatar_emoji;
  if (avatar_url !== undefined) client.avatar_url = avatar_url;
  if (senha) client.senha_hash = hashPassword(senha);

  saveDatabase(db);

  const { senha_hash, ...clientPublic } = client;
  res.json({
    success: true,
    user: {
      ...clientPublic,
      role: "client"
    }
  });
});

// --- PROFESSIONAL AUTH ENDPOINTS ---

// Professional / Owner login (delegates to authService.performLogin)
app.post("/api/professional/login", async (req, res) => {
  try {
    const { email, password, device_id } = req.body as { email?: string; password?: string; device_id?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const payload: LoginPayload = { role: "professional", email, senha: password, device_id };
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
    return res.status(401).json({ error: "Credenciais de profissional incorretas." });
  }
});

// Generic auth login endpoint (PR-11.2)
// Supports roles: 'admin' (email+password), 'professional' (email+password), 'client' (salao_id+telefone+senha)
app.use("/auth", authRouter);

// Update professional profile details
  app.put("/api/professional/profile", verifyAccessToken, checkProfessional, (req, res) => {
  const { 
    email, nome, telefone, nomeSalao, slugUrl, avatar_emoji, avatar_url, endereco,
    pergunta_seguranca, resposta_seguranca, descricao, 
    hora_inicio_expediente, hora_fim_expediente, hora_inicio_almoco, hora_fim_almoco 
  } = req.body;
  
  const salon = db.saloes.find((s) => normalizeEmail(s.email) === normalizeEmail(email));
  if (!salon) {
    return res.status(404).json({ error: "Profissional não encontrado." });
  }

  // If slug is changing, verify it's unique
  if (slugUrl && slugUrl !== salon.slug_url) {
    const cleanSlug = slugUrl.toLowerCase().trim().replace(/\s+/g, "-");
    const exists = db.saloes.some((s) => s.slug_url === cleanSlug && s.id !== salon.id);
    if (exists) {
      return res.status(400).json({ error: "Este endereço de Workspace (slug) já está em uso por outro salão." });
    }
    salon.slug_url = cleanSlug;
  }

  // Validate and check lunch hours conflicts if any operational hours actually changed
  const currentHoraInicioExpediente = salon.hora_inicio_expediente ?? "";
  const currentHoraFimExpediente = salon.hora_fim_expediente ?? "";
  const currentHoraInicioAlmoco = salon.hora_inicio_almoco ?? "";
  const currentHoraFimAlmoco = salon.hora_fim_almoco ?? "";
  const comp1 = (hora_inicio_expediente !== undefined && (hora_inicio_expediente || "") !== currentHoraInicioExpediente);
  const comp2 = (hora_fim_expediente !== undefined && (hora_fim_expediente || "") !== currentHoraFimExpediente);
  const comp3 = (hora_inicio_almoco !== undefined && (hora_inicio_almoco || "") !== currentHoraInicioAlmoco);
  const comp4 = (hora_fim_almoco !== undefined && (hora_fim_almoco || "") !== currentHoraFimAlmoco);

  let mudouHorario = false;
  if (comp1) mudouHorario = true;
  if (comp2) mudouHorario = true;
  if (comp3) mudouHorario = true;
  if (comp4) mudouHorario = true;

  if (mudouHorario) {
    const effectiveHoraInicioAlmoco = (hora_inicio_almoco !== undefined) ? (hora_inicio_almoco || "") : currentHoraInicioAlmoco;
    const effectiveHoraFimAlmoco = (hora_fim_almoco !== undefined) ? (hora_fim_almoco || "") : currentHoraFimAlmoco;

    if (effectiveHoraInicioAlmoco && effectiveHoraFimAlmoco) {
      const [lStartH, lStartM] = effectiveHoraInicioAlmoco.split(":").map(Number);
      const [lEndH, lEndM] = effectiveHoraFimAlmoco.split(":").map(Number);
      const lunchStartMin = lStartH * 60 + lStartM;
      const lunchEndMin = lEndH * 60 + lEndM;

      // Check if any active booking conflicts with this lunch period
      const activeBookings = db.agendamentos.filter(
        (b) => b.salao_id === salon.id && b.status_atendimento !== "cancelado"
      );

      for (const b of activeBookings) {
        const { hour: bStartH, minute: bStartM } = getLocalTimeParts(b.data_hora_inicio);
        const { hour: bEndH, minute: bEndM } = getLocalTimeParts(b.data_hora_fim);
        const bStartMin = bStartH * 60 + bStartM;
        const bEndMin = bEndH * 60 + bEndM;

        if (bStartMin < lunchEndMin && lunchStartMin < bEndMin) {
          const dateObj = new Date(b.data_hora_inicio);
          const dateStr = dateObj.toLocaleDateString("pt-BR");
          const timeStr = `${bStartH.toString().padStart(2, "0")}:${bStartM.toString().padStart(2, "0")}`;
          return res.status(400).json({
            error: `Não é possível definir este horário de almoço pois existe um agendamento conflitante em ${dateStr} às ${timeStr}.`
          });
        }
      }
    }
  }

  if (nome) salon.dono = nome;
  if (telefone) salon.telefone = telefone;
  if (nomeSalao) salon.nome = nomeSalao;
  if (avatar_emoji) salon.avatar_emoji = avatar_emoji;
  if (avatar_url !== undefined) salon.avatar_url = avatar_url;
  if (descricao !== undefined) salon.descricao = descricao;
  if (endereco !== undefined) salon.endereco = endereco;

  if (hora_inicio_expediente !== undefined) salon.hora_inicio_expediente = hora_inicio_expediente;
  if (hora_fim_expediente !== undefined) salon.hora_fim_expediente = hora_fim_expediente;
  
  // Set to provided value or clear if null/empty
  salon.hora_inicio_almoco = hora_inicio_almoco || "";
  salon.hora_fim_almoco = hora_fim_almoco || "";

  if (pergunta_seguranca && resposta_seguranca) {
    salon.pergunta_seguranca = pergunta_seguranca;
    salon.resposta_seguranca_hash = hashPassword(resposta_seguranca.trim().toLowerCase());
  }

  saveDatabase(db);

  res.json({
    success: true,
    user: {
      id: salon.id,
      email: salon.email,
      nome: salon.dono,
      salao: salon,
      role: "professional",
      telefone: salon.telefone,
      avatar_emoji: salon.avatar_emoji || "💅",
      avatar_url: salon.avatar_url || ""
    }
  });
});

// Change professional password (while logged in)
  app.put("/api/professional/change-password", verifyAccessToken, checkProfessional, (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const salon = db.saloes.find((s) => normalizeEmail(s.email) === normalizeEmail(email));
  if (!salon) {
    return res.status(404).json({ error: "Profissional não encontrado." });
  }

  if (!salon.senha_hash || !verifyPassword(currentPassword, salon.senha_hash)) {
    return res.status(400).json({ error: "Senha atual incorreta." });
  }

  salon.senha_hash = hashPassword(newPassword);
  saveDatabase(db);

  res.json({ success: true, message: "Senha alterada com sucesso!" });
});

// Recover professional: Step 1 - get question
app.post("/api/professional/recover-question", (req, res) => {
  const { email } = req.body;
  const salon = db.saloes.find((s) => normalizeEmail(s.email) === normalizeEmail(email));
  if (!salon) {
    return res.status(404).json({ error: "E-mail de profissional não encontrado no sistema." });
  }

  if (!salon.pergunta_seguranca) {
    return res.status(400).json({ 
      error: "Nenhuma pergunta de segurança foi configurada para esta conta ainda. Faça login e defina-a nas configurações de perfil." 
    });
  }

  res.json({
    success: true,
    pergunta_seguranca: salon.pergunta_seguranca
  });
});

// Recover professional: Step 2 - verify answer and reset password
app.post("/api/professional/recover-reset", (req, res) => {
  const { email, resposta_seguranca, newPassword } = req.body;
  const salon = db.saloes.find((s) => normalizeEmail(s.email) === normalizeEmail(email));
  if (!salon) {
    return res.status(404).json({ error: "Profissional não encontrado." });
  }

  if (!salon.resposta_seguranca_hash || !verifyPassword(resposta_seguranca.trim().toLowerCase(), salon.resposta_seguranca_hash)) {
    return res.status(400).json({ error: "Resposta de segurança incorreta." });
  }

  salon.senha_hash = hashPassword(newPassword);
  saveDatabase(db);

  res.json({ success: true, message: "Senha redefinida com sucesso!" });
});

// --- SERVICES ENDPOINTS (PRO-ONLY) ---

// Get all services for a salon
  app.get("/api/salons/:id/services", verifyAccessToken, checkProfessional, (req, res) => {
  const salaoId = req.params.id;
  const services = db.servicos.filter((s) => s.salao_id === salaoId);
  res.json(services);
});

// Create new service
  app.post("/api/services", verifyAccessToken, checkProfessional, (req, res) => {
  const { salao_id, nome, preco, duracao_estimada_minutos, foto_url } = req.body;

  if (!salao_id || !nome || preco === undefined || !duracao_estimada_minutos) {
    return res.status(400).json({ error: "Dados incompletos para criação do serviço." });
  }

  const newService: Servico = {
    id: generateId(),
    salao_id,
    nome,
    preco: Number(preco),
    duracao_estimada_minutos: Number(duracao_estimada_minutos),
    ativo: true,
    criado_em: new Date().toISOString(),
    foto_url: foto_url || ""
  };

  db.servicos.push(newService);
  saveDatabase(db);

  res.status(201).json(newService);
});

// Update service
  app.put("/api/services/:id", verifyAccessToken, checkProfessional, (req, res) => {
  const sId = req.params.id;
  const { nome, preco, duracao_estimada_minutos, ativo, foto_url } = req.body;

  const service = db.servicos.find((s) => s.id === sId);
  if (!service) {
    return res.status(404).json({ error: "Serviço não encontrado." });
  }

  if (nome !== undefined) service.nome = nome;
  if (preco !== undefined) service.preco = Number(preco);
  if (duracao_estimada_minutos !== undefined) service.duracao_estimada_minutos = Number(duracao_estimada_minutos);
  if (ativo !== undefined) service.ativo = Boolean(ativo);
  if (foto_url !== undefined) service.foto_url = foto_url;

  saveDatabase(db);
  res.json(service);
});

// --- AGENDA & BLOCKS ENDPOINTS ---

// Get all blocks for a salon
  app.get("/api/salons/:id/blocks", verifyAccessToken, checkProfessional, (req, res) => {
  const salaoId = req.params.id;
  const blocks = db.bloqueios_agenda.filter((b) => b.salao_id === salaoId);
  res.json(blocks);
});

// Get sanitized availability intervals for a salon (for clients to compute availability)
// Returns only data_hora_inicio and data_hora_fim to avoid leaking descriptions or metadata.
app.get("/api/salons/:id/availability-blocks", verifyAccessToken, (req, res) => {
  const salaoId = req.params.id;
  const date = typeof req.query.date === "string" ? req.query.date : undefined; // optional YYYY-MM-DD

  let blocks = db.bloqueios_agenda.filter((b) => b.salao_id === salaoId);

  if (date) {
    blocks = blocks.filter((b) => {
      try {
        return new Date(b.data_hora_inicio).toISOString().slice(0, 10) === date;
      } catch (e) {
        return false;
      }
    });
  }

  const out = blocks.map((b) => ({ data_hora_inicio: b.data_hora_inicio, data_hora_fim: b.data_hora_fim }));
  res.json(out);
});

// Get sanitized occupancy intervals for a salon (for clients to compute availability)
// Returns only data_hora_inicio and data_hora_fim from active bookings (no PII, no ids)
app.get("/api/salons/:id/occupancy", verifyAccessToken, (req, res) => {
  const salaoId = req.params.id;
  const date = typeof req.query.date === "string" ? req.query.date : undefined; // optional YYYY-MM-DD

  let bookings = db.agendamentos.filter((b) => b.salao_id === salaoId && b.status_atendimento !== "cancelado");

  if (date) {
    bookings = bookings.filter((b) => {
      try {
        return new Date(b.data_hora_inicio).toISOString().slice(0, 10) === date;
      } catch (e) {
        return false;
      }
    });
  }

  const out = bookings.map((b) => ({ data_hora_inicio: b.data_hora_inicio, data_hora_fim: b.data_hora_fim }));
  res.json(out);
});

// Create a block
  app.post("/api/blocks", verifyAccessToken, checkProfessional, (req, res) => {
  const { salao_id, data_hora_inicio, data_hora_fim, tipo, descricao } = req.body;

  if (!salao_id || !data_hora_inicio || !data_hora_fim || !tipo || !descricao) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes para o bloqueio." });
  }

  // Check overlap with existing active bookings or other blocks
  const overlap = isTimeSlotOverlapping(salao_id, data_hora_inicio, data_hora_fim);
  if (overlap.isOverlapping) {
    return res.status(400).json({ error: overlap.reason || "Erro de sobreposição de horário." });
  }

  const newBlock: BloqueioAgenda = {
    id: generateId(),
    salao_id,
    data_hora_inicio,
    data_hora_fim,
    tipo,
    descricao,
    criado_em: new Date().toISOString()
  };

  db.bloqueios_agenda.push(newBlock);
  saveDatabase(db);

  res.status(201).json(newBlock);
});

// Delete a block
  app.delete("/api/blocks/:id", verifyAccessToken, checkProfessional, (req, res) => {
  const bId = req.params.id;
  const index = db.bloqueios_agenda.findIndex((b) => b.id === bId);

  if (index === -1) {
    return res.status(404).json({ error: "Bloqueio não encontrado." });
  }

  db.bloqueios_agenda.splice(index, 1);
  saveDatabase(db);

  res.json({ success: true, message: "Bloqueio removido com sucesso." });
});

// --- BOOKINGS (AGENDAMENTOS) ENDPOINTS ---

// Get all bookings for a salon (enriched with customer and service data)
// First handler: allow clients to fetch only their bookings. If caller is professional, delegate to next() which runs the protected handler below.
app.get("/api/salons/:id/bookings", (req, res, next) => {
  const salaoId = req.params.id;

  // Authenticate optionally by Bearer token when provided (backward-incompatible: headers removed).
  // If no Authorization header is provided, request remains unauthenticated and will be rejected below.
  let role = "";
  let tokenUserId: string | undefined;
  try {
    const authHeader = req.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
        const v = verifyJwt(token, JWT_SECRET);
        if (v.valid && v.payload) {
          role = (v.payload.role || "") as string;
          tokenUserId = v.payload.sub;
        } else {
          return res.status(403).json({ error: "Acesso proibido. Autenticação inválida para consultar agendamentos deste salão." });
        }
      }
    }
  } catch (err) {
    return res.status(403).json({ error: "Acesso proibido. Autenticação inválida para consultar agendamentos deste salão." });
  }

  // Helper to enrich bookings
  const enrich = (bookingsList: any[]) => {
    const enrichedBookings = bookingsList.map((b) => {
      const client = db.clientes.find((c) => c.id === b.cliente_id);
      const service = db.servicos.find((s) => s.id === b.servico_id);

      return {
        ...b,
        cliente: client ? { id: client.id, nome: client.nome, telefone: client.telefone, cpf: client.cpf } : null,
        servico: service ? { id: service.id, nome: service.nome, preco: service.preco, duracao_estimada_minutos: service.duracao_estimada_minutos } : null
      };
    });

    enrichedBookings.sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());
    return enrichedBookings;
  };

  if (role === "professional") {
    // Delegate to the professional-protected handler below
    return next();
  }

  if (role === "client") {
    // Identify client from token subject (sub). Keep query param fallback for compatibility.
    let clientId: string | null = tokenUserId || null;

    if (!clientId && req.query && req.query.client_id) {
      const q = String(req.query.client_id);
      const byQ = db.clientes.find((c) => c.id === q && c.salao_id === salaoId);
      if (byQ) clientId = byQ.id;
    }

    if (!clientId) {
      // Do not return all bookings when client cannot be identified — deny access instead
      return res.status(403).json({ error: "Forbidden" });
    }

    const bookings = db.agendamentos.filter((b) => b.salao_id === salaoId && b.cliente_id === clientId);
    return res.json(enrich(bookings));
  }

  // Default: unauthorized
  return res.status(403).json({ error: "Acesso proibido. Autenticação inválida para consultar agendamentos deste salão." });
});

// Protected handler: professionals see all salon bookings (enforced by checkProfessional middleware)
  app.get("/api/salons/:id/bookings", verifyAccessToken, checkProfessional, (req, res) => {
  const salaoId = req.params.id;
  const bookings = db.agendamentos.filter((b) => b.salao_id === salaoId);

  const enrichedBookings = bookings.map((b) => {
    const client = db.clientes.find((c) => c.id === b.cliente_id);
    const service = db.servicos.find((s) => s.id === b.servico_id);

    return {
      ...b,
      cliente: client ? { id: client.id, nome: client.nome, telefone: client.telefone, cpf: client.cpf } : null,
      servico: service ? { id: service.id, nome: service.nome, preco: service.preco, duracao_estimada_minutos: service.duracao_estimada_minutos } : null
    };
  });

  enrichedBookings.sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());

  res.json(enrichedBookings);
});

// Get individual client history of bookings
app.get("/api/clients/:id/bookings", verifyAccessToken, (req, res) => {
  const client_id = req.params.id;
  const user = req.user;

  // verifyAccessToken already returns 401 for missing/invalid token
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Only clients are allowed to access this route for their own bookings
  if (user.role !== "client") return res.status(403).json({ error: "Forbidden" });

  // Ensure the token subject matches the requested client id
  if (user.id !== client_id) return res.status(403).json({ error: "Forbidden" });

  // If the token contains a salao_id, ensure the requested client belongs to the same salon
  if (user.salao_id) {
    const clientRecord = db.clientes.find((c) => c.id === client_id);
    if (clientRecord && clientRecord.salao_id && clientRecord.salao_id !== user.salao_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const bookings = db.agendamentos.filter((b) => b.cliente_id === client_id);

  const enrichedBookings = bookings.map((b) => {
    const salon = db.saloes.find((s) => s.id === b.salao_id);
    const service = db.servicos.find((s) => s.id === b.servico_id);

    return {
      ...b,
      salao: salon ? { id: salon.id, nome: salon.nome, slug_url: salon.slug_url, telefone: salon.telefone } : null,
      servico: service ? { id: service.id, nome: service.nome, preco: service.preco, duracao_estimada_minutos: service.duracao_estimada_minutos } : null
    };
  });

  enrichedBookings.sort((a, b) => new Date(b.data_hora_inicio).getTime() - new Date(a.data_hora_inicio).getTime());

  res.json(enrichedBookings);
});

// Create a new booking (auto checks conflict based on calculated start & end time)
app.post("/api/bookings", verifyAccessToken, (req: any, res: any) => {
  const { salao_id, cliente_id, servico_id, data_hora_inicio, observacoes, telefone, nome_cliente_avulso } = req.body;
  const user = req.user as import("./src/auth/types").RequestUser | undefined;
  

  // Require basic fields
  if (!salao_id || (!cliente_id && !telefone) || !servico_id || !data_hora_inicio) {
    return res.status(400).json({ error: "Dados para o agendamento incompletos. (é necessário cliente_id ou telefone)" });
  }

  // Authorization and origin validation
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Resolve role-specific rules
  let resolvedClienteId: string | undefined = cliente_id;

  if (user.role === "client") {
    // Clients must create bookings only for themselves and cannot create walk-ins
    if (!cliente_id) {
      return res.status(403).json({ error: "Clientes devem especificar seu próprio cliente_id na requisição." });
    }
    if (String(cliente_id) !== String(user.id)) {
      return res.status(403).json({ error: "Clientes só podem agendar para si mesmos." });
    }
    // Ensure the client belongs to the salon
    const clientRecord = db.clientes.find((c) => c.id === cliente_id);
    if (!clientRecord || clientRecord.salao_id !== salao_id) {
      return res.status(403).json({ error: "Cliente inválido para este salão." });
    }
    resolvedClienteId = cliente_id;
  } else if (user.role === "professional") {
    // Professionals can create bookings for their own salon only
    const salonRecord = db.saloes.find((s) => s.id === user.id);
    if (!salonRecord) return res.status(403).json({ error: "Acesso proibido. Profissional inválido." });
    if (salonRecord.id !== salao_id) {
      return res.status(403).json({ error: "Profissionais só podem criar agendamentos para seu próprio salão." });
    }
    // If cliente_id provided, ensure that client exists and belongs to this salon
    if (cliente_id) {
      const clientRecord = db.clientes.find((c) => c.id === cliente_id);
      if (!clientRecord || clientRecord.salao_id !== salao_id) {
        return res.status(403).json({ error: "Cliente inválido para este salão." });
      }
      resolvedClienteId = cliente_id;
    } else if (telefone) {
      // allow walk-in: try to resolve optional existing client by phone within same salon
      const clean = normalizePhone(telefone);
      const matched = db.clientes.find((c) => c.salao_id === salao_id && normalizePhone(c.telefone) === clean);
      if (matched) resolvedClienteId = matched.id;
    }
  } else {
    return res.status(403).json({ error: "Acesso proibido. Credenciais insuficientes." });
  }

  // Find service to calculate end time
  const service = db.servicos.find((s) => s.id === servico_id);
  if (!service) {
    return res.status(404).json({ error: "Serviço não encontrado." });
  }

  if (!service.ativo) {
    return res.status(400).json({ error: "Este serviço está inativo e não pode ser agendado." });
  }

  const duration = service.duracao_estimada_minutos;
  const startTs = new Date(data_hora_inicio).getTime();
  const endTs = startTs + duration * 60000;
  const data_hora_fim = new Date(endTs).toISOString();

  // Validation: if booking date corresponds to today (salon local time), disallow bookings in the past
  try {
    const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
    const bookingDay = fmt.format(new Date(data_hora_inicio));
    const todayDay = fmt.format(new Date());
    if (bookingDay === todayDay) {
      if (startTs <= Date.now()) {
        return res.status(400).json({ error: "Não é permitido realizar agendamentos para horários que já passaram." });
      }
    }
  } catch (e) {
    // If Intl fails for any reason, fall back to the same "today + past" logic
    // using server-local date comparison as a best-effort substitute.
    const bookingDateLocal = new Date(startTs);
    const todayLocal = new Date();
    const isBookingLocalToday = bookingDateLocal.getFullYear() === todayLocal.getFullYear() && bookingDateLocal.getMonth() === todayLocal.getMonth() && bookingDateLocal.getDate() === todayLocal.getDate();
    if (isBookingLocalToday && startTs <= Date.now()) {
      return res.status(400).json({ error: "Não é permitido realizar agendamentos para horários que já passaram." });
    }
  }

  // Validate operating hours and lunch break
  const salon = db.saloes.find((s) => s.id === salao_id);
  if (salon && salon.ativo === false) {
    return res.status(400).json({ error: "Este salão está temporariamente inativo e não está aceitando novos agendamentos." });
  }
  if (salon) {
    const { hour: startH, minute: startM } = getLocalTimeParts(data_hora_inicio);
    const { hour: endH, minute: endM } = getLocalTimeParts(data_hora_fim);
    const bookingStartMin = startH * 60 + startM;
    const bookingEndMin = endH * 60 + endM;

    // Check operating hours
    const [opStartH, opStartM] = (salon.hora_inicio_expediente || "08:00").split(":").map(Number);
    const [opEndH, opEndM] = (salon.hora_fim_expediente || "18:00").split(":").map(Number);
    const opStartMin = opStartH * 60 + opStartM;
    const opEndMin = opEndH * 60 + opEndM;

    if (bookingStartMin < opStartMin || bookingEndMin > opEndMin) {
      return res.status(400).json({
        error: `O horário selecionado (${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")} - ${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}) está fora do expediente do salão (${salon.hora_inicio_expediente || "08:00"} às ${salon.hora_fim_expediente || "18:00"}).`
      });
    }

    // Check lunch hours
    if (salon.hora_inicio_almoco && salon.hora_fim_almoco) {
      const [lStartH, lStartM] = salon.hora_inicio_almoco.split(":").map(Number);
      const [lEndH, lEndM] = salon.hora_fim_almoco.split(":").map(Number);
      const lunchStartMin = lStartH * 60 + lStartM;
      const lunchEndMin = lEndH * 60 + lEndM;

      if (bookingStartMin < lunchEndMin && lunchStartMin < bookingEndMin) {
        return res.status(400).json({
          error: `O horário selecionado está dentro do período de almoço do salão (${salon.hora_inicio_almoco} às ${salon.hora_fim_almoco}).`
        });
      }
    }
  }

  // Overlap verification
  const overlap = isTimeSlotOverlapping(salao_id, data_hora_inicio, data_hora_fim);
  if (overlap.isOverlapping) {
    return res.status(400).json({ error: overlap.reason || "Este horário já está ocupado." });
  }

  const newBooking: Agendamento = {
    id: generateId(),
    salao_id,
    cliente_id: resolvedClienteId || null,
    servico_id,
    data_hora_inicio,
    data_hora_fim,
    status_atendimento: "pendente",
    status_financeiro: "pendente",
    valor_cobrado: service.preco,
    observacoes: observacoes || "",
    cliente_telefone_informado: telefone ? normalizePhone(String(telefone)) : undefined,
    // If this booking was created for an unregistered (avulso) client, store a snapshot
    nome_cliente_avulso: !resolvedClienteId && req.body.nome_cliente_avulso ? String(req.body.nome_cliente_avulso) : undefined,
    telefone_cliente_avulso: !resolvedClienteId && telefone ? normalizePhone(String(telefone)) : undefined,
    criado_em: new Date().toISOString(),
    // initialize remarcacao meta
    remarcacoes: [],
    quantidade_remarcacoes: 0,
    foi_remarcado: false
  };

  db.agendamentos.push(newBooking);
  saveDatabase(db);

  // Return full enriched info
  const client = db.clientes.find((c) => c.id === newBooking.cliente_id);
  res.status(201).json({
    ...newBooking,
    cliente: client ? { id: client.id, nome: client.nome, telefone: client.telefone } : null,
    servico: service
  });
});

// Update booking status or payment manually
  app.put("/api/bookings/:id", verifyAccessToken, (req, res) => {
  const bId = req.params.id;
  const user = req.user as import("./src/auth/types").RequestUser | undefined;
  const role = user?.role;
  const userId = user?.id;
  const email = undefined; // legacy header removed; email not used after migration
  const { status_atendimento, status_financeiro, valor_cobrado, observacoes, data_hora_inicio } = req.body;

  const booking = db.agendamentos.find((b) => b.id === bId);
  if (!booking) {
    return res.status(404).json({ error: "Agendamento não encontrado." });
  }

  // Authorization: allow professionals of the salon OR the client who owns the booking
  if (role === "professional") {
    const salon = db.saloes.find((s) => s.id === userId);
    if (!salon || salon.id !== booking.salao_id) {
      return res.status(403).json({ error: "Acesso proibido. Você não tem permissão para modificar este agendamento." });
    }
  } else if (role === "client") {
    if (!userId || String(userId) !== String(booking.cliente_id)) {
      return res.status(403).json({ error: "Acesso proibido. Apenas o cliente dono do agendamento pode remarcar." });
    }
  } else {
    return res.status(403).json({ error: "Acesso proibido. Credenciais insuficientes." });
  }

  // Internal helper: record a remarcacao and update booking times atomically
  function remarkBooking(b: Agendamento, newStartIso: string, newEndIso: string, actor: string) {
    const entry = { de: b.data_hora_inicio, para: newStartIso, quando: new Date().toISOString(), por: actor };
    if (!b.remarcacoes) b.remarcacoes = [];
    b.remarcacoes.push(entry);
    b.quantidade_remarcacoes = (b.quantidade_remarcacoes || 0) + 1;
    b.foi_remarcado = true;
    b.data_hora_inicio = newStartIso;
    b.data_hora_fim = newEndIso;
  }

  // If start time is updated, recalculate end and check conflicts
  if (data_hora_inicio && data_hora_inicio !== booking.data_hora_inicio) {
    const service = db.servicos.find((s) => s.id === booking.servico_id);
    if (!service) return res.status(404).json({ error: "Serviço associado inválido." });

    const duration = service.duracao_estimada_minutos;
    const startTs = new Date(data_hora_inicio).getTime();
    const endTs = startTs + duration * 60000;
    const data_hora_fim = new Date(endTs).toISOString();

    // Validate operating hours and lunch break
    const salon = db.saloes.find((s) => s.id === booking.salao_id);
    if (salon) {
      const { hour: startH, minute: startM } = getLocalTimeParts(data_hora_inicio);
      const { hour: endH, minute: endM } = getLocalTimeParts(data_hora_fim);
      const bookingStartMin = startH * 60 + startM;
      const bookingEndMin = endH * 60 + endM;

      // Check operating hours
      const [opStartH, opStartM] = (salon.hora_inicio_expediente || "08:00").split(":").map(Number);
      const [opEndH, opEndM] = (salon.hora_fim_expediente || "18:00").split(":").map(Number);
      const opStartMin = opStartH * 60 + opStartM;
      const opEndMin = opEndH * 60 + opEndM;

      if (bookingStartMin < opStartMin || bookingEndMin > opEndMin) {
        return res.status(400).json({
          error: `O horário selecionado (${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")} - ${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}) está fora do expediente do salão (${salon.hora_inicio_expediente || "08:00"} às ${salon.hora_fim_expediente || "18:00"}).`
        });
      }

      // Check lunch hours
      if (salon.hora_inicio_almoco && salon.hora_fim_almoco) {
        const [lStartH, lStartM] = salon.hora_inicio_almoco.split(":").map(Number);
        const [lEndH, lEndM] = salon.hora_fim_almoco.split(":").map(Number);
        const lunchStartMin = lStartH * 60 + lStartM;
        const lunchEndMin = lEndH * 60 + lEndM;

        if (bookingStartMin < lunchEndMin && lunchStartMin < bookingEndMin) {
          return res.status(400).json({
            error: `O horário selecionado está dentro do período de almoço do salão (${salon.hora_inicio_almoco} às ${salon.hora_fim_almoco}).`
          });
        }
      }
    }

    const overlap = isTimeSlotOverlapping(booking.salao_id, data_hora_inicio, data_hora_fim, booking.id);
    if (overlap.isOverlapping) {
      return res.status(400).json({ error: overlap.reason || "Erro de conflito no horário atualizado." });
    }

    // Record remarcacao metadata and update booking times
    const actor = (user && user.role === "client") ? "cliente" : "profissional";
    remarkBooking(booking, data_hora_inicio, data_hora_fim, actor);
  }

  if (status_atendimento !== undefined) {
    // Prevent cancelling a booking that is already concluded
    if (status_atendimento === "cancelado" && booking.status_atendimento === "concluido") {
      return res.status(400).json({ error: "Atendimento concluído não pode ser cancelado." });
    }

    booking.status_atendimento = status_atendimento;
    
    // Auto complete triggers payment if requested, or if professional concludes
    if (status_atendimento === "concluido" && booking.status_financeiro === "pendente") {
      // We can keep it pending or let professional mark it.
    }
  }

  if (valor_cobrado !== undefined) {
    booking.valor_cobrado = Number(valor_cobrado);
  }

  if (observacoes !== undefined) {
    booking.observacoes = observacoes;
  }

  // PAYMENT REGISTRATION HANDLER
  // When changing financial status to 'pago'
  if (status_financeiro === "pago") {
    // Only professionals are allowed to change financial status
    if (role !== "professional") {
      return res.status(403).json({ error: "Apenas profissionais podem alterar o status financeiro." });
    }

    // Allow payment when booking is pending, confirmed or concluded.
    // Disallow payment for cancelled bookings.
    const currentStatusAtendimento = status_atendimento || booking.status_atendimento;
    if (currentStatusAtendimento === "cancelado") {
      return res.status(400).json({ error: "Agendamento cancelado não pode receber pagamento." });
    }

    if (booking.status_financeiro === "pago") {
      return res.status(400).json({ error: "Este agendamento já foi pago." });
    }

    // Check for existing caixa entry to prevent duplicate launches
    const existingEntry = db.caixa.find((c) => c.agendamento_id === booking.id);
    if (existingEntry) {
      booking.status_financeiro = "pago"; // Ensure sync
      saveDatabase(db);
      return res.status(400).json({ error: "Este agendamento já possui registro de pagamento." });
    }

    const service = db.servicos.find((s) => s.id === booking.servico_id);
    const client = db.clientes.find((c) => c.id === booking.cliente_id);
    
    // Utilizar o valor cadastrado no serviço
    const finalPrice = service ? service.preco : booking.valor_cobrado;

    booking.valor_cobrado = finalPrice; // Force the service price, no modifications allowed
    booking.status_financeiro = "pago";

    const newCaixaEntry: Caixa = {
      id: generateId(),
      salao_id: booking.salao_id,
      agendamento_id: booking.id,
      valor: finalPrice,
      tipo: "entrada",
      tipo_movimentacao: "Entrada",
      origem: "Atendimento",
      descricao: `Serviço pago: ${service ? service.nome : "Atendimento"} - Cliente: ${client ? client.nome : "Cliente"}`,
      data_pagamento: new Date().toISOString(),
      criado_em: new Date().toISOString()
    };

    db.caixa.push(newCaixaEntry);
  } else if (status_financeiro === "pendente" && booking.status_financeiro === "pago") {
    booking.status_financeiro = "pendente";
    // Remove related cash entries if reverted
    db.caixa = db.caixa.filter((c) => c.agendamento_id !== booking.id);
  }

  saveDatabase(db);
  res.json(booking);
});

// --- CASH REGISTER & FINANCE ENDPOINTS (PRO-ONLY) ---

// Get all cash transactions with date grouping for report
app.get("/api/salons/:id/caixa", verifyAccessToken, checkProfessional, (req, res) => {
  const salaoId = req.params.id;
  const entries = db.caixa.filter((c) => c.salao_id === salaoId);

  // Sort by payment date descending
  entries.sort((a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime());

  // Return normalized entries for compatibility with new ledger fields
  const normalized = entries.map((e) => normalizarMovimentacao(e));

  res.json(normalized);
});

// Create manual cash entry (independent of standard booking)
app.post("/api/caixa", verifyAccessToken, checkProfessional, (req, res) => {
  const {
    salao_id,
    valor,
    descricao,
    tipo_movimentacao,
    origem,
    forma_pagamento,
    motivo,
    observacao,
    referencia,
    registrado_por,
    agendamento_id
  } = req.body;

  const isEntrada = !tipo_movimentacao || tipo_movimentacao === "Entrada";
  if (!salao_id || valor === undefined || (isEntrada && !descricao)) {
    return res.status(400).json({ error: "Dados de caixa obrigatórios ausentes." });
  }

  const tm = tipo_movimentacao || "Entrada";
  const og = origem || "Manual";

  // If agendamento_id is provided, validate booking existence and salon ownership
  const user = req.user as import("./src/auth/types").RequestUser | undefined;
  if (agendamento_id) {
    const booking = db.agendamentos.find((b) => b.id === agendamento_id);
    if (!booking) {
      return res.status(400).json({ error: "Agendamento informado não encontrado." });
    }

    // Ensure the authenticated professional belongs to the same salon as the booking
    if (!user || !user.salao_id || booking.salao_id !== user.salao_id) {
      return res.status(403).json({ error: "Agendamento não pertence ao salão do profissional autenticado." });
    }

    // If creating an Estorno linked to a booking, enforce business rules and prevent duplicates
    if (tm === "Estorno") {
      // booking must be cancelled
      if (booking.status_atendimento !== "cancelado") {
        return res.status(400).json({ error: "Agendamento precisa estar cancelado para registrar estorno vinculado." });
      }

      // booking must be paid
      if (booking.status_financeiro !== "pago") {
        return res.status(400).json({ error: "Agendamento precisa estar com status financeiro 'pago' para registrar estorno vinculado." });
      }

      const existingEstorno = db.caixa.find((c) => c.tipo_movimentacao === "Estorno" && c.agendamento_id === agendamento_id);
      if (existingEstorno) {
        return res.status(400).json({ error: "Este agendamento já possui estorno registrado." });
      }
    }
  }

  if ((tm === "Saída" || tm === "Estorno") && !motivo) {
    return res.status(400).json({ error: "Campo 'motivo' é obrigatório para Saída ou Estorno." });
  }

  const newEntry: Caixa = {
    id: generateId(),
    salao_id,
    agendamento_id: agendamento_id || undefined,
    valor: Number(valor),
    // keep legacy 'tipo' for backward compatibility when it's an entry
    tipo: tm === "Entrada" ? "entrada" : undefined,
    descricao: descricao || undefined,
    data_pagamento: new Date().toISOString(),
    criado_em: new Date().toISOString(),
    tipo_movimentacao: tm,
    origem: og,
    forma_pagamento: forma_pagamento || undefined,
    motivo: motivo || undefined,
    observacao: observacao || undefined,
    referencia: referencia || undefined,
    registrado_por: registrado_por || undefined
  };

  db.caixa.push(newEntry);
  saveDatabase(db);

  // If we just created an estorno linked to an agendamento, update its financial status
  if (tm === "Estorno" && agendamento_id) {
    const bookingToUpdate = db.agendamentos.find((b) => b.id === agendamento_id);
    if (bookingToUpdate) {
      bookingToUpdate.status_financeiro = "estornado" as any;
      saveDatabase(db);
    }
  }

  res.status(201).json(normalizarMovimentacao(newEntry));
});

// Get financial statistics (Daily, Weekly, Monthly chart aggregation)
app.get("/api/salons/:id/finance-reports", verifyAccessToken, checkProfessional, (req, res) => {
  const salaoId = req.params.id;
  const entries = db.caixa.filter((c) => c.salao_id === salaoId);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  // Weekly start (7 days ago)
  const startOfWeek = new Date();
  startOfWeek.setDate(today.getDate() - 7);
  const startOfWeekTs = startOfWeek.getTime();

  // Monthly start (1st of current calendar month at 00:00:00)
  const startOfCurrentMonthTs = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

  let dailyTotal = 0;
  let weeklyTotal = 0;
  let monthlyTotal = 0;

  // Let's build a day-by-day record array for the last 14 days for a beautiful visual SVG chart
  const dailyHistory: { label: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    dailyHistory.push({ label: dayLabel, total: 0 });
  }

  entries.forEach((e) => {
    const m = normalizarMovimentacao(e);
    const entryTime = new Date(m.data_pagamento).getTime();
    const entryVal = Number(m.valor) || 0;
    const signedVal = m.tipo_movimentacao === "Saída" || m.tipo_movimentacao === "Estorno" ? -entryVal : entryVal;

    if (entryTime >= startOfDay) {
      dailyTotal += signedVal;
    }
    if (entryTime >= startOfWeekTs) {
      weeklyTotal += signedVal;
    }
    if (entryTime >= startOfCurrentMonthTs) {
      monthlyTotal += signedVal;
    }

    // Match daily chart
    const entryDate = new Date(m.data_pagamento);
    const dayLabel = `${entryDate.getDate()}/${entryDate.getMonth() + 1}`;
    const chartDay = dailyHistory.find((item) => item.label === dayLabel);
    if (chartDay) {
      chartDay.total += signedVal;
    }
  });

  res.json({
    dailyTotal,
    weeklyTotal,
    monthlyTotal,
    dailyHistory
  });
});

// --- CUSTOMERS / CLIENTS LIST (PRO-ONLY) ---

// List all clients registered under a specific salon, with their count of appointments
app.get("/api/salons/:id/clients", verifyAccessToken, checkProfessional, (req, res) => {
  const salaoId = req.params.id;
  const salonClients = db.clientes.filter((c) => c.salao_id === salaoId);

  const enrichedClients = salonClients.map((c) => {
    const clientBookings = db.agendamentos.filter((b) => b.cliente_id === c.id);
    const totalSpent = db.caixa
      .filter((cx) => cx.salao_id === salaoId && cx.agendamento_id && clientBookings.some((b) => b.id === cx.agendamento_id))
      .reduce((sum, item) => {
        const m = normalizarMovimentacao(item);
        const v = Number(m.valor) || 0;
        return m.tipo_movimentacao === "Saída" || m.tipo_movimentacao === "Estorno" ? sum - v : sum + v;
      }, 0);

    return {
      id: c.id,
      salao_id: c.salao_id,
      nome: c.nome,
      telefone: c.telefone,
      cpf: c.cpf,
      criado_em: c.criado_em,
      total_agendamentos: clientBookings.length,
      total_pago: totalSpent
    };
  });

  res.json(enrichedClients);
});

// ==========================================
// VITE AND STATIC SERVING PIPELINE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA catch-all
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    // Collect non-internal IPv4 addresses for LAN access
    const nets = os.networkInterfaces();
    const addresses: string[] = [];
    Object.values(nets).forEach((netList) => {
      if (!netList) return;
      netList.forEach((net) => {
        // Node may return 'IPv4' or 4 depending on platform/ts settings
        if ((net.family === "IPv4" || (net as any).family === 4) && !net.internal) {
          addresses.push(net.address);
        }
      });
    });

    console.log(`[StudioFlow] Backend Express running on http://localhost:${PORT}`);
    if (addresses.length > 0) {
      addresses.forEach((addr) => {
        console.log(`[StudioFlow] App available on http://${addr}:${PORT}`);
      });
    } else {
      console.log(`[StudioFlow] No LAN IPv4 address found — use http://localhost:${PORT}`);
    }
  });

}

(async () => {
  try {
    await initPersistence();
    db = await loadDatabase();
    await startServer();
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();

export default app;
