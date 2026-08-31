export interface Cliente {
  id: string;
  salao_id: string;
  nome: string;
  telefone: string;
  cpf: string;
  criado_em: string;
  total_agendamentos?: number;
  total_pago?: number;
  avatar_emoji?: string;
  avatar_url?: string;
}

export interface Salon {
  id: string;
  nome: string;
  dono: string;
  telefone: string;
  slug_url: string;
  criado_em: string;
  email?: string;
  avatar_emoji?: string;
  avatar_url?: string;
  pergunta_seguranca?: string;
  descricao?: string;
  hora_inicio_expediente?: string;
  hora_fim_expediente?: string;
  hora_inicio_almoco?: string;
  hora_fim_almoco?: string;
  ativo?: boolean;
  endereco?: string;
}

export interface Servico {
  id: string;
  salao_id: string;
  nome: string;
  preco: number;
  duracao_estimada_minutos: number;
  ativo: boolean;
  criado_em: string;
  foto_url?: string;
}

export interface Agendamento {
  id: string;
  salao_id: string;
  cliente_id: string | null;
  servico_id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status_atendimento: "pendente" | "confirmado" | "concluido" | "cancelado";
  status_financeiro: "pendente" | "pago" | "estornado";
  valor_cobrado: number;
  observacoes?: string;
  criado_em: string;
  cliente?: {
    id: string;
    nome: string;
    telefone: string;
    cpf: string;
  } | null;
  // Snapshot fields for walk-in (avulso) clients when no cliente_id is provided
  nome_cliente_avulso?: string;
  telefone_cliente_avulso?: string;
  cliente_telefone_informado?: string;
  servico?: {
    id: string;
    nome: string;
    preco: number;
    duracao_estimada_minutos: number;
  } | null;
  salao?: {
    id: string;
    nome: string;
    slug_url: string;
    telefone: string;
  } | null;
  // Histórico de remarcações (adicionado pela PR de apresentação)
  remarcacoes?: { de: string; para: string; quando: string; por: string }[];
  quantidade_remarcacoes?: number;
  foi_remarcado?: boolean;
}

export interface Caixa {
  id: string;
  salao_id: string;
  agendamento_id?: string;
  valor: number;
  tipo?: string;
  descricao?: string | null;
  data_pagamento: string;
  criado_em: string;

  // Optional fields present in persisted objects and used by the UI
  tipo_movimentacao?: "Entrada" | "Saída" | "Estorno" | string;
  origem?: string;
  forma_pagamento?: string;
  motivo?: string;
  observacao?: string;
  referencia?: string;
  registrado_por?: string;
}

export interface BloqueioAgenda {
  id: string;
  salao_id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  tipo: "almoco" | "folga" | "manual";
  descricao: string;
  criado_em: string;
}

export interface SessionUser {
  id: string;
  nome?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  salao_id?: string;
  salao?: Salon;
  role: "client" | "professional" | "admin";
  nivel_acesso?: string;
  accessToken?: string;
  isImpersonated?: boolean;
  avatar_emoji?: string;
  avatar_url?: string;
  pergunta_seguranca?: string;
  descricao?: string;
}

export interface AdminSistema {
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

export interface Database {
  clientes: Cliente[];
  saloes: Salon[];
  administrador_sistema: AdminSistema[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  caixa: Caixa[];
  bloqueios_agenda: BloqueioAgenda[];
}
