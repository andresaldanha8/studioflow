import React, { useState, useEffect, useRef } from "react";
import { apiUrl } from "./utils/apiUrl";
import {
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Scissors,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LogOut,
  User,
  Search,
  Lock,
  Phone,
  Info,
  ChevronRight,
  ArrowLeft,
  Briefcase,
  Grid,
  FileText,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  CalendarCheck,
  RefreshCw,
  Eye,
  Filter,
  Upload
} from "lucide-react";
import { Cliente, Salon, Servico, Agendamento, Caixa, BloqueioAgenda, SessionUser } from "./types";
import BookingHistoryModal from "./BookingHistoryModal";
import BookingHistoryBadge from "./BookingHistoryBadge";

const formatPhone = (value: string) => {
  const nums = value.replace(/\D/g, "");
  if (!nums) return "";
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
};

const formatCPF = (value: string) => {
  const nums = value.replace(/\D/g, "");
  if (!nums) return "";
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
};

// Normaliza telefones removendo caracteres não numéricos.
// Usado para comparações robustas entre formatos diferentes
// Ex: (94) 99181-9698, 94991819698 e "94 99181-9698" são equivalentes.
const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export default function App() {
  // Global Workspace & Auth States
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => {
    const saved = localStorage.getItem("user_session");
    if (!saved) return null;
    try {
      // Garantir que o valor parseado seja tratado como `SessionUser | null`.
      return JSON.parse(saved) as SessionUser;
    } catch (err) {
      // Se o JSON estiver corrompido, limpar e retornar nulo
      localStorage.removeItem("user_session");
      return null;
    }
  });

  // Keep a ref to currentUser so listeners have latest value without reattaching
  const currentUserRef = useRef<SessionUser | null>(currentUser);
  const selectedSalonRef = useRef<Salon | null>(selectedSalon);
  const localSessionInvalidatedRef = useRef(false);
  const bookingsFetchInFlightRef = useRef(false);
  const isMountedRef = useRef(false);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    selectedSalonRef.current = selectedSalon;
  }, [selectedSalon]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Navigation within roles
  const [currentView, setCurrentView] = useState<string>("dashboard"); // default views

  // Global data arrays for current salon
  const [services, setServices] = useState<Servico[]>([]);
  const [bookings, setBookings] = useState<Agendamento[]>([]);
  const [blocks, setBlocks] = useState<BloqueioAgenda[]>([]);
  // Availability blocks sanitized for clients (only start/end timestamps)
  const [availabilityBlocks, setAvailabilityBlocks] = useState<{ data_hora_inicio: string; data_hora_fim: string }[]>([]);
  const [occupiedIntervals, setOccupiedIntervals] = useState<{ data_hora_inicio: string; data_hora_fim: string }[]>([]);
  const [caixaEntries, setCaixaEntries] = useState<Caixa[]>([]);
  const [financeStats, setFinanceStats] = useState({
    dailyTotal: 0,
    weeklyTotal: 0,
    monthlyTotal: 0,
    dailyHistory: [] as { label: string; total: number }[]
  });
  const [clients, setClients] = useState<Cliente[]>([]);

  // Global system admin data
  const [adminStats, setAdminStats] = useState({
    stats: { salonsCount: 0, clientsCount: 0, totalSchedules: 0, totalRevenue: 0 },
    saloes: [] as Salon[],
    clientes: [] as Cliente[],
    agendamentos: [] as Agendamento[]
  });

  // UI state utilities
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Authentication inputs
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState(""); // professional/admin
  
  // Signup inputs
  const [signupNome, setSignupNome] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupCpf, setSignupCpf] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Recovery password inputs
  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoverLastFourCpf, setRecoverLastFourCpf] = useState("");
  const [recoverNewPassword, setRecoverNewPassword] = useState("");
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Scheduling wizard inputs
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<{ time: string; startIso: string; endIso: string; available: boolean; conflictReason: string | null }[]>([]);

  // Service form inputs (add/edit)
  const [editingService, setEditingService] = useState<Servico | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [serviceFotoUrl, setServiceFotoUrl] = useState("");
  const [showServiceForm, setShowServiceForm] = useState(false);

  // Block form inputs
  const [blockType, setBlockType] = useState<"almoco" | "folga" | "manual">("manual");
  const [blockDate, setBlockDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("12:00");
  const [blockEndTime, setBlockEndTime] = useState("13:00");
  const [blockDescription, setBlockDescription] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false);

  // Manual cash entry
  const [manualCashVal, setManualCashVal] = useState("");
  const [manualCashDesc, setManualCashDesc] = useState("");
  // Movimentação do caixa (nova interface)
  const [movValor, setMovValor] = useState("");
  const [movDescricao, setMovDescricao] = useState("");
  const [movTipo, setMovTipo] = useState<"Entrada" | "Saída" | "Estorno">("Entrada");
  const [movFormaPagamento, setMovFormaPagamento] = useState<string>("");
  const [movMotivo, setMovMotivo] = useState<string>("");
  const [movObservacao, setMovObservacao] = useState<string>("");
  const [movReferencia, setMovReferencia] = useState<string>("");
  const [showAdditionalInfo, setShowAdditionalInfo] = useState<boolean>(false);
  const [selectedEstornoAgId, setSelectedEstornoAgId] = useState<string | null>(null);

  // Admin salon creator
  const [adminSalonNome, setAdminSalonNome] = useState("");
  const [adminSalonDono, setAdminSalonDono] = useState("");
  const [adminSalonPhone, setAdminSalonPhone] = useState("");
  const [adminSalonSlug, setAdminSalonSlug] = useState("");
  const [adminSalonEndereco, setAdminSalonEndereco] = useState("");
  const [adminSalonAtivo, setAdminSalonAtivo] = useState(true);
  const [adminSalonSearch, setAdminSalonSearch] = useState("");
  const [showAdminSalonForm, setShowAdminSalonForm] = useState(false);
  const [editingSalonId, setEditingSalonId] = useState<string | null>(null);
  const [isDirectSalonLink, setIsDirectSalonLink] = useState(!!window.location.hash);
  const justImpersonatedRef = useRef(false);
  const [salonToDelete, setSalonToDelete] = useState<{ id: string; nome: string } | null>(null);

  // New multi-portal architecture states
  const [portalMode, setPortalMode] = useState<"client" | "salon" | "admin" | "directory">(() => {
    const hash = window.location.hash.replace("#", "").trim();
    const route = hash !== "" ? hash : window.location.pathname.slice(1);
    const cleanRoute = route.split("/")[0].toLowerCase().trim();
    if (cleanRoute === "admin") return "admin";
    if (cleanRoute === "pro") return "salon";
    if (cleanRoute !== "") return "client";
    return "directory";
  });
  const [clientSlug, setClientSlug] = useState<string>("");
  const [clientAuthForm, setClientAuthForm] = useState<"none" | "login" | "signup" | "recovery">("none");
  const [clientRecoveryStep, setClientRecoveryStep] = useState<1 | 2 | 3>(1);
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [recoverConfirmPassword, setRecoverConfirmPassword] = useState("");
  const [publicSalons, setPublicSalons] = useState<Salon[]>([]);

  // Client profile form inputs
  const [clientProfileName, setClientProfileName] = useState("");
  const [clientProfilePhone, setClientProfilePhone] = useState("");
  const [clientProfileCpf, setClientProfileCpf] = useState("");
  const [clientProfileEmoji, setClientProfileEmoji] = useState("👩");
  const [clientProfileUrl, setClientProfileUrl] = useState("");
  const [clientProfilePassword, setClientProfilePassword] = useState("");
  const [clientProfileConfirmPassword, setClientProfileConfirmPassword] = useState("");
  const [isUpdatingClientProfile, setIsUpdatingClientProfile] = useState(false);

  // Admin Tab & Profile settings
  const [adminActiveTab, setAdminActiveTab] = useState<"dashboard" | "profile">("dashboard");
  const [adminProfileName, setAdminProfileName] = useState("");
  const [adminProfilePhone, setAdminProfilePhone] = useState("");
  const [adminProfileEmoji, setAdminProfileEmoji] = useState("👑");
  const [adminProfileUrl, setAdminProfileUrl] = useState("");
  const [adminProfileQuestion, setAdminProfileQuestion] = useState("");
  const [adminProfileAnswer, setAdminProfileAnswer] = useState("");
  const [adminCurrentPassword, setAdminCurrentPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");

  // Professional Profile Settings
  const [proProfileName, setProProfileName] = useState("");
  const [proProfilePhone, setProProfilePhone] = useState("");
  const [proProfileSalonName, setProProfileSalonName] = useState("");
  const [proProfileSlug, setProProfileSlug] = useState("");
  const [proProfileEmoji, setProProfileEmoji] = useState("💅");
  const [proProfileDesc, setProProfileDesc] = useState("");
  const [proProfileUrl, setProProfileUrl] = useState("");
  const [proProfileQuestion, setProProfileQuestion] = useState("");
  const [proProfileAnswer, setProProfileAnswer] = useState("");
  const [proProfileEndereco, setProProfileEndereco] = useState("");
  const [proCurrentPassword, setProCurrentPassword] = useState("");
  const [proNewPassword, setProNewPassword] = useState("");
  const [proConfirmPassword, setProConfirmPassword] = useState("");
  const [proProfileStartExpediente, setProProfileStartExpediente] = useState("08:00");
  const [proProfileEndExpediente, setProProfileEndExpediente] = useState("18:00");
  const [proProfileStartAlmoco, setProProfileStartAlmoco] = useState("12:00");
  const [proProfileEndAlmoco, setProProfileEndAlmoco] = useState("13:00");
  const [proProfileHasAlmoco, setProProfileHasAlmoco] = useState(true);

  // Reschedule booking states
  const [reschedulingBooking, setReschedulingBooking] = useState<Agendamento | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);
  // Cancel modal for clients
  const [cancelingBooking, setCancelingBooking] = useState<Agendamento | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  // Booking history UI
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[] | null>(null);

  // Professional forgot password & recovery states
  const [showProRecoverModal, setShowProRecoverModal] = useState(false);
  const [proRecoverEmail, setProRecoverEmail] = useState("");
  const [proRecoverStep, setProRecoverStep] = useState<1 | 2>(1);
  const [proRecoverQuestion, setProRecoverQuestion] = useState("");
  const [proRecoverAnswer, setProRecoverAnswer] = useState("");
  const [proRecoverNewPassword, setProRecoverNewPassword] = useState("");
  const [proRecoverConfirmPassword, setProRecoverConfirmPassword] = useState("");

  // Admin forgot password & recovery states
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverStep, setRecoverStep] = useState<1 | 2>(1);
  const [recoverQuestion, setRecoverQuestion] = useState("");
  const [recoverAnswer, setRecoverAnswer] = useState("");
  const [recoverAdminNewPassword, setRecoverAdminNewPassword] = useState("");
  const [recoverAdminConfirmPassword, setRecoverAdminConfirmPassword] = useState("");

  // Auto-sync profile fields when admin is logged in
  useEffect(() => {
    if (currentUser && currentUser.role === "admin") {
      setAdminProfileName(currentUser.nome || "Master Admin");
      setAdminProfilePhone(currentUser.telefone || "");
      setAdminProfileEmoji(currentUser.avatar_emoji || "👑");
      setAdminProfileUrl(currentUser.avatar_url || "");
      setAdminProfileQuestion(currentUser.pergunta_seguranca || "");
    }
  }, [currentUser]);

  // Auto-sync profile fields when professional is logged in
  useEffect(() => {
    if (currentUser && currentUser.role === "professional" && selectedSalon) {
      setProProfileName(currentUser.nome || "");
      setProProfilePhone(currentUser.telefone || "");
      setProProfileSalonName(selectedSalon.nome || "");
      setProProfileSlug(selectedSalon.slug_url || "");
      setProProfileEmoji(currentUser.avatar_emoji || "💅");
      setProProfileUrl(currentUser.avatar_url || "");
      setProProfileQuestion(selectedSalon.pergunta_seguranca || "");
      setProProfileDesc(selectedSalon.descricao || "");
      setProProfileEndereco(selectedSalon.endereco || "");
      setProProfileStartExpediente(selectedSalon.hora_inicio_expediente || "08:00");
      setProProfileEndExpediente(selectedSalon.hora_fim_expediente || "18:00");
      setProProfileStartAlmoco(selectedSalon.hora_inicio_almoco || "12:00");
      setProProfileEndAlmoco(selectedSalon.hora_fim_almoco || "13:00");
      setProProfileHasAlmoco(!!(selectedSalon.hora_inicio_almoco && selectedSalon.hora_fim_almoco));
    }
  }, [currentUser, selectedSalon]);

  // Auto-sync profile fields when client is logged in
  useEffect(() => {
    if (currentUser && currentUser.role === "client") {
      setClientProfileName(currentUser.nome || "");
      setClientProfilePhone(currentUser.telefone || "");
      setClientProfileCpf(currentUser.cpf || "");
      setClientProfileEmoji(currentUser.avatar_emoji || "👩");
      setClientProfileUrl(currentUser.avatar_url || "");
      setClientProfilePassword("");
      setClientProfileConfirmPassword("");
    }
  }, [currentUser]);

  // Search/Filters
  const [clientSearch, setClientSearch] = useState("");
  const [agendaDateFilter, setAgendaDateFilter] = useState("");

  // ==========================================
  // INITIAL DATA LOADING & ROUTING
  // ==========================================

  const fetchPublicSalons = async () => {
    try {
      const res = await fetch(apiUrl("/api/public/salons"), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPublicSalons(data);
        return data;
      }
    } catch (e) {
      console.error("Error fetching public salons", e);
    }
    return [];
  };

  // Helper function to handle navigation cleanly (supporting both pathnames & hash fallback)
  const navigateToPortal = (mode: "client" | "salon" | "admin" | "directory", slug?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setClientAuthForm("none");
    if (mode === "client" && slug) {
      window.location.hash = `#${slug}`;
      setPortalMode("client");
      setClientSlug(slug);
      fetchSalonBySlug(slug);
    } else if (mode === "salon") {
      window.location.hash = "#pro";
      setPortalMode("salon");
      setSelectedSalon(null);
    } else if (mode === "admin") {
      window.location.hash = "#admin";
      setPortalMode("admin");
      setSelectedSalon(null);
    } else {
      window.location.hash = "";
      setPortalMode("directory");
      setSelectedSalon(null);
      fetchPublicSalons();
    }
  };

  // Fetch initial salons list and set up routing on mount
  useEffect(() => {

    const handleRouting = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash.replace("#", "");

      // Check if pathname has a route (e.g. /admin, /pro, /studio-glamour)
      const route = hash !== "" ? hash : pathname.slice(1);

      // Clean up route to find mode
      const cleanRoute = route.split("/")[0].toLowerCase().trim();

      const saved = localStorage.getItem("user_session");
      const parsedUser = saved ? JSON.parse(saved) : null;

      // Prevent normal admin sessions from landing visually in the professional portal (#pro).
      // If the admin is impersonating a professional, an admin_session_backup will exist
      // and we must allow #pro to proceed. For regular admin sessions, normalize back
      // to #admin immediately and stop further routing logic to avoid blank views.
      const isImpersonating = localStorage.getItem("admin_session_backup") !== null;
      if (parsedUser && parsedUser.role === "admin" && cleanRoute === "pro" && !isImpersonating) {
        window.location.hash = "#admin";
        setPortalMode("admin");
        return;
      }

      // Prevent normal admin sessions from landing visually on a public salon slug.
      // If the admin is impersonating a professional, admin_session_backup will exist
      // and we must allow visiting slugs. For regular admin sessions, normalize back
      // to #admin immediately and stop further routing logic to avoid hybrid views.
      if (
        parsedUser &&
        parsedUser.role === "admin" &&
        cleanRoute !== "admin" &&
        cleanRoute !== "pro" &&
        cleanRoute !== "" &&
        !isImpersonating
      ) {
        window.location.hash = "#admin";
        setPortalMode("admin");
        return;
      }

      // --- CENTRAL DE CONTROLE DE ACESSO E REDIRECIONAMENTO ---
      if (parsedUser) {
        if (parsedUser.role === "client") {
          // Cliente: Pode acessar apenas o seu salão. Nunca admin, pro ou directory ("").
          if (cleanRoute === "admin" || cleanRoute === "pro" || cleanRoute === "") {
            const lastClientSlug = localStorage.getItem("last_client_salon_slug") || (parsedUser.salao ? parsedUser.salao.slug_url : "bella-sobrancelha");
            window.location.hash = `#${lastClientSlug}`;
            setPortalMode("client");
            setClientSlug(lastClientSlug);
            fetchSalonBySlug(lastClientSlug);
            return;
          }
        } else if (parsedUser.role === "professional") {
          // Profissional: Pode acessar apenas 'pro'. Nunca admin, directory ("") ou salões de terceiros.
          // Exceto se estiver em modo de impersonação (admin_session_backup existe), permitindo navegação
          const hasBackup = localStorage.getItem("admin_session_backup") !== null;
          if (cleanRoute !== "pro" && !hasBackup) {
            window.location.hash = "#pro";
            setPortalMode("salon");
              if (parsedUser.salao) {
              setSelectedSalon(parsedUser.salao);
            } else {
              setSelectedSalon(null);
            }
            return;
          }
        } else if (parsedUser.role === "admin") {
          // Administrador: Pode acessar tudo.
        }
      }

      // Salvar o slug visitado para controle posterior se não estiver logado
      if (!parsedUser && cleanRoute !== "admin" && cleanRoute !== "pro" && cleanRoute !== "") {
        localStorage.setItem("last_client_salon_slug", cleanRoute);
      }

      if (cleanRoute === "admin") {
        setPortalMode("admin");
        if (parsedUser && parsedUser.role === "admin") {
          fetchSalons(parsedUser);
        }
      } else if (cleanRoute === "pro") {
        setPortalMode("salon");
        if (parsedUser && parsedUser.role === "professional" && parsedUser.salao) {
          setSelectedSalon(parsedUser.salao);

          // Restauração mínima e estrita para impersonation no boot (F5):
          // Só executar quando:
          // - estamos em impersonation persistida (admin_session_backup existe)
          // - o user_session persistido é realmente um profissional impersonado
          // - o user_session possui accessToken e salao
          // - e NÃO acabamos de fazer a impersonation nesta execução (justImpersonatedRef)
          // Se todas as condições se aplicarem, carregamos explicitamente o workspace
          // usando o accessToken persistido e retornamos para impedir o ramo #pro
          // padrão de continuar (evita chamadas duplicadas).
          try {
            const hasBackup = localStorage.getItem("admin_session_backup");
            if (
              hasBackup &&
              parsedUser.isImpersonated === true &&
              parsedUser.accessToken &&
              parsedUser.salao &&
              !justImpersonatedRef.current
            ) {
              // Carrega explicitamente usando o token do usuário persistido
              // (este caminho é executado somente no boot quando necessário).
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              loadSalonWorkspaceData(parsedUser.salao.id, parsedUser.accessToken);
              return;
            }
            // Se acabamos de impersonar nesta execução, consumimos a marca e
            // evitamos executar a restauração aqui para não duplicar o load
            // que já foi executado em handleAdminImpersonate().
            if (justImpersonatedRef.current) {
              justImpersonatedRef.current = false;
            }
          } catch (e) {
            console.error("Erro ao tentar restaurar impersonation no boot", e);
          }
        } else {
          setSelectedSalon(null);
        }
      } else if (cleanRoute !== "") {
        setPortalMode("client");
        setClientSlug(cleanRoute);
        fetchSalonBySlug(cleanRoute);
      } else {
        setPortalMode("directory");
        setSelectedSalon(null);
        // Only fetch the admin-only public salons list when an admin session exists.
        if (parsedUser && parsedUser.role === "admin") {
          fetchPublicSalons();
        }
      }
    };

    handleRouting();

    window.addEventListener("hashchange", handleRouting);
    return () => {
      window.removeEventListener("hashchange", handleRouting);
    };
  }, []);

  // Set user login state in localstorage
  const handleSetUser = (user: SessionUser | null) => {
    // Obter o role do usuário antes de limpar a sessão
    const saved = localStorage.getItem("user_session");
    const parsedUser = saved ? JSON.parse(saved) : null;
    const oldRole = parsedUser ? parsedUser.role : null;

    setCurrentUser(user);
    currentUserRef.current = user;
    localSessionInvalidatedRef.current = false;
    if (user) {
      localStorage.setItem("user_session", JSON.stringify(user));
      // Route appropriately
      if (user.role === "client") {
        setCurrentView("services");
        setClientAuthForm("none");
      } else if (user.role === "professional") {
        setCurrentView("dashboard");
      } else if (user.role === "admin") {
        setCurrentView("dashboard");
      }
      // Se for um cliente e já houver um salão selecionado, recarregar os
      // dados do salão no contexto autenticado para exibir agendamentos.
      if (user.role === "client" && selectedSalon) {
        loadSalonWorkspaceData(selectedSalon.id);
      }
    } else {
      localStorage.removeItem("user_session");
      localStorage.removeItem("admin_session_backup");
      // Reset forms & currentView
      setClientAuthForm("none");

      if (oldRole === "professional") {
        // Limpa completamente o contexto do salão
        setSelectedSalon(null);
        setServices([]);
        setBookings([]);
        setBlocks([]);
        setClients([]);
        setCaixaEntries([]);

        setFinanceStats({
          dailyTotal: 0,
          weeklyTotal: 0,
          monthlyTotal: 0,
          dailyHistory: []
        });

        // Profissional ao realizar logout retorna unicamente ao Portal da Profissional (#pro)
        setPortalMode("salon");
        window.location.hash = "#pro";
        setCurrentView("dashboard");
      } else if (oldRole === "client") {
        // Cliente ao deslogar permanece no portal do salão visitado
        setPortalMode("client");
        setCurrentView("services");
      } else if (oldRole === "admin") {
        // Admin ao deslogar volta para o portal de login administrativo (#admin)
        setPortalMode("admin");
        window.location.hash = "#admin";
        setCurrentView("dashboard");
      } else {
        if (portalMode === "client") {
          setCurrentView("services");
        } else if (portalMode === "salon") {
          setCurrentView("dashboard");
        } else if (portalMode === "admin") {
          setCurrentView("dashboard");
        }
      }
    }
  };

  // Invalidate session only in this tab without touching persisted global session
  const invalidateLocalSession = () => {
    const prev = currentUserRef.current;
    // Clear tab-local user
    setCurrentUser(null);
    currentUserRef.current = null;
    localSessionInvalidatedRef.current = true;

    // If previous was a professional, clear salon-specific UI state similar to full logout
    if (prev && prev.role === "professional") {
      setSelectedSalon(null);
      setServices([]);
      setBookings([]);
      setBlocks([]);
      setClients([]);
      setCaixaEntries([]);
      setFinanceStats({
        dailyTotal: 0,
        weeklyTotal: 0,
        monthlyTotal: 0,
        dailyHistory: []
      });
      setPortalMode("salon");
      window.location.hash = "#pro";
      setCurrentView("dashboard");
    } else if (prev && prev.role === "client") {
      setPortalMode("client");
      setCurrentView("services");
    } else if (prev && prev.role === "admin") {
      setPortalMode("admin");
      window.location.hash = "#admin";
      setCurrentView("dashboard");
    }
  };

  const fetchSalons = async (customUser?: SessionUser | null) => {
    const userToVerify = customUser !== undefined ? customUser : currentUser;
    if (!userToVerify || userToVerify.role !== "admin") {
      return;
    }
    try {
      setLoading(true);
      // Fetch stats from admin endpoint which includes salon list, or directly fetch if needed
      const response = await fetch(apiUrl("/api/admin/stats"), {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSalons(data.saloes);
        setAdminStats(data);
      }
    } catch (err) {
      console.error("Error fetching salons", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync user_session changes across tabs and ensure single-session invariant
  // Consumer-only: do not write back to localStorage from this listener.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (e.key !== "user_session" && e.key !== "admin_session_backup") return;

        if (e.key === "user_session") {
          const newVal = e.newValue ? JSON.parse(e.newValue) : null;
          const cur = currentUserRef.current;

          // If the global session was cleared, invalidate only this tab
          if (!newVal) {
            if (cur) invalidateLocalSession();
            return;
          }

          // If the global session changed to a different id/role, adopt it locally
          if (!cur || cur.id !== newVal.id || cur.role !== newVal.role) {
            // Apply persisted session to UI state only -- DO NOT write it back to localStorage
            setCurrentUser(newVal);
            currentUserRef.current = newVal;
            localSessionInvalidatedRef.current = false;
            // Adjust portalMode/view locally
            if (newVal.role === "professional") {
              setPortalMode("salon");
              setCurrentView("dashboard");
              if (newVal.salao) setSelectedSalon(newVal.salao);
            } else if (newVal.role === "client") {
              setPortalMode("client");
              setCurrentView("services");
            } else if (newVal.role === "admin") {
              setPortalMode("admin");
              setCurrentView("dashboard");
            }
          }
        }

        // Changes to admin_session_backup do not require direct action here;
        // impersonation restore flow uses explicit handlers in the UI.
      } catch (err) {
        // swallow parsing errors
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const fetchSalonBySlug = async (slug: string) => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl(`/api/salons/by-slug/${slug}`));
      if (res.ok) {
        const data = await res.json();
        setSelectedSalon(data.salon);
        setServices(data.services);
        window.location.hash = slug;

        // Auto transition view
        if (currentUser && currentUser.role !== "admin") {
          const userSalonId = currentUser.role === "professional"
            ? (currentUser.salao?.id || currentUser.id)
            : currentUser.salao_id;

          if (userSalonId !== data.salon.id) {
            invalidateLocalSession();
          }
        }
        
        // Load data specific to this salon
        // Only trigger workspace load if we have an active or persisted session
        // to avoid anonymous calls to professional-only endpoints that return 401/403.
        const savedSession = localStorage.getItem("user_session");
        const parsedSession = savedSession ? JSON.parse(savedSession) : null;
        if (currentUser || parsedSession) {
          // If we have a persisted accessToken prefer using it to avoid races
          // Only professionals should use their explicit token path to load the full workspace.
          if (parsedSession && parsedSession.accessToken && parsedSession.role === "professional") {
              loadSalonWorkspaceData(data.salon.id, parsedSession.accessToken);
            } else {
              loadSalonWorkspaceData(data.salon.id);
            }
        }
      } else {
        setErrorMessage("Salão selecionado não foi encontrado.");
      }
    } catch (err) {
      console.error("Error loading salon", err);
    } finally {
      setLoading(false);
    }
  };

  const syncBookings = async (
    salonId: string,
    headers: Record<string, string>,
    shouldApply: () => boolean = () => true
  ) => {
    if (bookingsFetchInFlightRef.current) return;

    bookingsFetchInFlightRef.current = true;
    try {
      const response = await fetch(apiUrl(`/api/salons/${salonId}/bookings`), { headers });
      if (!response.ok) return;

      const data = await response.json();
      if (!Array.isArray(data) || !isMountedRef.current || !shouldApply()) return;

      setBookings(data);
    } catch (err) {
      console.error("Error syncing bookings", err);
    } finally {
      bookingsFetchInFlightRef.current = false;
    }
  };

  const loadSalonWorkspaceData = async (salonId: string, explicitToken?: string) => {
    try {
      // If explicitToken provided, use it and call all workspace endpoints (used for impersonation/explicit token flows)
      if (explicitToken) {
        const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${explicitToken}` };
        const [srvRes, , blkRes, cxRes, fnRes, cliRes] = await Promise.all([
          fetch(apiUrl(`/api/salons/${salonId}/services`), { headers }),
          syncBookings(salonId, headers),
          fetch(apiUrl(`/api/salons/${salonId}/blocks`), { headers }),
          fetch(apiUrl(`/api/salons/${salonId}/caixa`), { headers }),
          fetch(apiUrl(`/api/salons/${salonId}/finance-reports`), { headers }),
          fetch(apiUrl(`/api/salons/${salonId}/clients`), { headers })
        ]);

        if (srvRes.ok) setServices(await srvRes.json());
        if (blkRes.ok) setBlocks(await blkRes.json());
        if (cxRes.ok) setCaixaEntries(await cxRes.json());
        if (fnRes.ok) setFinanceStats(await fnRes.json());
        if (cliRes.ok) setClients(await cliRes.json());
        return;
      }

      // If there's no explicit token and no persisted session and no current user,
      // avoid executing workspace fetches (these are professional/admin endpoints).
      const _saved = localStorage.getItem('user_session');
      const _parsed = _saved ? JSON.parse(_saved) : null;
      if (!explicitToken && !currentUser && !_parsed) {
        // anonymous context — do not call pro-only workspace endpoints
        return;
      }

      // Determine current role from state or persisted session
      const saved = _saved;
      const parsed = _parsed ? _parsed : null;
      const role = (currentUser && (currentUser as any).role) || (parsed && parsed.role) || null;

      // If the active session is a client, avoid calling professional-only endpoints that return 403.
      if (role === 'client') {
        // For clients, only fetch their own bookings (route that doesn't require professional role)
        try {
          const clientId = (currentUser && (currentUser as any).id) || (parsed && parsed.id) || null;
          if (clientId) {
            const bkgRes = await fetch(apiUrl(`/api/clients/${clientId}/bookings`), { headers: getAuthHeaders() });
            if (bkgRes.ok) setBookings(await bkgRes.json());
            try {
              const availRes = await fetch(apiUrl(`/api/salons/${salonId}/availability-blocks`), { headers: getAuthHeaders() });
              if (availRes.ok) {
                const av = await availRes.json();
                // Expect array of { data_hora_inicio, data_hora_fim }
                setAvailabilityBlocks(Array.isArray(av) ? av : []);
              }
                try {
                  const occRes = await fetch(apiUrl(`/api/salons/${salonId}/occupancy?date=${encodeURIComponent(selectedDate || "")}`), { headers: getAuthHeaders() });
                  if (occRes.ok) {
                    const occ = await occRes.json();
                    setOccupiedIntervals(Array.isArray(occ) ? occ : []);
                  }
                } catch (e) {
                  console.error("Error loading occupancy for client", e);
                }
            } catch (e) {
              console.error("Error loading availability blocks for client", e);
            }
          }
        } catch (e) {
          console.error('Error loading client bookings', e);
        }
        // Services and salon info should already be populated by fetchSalonBySlug; skip pro-only endpoints
        return;
      }

      // Prevent non-professional roles (e.g. admin) from executing professional-only workspace fetches
      // when no explicitToken is provided. Impersonation/explicit-token flows are preserved
      // because they use the explicitToken path above.
      if (role !== 'professional') {
        return;
      }

      // Non-client (professional/admin) default behavior: use authenticated headers
      const headers = getAuthHeaders();
      const [srvRes, , blkRes, cxRes, fnRes, cliRes] = await Promise.all([
        fetch(apiUrl(`/api/salons/${salonId}/services`), { headers }),
        syncBookings(salonId, headers),
        fetch(apiUrl(`/api/salons/${salonId}/blocks`), { headers }),
        fetch(apiUrl(`/api/salons/${salonId}/caixa`), { headers }),
        fetch(apiUrl(`/api/salons/${salonId}/finance-reports`), { headers }),
        fetch(apiUrl(`/api/salons/${salonId}/clients`), { headers })
      ]);

      if (srvRes.ok) setServices(await srvRes.json());
      if (blkRes.ok) setBlocks(await blkRes.json());
      if (cxRes.ok) setCaixaEntries(await cxRes.json());
      if (fnRes.ok) setFinanceStats(await fnRes.json());
      if (cliRes.ok) setClients(await cliRes.json());
    } catch (err) {
      console.error("Error loading workspace data", err);
    }
  };

  const reloadCurrentSalon = () => {
    if (selectedSalon) {
      loadSalonWorkspaceData(selectedSalon.id);
    }
    fetchSalons(); // refresh admin stats as well
  };

  // Trigger loading salon details when salon shifts
  useEffect(() => {
    if (!selectedSalon) return;

    // Prefer the persisted session in localStorage to avoid races
    const saved = localStorage.getItem("user_session");
    const parsed = saved ? JSON.parse(saved) : null;

    // If there is no persisted session or no accessToken, abort — avoids ghost requests
    if (!parsed || !parsed.accessToken) return;

    // Only professionals should use this explicit-token workspace loader.
    // Prevent clients from entering the explicit-token path here.
    if (parsed.role !== "professional") return;

    // If currently in admin backup mode (impersonation flow in progress), abort
    if (localStorage.getItem("admin_session_backup")) return;

    // Resolve salon id from session (professional session may carry salao or salao_id)
    const sessionSalonId = parsed.salao?.id || parsed.salao_id || parsed.id;
    if (!sessionSalonId) return;

    // Only load if the session's salon id matches the selected salon id
    if (sessionSalonId !== selectedSalon.id) return;

    // Use explicit token from persisted session to avoid ambiguous getAuthHeaders reads
    loadSalonWorkspaceData(selectedSalon.id, parsed.accessToken);
  }, [selectedSalon]);

  // ==========================================
  // CLIENT REGISTRATION & LOGIN
  // ==========================================

  const handleClientSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanCPF = signupCpf.replace(/\D/g, "");
    if (cleanCPF.length !== 11) {
      setErrorMessage("O CPF deve conter exatamente 11 dígitos.");
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setErrorMessage("O telefone deve conter entre 10 e 11 dígitos.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/clients/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salao_id: selectedSalon.id,
          nome: signupNome,
          telefone: signupPhone,
          cpf: signupCpf,
          senha: signupPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao realizar cadastro.");
      } else {
        setSuccessMessage("Cadastro realizado com sucesso!");
        handleSetUser(data.user);
        // Clear forms
        setSignupNome("");
        setSignupPhone("");
        setSignupCpf("");
        setSignupPassword("");
        setSignupConfirmPassword("");
      }
    } catch (err) {
      setErrorMessage("Erro de rede ao cadastrar.");
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "client",
          salao_id: selectedSalon.id,
          telefone: loginPhone,
          senha: loginPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao fazer login.");
      } else {
        // Persist accessToken together with user session for immediate usage
        const userWithToken = { ...(data.user as any), accessToken: data.accessToken } as SessionUser & { accessToken?: string };
        handleSetUser(userWithToken);
        setLoginPhone("");
        setLoginPassword("");
        setSuccessMessage(`Bem-vinda de volta, ${data.user.nome}!`);
      }
    } catch (err) {
      setErrorMessage("Erro de rede ao fazer login.");
    }
  };

  const handleVerifyRecoveryPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl("/api/clients/recovery/check-phone"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salao_id: selectedSalon.id,
          telefone: recoverPhone
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Cadastro não localizado. Verifique o número digitado.");
      } else {
        setClientRecoveryStep(2);
        setSuccessMessage("Cadastro localizado! Etapa 2: Informe os 4 últimos dígitos do seu CPF.");
      }
    } catch (err) {
      setErrorMessage("Erro de rede ao verificar cadastro.");
    }
  };

  const handleVerifyRecoveryCpf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl("/api/clients/verify-recovery"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salao_id: selectedSalon.id,
          telefone: recoverPhone,
          lastFourCpf: recoverLastFourCpf
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Não foi possível validar as informações informadas.");
      } else {
        setClientRecoveryStep(3);
        setSuccessMessage("Dados confirmados! Etapa 3: Defina sua nova senha.");
      }
    } catch (err) {
      setErrorMessage("Erro de rede ao verificar dados.");
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (recoverNewPassword !== recoverConfirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/clients/recover-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salao_id: selectedSalon.id,
          telefone: recoverPhone,
          lastFourCpf: recoverLastFourCpf,
          novaSenha: recoverNewPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao recuperar senha.");
      } else {
        setSuccessMessage("Senha redefinida com sucesso! Acesse sua conta agora.");
        setClientAuthForm("login"); // redirect to login
        setClientRecoveryStep(1);   // reset step
        setRecoverPhone("");
        setRecoverLastFourCpf("");
        setRecoverNewPassword("");
        setRecoverConfirmPassword("");
        setShowRecoveryModal(false);
      }
    } catch (err) {
      setErrorMessage("Erro de rede ao recuperar senha.");
    }
  };

  // ==========================================
  // PROFESSIONAL & ADMIN LOGIN
  // ==========================================

  const handleProfessionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl("/api/professional/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Falha nas credenciais.");
        setLoginPassword("");
      } else {
        setSelectedSalon(data.user.salao);
        // Persist accessToken together with user session for immediate usage
        const userWithToken = { ...(data.user as any), accessToken: data.accessToken } as SessionUser & { accessToken?: string };
        handleSetUser(userWithToken);
        setLoginEmail("");
        setLoginPassword("");
        setSuccessMessage("Painel profissional conectado!");
      }
    } catch (err) {
      setLoginPassword("");
      setErrorMessage("Erro ao conectar.");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "admin",
          email: loginEmail,
          senha: loginPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Credenciais de administrador inválidas.");
      } else {
        // Anexa o AccessToken ao objeto de sessão do usário (igual ao fluxo do profissional)
        const userWithToken = { ...(data.user as any), accessToken: data.accessToken } as SessionUser & { accessToken?: string };
        handleSetUser(userWithToken);
        setLoginEmail("");
        setLoginPassword("");
        setSuccessMessage("Bem-vindo ao painel master do sistema!");
        fetchSalons(userWithToken);
      }
    } catch (err) {
      setErrorMessage("Erro de rede.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("A imagem selecionada é muito grande. Escolha uma imagem de até 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setAdminProfileUrl(compressedBase64);
          setAdminProfileEmoji("👑"); // Reset emoji preference if user uploads a photo
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser || currentUser.role !== "admin") return;

    try {
      const response = await fetch(apiUrl("/api/admin/profile"), {
        method: "PUT",
        headers: getAuthHeaders("application/json"),
        body: JSON.stringify({
          email: currentUser.email,
          nome: adminProfileName,
          avatar_emoji: adminProfileEmoji,
          avatar_url: adminProfileUrl,
          telefone: adminProfilePhone,
          pergunta_seguranca: adminProfileQuestion,
          resposta_seguranca: adminProfileAnswer ? adminProfileAnswer : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao atualizar perfil do administrador.");
      } else {
        handleSetUser(data.user);
        setAdminProfileAnswer(""); // clear answer input after save
        setSuccessMessage("Perfil de Administrador Master atualizado com sucesso!");
        fetchSalons(data.user);
      }
    } catch (err) {
      setErrorMessage("Erro de conexão ao salvar perfil.");
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser || currentUser.role !== "admin") return;

    if (adminNewPassword !== adminConfirmPassword) {
      setErrorMessage("A nova senha e a confirmação não conferem.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/admin/change-password"), {
        method: "PUT",
        headers: getAuthHeaders("application/json"),
        body: JSON.stringify({
          email: currentUser.email,
          currentPassword: adminCurrentPassword,
          newPassword: adminNewPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao alterar a senha.");
      } else {
        setSuccessMessage("Senha do Administrador Master alterada com sucesso!");
        setAdminCurrentPassword("");
        setAdminNewPassword("");
        setAdminConfirmPassword("");
      }
    } catch (err) {
      setErrorMessage("Erro de conexão ao alterar a senha.");
    }
  };

  const handleRecoverPasswordStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!recoverEmail) {
      setErrorMessage("Por favor, digite o seu e-mail de administrador.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/admin/recover-question"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoverEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao buscar pergunta de segurança.");
      } else {
        setRecoverQuestion(data.pergunta_seguranca);
        setRecoverStep(2);
        setSuccessMessage("Pergunta de segurança localizada! Por favor, responda abaixo para redefinir a sua senha.");
      }
    } catch (err) {
      setErrorMessage("Erro ao conectar com o serviço de recuperação.");
    }
  };

  const handleRecoverPasswordStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (recoverAdminNewPassword !== recoverAdminConfirmPassword) {
      setErrorMessage("As senhas não conferem.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/admin/recover-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: recoverEmail,
          resposta_seguranca: recoverAnswer,
          newPassword: recoverAdminNewPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao redefinir a senha.");
      } else {
        setSuccessMessage(data.message || "Senha do Administrador Master redefinida com sucesso!");
        // Reset recovery form
        setShowRecoverModal(false);
        setRecoverEmail("");
        setRecoverStep(1);
        setRecoverQuestion("");
        setRecoverAnswer("");
        setRecoverAdminNewPassword("");
        setRecoverAdminConfirmPassword("");
      }
    } catch (err) {
      setErrorMessage("Erro ao conectar ao redefinir a senha.");
    }
  };

  // ==========================================
  // CLIENT PROFILE & CONFIG HANDLERS
  // ==========================================

  const handleClientProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("A imagem selecionada é muito grande. Escolha uma imagem de até 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setClientProfileUrl(compressedBase64);
          setClientProfileEmoji(""); // clear emoji preference when custom photo is uploaded
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateClientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser || currentUser.role !== "client") return;

    if (clientProfilePassword && clientProfilePassword !== clientProfileConfirmPassword) {
      setErrorMessage("A nova senha e a confirmação não conferem.");
      return;
    }

    setIsUpdatingClientProfile(true);

    try {
      const response = await fetch(apiUrl("/api/clients/profile"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: currentUser.id,
          nome: clientProfileName,
          telefone: clientProfilePhone,
          cpf: clientProfileCpf,
          avatar_emoji: clientProfileEmoji,
          avatar_url: clientProfileUrl,
          senha: clientProfilePassword || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao atualizar perfil do cliente.");
      } else {
        handleSetUser(data.user);
        setClientProfilePassword("");
        setClientProfileConfirmPassword("");
        setSuccessMessage("Seu perfil foi atualizado com sucesso!");
      }
    } catch (err) {
      setErrorMessage("Erro de conexão ao salvar perfil.");
    } finally {
      setIsUpdatingClientProfile(false);
    }
  };

  // ==========================================
  // PROFESSIONAL PROFILE & CONFIG HANDLERS
  // ==========================================

  const handleProProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setProProfileUrl(compressedBase64);
          setProProfileEmoji("💅"); // Reset emoji preference if user uploads a photo
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleServiceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width / height > MAX_WIDTH / MAX_HEIGHT) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
          setServiceFotoUrl(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser || currentUser.role !== "professional") return;

    try {
      const response = await fetch(apiUrl("/api/professional/profile"), {
        method: "PUT",
        headers: getAuthHeaders("application/json"),
        body: JSON.stringify({
          email: currentUser.email,
          nome: proProfileName,
          telefone: proProfilePhone,
          nomeSalao: proProfileSalonName,
          slugUrl: proProfileSlug,
          endereco: proProfileEndereco,
          avatar_emoji: proProfileEmoji,
          avatar_url: proProfileUrl,
          pergunta_seguranca: proProfileQuestion,
          resposta_seguranca: proProfileAnswer ? proProfileAnswer : undefined,
          descricao: proProfileDesc,
          hora_inicio_expediente: proProfileStartExpediente,
          hora_fim_expediente: proProfileEndExpediente,
          hora_inicio_almoco: proProfileHasAlmoco ? proProfileStartAlmoco : "",
          hora_fim_almoco: proProfileHasAlmoco ? proProfileEndAlmoco : ""
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao atualizar perfil do profissional.");
      } else {
        handleSetUser(data.user);
        setSelectedSalon(data.user.salao);
        setProProfileAnswer(""); // clear answer input after save
        setSuccessMessage("Perfil e informações do salão atualizados com sucesso!");
      }
    } catch (err) {
      setErrorMessage("Erro de conexão ao salvar perfil.");
    }
  };

  const handleChangeProPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser || currentUser.role !== "professional") return;

    if (proNewPassword !== proConfirmPassword) {
      setErrorMessage("A nova senha e a confirmação não conferem.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/professional/change-password"), {
        method: "PUT",
        headers: getAuthHeaders("application/json"),
        body: JSON.stringify({
          email: currentUser.email,
          currentPassword: proCurrentPassword,
          newPassword: proNewPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao alterar a senha.");
      } else {
        setSuccessMessage("Sua senha profissional foi alterada com sucesso!");
        setProCurrentPassword("");
        setProNewPassword("");
        setProConfirmPassword("");
      }
    } catch (err) {
      setErrorMessage("Erro de conexão ao alterar a senha.");
    }
  };

  const handleProRecoverPasswordStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!proRecoverEmail) {
      setErrorMessage("Por favor, digite o e-mail cadastrado do salão.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/professional/recover-question"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: proRecoverEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao buscar pergunta de segurança.");
      } else {
        setProRecoverQuestion(data.pergunta_seguranca);
        setProRecoverStep(2);
        setSuccessMessage("Pergunta de segurança localizada! Responda abaixo para redefinir a senha do seu salão.");
      }
    } catch (err) {
      setErrorMessage("Erro ao conectar com o serviço de recuperação.");
    }
  };

  const handleProRecoverPasswordStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (proRecoverNewPassword !== proRecoverConfirmPassword) {
      setErrorMessage("As senhas não conferem.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/professional/recover-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: proRecoverEmail,
          resposta_seguranca: proRecoverAnswer,
          newPassword: proRecoverNewPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao redefinir a senha.");
      } else {
        setSuccessMessage(data.message || "Senha redefinida com sucesso!");
        setShowProRecoverModal(false);
        setProRecoverEmail("");
        setProRecoverStep(1);
        setProRecoverQuestion("");
        setProRecoverAnswer("");
        setProRecoverNewPassword("");
        setProRecoverConfirmPassword("");
      }
    } catch (err) {
      setErrorMessage("Erro ao conectar ao redefinir a senha.");
    }
  };

  // ==========================================
  // SCHEDULING FLOW (CLIENTS & PROS)
  // ==========================================

  // Compute available slots for a given service and date. Optionally ignore a booking id (for rescheduling)
  const computeAvailableSlots = (serviceId?: string, date?: string, excludeBookingId?: string) => {
    if (!selectedSalon || !serviceId || !date) return [] as typeof availableSlots;

    const service = services.find((s) => s.id === serviceId);
    if (!service) return [] as typeof availableSlots;

    const [startH, startM] = (selectedSalon.hora_inicio_expediente || "08:00").split(":").map(Number);
    const [endH, endM] = (selectedSalon.hora_fim_expediente || "18:00").split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Check if lunch hours are configured
    let hasLunch = false;
    let lunchStartMin = 0;
    let lunchEndMin = 0;
    if (selectedSalon.hora_inicio_almoco && selectedSalon.hora_fim_almoco) {
      const [lStartH, lStartM] = selectedSalon.hora_inicio_almoco.split(":").map(Number);
      const [lEndH, lEndM] = selectedSalon.hora_fim_almoco.split(":").map(Number);
      lunchStartMin = lStartH * 60 + lStartM;
      lunchEndMin = lEndH * 60 + lEndM;
      hasLunch = true;
    }

    const intervalMin = 30;
    const generated: typeof availableSlots = [];

    // Local overlap helper
    const isConflict = (startIso: string, endIso: string) => {
      const rStart = new Date(startIso).getTime();
      const rEnd = new Date(endIso).getTime();

      // Check against bookings, optionally ignoring the booking being rescheduled
      const hasBookingConflict = bookings.some((b) => {
        if (b.status_atendimento === "cancelado") return false;
        if (excludeBookingId && b.id === excludeBookingId) return false;
        const bStart = new Date(b.data_hora_inicio).getTime();
        const bEnd = new Date(b.data_hora_fim).getTime();
        return rStart < bEnd && bStart < rEnd;
      });

      if (hasBookingConflict) return "Horário reservado";

      // Check against blocks
      const hasBlockConflict = blocks.some((b) => {
        const blStart = new Date(b.data_hora_inicio).getTime();
        const blEnd = new Date(b.data_hora_fim).getTime();
        return rStart < blEnd && blStart < rEnd;
      });

      if (hasBlockConflict) return "Bloqueio de agenda/pausa";

      // Also check sanitized availability blocks provided to clients
      const hasAvailBlockConflict = availabilityBlocks.some((b) => {
        const blStart = new Date(b.data_hora_inicio).getTime();
        const blEnd = new Date(b.data_hora_fim).getTime();
        return rStart < blEnd && blStart < rEnd;
      });

      if (hasAvailBlockConflict) return "Bloqueio de agenda/pausa";

      // Check occupancy (sanitized bookings without PII)
      const hasOccupancyConflict = occupiedIntervals.some((b) => {
        const obStart = new Date(b.data_hora_inicio).getTime();
        const obEnd = new Date(b.data_hora_fim).getTime();
        return rStart < obEnd && obStart < rEnd;
      });

      if (hasOccupancyConflict) return "Horário reservado";

      return null;
    };

    for (let min = startMinutes; min < endMinutes; min += intervalMin) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

      // Combine date input and hour to make real ISO timestamp
      const [year, month, day] = date.split("-").map(Number);
      const startDt = new Date(year, month - 1, day, h, m, 0, 0);
      const endDt = new Date(startDt.getTime() + service.duracao_estimada_minutos * 60 * 1000);

      const startIso = startDt.toISOString();
      const endIso = endDt.toISOString();

      // If the chosen date is today, skip slots that are already in the past
      const now = new Date();
      const isChosenDateToday = startDt.getFullYear() === now.getFullYear() && startDt.getMonth() === now.getMonth() && startDt.getDate() === now.getDate();
      if (isChosenDateToday && startDt.getTime() <= now.getTime()) {
        continue; // do not include past slots for today
      }

      const slotEndMin = min + service.duracao_estimada_minutos;

      let conflictReason: string | null = null;

      // 1. Check if slot exceeds closing hour
      if (slotEndMin > endMinutes) {
        conflictReason = "Excede fim do expediente";
      }

      // 2. Check if slot overlaps with lunch break
      if (!conflictReason && hasLunch) {
        if (min < lunchEndMin && lunchStartMin < slotEndMin) {
          conflictReason = "Horário de Almoço";
        }
      }

      // 3. Check regular conflicts (bookings & manual blocks)
      if (!conflictReason) {
        conflictReason = isConflict(startIso, endIso);
      }

      generated.push({
        time: timeStr,
        startIso,
        endIso,
        available: conflictReason === null,
        conflictReason
      });
    }

    return generated;
  };

  useEffect(() => {
    setAvailableSlots(computeAvailableSlots(selectedServiceId, selectedDate));
  }, [selectedServiceId, selectedDate, bookings, blocks, services, selectedSalon, occupiedIntervals]);

  // Refresh occupancy when relevant changes happen: salon, date, bookings (create/remake/cancel)
  useEffect(() => {
    if (!selectedSalon) return;
    const salonId = selectedSalon.id;
    const date = selectedDate;
    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/api/salons/${salonId}/occupancy${date ? `?date=${encodeURIComponent(date)}` : ""}`), { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setOccupiedIntervals(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Error fetching occupancy", e);
      }
    };
    load();
  }, [selectedSalon, selectedDate, bookings]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon || !currentUser) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedServiceId || !selectedDate || !selectedTime) {
      setErrorMessage("Por favor, selecione serviço, data e horário.");
      return;
    }

    const slot = availableSlots.find((s) => s.time === selectedTime);
    if (!slot || !slot.available) {
      setErrorMessage("O horário selecionado não está mais disponível.");
      return;
    }

      try {
      const response = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers: getAuthHeaders("application/json"),
        body: JSON.stringify({
          salao_id: selectedSalon.id,
          cliente_id: currentUser.id,
          servico_id: selectedServiceId,
          data_hora_inicio: slot.startIso,
          observacoes: bookingNotes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao salvar agendamento.");
      } else {
        setSuccessMessage("Horário agendado com sucesso! Aguardando atendimento.");
        // Atualiza imediatamente a lista de agendamentos no cliente
        try {
          setBookings((prev) => {
            // Prepend novo agendamento enriquecido retornado pelo servidor
            return [data as any, ...prev];
          });
        } catch (e) {
          // ignore
        }
        // reset scheduler
        setSelectedServiceId("");
        setSelectedDate("");
        setSelectedTime("");
        setBookingNotes("");
        reloadCurrentSalon();
        
        // Go back to history
        setCurrentView("history");
      }
    } catch (err) {
      setErrorMessage("Erro ao criar agendamento.");
    }
  };

  // ==========================================
  // PROFESSIONAL CORE ACTIONS
  // ==========================================

  // Book on behalf of a walk-in client (creates dummy or links pre-existing client)
  const [showWalkinForm, setShowWalkinForm] = useState(false);
  const [walkinClientName, setWalkinClientName] = useState("");
  const [walkinClientPhone, setWalkinClientPhone] = useState("");
  const [walkinClientId, setWalkinClientId] = useState<string | null>(null);
  const [walkinSuggestions, setWalkinSuggestions] = useState<Cliente[]>([]);
  const [isWalkinClientLocked, setIsWalkinClientLocked] = useState(false);

  const handleWalkinBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);

    if (!walkinClientName || !walkinClientPhone || !selectedServiceId || !selectedDate || !selectedTime) {
      setErrorMessage("Preencha todos os dados do cliente e o horário.");
      return;
    }

    try {
      const slot = availableSlots.find((s) => s.time === selectedTime);
      if (!slot) return;

      // Prepare payload. Prefer explicit cliente_id if selected via suggestions.
      const matched = clients.find(
        (c) => normalizePhone(c.telefone) === normalizePhone(walkinClientPhone)
      );

      const payload: any = {
        salao_id: selectedSalon.id,
        servico_id: selectedServiceId,
        data_hora_inicio: slot.startIso,
        observacoes: "Agendado presencialmente pela profissional."
      };

      if (walkinClientId) {
        payload.cliente_id = walkinClientId;
      } else if (matched) {
        payload.cliente_id = matched.id;
      } else {
        // If client not registered, send telefone (digits only) and name snapshot
        // so backend can store a guest snapshot on the booking (no client record creation).
        payload.telefone = walkinClientPhone.replace(/\D/g, "");
        payload.nome_cliente_avulso = walkinClientName;
      }

      const bookRes = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers: getAuthHeaders("application/json"),
        body: JSON.stringify(payload)
      });

      if (bookRes.ok) {
        setSuccessMessage("Agendamento presencial realizado!");
        setShowWalkinForm(false);
        setWalkinClientName("");
        setWalkinClientPhone("");
        setWalkinClientId(null);
        setWalkinSuggestions([]);
        setIsWalkinClientLocked(false);
        setSelectedServiceId("");
        setSelectedDate("");
        setSelectedTime("");
        reloadCurrentSalon();
      } else {
        const errData = await bookRes.json();
        setErrorMessage(errData.error || "Erro ao agendar.");
      }
    } catch (err) {
      setErrorMessage("Falha de comunicação.");
    }
  };

  const getAuthHeaders = (contentType = "application/json") => {
    const saved = localStorage.getItem("user_session");
    const parsedUser = saved ? JSON.parse(saved) : null;

    // Prefer in-memory `currentUser` (tab-local) to avoid blindly using a
    // token written by another tab. Fall back to persisted session only when
    // there is no in-memory session for this tab.
    const userToUse: SessionUser | null = currentUser || (!localSessionInvalidatedRef.current ? parsedUser : null);
    const headers: Record<string, string> = {};
    if (contentType) headers["Content-Type"] = contentType;

    if (userToUse && (userToUse as any).accessToken) {
      // If both persisted and in-memory sessions exist but disagree on id/role,
      // prefer `currentUser` to avoid sending a token that does not belong to
      // the visual identity of this tab.
      const token = currentUser && parsedUser && (currentUser.id !== parsedUser.id || currentUser.role !== parsedUser.role)
        ? currentUser.accessToken
        : (userToUse as any).accessToken;
      const payload = token ? decodeJwtPayload(token) : null;

      // Never attach a token whose declared identity differs from the user
      // represented by this tab/session.
      if (token && payload && payload.role === userToUse.role && payload.sub === userToUse.id) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  };

  const refetchProfessionalBookings = () => {
    const activeUser = currentUserRef.current;
    const activeSalon = selectedSalonRef.current;
    if (!activeUser || activeUser.role !== "professional" || !activeSalon) return;

    const expectedUserId = activeUser.id;
    const expectedSalonId = activeSalon.id;
    void syncBookings(expectedSalonId, getAuthHeaders(), () => {
      const latestUser = currentUserRef.current;
      const latestSalon = selectedSalonRef.current;
      return (
        latestUser?.role === "professional" &&
        latestUser.id === expectedUserId &&
        latestSalon?.id === expectedSalonId
      );
    });
  };

  useEffect(() => {
    if (currentView !== "agenda" || currentUser?.role !== "professional" || !selectedSalon) return;
    refetchProfessionalBookings();
  }, [currentView, currentUser?.id, currentUser?.role, selectedSalon?.id]);

  useEffect(() => {
    if (currentUser?.role !== "professional" || !selectedSalon) return;

    const intervalId = window.setInterval(() => {
      if (!document.hidden) refetchProfessionalBookings();
    }, 30_000);

    const handleVisibilityChange = () => {
      if (!document.hidden) refetchProfessionalBookings();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser?.id, currentUser?.role, selectedSalon?.id]);

  // Single-flight refresh control and global fetch wrapper
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const originalFetchRef = useRef<typeof fetch | null>(null);

  const decodeJwtPayload = (token: string): any | null => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      // base64url -> base64
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent((window.atob(b64).split("").map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`).join("")));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  };

  const doRefresh = async (): Promise<boolean> => {
    // If currently impersonating, do not attempt cookie-based refresh
    const saved = localStorage.getItem('user_session');
    const parsedSaved = saved ? JSON.parse(saved) : null;
    const activeUser = currentUserRef.current || (!localSessionInvalidatedRef.current ? parsedSaved : null);
    if (!activeUser) return false;
    if (activeUser && (activeUser as any).isImpersonated) {
      return false;
    }

    const expectedRole = activeUser ? activeUser.role : undefined;
    const expectedSub = activeUser ? activeUser.id : undefined;

    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    refreshPromiseRef.current = (async () => {
      try {
        const res = await (originalFetchRef.current || fetch)(apiUrl('/auth/refresh'), { method: 'POST', credentials: 'include' });
        if (!res.ok) return false;
        const js = await res.json();
        if (js && js.accessToken) {
          // Validate decoded payload to ensure the returned token belongs to
          // the expected session (role + sub). Do NOT validate signature here.
          const payload = decodeJwtPayload(js.accessToken);
          if (!payload) return false;

          if (expectedRole && payload.role !== expectedRole) {
            // Token mismatch: do not overwrite persisted session. Invalidate
            // current tab session only to enforce single-session invariant.
            invalidateLocalSession();
            return false;
          }
          if (expectedSub && payload.sub !== expectedSub) {
            invalidateLocalSession();
            return false;
          }

          const savedNow = localStorage.getItem('user_session');
          const parsed = savedNow ? JSON.parse(savedNow) : null;
          if (parsed) {
            // The global session may have changed while refresh was in flight.
            // Never write this tab's refreshed token into another identity.
            if (parsed.role !== expectedRole || parsed.id !== expectedSub) {
              invalidateLocalSession();
              return false;
            }
            parsed.accessToken = js.accessToken;
            // Persist updated session and update state
            localStorage.setItem('user_session', JSON.stringify(parsed));
            handleSetUser(parsed);
          } else {
            // The global session was removed while refresh was in flight.
            invalidateLocalSession();
            return false;
          }
          return true;
        }
        return false;
      } catch (e) {
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();
    return refreshPromiseRef.current;
  };

    useEffect(() => {
      // wrap window.fetch to handle 401 -> refresh -> retry (single-flight)
      const orig = (window as any).fetch;
      originalFetchRef.current = orig;
      (window as any).fetch = async (input: RequestInfo, init?: RequestInit) => {
        const resp = await orig(input, init);
        try {
          if (resp.status !== 401) return resp;
        } catch (e) {
          return resp;
        }

        // Avoid attempting refresh for refresh endpoint itself or auth login
        const url = typeof input === 'string' ? input : (input as Request).url || '';
        if (url.includes('/auth/refresh') || url.includes('/api/professional/login') || url.includes('/auth/login')) {
          return resp;
        }

        const refreshed = await doRefresh();
        if (!refreshed) {
          // Automatic refresh failure invalidates only this tab. It must not
          // remove a newer global session created by another tab.
          invalidateLocalSession();
          return resp;
        }

        // Retry original request once with updated Authorization header
        const newInit: RequestInit = { ...(init || {}) };
        const existingHeaders = (newInit.headers as Record<string, string>) || {};
        const merged = { ...(existingHeaders || {}), ...(getAuthHeaders((existingHeaders && existingHeaders['Content-Type']) ? existingHeaders['Content-Type'] : undefined)) };
        newInit.headers = merged;
        return await orig(input, newInit);
      };

      return () => {
        if (originalFetchRef.current) (window as any).fetch = originalFetchRef.current;
      };
    }, []);

  // Change status of a booking (confirm, complete, cancel)
  const handleUpdateBookingStatus = async (bookingId: string, status: "confirmado" | "concluido" | "cancelado") => {
    try {
      const response = await fetch(apiUrl(`/api/bookings/${bookingId}`), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status_atendimento: status })
      });

      if (response.ok) {
        setSuccessMessage(`Agendamento atualizado para: ${status}!`);
        reloadCurrentSalon();
      } else {
        setErrorMessage("Erro ao atualizar agendamento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manual payment registration
  const handleRegisterPayment = async (bookingId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/bookings/${bookingId}`), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status_financeiro: "pago" })
      });

      if (response.ok) {
        setSuccessMessage("Pagamento registrado! Entrada gerada no caixa.");
        reloadCurrentSalon();
      } else {
        setErrorMessage("Erro ao registrar pagamento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Rescheduling handlers
  const handleOpenReschedule = (booking: Agendamento) => {
    try {
      const d = new Date(booking.data_hora_inicio);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      const hour = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      const timeStr = `${hour}:${min}`;
      
      setRescheduleDate(dateStr);
      setRescheduleTime(timeStr);
      setReschedulingBooking(booking);
    } catch (err) {
      console.error("Error parsing booking date: ", err);
    }
  };

  const openHistoryFor = (booking: Agendamento) => {
    setHistoryItems(booking.remarcacoes || []);
    setHistoryOpen(true);
  };

  const handleSaveReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingBooking) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingReschedule(true);

    try {
      if (!rescheduleTime) {
        setErrorMessage("Selecione um horário para remarcar.");
        setIsSavingReschedule(false);
        return;
      }
      const [year, month, day] = rescheduleDate.split("-").map(Number);
      const [hour, min] = rescheduleTime.split(":").map(Number);
      const startDt = new Date(year, month - 1, day, hour, min, 0, 0);
      const combinedIso = startDt.toISOString();

      const response = await fetch(apiUrl(`/api/bookings/${reschedulingBooking.id}`), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ data_hora_inicio: combinedIso })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erro ao remarcar agendamento.");
      } else {
        setSuccessMessage("Agendamento remarcado com sucesso!");
        setReschedulingBooking(null);
        reloadCurrentSalon();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Erro de comunicação com o servidor.");
    } finally {
      setIsSavingReschedule(false);
    }
  };

  // --- SERVICE CREATION / EDITING ---

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);

    const payload = {
      salao_id: selectedSalon.id,
      nome: serviceName,
      preco: Number(servicePrice),
      duracao_estimada_minutos: Number(serviceDuration),
      foto_url: serviceFotoUrl
    };

    try {
      let res;
      if (editingService) {
        res = await fetch(apiUrl(`/api/services/${editingService.id}`), {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(apiUrl("/api/services"), {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setSuccessMessage(editingService ? "Serviço editado com sucesso!" : "Serviço criado com sucesso!");
        setServiceName("");
        setServicePrice("");
        setServiceDuration("30");
        setServiceFotoUrl("");
        setEditingService(null);
        setShowServiceForm(false);
        reloadCurrentSalon();
      } else {
        setErrorMessage("Erro ao salvar serviço.");
      }
    } catch (err) {
      setErrorMessage("Erro de comunicação.");
    }
  };

  const handleToggleServiceActive = async (service: Servico) => {
    try {
      const res = await fetch(apiUrl(`/api/services/${service.id}`), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ativo: !service.ativo })
      });
      if (res.ok) {
        setSuccessMessage("Status do serviço modificado!");
        reloadCurrentSalon();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- AGENDA BLOCKING ---

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);

    if (!blockDate || !blockStartTime || !blockEndTime || !blockDescription) {
      setErrorMessage("Preencha todos os campos do bloqueio.");
      return;
    }

    // Compose ISO range
    const [year, month, day] = blockDate.split("-").map(Number);
    const [sh, sm] = blockStartTime.split(":").map(Number);
    const [eh, em] = blockEndTime.split(":").map(Number);

    const startIso = new Date(year, month - 1, day, sh, sm).toISOString();
    const endIso = new Date(year, month - 1, day, eh, em).toISOString();

    try {
      const res = await fetch(apiUrl("/api/blocks"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          salao_id: selectedSalon.id,
          data_hora_inicio: startIso,
          data_hora_fim: endIso,
          tipo: blockType,
          descricao: blockDescription
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Horário bloqueado com sucesso!");
        setBlockDate("");
        setBlockStartTime("12:00");
        setBlockEndTime("13:00");
        setBlockDescription("");
        setShowBlockForm(false);
        reloadCurrentSalon();
      } else {
        setErrorMessage(data.error || "Erro ao registrar bloqueio de agenda.");
      }
    } catch (err) {
      setErrorMessage("Erro de conexão.");
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/blocks/${blockId}`), {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setSuccessMessage("Bloqueio removido.");
        reloadCurrentSalon();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- MANUAL CASH FLOW ENTRY ---

  const handleCreateManualCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setErrorMessage(null);
    // Now handled by unified 'Registrar Movimentação' form; keep backward compatibility: map old inputs
    const payload: any = {
      salao_id: selectedSalon.id,
      valor: Number(manualCashVal || movValor),
      descricao: manualCashDesc || movDescricao
    };

    // If estorno was created for a booking, include the agendamento_id
    if (selectedEstornoAgId) payload.agendamento_id = selectedEstornoAgId;

    // If newer fields were used, include them
    if (movTipo) payload.tipo_movimentacao = movTipo;
    // Origem definida automaticamente para lançamentos via UI
    payload.origem = "Manual";
    if (movFormaPagamento) payload.forma_pagamento = movFormaPagamento;
    if (movMotivo) payload.motivo = movMotivo;
    if (movObservacao) payload.observacao = movObservacao;
    if (movReferencia) payload.referencia = movReferencia;

    try {
      const res = await fetch(apiUrl("/api/caixa"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMessage("Movimentação registrada no caixa!");
        // reset both legacy and new form fields
        setManualCashVal("");
        setManualCashDesc("");
        setMovValor("");
        setMovDescricao("");
        setMovTipo("Entrada");
        setMovFormaPagamento("");
        setMovMotivo("");
        setMovObservacao("");
        setMovReferencia("");
        setSelectedEstornoAgId(null);
        reloadCurrentSalon();
      } else {
        const data = await res.json().catch(() => null);
        setErrorMessage((data && data.error) || "Erro ao salvar movimentação de caixa.");
      }
    } catch (err) {
      setErrorMessage("Erro de rede.");
    }
  };

  // Compute eligible bookings for estorno selection
  const eligibleEstornoBookings = (selectedSalon
    ? bookings.filter((b) =>
        b.salao_id === selectedSalon.id &&
        b.status_atendimento === "cancelado" &&
        b.status_financeiro === "pago" &&
        caixaEntries.some((c) => c.agendamento_id === b.id) &&
        !caixaEntries.some((c) => c.tipo_movimentacao === "Estorno" && c.agendamento_id === b.id)
      )
    : []);

  useEffect(() => {
    // Clear selection when switching away from Estorno type
    if (movTipo !== "Estorno") setSelectedEstornoAgId(null);
  }, [movTipo]);

  // ==========================================
  // SYSTEM ADMIN MASTER ACTIONS
  // ==========================================

  const handleEditSalonInit = (salon: Salon) => {
    setEditingSalonId(salon.id);
    setAdminSalonNome(salon.nome);
    setAdminSalonDono(salon.dono);
    setAdminSalonPhone(salon.telefone);
    setAdminSalonSlug(salon.slug_url);
    setAdminSalonEndereco(salon.endereco || "");
    setAdminSalonAtivo(salon.ativo !== false);
    setShowAdminSalonForm(true);
  };

  const handleCancelAdminForm = () => {
    setEditingSalonId(null);
    setAdminSalonNome("");
    setAdminSalonDono("");
    setAdminSalonPhone("");
    setAdminSalonSlug("");
    setAdminSalonEndereco("");
    setAdminSalonAtivo(true);
    setShowAdminSalonForm(false);
  };

  const handleAdminCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser || currentUser.role !== "admin") return;

    if (!adminSalonNome || !adminSalonDono || !adminSalonPhone || !adminSalonSlug) {
      setErrorMessage("Preencha todos os campos do salão.");
      return;
    }

    const cleanSlug = adminSalonSlug.toLowerCase().trim().replace(/\s+/g, "-");

    try {
      const url = editingSalonId ? `/api/admin/salons/${editingSalonId}` : "/api/admin/salons";
      const method = editingSalonId ? "PUT" : "POST";

      const res = await fetch(apiUrl(url), {
        method,
        headers: getAuthHeaders("application/json"),
        body: JSON.stringify({
          nome: adminSalonNome,
          dono: adminSalonDono,
          telefone: adminSalonPhone,
          slug_url: cleanSlug,
          endereco: adminSalonEndereco,
          ativo: adminSalonAtivo
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(
          editingSalonId 
            ? `Salão "${data.nome}" atualizado com sucesso!` 
            : `Salão "${data.nome}" criado com sucesso! E-mail de acesso: "${data.email}" / Senha padrão: "senha"`
        );
        handleCancelAdminForm();
        fetchSalons(currentUser);
        fetchPublicSalons();
      } else {
        setErrorMessage(data.error || "Erro ao processar requisição do salão.");
      }
    } catch (err) {
      setErrorMessage("Erro ao conectar ao servidor.");
    }
  };

  const handleAdminDeleteSalon = (salonId: string, name: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    setSalonToDelete({ id: salonId, nome: name });
  };

  const executeAdminDeleteSalon = async () => {
    if (!currentUser || currentUser.role !== "admin" || !salonToDelete) return;

    try {
      const res = await fetch(apiUrl(`/api/admin/salons/${salonToDelete.id}`), {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || "Salão excluído com sucesso.");
        fetchSalons(currentUser);
        fetchPublicSalons();
      } else {
        setErrorMessage(data.error || "Erro ao excluir salão.");
      }
    } catch (err) {
      setErrorMessage("Erro de rede ao tentar excluir salão.");
    } finally {
      setSalonToDelete(null);
    }
  };

  // Bypass login for developer/admin convenience to access any salon workspace
  const handleAdminImpersonate = async (salon: Salon) => {
    try {
      if (currentUser && currentUser.role === "admin") {
        localStorage.setItem("admin_session_backup", JSON.stringify(currentUser));
      }


      const res = await fetch(apiUrl(`/api/admin/impersonate/${salon.id}`), {
        method: "POST",
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || "Falha ao iniciar impersonation.");
        return;
      }

      const js = await res.json();
      if (!js || !js.accessToken || !js.user) {
        setErrorMessage("Resposta de impersonation inválida.");
        return;
      }

      const impersonatedUser: SessionUser = {
        id: js.user.id,
        nome: js.user.nome || salon.dono,
        email: js.user.email || `dono@${salon.slug_url}.com`,
        role: "professional",
        salao_id: salon.id,
        salao: salon,
        accessToken: js.accessToken,
        isImpersonated: true
      };

      // Persist session first, then update state and UI to avoid race with getAuthHeaders
      localStorage.setItem("user_session", JSON.stringify(impersonatedUser));
      setCurrentUser(impersonatedUser);
      // Carrega os dados do salão explicitamente usando o token de impersonation
      await loadSalonWorkspaceData(salon.id, js.accessToken);
      // Agora atualize seleção e view apenas após os dados estarem carregados
      setSelectedSalon(salon);

      // Marcar que acabamos de executar a impersonation nesta sessão/execução
      // para evitar que o handleRouting() recém-disparado pelo hashchange
      // tente restaurar novamente (causando load duplicado). O ref é apenas
      // em memória e não persiste através de reloads — portanto não bloqueia
      // a restauração no caso de F5 (boot).
      justImpersonatedRef.current = true;

      // Normalizar a URL para o portal profissional e atualizar o modo visual.
      // Posicionar esta mudança DEPOIS do load explícito e do setSelectedSalon
      // evita races e chamadas duplicadas ao loader.
      window.location.hash = "#pro";
      setPortalMode("salon");

      setSuccessMessage(`Acessando ambiente isolado: ${salon.nome}`);
      setCurrentView("dashboard");
    } catch (err) {
      console.error(err);
      setErrorMessage("Erro de rede ao iniciar impersonation.");
    }
  };

  const handleReturnToAdmin = () => {
    const backup = localStorage.getItem("admin_session_backup");
    setPortalMode("admin");
    window.location.hash = "#admin";
    if (backup) {
      try {
        const adminUser = JSON.parse(backup);
        setSelectedSalon(null);
        setCurrentUser(adminUser);
        localStorage.setItem("user_session", JSON.stringify(adminUser));
        localStorage.removeItem("admin_session_backup");
        setSuccessMessage("Retornou ao Painel Master Admin com sucesso!");
        setCurrentView("dashboard");
        fetchSalons(adminUser);
      } catch (e) {
        // Fallback below
      }
    } else {
      setSelectedSalon(null);
      const adminUser: SessionUser = {
        id: "admin",
        nome: "Master Admin",
        email: "admin@salao.com",
        role: "admin"
      };
      setCurrentUser(adminUser);
      localStorage.setItem("user_session", JSON.stringify(adminUser));
      setSuccessMessage("Retornou ao Painel Master Admin.");
      setCurrentView("dashboard");
      fetchSalons(adminUser);
    }
  };

  // ==========================================
  // VIEW RENDER CORNER
  // ==========================================

  // Clear alerts after 4 seconds
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
        setSuccessMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const copySalonLink = (slug: string) => {
    if (!slug) return;
    const link = window.location.origin + "/#" + slug;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => setSuccessMessage("Link de agendamento copiado com sucesso."), () => setErrorMessage("Falha ao copiar o link."));
    } else {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setSuccessMessage("Link de agendamento copiado com sucesso.");
      } catch (e) {
        setErrorMessage("Falha ao copiar o link.");
      }
      ta.remove();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluido": return "bg-green-100 text-green-800";
      case "confirmado": return "bg-blue-100 text-blue-800";
      case "pendente": return "bg-amber-100 text-amber-800";
      case "cancelado": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredSalons = (adminStats.saloes || []).filter((salon) => {
    const query = adminSalonSearch.toLowerCase().trim();
    return (
      salon.nome.toLowerCase().includes(query) ||
      salon.dono.toLowerCase().includes(query) ||
      (salon.endereco || "").toLowerCase().includes(query) ||
      salon.slug_url.toLowerCase().includes(query) ||
      salon.telefone.toLowerCase().includes(query)
    );
  });

  const isSalonInactiveForCurrentUser = 
    selectedSalon && 
    selectedSalon.ativo === false && 
    (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "professional"));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* ==========================================
          TOP BRAND BAR
         ========================================== */}
      {!(portalMode === "client" && !currentUser) && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer" 
              onClick={() => navigateToPortal("directory")}
            >
              <div className="bg-pink-600 text-white p-2.5 rounded-xl shadow-md shadow-pink-100">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                {portalMode === "admin" ? (
                  <>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center">
                      Painel Master
                      <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full ml-1.5 font-bold">ADMIN</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">Gestão Geral da Plataforma</p>
                  </>
                ) : portalMode === "salon" ? (
                  <>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center">
                      {selectedSalon ? selectedSalon.nome : "Portal do Salão"}
                      <span className="text-[10px] bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded-full ml-1.5 font-bold">PRO</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">Gestão do Estabelecimento</p>
                  </>
                ) : portalMode === "client" && selectedSalon ? (
                  <>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center">
                      {selectedSalon.nome}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">Área do Cliente</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight">
                      StudioFlow
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">Plataforma de Beleza & Estética</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {portalMode !== "directory" && currentUser?.role === "admin" && (
                <button
                  onClick={() => navigateToPortal("directory")}
                  className="flex items-center space-x-1 text-xs text-slate-700 hover:text-pink-600 font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
                >
                  <Search className="h-3.5 w-3.5 text-pink-600" />
                  <span>Ver Diretório</span>
                </button>
              )}

              {currentUser ? (
                <div className="flex items-center space-x-3">
                  {portalMode === "directory" && currentUser.role === "professional" && (
                    <button
                      onClick={() => navigateToPortal("salon")}
                      className="text-xs text-white bg-pink-600 hover:bg-pink-700 font-bold px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-sm cursor-pointer mr-1 animate-fade-in"
                    >
                      <span>Ir para o Painel</span>
                    </button>
                  )}
                  {portalMode === "directory" && currentUser.role === "admin" && (
                    <button
                      onClick={() => navigateToPortal("admin")}
                      className="text-xs text-white bg-pink-600 hover:bg-pink-700 font-bold px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-sm cursor-pointer mr-1 animate-fade-in"
                    >
                      <Shield className="h-3 w-3" />
                      <span>Painel Master</span>
                    </button>
                  )}
                  {(currentUser.isImpersonated || localStorage.getItem("admin_session_backup")) && (
                    <button
                      onClick={handleReturnToAdmin}
                      className="flex items-center space-x-1.5 text-xs text-white bg-pink-600 hover:bg-pink-700 font-bold px-3 py-1.5 rounded-lg transition shadow-sm cursor-pointer mr-1"
                      title="Voltar ao Painel Master Admin"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      <span>Voltar Admin</span>
                    </button>
                  )}
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-sm shadow-sm overflow-hidden shrink-0">
                      {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{currentUser.avatar_emoji || (currentUser.role === "admin" ? "👑" : currentUser.role === "professional" ? "💅" : "👤")}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-800">{currentUser.nome || currentUser.email}</p>
                      <p className="text-[10px] capitalize font-semibold bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md inline-block">
                        {currentUser.role === "professional" ? "💅 Profissional" : currentUser.role === "admin" ? "👑 Master Admin" : "👤 Cliente"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSetUser(null)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Sair"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {portalMode === "directory" && (
                    <>
                      <button
                        onClick={() => navigateToPortal("salon")}
                        className="text-xs text-slate-700 hover:text-pink-600 font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition hover:bg-pink-50 hover:border-pink-200"
                      >
                        Portal do Salão
                      </button>
                      <button
                        onClick={() => navigateToPortal("admin")}
                        className="text-xs text-white hover:bg-pink-700 font-bold bg-pink-600 px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-sm"
                      >
                        <Shield className="h-3 w-3" />
                        <span>Área Admin</span>
                      </button>
                    </>
                  )}
                  {portalMode === "salon" && (
                    <span className="text-xs text-slate-400 italic">StudioFlow</span>
                  )}
                  {portalMode === "admin" && (
                    <span className="text-xs text-slate-400 italic">Portal Administrativo Master</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ==========================================
          NOTIFICATION TOASTS
         ========================================== */}
      <div className="max-w-md mx-auto w-full px-4 mt-4 absolute top-16 left-1/2 -translate-x-1/2 z-50">
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-lg flex items-start space-x-3 animate-fade-in">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Atenção</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-lg flex items-start space-x-3 animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">Sucesso</p>
              <p className="text-xs text-green-700 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          MAIN AREA CONTENT
         ========================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-6 flex flex-col">
        
        {/* ==========================================
            VIEW 0: NO WORKSPACE / LANDING / SALON SELECTOR
           ========================================== */}
        {!selectedSalon && (!currentUser || currentUser.role !== "admin" || portalMode === "directory") && (
          <div className="flex-1 flex flex-col justify-center py-6 sm:py-10 animate-fade-in">
            <div className="max-w-4xl mx-auto w-full space-y-8">
              
              {/* ==================== 1. DIRECTORY MODE ==================== */}
              {portalMode === "directory" && (
                currentUser && currentUser.role === "admin" ? (
                  <div className="space-y-8">
                    <div className="text-center space-y-3">
                      <span className="bg-pink-50 text-pink-700 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                        ✨ Encontre seu Salão de Beleza
                      </span>
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Diretório StudioFlow
                      </h2>
                      <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
                        Pesquise e agende horários diretamente nos melhores estabelecimentos de estética, unhas, sobrancelhas e cabelos da sua região.
                      </p>
                    </div>

                    {/* Search Bar */}
                    <div className="max-w-md mx-auto relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar por nome do salão ou descrição..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full text-sm border border-slate-200 bg-white shadow-sm rounded-2xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                      />
                    </div>

                    {/* Salons Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {publicSalons.filter(salon => {
                        const query = clientSearch.toLowerCase().trim();
                        if (!query) return true;
                        return salon.nome.toLowerCase().includes(query) ||
                               (salon.descricao && salon.descricao.toLowerCase().includes(query)) ||
                               salon.dono.toLowerCase().includes(query);
                      }).length === 0 ? (
                        <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-sm">
                          <div className="text-4xl">💅</div>
                          <h3 className="text-base font-bold text-slate-800">Nenhum salão encontrado</h3>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            Tente digitar outro termo ou verifique se o salão desejado foi cadastrado corretamente.
                          </p>
                        </div>
                      ) : (
                        publicSalons.filter(salon => {
                          const query = clientSearch.toLowerCase().trim();
                          if (!query) return true;
                          return salon.nome.toLowerCase().includes(query) ||
                                 (salon.descricao && salon.descricao.toLowerCase().includes(query)) ||
                                 salon.dono.toLowerCase().includes(query);
                        }).map((salon) => (
                          <div
                            key={salon.id}
                            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-pink-300 hover:shadow-md transition duration-300"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-2xl shadow-inner shrink-0 overflow-hidden">
                                  {salon.avatar_url ? (
                                    <img src={salon.avatar_url} alt={salon.nome} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{salon.avatar_emoji || "💅"}</span>
                                  )}
                                </div>
                                <div className="overflow-hidden">
                                  <h3 className="text-base font-bold text-slate-900 truncate">{salon.nome}</h3>
                                  <p className="text-[11px] text-pink-600 font-semibold tracking-wide truncate">Proprietária: {salon.dono}</p>
                                </div>
                              </div>

                              {salon.descricao ? (
                                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                  {salon.descricao}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  Sem descrição cadastrada no momento.
                                </p>
                              )}

                              <div className="pt-2 flex items-center text-[11px] text-slate-400 font-medium">
                                <Phone className="h-3.5 w-3.5 mr-1 text-slate-300 shrink-0" />
                                <span className="truncate">{salon.telefone}</span>
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100">
                              <button
                                onClick={() => navigateToPortal("client", salon.slug_url)}
                                className="w-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                              >
                                <span>Acessar Salão & Agendar</span>
                                <Scissors className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Dev / Review Accounts Tip */}
                    <div className="mt-12 bg-slate-100 border border-slate-200 rounded-2xl p-5 text-center max-w-xl mx-auto">
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        💡 <strong>Credenciais de Teste / Desenvolvimento:</strong><br />
                        <span className="text-[11px] block mt-1.5 text-slate-600">
                          Profissional Bella: <code className="bg-white text-pink-700 px-1 py-0.5 rounded font-mono border border-slate-200">dono@bella.com</code> / senha: <code className="bg-white text-pink-700 px-1 py-0.5 rounded font-mono border border-slate-200">senha</code>
                        </span>
                        <span className="text-[11px] block mt-1 text-slate-600">
                          Profissional Glamour: <code className="bg-white text-pink-700 px-1 py-0.5 rounded font-mono border border-slate-200">dono@glamour.com</code> / senha: <code className="bg-white text-pink-700 px-1 py-0.5 rounded font-mono border border-slate-200">senha</code>
                        </span>
                        <span className="text-[11px] block mt-1 text-slate-600">
                          Admin Master Geral: <code className="bg-white text-pink-700 px-1 py-0.5 rounded font-mono border border-slate-200">admin@salao.com</code> / senha: <code className="bg-white text-pink-700 px-1 py-0.5 rounded font-mono border border-slate-200">admin123</code>
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto w-full flex flex-col justify-center items-center space-y-3 text-center py-3 sm:py-4 animate-fade-in transform lg:-translate-y-10">
                    <div className="relative w-14 h-14 rounded-full bg-pink-50 border-2 border-pink-100 flex items-center justify-center text-2xl shadow-md mx-auto">
                      🔒
                    </div>

                    <div className="space-y-1.5">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        Plataforma Privada
                      </h2>
                      <span className="bg-pink-50 text-pink-700 text-[10px] px-3 py-1 rounded-full font-extrabold uppercase tracking-wider inline-block">
                        StudioFlow
                      </span>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                        O StudioFlow é um ecossistema privativo de agendamento online.
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                        Para visualizar serviços, valores e agendar horários, <strong>utilize o link direto exclusivo</strong> compartilhado pelo seu profissional ou salão de beleza no WhatsApp.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-sm space-y-2 text-left mt-2 w-full">
                      <h3 className="text-xs font-bold text-slate-800 text-center border-b border-slate-100 pb-1">
                        Acesso Restrito
                      </h3>
                      <button
                        onClick={() => navigateToPortal("salon")}
                        className="w-full bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <span>💅 Portal do Salão (Profissionais)</span>
                      </button>
                      <button
                        onClick={() => navigateToPortal("admin")}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <span>👑 Área Administrativa (Master)</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* ==================== 2. PROFESSIONAL PORTAL LOGIN ==================== */}
              {portalMode === "salon" && (!(currentUser && currentUser.role === "professional")) && (
                <div className="max-w-md mx-auto w-full space-y-4">
                  <div className="text-center space-y-2">
                    <span className="bg-pink-50 text-pink-700 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                      💅 Área Profissional
                    </span>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      Portal do Salão
                    </h2>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Acesse a administração exclusiva do seu estabelecimento para gerenciar sua agenda, <br/>equipe e caixa.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <form onSubmit={handleProfessionalLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail Profissional</label>
                        <input
                          type="email"
                          required
                          placeholder="Ex: dono@bella.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Senha de Acesso</label>
                        <input
                          type="password"
                          required
                          placeholder="Sua senha secreta"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-xl transition shadow-sm mt-2 cursor-pointer"
                      >
                        Entrar no Painel do Salão
                      </button>
                    </form>

                    <div className="text-center border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setProRecoverStep(1);
                          setProRecoverEmail(loginEmail || "");
                          setShowProRecoverModal(true);
                        }}
                        className="text-xs text-pink-600 hover:text-pink-700 hover:underline font-semibold"
                      >
                        Esqueceu a senha do seu Salão?
                      </button>
                    </div>
                  </div>

                  {currentUser?.role === "admin" && (
                    <div className="text-center">
                      <button
                        onClick={() => navigateToPortal("directory")}
                        className="text-xs text-slate-500 hover:text-pink-600 font-semibold flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Voltar ao Diretório Principal</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ==================== 3. ADMIN PORTAL LOGIN ==================== */}
              {portalMode === "admin" && (
                <div className="max-w-md mx-auto w-full space-y-6">
                  <div className="text-center space-y-2">
                    <span className="bg-red-50 text-red-700 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                      👑 Área Administrativa (Master)
                    </span>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      Console Master Admin
                    </h2>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Acesso corporativo exclusivo para o dono da plataforma gerenciar salões e faturamento global.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail Administrativo</label>
                        <input
                          type="email"
                          required
                          placeholder="Ex: admin@salao.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Master</label>
                        <input
                          type="password"
                          required
                          placeholder="Sua senha secreta"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-xl transition shadow-sm mt-2 cursor-pointer"
                      >
                        Acessar Painel Corporativo
                      </button>
                    </form>

                    <div className="text-center border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoverStep(1);
                          setRecoverEmail(loginEmail || "");
                          setShowRecoverModal(true);
                        }}
                        className="text-xs text-pink-600 hover:text-pink-700 hover:underline font-semibold"
                      >
                        Esqueceu a senha Master do Sistema?
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => navigateToPortal("directory")}
                      className="text-xs text-slate-500 hover:text-pink-600 font-semibold flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Voltar ao Diretório Principal</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==========================================
            VIEW 1: SYSTEM ADMIN CONSOLE
           ========================================== */}
        {currentUser && currentUser.role === "admin" && portalMode === "admin" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <Shield className="h-6 w-6 text-pink-600 mr-2" />
                  Painel Administrativo Master (Dono do Sistema)
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Visão consolidada e controle de todos os salões ativos.</p>
              </div>
              {adminActiveTab === "dashboard" && (
                <button
                  onClick={() => setShowAdminSalonForm(!showAdminSalonForm)}
                  className="mt-3 sm:mt-0 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Novo Salão</span>
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 pb-2 space-x-2">
              <button
                onClick={() => setAdminActiveTab("dashboard")}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 ${adminActiveTab === "dashboard" ? "bg-pink-600 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Salões e Métricas</span>
              </button>
              <button
                onClick={() => setAdminActiveTab("profile")}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 ${adminActiveTab === "profile" ? "bg-pink-600 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
              >
                <User className="h-4 w-4" />
                <span>Meu Perfil & Configurações</span>
              </button>
              <button
                onClick={() => navigateToPortal("directory")}
                className="text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 bg-pink-50 border border-pink-100 text-pink-700 hover:bg-pink-100 cursor-pointer ml-auto"
              >
                <Search className="h-4 w-4" />
                <span>Visualizar Diretório Geral 🔎</span>
              </button>
            </div>

            {adminActiveTab === "dashboard" && (
              <>

            {/* Quick stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 font-medium text-xs">Total de Salões</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{adminStats.stats.salonsCount}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 font-medium text-xs">Clientes Ativos</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{adminStats.stats.clientsCount}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 font-medium text-xs">Agendamentos Totais</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{adminStats.stats.totalSchedules}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 font-medium text-xs">Faturamento do Ecossistema</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(adminStats.stats.totalRevenue)}</div>
              </div>
            </div>

            {/* Admin Create Salon Modal/Form */}
            {showAdminSalonForm && (
              <div className="bg-white border border-pink-100 rounded-2xl p-6 shadow-md max-w-xl">
                <h3 className="text-sm font-bold text-slate-950 mb-4 flex items-center">
                  <Scissors className="h-4 w-4 text-pink-600 mr-1.5" />
                  {editingSalonId ? "Editar Salão de Beleza / Workspace" : "Cadastrar Salão de Beleza / Profissional"}
                </h3>
                <form onSubmit={handleAdminCreateSalon} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Salão/Workspace</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Studio VIP Sobrancelhas"
                      value={adminSalonNome}
                      onChange={(e) => setAdminSalonNome(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Dono (Profissional)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Gabriela Souza"
                      value={adminSalonDono}
                      onChange={(e) => setAdminSalonDono(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Comercial</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: (11) 98888-7777"
                      value={adminSalonPhone}
                      onChange={(e) => setAdminSalonPhone(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Link de Agendamento (Identificador Único)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Ex: studio-vip (letras minusculas)"
                        value={adminSalonSlug}
                        onChange={(e) => setAdminSalonSlug(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none"
                      />
                      <button type="button" onClick={() => copySalonLink(adminSalonSlug)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
                        📋 Copiar Link
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço do Salão/Workspace</label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Paulista, 1000, Sala 102 - Bela Vista, São Paulo"
                      value={adminSalonEndereco}
                      onChange={(e) => setAdminSalonEndereco(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center space-x-2 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <input
                      type="checkbox"
                      id="adminSalonAtivo"
                      checked={adminSalonAtivo}
                      onChange={(e) => setAdminSalonAtivo(e.target.checked)}
                      className="rounded text-pink-600 focus:ring-pink-500 h-4 w-4 border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="adminSalonAtivo" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                      Salão Ativo (Clientes podem ver e agendar serviços publicamente)
                    </label>
                  </div>
                  <div className="sm:col-span-2 pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={handleCancelAdminForm}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition"
                    >
                      {editingSalonId ? "Salvar Alterações" : "Criar Salão"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Salons list & Direct entry */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Salões Cadastrados no Sistema</h3>
                <span className="text-xs text-slate-400 font-mono">Controle Técnico Direto</span>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Pesquisar salões por nome, dono, telefone ou link de agendamento..."
                    value={adminSalonSearch}
                    onChange={(e) => setAdminSalonSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-4 py-2 border border-slate-200 rounded-xl outline-none bg-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
                {adminSalonSearch.trim() !== "" && (
                  <span className="text-xs text-slate-500">
                    Mostrando {filteredSalons.length} de {adminStats.saloes.length} salões
                  </span>
                )}
              </div>
              
              {/* Desktop view (Table) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold">
                      <th className="p-4">Salão / Workspace</th>
                      <th className="p-4">Profissional Responsável</th>
                      <th className="p-4">Link de Agendamento</th>
                      <th className="p-4">Telefone</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Criado Em</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                    {filteredSalons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Nenhum salão encontrado correspondente à pesquisa.
                        </td>
                      </tr>
                    ) : (
                      filteredSalons.map((salon) => (
                        <tr key={salon.id} className="hover:bg-slate-50">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{salon.nome}</div>
                            {salon.endereco && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{salon.endereco}</div>
                            )}
                          </td>
                          <td className="p-4 font-medium">{salon.dono}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-pink-600">/{salon.slug_url}</span>
                              <button type="button" onClick={() => copySalonLink(salon.slug_url)} className="text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-xl">
                                📋 Copiar Link
                              </button>
                            </div>
                          </td>
                          <td className="p-4">{salon.telefone}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${salon.ativo !== false ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
                              {salon.ativo !== false ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="p-4">{formatDate(salon.criado_em)}</td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleAdminImpersonate(salon)}
                                className="bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold py-1.5 px-3 rounded-lg transition"
                              >
                                Inspecionar
                              </button>
                              <button
                                onClick={() => handleEditSalonInit(salon)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1.5 px-3 rounded-lg transition"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleAdminDeleteSalon(salon.id, salon.nome)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-1.5 px-3 rounded-lg transition"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile view (Cards) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredSalons.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Nenhum salão cadastrado ou encontrado.
                  </div>
                ) : (
                  filteredSalons.map((salon) => (
                    <div key={salon.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-slate-900 text-sm">{salon.nome}</h4>
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${salon.ativo !== false ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
                              {salon.ativo !== false ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Criado em: {formatDate(salon.criado_em)}</p>
                        </div>
                        <span className="text-[10px] font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md flex items-center gap-2">
                          <span>/ {salon.slug_url}</span>
                          <button type="button" onClick={() => copySalonLink(salon.slug_url)} className="text-[10px] bg-white/80 hover:bg-white px-2 py-0.5 rounded">
                            📋
                          </button>
                        </span>
                      </div>

                      {salon.endereco && (
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          <span className="font-semibold text-slate-600">Endereço:</span> {salon.endereco}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                        <div>
                          <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Responsável</span>
                          <span className="font-semibold text-slate-800">{salon.dono}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Telefone</span>
                          <span className="font-semibold text-slate-800">{salon.telefone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAdminImpersonate(salon)}
                          className="flex-1 text-center bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold py-2 px-3 rounded-lg transition"
                        >
                          Inspecionar
                        </button>
                        <button
                          onClick={() => handleEditSalonInit(salon)}
                          className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-2 px-3 rounded-lg transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleAdminDeleteSalon(salon.id, salon.nome)}
                          className="text-center bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold py-2 px-3 rounded-lg transition"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {adminActiveTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left block: Avatar & Quick Info */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 h-fit">
              <div className="relative w-24 h-24 rounded-full bg-pink-50 border-2 border-pink-100 flex items-center justify-center text-5xl shadow-md overflow-hidden">
                {adminProfileUrl ? (
                  <img src={adminProfileUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span>{adminProfileEmoji}</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{adminProfileName || "Administrador Master"}</h3>
                <p className="text-xs text-pink-600 font-medium tracking-wide">Nível de Acesso: {currentUser?.nivel_acesso || "master"}</p>
                <p className="text-xs text-slate-400 mt-1">{currentUser?.email}</p>
              </div>
              <div className="w-full pt-4 border-t border-slate-100 space-y-2 text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metadados da Sessão</div>
                <div className="text-xs text-slate-600 flex justify-between">
                  <span>ID da Conta:</span>
                  <span className="font-mono text-slate-500">{currentUser?.id}</span>
                </div>
                <div className="text-xs text-slate-600 flex justify-between">
                  <span>Telefone:</span>
                  <span className="text-slate-500">{adminProfilePhone || "Não cadastrado"}</span>
                </div>
              </div>
            </div>

            {/* Right block: Profile fields form + Change Password */}
            <div className="lg:col-span-2 space-y-6">
              {/* General Info & Security Question Card */}
              <form onSubmit={handleUpdateAdminProfile} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  <User className="h-5 w-5 text-pink-600 mr-2" />
                  Informações Pessoais & Recuperação
                </h3>
                <p className="text-xs text-slate-500 -mt-4">
                  Mantenha suas informações cadastrais atualizadas e defina uma pergunta de segurança para caso de esquecimento da senha.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={adminProfileName}
                      onChange={(e) => setAdminProfileName(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone de Contato</label>
                    <input
                      type="text"
                      placeholder="Ex: (11) 98888-7777"
                      value={adminProfilePhone}
                      onChange={(e) => setAdminProfilePhone(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Escolha seu Emoji Avatar</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {["👑", "💅", "⭐", "🦄", "⚡", "🤖", "🎨", "🚀", "💻", "🏆", "🌟", "🦁"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setAdminProfileEmoji(emoji);
                            setAdminProfileUrl(""); // Clear URL if emoji selected
                          }}
                          className={`text-xl p-2.5 rounded-xl border transition ${adminProfileEmoji === emoji && !adminProfileUrl ? "border-pink-500 bg-pink-50 scale-110 shadow-sm" : "border-slate-200 hover:bg-slate-50"}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ou envie uma Foto de Perfil do seu dispositivo</label>
                    <div className="mt-1.5 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      {adminProfileUrl ? (
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-300 bg-white flex-0 shadow-sm group">
                          <img src={adminProfileUrl} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setAdminProfileUrl("")}
                            className="absolute inset-0 bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-xs font-medium shrink-0 shadow-sm">
                          Sem Foto
                        </div>
                      )}

                      <div className="flex-1">
                        <label className="inline-flex items-center px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm">
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          <span>Selecionar Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </label>
                        <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                          Sua foto será otimizada e salva diretamente no sistema. Ideal para uso em computadores e celulares.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">🛡️ Sistema de Recuperação de Senha por Segurança</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Pergunta de Segurança</label>
                        <select
                          value={adminProfileQuestion}
                          onChange={(e) => setAdminProfileQuestion(e.target.value)}
                          className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                        >
                          <option value="">-- Escolha uma pergunta --</option>
                          <option value="Qual o nome do seu primeiro pet?">Qual o nome do seu primeiro pet?</option>
                          <option value="Em qual cidade você nasceu?">Em qual cidade você nasceu?</option>
                          <option value="Qual era o modelo do seu primeiro carro?">Qual era o modelo do seu primeiro carro?</option>
                          <option value="Qual o nome da sua escola primária?">Qual o nome da sua escola primária?</option>
                          <option value="Qual o seu prato preferido da infância?">Qual o seu prato preferido da infância?</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Sua Resposta Secreta</label>
                        <input
                          type="password"
                          placeholder="Nova resposta de segurança"
                          value={adminProfileAnswer}
                          onChange={(e) => setAdminProfileAnswer(e.target.value)}
                          className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">A resposta não diferencia maiúsculas/minúsculas nem espaços extras.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Salvar Informações do Perfil
                  </button>
                </div>
              </form>

              {/* Change Password Card */}
              <form onSubmit={handleChangeAdminPassword} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  <Lock className="h-5 w-5 text-pink-600 mr-2" />
                  Alterar Senha de Acesso
                </h3>
                <p className="text-xs text-slate-500 -mt-4">
                  Recomendamos alterar sua senha periodicamente para manter o painel administrativo do ecossistema totalmente protegido.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Atual</label>
                    <input
                      type="password"
                      required
                      value={adminCurrentPassword}
                      onChange={(e) => setAdminCurrentPassword(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha</label>
                    <input
                      type="password"
                      required
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      required
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Redefinir Senha de Acesso
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

          </div>
        )}

        {/* ==========================================
            SALON ISOLATED WORKSPACE CONTENT
           ========================================== */}
        {selectedSalon && (
          isSalonInactiveForCurrentUser ? (
            <div className="flex-1 flex flex-col justify-center items-center py-10 animate-fade-in">
              <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-4xl mx-auto text-rose-600">
                  ⚠️
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">Salão Temporariamente Indisponível</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    O salão <strong className="text-slate-800">{selectedSalon.nome}</strong> está temporariamente inativo e não está aceitando novos agendamentos no momento.
                  </p>
                  <p className="text-xs text-slate-400">
                    Se você é o proprietário, por favor faça login ou entre em contato com o suporte para reativação.
                  </p>
                </div>
                {currentUser?.role === "admin" && (
                  <div className="pt-2">
                    <button
                      onClick={() => navigateToPortal("directory")}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      Voltar ao Diretório Geral
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : portalMode === "client" && !currentUser ? (
            /* ==========================================
               CLIENT PORTAL - BEAUTIFUL LANDING ENTRANCE (EXCLUSIVE TO EACH SALON)
               ========================================== */
            <div className="flex-1 flex flex-col justify-center items-center py-6 sm:py-10 animate-fade-in">
              <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 text-center">
                
                {/* Salon Logo */}
                <div className="relative w-24 h-24 rounded-full bg-pink-50 border-2 border-pink-100 flex items-center justify-center text-5xl shadow-md overflow-hidden mx-auto">
                  {selectedSalon.avatar_url ? (
                    <img src={selectedSalon.avatar_url} alt={selectedSalon.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{selectedSalon.avatar_emoji || "💅"}</span>
                  )}
                </div>

                {/* Salon Name & Description */}
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    {selectedSalon.nome}
                  </h2>
                  <p className="text-[10px] bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md inline-block font-bold uppercase tracking-wider">
                    Área do Cliente
                  </p>
                  {selectedSalon.descricao ? (
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      {selectedSalon.descricao}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Seja muito bem-vinda ao nosso espaço de agendamento online.
                    </p>
                  )}
                </div>

                {/* ==================== SCREEN 1: LANDING BUTTONS ==================== */}
                {clientAuthForm === "none" && (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => setClientAuthForm("login")}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-3 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      Entrar na minha Conta
                    </button>
                    <button
                      onClick={() => setClientAuthForm("signup")}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
                    >
                      Criar Nova Conta
                    </button>
                    
                    <div className="pt-2">
                      <button
                        onClick={() => setClientAuthForm("recovery")}
                        className="text-[11px] text-pink-600 hover:text-pink-700 hover:underline font-semibold cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  </div>
                )}

                {/* ==================== SCREEN 2: LOGIN FORM ==================== */}
                {clientAuthForm === "login" && (
                  <form onSubmit={handleClientLogin} className="space-y-4 pt-2 text-left">
                    <div className="text-center pb-2">
                      <h3 className="text-sm font-bold text-slate-800">Acesse sua Conta</h3>
                      <p className="text-[11px] text-slate-400">Informe seus dados para continuar</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Celular</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: (11) 98888-7777"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(formatPhone(e.target.value))}
                        className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Secreta</label>
                      <input
                        type="password"
                        required
                        placeholder="Sua senha secreta"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                      />
                    </div>

                    <div className="pt-2 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setClientAuthForm("none")}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer text-center"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                      >
                        Entrar
                      </button>
                    </div>
                  </form>
                )}

                {/* ==================== SCREEN 3: SIGNUP FORM ==================== */}
                {clientAuthForm === "signup" && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (signupPassword !== signupConfirmPassword) {
                      setErrorMessage("As senhas informadas não coincidem.");
                      return;
                    }
                    handleClientSignup(e);
                  }} className="space-y-4 pt-2 text-left">
                    <div className="text-center pb-2">
                      <h3 className="text-sm font-bold text-slate-800">Crie sua Conta Grátis</h3>
                      <p className="text-[11px] text-slate-400">Inscreva-se em menos de 1 minuto</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Seu nome completo"
                        value={signupNome}
                        onChange={(e) => setSignupNome(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Celular</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: (11) 98888-7777"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(formatPhone(e.target.value))}
                        className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">CPF (Necessário para segurança)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 123.456.789-00"
                        value={signupCpf}
                        onChange={(e) => setSignupCpf(formatCPF(e.target.value))}
                        className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Sua Senha</label>
                      <input
                        type="password"
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Senha</label>
                      <input
                        type="password"
                        required
                        placeholder="Repita sua senha"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                      />
                    </div>

                    <div className="pt-2 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setClientAuthForm("none")}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer text-center"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                      >
                        Cadastrar
                      </button>
                    </div>
                  </form>
                )}

                {/* ==================== SCREEN 4: PASSWORD RECOVERY FORM ==================== */}
                {clientAuthForm === "recovery" && (
                  <div className="space-y-4 pt-2 text-left">
                    {clientRecoveryStep === 1 ? (
                      <form onSubmit={handleVerifyRecoveryPhone} className="space-y-4">
                        <div className="text-center pb-2">
                          <h3 className="text-sm font-bold text-slate-800">Recuperar Senha</h3>
                          <p className="text-[11px] text-pink-600 font-semibold">Etapa 1 de 3: Informe seu telefone</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Celular Cadastrado</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: (11) 98888-7777"
                            value={recoverPhone}
                            onChange={(e) => setRecoverPhone(formatPhone(e.target.value))}
                            className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                          />
                        </div>

                        <div className="pt-2 flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setClientAuthForm("none");
                              setClientRecoveryStep(1);
                              setRecoverPhone("");
                            }}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer text-center"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                          >
                            Buscar Cadastro
                          </button>
                        </div>
                      </form>
                    ) : clientRecoveryStep === 2 ? (
                      <form onSubmit={handleVerifyRecoveryCpf} className="space-y-4">
                        <div className="text-center pb-2">
                          <h3 className="text-sm font-bold text-slate-800">Recuperar Senha</h3>
                          <p className="text-[11px] text-pink-600 font-semibold">Etapa 2 de 3: Identificação</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] text-slate-600 mb-2 leading-relaxed">
                          <p><strong>Telefone:</strong> {recoverPhone}</p>
                          <p className="mt-1">Para sua segurança, informe os 4 últimos dígitos do seu CPF cadastrado.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Últimos 4 Números do seu CPF</label>
                          <input
                            type="text"
                            required
                            maxLength={4}
                            placeholder="Ex: 8900"
                            value={recoverLastFourCpf}
                            onChange={(e) => setRecoverLastFourCpf(e.target.value.replace(/\D/g, ""))}
                            className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                          />
                        </div>

                        <div className="pt-2 flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setClientRecoveryStep(1);
                              setRecoverLastFourCpf("");
                            }}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer text-center"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                          >
                            Validar CPF
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handlePasswordRecovery} className="space-y-4">
                        <div className="text-center pb-2">
                          <h3 className="text-sm font-bold text-slate-800">Nova Senha</h3>
                          <p className="text-[11px] text-pink-600 font-semibold">Etapa 3 de 3: Crie sua nova senha</p>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-start space-x-2 text-[11px] text-emerald-900 mb-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <p className="font-medium leading-normal">
                            Dados validados! Defina sua nova senha de acesso abaixo.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha Secreta</label>
                          <input
                            type="password"
                            required
                            placeholder="Mínimo 6 caracteres"
                            value={recoverNewPassword}
                            onChange={(e) => setRecoverNewPassword(e.target.value)}
                            className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nova Senha</label>
                          <input
                            type="password"
                            required
                            placeholder="Repita a nova senha"
                            value={recoverConfirmPassword}
                            onChange={(e) => setRecoverConfirmPassword(e.target.value)}
                            className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                          />
                        </div>

                        <div className="pt-2 flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setClientRecoveryStep(2);
                              setRecoverNewPassword("");
                              setRecoverConfirmPassword("");
                            }}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer text-center"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                          >
                            Salvar Nova Senha
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

              </div>
              
              {/* Back to main Directory */}
              {(currentUser as SessionUser | null)?.role === "admin" && (
                <button
                  onClick={() => navigateToPortal("directory")}
                  className="mt-4 text-xs text-slate-500 hover:text-pink-600 font-semibold flex items-center justify-center space-x-1 cursor-pointer animate-fade-in"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar ao Diretório Geral</span>
                </button>
              )}
            </div>
          ) : (
            /* ==========================================
               INNER WORKSPACE PAGES (PROFESSIONAL OR AUTHENTICATED CLIENT)
               ========================================== */
            <div className="flex-1 flex flex-col space-y-6">
            
            {/* Salon Header Information Block */}
            <div className="bg-linear-to-r from-pink-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center space-y-5 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
                {/* Salon Owner Profile Picture / Logo */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-white/10 border-4 border-white/30 shadow-2xl ring-4 ring-pink-500/20 shrink-0 flex items-center justify-center text-5xl sm:text-6xl md:text-7xl overflow-hidden transition hover:scale-105 duration-300">
                  {selectedSalon.avatar_url ? (
                    <img 
                      src={selectedSalon.avatar_url} 
                      alt={selectedSalon.dono} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <span>{selectedSalon.avatar_emoji || "💅"}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="bg-pink-500/20 text-pink-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      Salão Conectado
                    </span>
                    <span className="bg-white/10 text-white text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-2">
                      Link de Agendamento: {selectedSalon.slug_url}
                      <button type="button" onClick={() => copySalonLink(selectedSalon.slug_url)} className="text-[11px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded">
                        📋 Copiar Link
                      </button>
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">{selectedSalon.nome}</h2>
                  <p className="text-pink-200 text-xs sm:text-sm font-medium flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <span>💅 {selectedSalon.dono}</span>
                    <span className="opacity-40">&bull;</span>
                    <span>📞 {selectedSalon.telefone}</span>
                  </p>
                </div>
              </div>

              {/* Quick links depending on role */}
              <div className="mt-4 sm:mt-0 flex flex-wrap gap-2 pb-2">
                {(!currentUser || currentUser.role === "client") && (
                  <>
                    <button
                      onClick={() => setCurrentView("services")}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition ${currentView === "services" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      Serviços
                    </button>
                    {currentUser && (
                      <>
                        <button
                          onClick={() => setCurrentView("book")}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition ${currentView === "book" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                        >
                          Agendar Horário
                        </button>
                        <button
                          onClick={() => setCurrentView("history")}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition ${currentView === "history" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                        >
                          Meus Agendamentos
                        </button>
                        <button
                          onClick={() => setCurrentView("client-profile")}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition ${currentView === "client-profile" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                        >
                          Meu Perfil
                        </button>
                      </>
                    )}
                  </>
                )}

                {currentUser && currentUser.role === "professional" && (
                  <div className="flex flex-wrap gap-2 pb-2 w-full">
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 ${currentView === "dashboard" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      Painel
                    </button>
                    <button
                      onClick={() => setCurrentView("agenda")}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 ${currentView === "agenda" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      Agenda
                    </button>
                    <button
                      onClick={() => setCurrentView("blocks")}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 ${currentView === "blocks" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      Bloqueios
                    </button>
                    <button
                      onClick={() => setCurrentView("services")}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 ${currentView === "services" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      Serviços
                    </button>
                    <button
                      onClick={() => setCurrentView("clients")}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 ${currentView === "clients" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      Clientes
                    </button>
                    <button
                      onClick={() => setCurrentView("caixa")}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 ${currentView === "caixa" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      Caixa
                    </button>
                    <button
                      onClick={() => setCurrentView("pro-profile")}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition shrink-0 ${currentView === "pro-profile" ? "bg-white text-pink-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      Perfil & Config
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ==========================================
                CLIENT WORKSPACE PAGES (CLIENT IS VISITING)
               ========================================== */}
            {(!currentUser || currentUser.role === "client") && (
              <div className="grid lg:grid-cols-3 gap-8 items-start">
                
                {/* Left/Middle Column - Content View */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* SERVICE LIST VIEW */}
                  {currentView === "services" && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center">
                          <Scissors className="h-5 w-5 text-pink-600 mr-2" />
                          Nossos Serviços & Valores
                        </h3>
                        <span className="text-xs text-pink-600 font-semibold">{services.filter((s) => s.ativo).length} ativos</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {services.filter((srv) => srv.ativo).map((srv) => (
                          <div key={srv.id} className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col hover:border-pink-200 hover:shadow-md transition duration-300">
                            {srv.foto_url ? (
                              <div className="w-full h-44 overflow-hidden relative group">
                                <img src={srv.foto_url} alt={srv.nome} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                                <div className="absolute top-2.5 right-2.5 bg-pink-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                  Foto Real
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-28 bg-linear-to-br from-pink-50 to-pink-100 flex items-center justify-center text-4xl shrink-0">
                                💅
                              </div>
                            )}

                            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-slate-900 leading-snug">{srv.nome}</h4>
                                <p className="text-xs text-slate-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1 text-slate-400" />
                                  {srv.duracao_estimada_minutos} minutos de atendimento
                                </p>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                                <span className="text-sm font-black text-pink-600">
                                  {formatCurrency(srv.preco)}
                                </span>
                                {currentUser ? (
                                  <button
                                    onClick={() => {
                                      setSelectedServiceId(srv.id);
                                      setSelectedTime("");
                                      setCurrentView("book");
                                    }}
                                    className="bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-xl transition shadow-sm"
                                  >
                                    Quero Esse
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-medium text-slate-400">Entre para agendar</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {currentUser ? (
                        <button
                          onClick={() => setCurrentView("book")}
                          className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs py-3 rounded-2xl transition text-center shadow-sm"
                        >
                          Agendar um Horário Agora
                        </button>
                      ) : (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                          <p className="text-xs text-slate-500 font-medium">
                            Crie sua conta ou faça login ao lado para realizar um agendamento online.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* INTERACTIVE BOOKING SCHEDULER */}
                  {currentView === "book" && currentUser && (
                    <form onSubmit={handleCreateBooking} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center">
                          <Calendar className="h-5 w-5 text-pink-600 mr-2" />
                          Agendar Atendimento Online
                        </h3>
                        <span className="text-xs text-pink-600 font-semibold">Garantia contra conflitos</span>
                      </div>

                      {/* Service selection */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">1. Selecione o Serviço Desejado</label>
                        <select
                          required
                          value={selectedServiceId}
                          onChange={(e) => {
                            setSelectedServiceId(e.target.value);
                            setSelectedTime(""); // reset time
                          }}
                          className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-600 bg-white"
                        >
                          <option value="">-- Selecionar Serviço --</option>
                          {services.filter((s) => s.ativo).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nome} ({s.duracao_estimada_minutos} min) - {formatCurrency(s.preco)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dynamic Visual Service Preview (Real Results) */}
                      {selectedServiceId && (() => {
                        const srv = services.find((s) => s.id === selectedServiceId);
                        if (srv && srv.foto_url) {
                          return (
                            <div className="bg-pink-50/50 border border-pink-100 p-4 rounded-2xl animate-fade-in flex flex-col sm:flex-row gap-4 items-center">
                              <div className="w-24 h-24 sm:w-28 sm:h-20 rounded-xl overflow-hidden border border-pink-200 shadow-md shrink-0">
                                <img src={srv.foto_url} alt={srv.nome} className="w-full h-full object-cover" />
                              </div>
                              <div className="text-center sm:text-left space-y-1">
                                <span className="text-[9px] uppercase font-bold text-pink-600 tracking-wider bg-pink-100 px-2 py-0.5 rounded-full">
                                  Como o serviço fica
                                </span>
                                <h4 className="text-sm font-bold text-slate-800">{srv.nome}</h4>
                                <p className="text-xs text-slate-500 leading-normal">
                                  Olha que maravilhoso o resultado desse serviço já realizado no nosso salão! Perfeito para você se inspirar.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Date selection */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">2. Escolha o Dia</label>
                        <input
                          type="date"
                          required
                          value={selectedDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedTime(""); // reset time
                          }}
                          className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-600"
                        />
                      </div>

                      {/* Available slots grid */}
                      {selectedServiceId && selectedDate && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-2">
                            3. Horários Disponíveis para este Serviço nesta data
                          </label>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {availableSlots.map((slot) => (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => setSelectedTime(slot.time)}
                                className={`text-xs py-2 px-1 rounded-xl font-bold transition flex flex-col items-center justify-center border ${
                                  selectedTime === slot.time
                                    ? "bg-pink-600 border-pink-600 text-white"
                                    : slot.available
                                    ? "bg-pink-50 border-pink-100 text-pink-800 hover:bg-pink-100"
                                    : "bg-slate-50 border-slate-100 text-slate-300 line-through cursor-not-allowed"
                                }`}
                                title={slot.conflictReason || "Horário livre"}
                              >
                                <span>{slot.time}</span>
                                {!slot.available && (
                                  <span className="text-[7px] font-medium leading-none block mt-0.5 max-w-full truncate">
                                    Ocupado
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Booking Notes */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">Observações / Preferências (Opcional)</label>
                        <textarea
                          rows={2}
                          placeholder="Ex: Prefere esmalte escuro, ou design mais curvado..."
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-600"
                        />
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={!selectedTime}
                        className={`w-full font-bold text-xs py-3 rounded-2xl transition text-center shadow-sm ${
                          selectedTime
                            ? "bg-pink-600 hover:bg-pink-700 text-white"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        Confirmar e Agendar para {selectedTime || "..."}
                      </button>
                    </form>
                  )}

                  {/* BOOKING HISTORY */}
                  {currentView === "history" && currentUser && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center">
                          <Activity className="h-5 w-5 text-pink-600 mr-2" />
                          Seu Histórico de Atendimentos
                        </h3>
                        <button
                          onClick={() => reloadCurrentSalon()}
                          className="text-xs text-pink-600 font-bold hover:underline flex items-center"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Atualizar
                        </button>
                      </div>

                      <div className="space-y-4">
                        {bookings.filter((b) => b.cliente_id === currentUser.id).length === 0 ? (
                          <div className="text-center py-10">
                            <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
                            <p className="text-sm text-slate-500 mt-2 font-medium">Você ainda não possui agendamentos cadastrados neste salão.</p>
                          </div>
                        ) : (
                          bookings
                            .filter((b) => b.cliente_id === currentUser.id)
                            .map((b) => {
                              const srv = services.find((s) => s.id === b.servico_id);
                              return (
                                <div key={b.id} className="border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900">{srv ? srv.nome : "Atendimento"}</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                      <span className="flex items-center">
                                        <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                        {formatDate(b.data_hora_inicio)}
                                      </span>
                                      <span className="flex items-center">
                                        <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                        {formatTime(b.data_hora_inicio)} às {formatTime(b.data_hora_fim)}
                                      </span>
                                    </div>
                                    {b.observacoes && (
                                      <p className="text-xs text-slate-400 italic">Nota: &ldquo;{b.observacoes}&rdquo;</p>
                                    )}
                                    {(b.quantidade_remarcacoes && b.quantidade_remarcacoes > 0) && (
                                      <BookingHistoryBadge count={b.quantidade_remarcacoes || 0} onClick={() => openHistoryFor(b)} />
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                                    <div className="text-right">
                                      <p className="text-xs font-bold text-slate-900">{formatCurrency(b.valor_cobrado)}</p>
                                      <p className={`text-[9px] px-2 py-0.5 rounded-full inline-block font-semibold uppercase ${
                                        b.status_financeiro === "pago"
                                          ? "bg-green-100 text-green-700"
                                          : b.status_financeiro === "estornado"
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-amber-100 text-amber-700"
                                      }`}>
                                        {b.status_financeiro === "pago" ? "Pago" : b.status_financeiro === "estornado" ? "Estornado" : "Pendente"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] px-2.5 py-1 rounded-xl font-bold uppercase ${getStatusColor(b.status_atendimento)}`}>
                                        {b.status_atendimento}
                                      </span>
                                      {b.status_atendimento !== "concluido" && b.status_atendimento !== "cancelado" && (
                                        <button
                                          onClick={() => handleOpenReschedule(b)}
                                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold px-3 py-1 rounded"
                                        >
                                          Remarcar
                                        </button>
                                      )}
                                        {b.status_atendimento !== "concluido" && b.status_atendimento !== "cancelado" && (
                                          <button
                                            onClick={() => setCancelingBooking(b)}
                                            className="bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold px-3 py-1 rounded"
                                          >
                                            Cancelar
                                          </button>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  )}

                  {/* CLIENT PROFILE VIEW */}
                  {currentView === "client-profile" && currentUser && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center">
                          <User className="h-5 w-5 text-pink-600 mr-2" />
                          Meu Perfil & Dados Pessoais
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">Gerencie suas informações</span>
                      </div>

                      <form onSubmit={handleUpdateClientProfile} className="space-y-6">
                        
                        {/* Interactive Avatar / Photo Section */}
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-slate-700">Sua Foto de Perfil ou Avatar</label>
                          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            
                            {/* Current Display */}
                            <div className="relative w-20 h-20 rounded-full bg-pink-100 border-2 border-pink-200 flex items-center justify-center text-4xl shadow-md overflow-hidden group shrink-0">
                              {clientProfileUrl ? (
                                <img 
                                  src={clientProfileUrl} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span>{clientProfileEmoji || "👩"}</span>
                              )}
                              
                              {/* Quick Clear Button if photo is set */}
                              {clientProfileUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClientProfileUrl("");
                                    setClientProfileEmoji("👩");
                                  }}
                                  className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] font-bold uppercase"
                                >
                                  Remover
                                </button>
                              )}
                            </div>

                            {/* Control upload from cell phone / computer & drag & drop */}
                            <div className="flex-1 space-y-2 text-center sm:text-left">
                              <p className="text-xs font-medium text-slate-700">Envie uma foto do seu celular ou galeria</p>
                              
                              {/* Drag & Drop zone */}
                              <div 
                                className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center cursor-pointer hover:border-pink-500 hover:bg-pink-50/20 transition group relative"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files?.[0];
                                  if (file) {
                                    const event = { target: { files: [file] } } as any;
                                    handleClientProfileImageUpload(event);
                                  }
                                }}
                                onClick={() => document.getElementById("client-profile-file")?.click()}
                              >
                                <span className="text-[11px] font-bold text-pink-600 block group-hover:underline">
                                  📸 Clique para escolher ou arraste aqui
                                </span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                  PNG, JPG de até 5MB (Redimensionamento inteligente automático)
                                </span>
                              </div>

                              <input
                                type="file"
                                id="client-profile-file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleClientProfileImageUpload}
                              />
                            </div>
                          </div>

                          {/* Quick Emoji Avatar Selectors */}
                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-semibold text-slate-500">Ou use um dos nossos avatares prontos:</span>
                            <div className="flex flex-wrap gap-2">
                              {["👩", "👨", "🧑", "💅", "✨", "🌸", "💇‍♀️", "💆‍♀️", "💄", "🌟", "👑", "🌈", "🦋", "🐱", "🎧"].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    setClientProfileUrl("");
                                    setClientProfileEmoji(emoji);
                                  }}
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg transition ${
                                    !clientProfileUrl && clientProfileEmoji === emoji
                                      ? "bg-pink-50 border-pink-400 scale-110 shadow-sm"
                                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Profile Info fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Seu Nome Completo</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Maria Clara"
                              value={clientProfileName}
                              onChange={(e) => setClientProfileName(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone Celular / WhatsApp</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: (11) 99999-0000"
                              value={clientProfilePhone}
                              onChange={(e) => setClientProfilePhone(formatPhone(e.target.value))}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-600"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">CPF (utilizado para recuperação e faturamento)</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: 123.456.789-00"
                              value={clientProfileCpf}
                              onChange={(e) => setClientProfileCpf(formatCPF(e.target.value))}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-600"
                            />
                          </div>
                        </div>

                        {/* Optional Password Update */}
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                            <Lock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                            Alterar Senha de Acesso (Preencha apenas se quiser alterar)
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha</label>
                              <input
                                type="password"
                                placeholder="Mínimo 4 caracteres"
                                value={clientProfilePassword}
                                onChange={(e) => setClientProfilePassword(e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nova Senha</label>
                              <input
                                type="password"
                                placeholder="Repita a nova senha"
                                value={clientProfileConfirmPassword}
                                onChange={(e) => setClientProfileConfirmPassword(e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-600"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Form Submit & Reset */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setCurrentView("services")}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-6 rounded-2xl transition shadow-sm text-center"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isUpdatingClientProfile}
                            className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs py-3 px-8 rounded-2xl transition shadow-sm flex items-center justify-center min-w-37.5 disabled:opacity-75"
                          >
                            {isUpdatingClientProfile ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                                Salvando...
                              </>
                            ) : (
                              "Salvar Alterações"
                            )}
                          </button>
                        </div>

                      </form>
                    </div>
                  )}
                </div>

                {/* Right Column - Client Side Auth Panel */}
                <div className="space-y-6">
                  {!currentUser ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                      
                      {/* Toggle Form Header */}
                      <div className="border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-800">👤 Acesso do Cliente</h3>
                        <p className="text-xs text-slate-500 mt-1">Crie sua conta para começar a agendar horários online.</p>
                      </div>

                      {/* Login Form */}
                      <form onSubmit={handleClientLogin} className="space-y-4">
                        <h4 className="text-xs font-bold text-pink-600 uppercase tracking-wider">Já tenho Cadastro</h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Comercial / Contato</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: (11) 99999-1111"
                            value={loginPhone}
                            onChange={(e) => setLoginPhone(formatPhone(e.target.value))}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Senha</label>
                          <input
                            type="password"
                            required
                            placeholder="Sua senha"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs py-2.5 rounded-xl transition"
                        >
                          Entrar na Minha Conta
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowRecoveryModal(true); setClientRecoveryStep(1); }}
                          className="w-full text-center text-slate-400 hover:text-pink-600 text-[11px] font-semibold block transition"
                        >
                          Esqueceu sua senha? Clique para recuperar
                        </button>
                      </form>

                      {/* Signup Form */}
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (signupPassword !== signupConfirmPassword) {
                          setErrorMessage("As senhas informadas não coincidem.");
                          return;
                        }
                        handleClientSignup(e);
                      }} className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-pink-600 uppercase tracking-wider">Sou Novo Cliente</h4>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Seu Nome Completo</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Ana Silva"
                            value={signupNome}
                            onChange={(e) => setSignupNome(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone de Contato</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: (11) 99999-1111"
                            value={signupPhone}
                            onChange={(e) => setSignupPhone(formatPhone(e.target.value))}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">CPF (segurança e recuperação)</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: 123.456.789-00"
                            value={signupCpf}
                            onChange={(e) => setSignupCpf(formatCPF(e.target.value))}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Senha de Acesso</label>
                          <input
                            type="password"
                            required
                            placeholder="Mínimo 4 dígitos"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Senha</label>
                          <input
                            type="password"
                            required
                            placeholder="Repita sua senha"
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition"
                        >
                          Criar Conta de Cliente
                        </button>
                      </form>

                      {/* Professional/Admin Login Trigger */}
                      <div className="pt-4 border-t border-slate-100 text-center space-y-1.5 bg-slate-50 p-3 rounded-2xl">
                        <p className="text-[10px] font-medium text-slate-500 leading-tight">
                          Dono de Salão ou Administrador?
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSalon(null);
                            handleSetUser(null);
                            window.location.hash = "";
                          }}
                          className="text-xs text-pink-600 hover:text-pink-700 font-bold hover:underline transition inline-flex items-center"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Ir para Acesso Admin / Geral
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center space-y-4">
                      <div className="relative w-16 h-16 rounded-full bg-pink-50 border-2 border-pink-100 flex items-center justify-center text-3xl shadow-sm overflow-hidden mx-auto">
                        {currentUser.avatar_url ? (
                          <img src={currentUser.avatar_url} alt={currentUser.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{currentUser.avatar_emoji || (currentUser.nome ? currentUser.nome[0].toUpperCase() : "👤")}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{currentUser.nome}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{currentUser.telefone}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                        <button
                          onClick={() => setCurrentView("services")}
                          className={`w-full text-left p-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${currentView === "services" ? "bg-pink-50 text-pink-700 font-bold" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          <Scissors className="h-4 w-4 text-slate-400" />
                          <span>Ver Serviços & Preços</span>
                        </button>
                        <button
                          onClick={() => setCurrentView("book")}
                          className={`w-full text-left p-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${currentView === "book" ? "bg-pink-50 text-pink-700 font-bold" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>Agendar Atendimento</span>
                        </button>
                        <button
                          onClick={() => setCurrentView("history")}
                          className={`w-full text-left p-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${currentView === "history" ? "bg-pink-50 text-pink-700 font-bold" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span>Meus Agendamentos</span>
                        </button>
                        <button
                          onClick={() => setCurrentView("client-profile")}
                          className={`w-full text-left p-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${currentView === "client-profile" ? "bg-pink-50 text-pink-700 font-bold" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          <User className="h-4 w-4 text-slate-400" />
                          <span>Meu Perfil</span>
                        </button>
                        <button
                          onClick={() => handleSetUser(null)}
                          className="w-full text-left hover:bg-red-50 p-2 rounded-xl text-xs font-bold text-red-600 flex items-center space-x-2 mt-2"
                        >
                          <LogOut className="h-4 w-4 text-red-400" />
                          <span>Sair da Conta</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ==========================================
                PROFESSIONAL MANAGEMENT AREA (PORTUGUESE)
               ========================================== */}
            {currentUser && currentUser.role === "professional" && (
              <div className="space-y-6">
                
                {/* 1. PROFESSIONAL DASHBOARD OVERVIEW */}
                {currentView === "dashboard" && (
                  <div className="space-y-6">
                    {/* Welcome message and stats */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-slate-900">Visão Geral de Hoje</h3>
                        <button
                          onClick={() => reloadCurrentSalon()}
                          className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-slate-100 rounded-xl transition"
                          title="Atualizar Painel"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setShowWalkinForm(true);
                          setCurrentView("agenda");
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Agendar Cliente Presencial</span>
                      </button>
                    </div>

                    {/* Stats cards for professional */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 font-medium text-xs">Aguardando Atendimento</div>
                        <div className="text-2xl font-black text-amber-600 mt-1">
                          {bookings.filter((b) => b.status_atendimento === "pendente").length}
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 font-medium text-xs">Agendamentos Totais</div>
                        <div className="text-2xl font-black text-pink-600 mt-1">{bookings.length}</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 font-medium text-xs">Faturamento Total</div>
                        <div className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(financeStats.monthlyTotal)}</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 font-medium text-xs">Serviços Cadastrados</div>
                        <div className="text-2xl font-black text-slate-800 mt-1">{services.length}</div>
                      </div>
                    </div>

                    {/* Quick schedule today */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <h4 className="text-sm font-bold text-slate-900">Agenda Próxima</h4>
                        <button
                          onClick={() => setCurrentView("agenda")}
                          className="text-xs text-pink-600 font-semibold hover:underline"
                        >
                          Ir para Agenda Completa
                        </button>
                      </div>

                      <div className="space-y-3">
                        {bookings.filter((b) => b.status_atendimento === "pendente" || b.status_atendimento === "confirmado").slice(0, 5).length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs font-medium">
                            Nenhum atendimento pendente para hoje ou próximos dias.
                          </div>
                        ) : (
                          bookings
                            .filter((b) => b.status_atendimento === "pendente" || b.status_atendimento === "confirmado")
                            .slice(0, 5)
                            .map((b) => {
                              const srv = services.find((s) => s.id === b.servico_id);
                              const cli = b.cliente;
                              return (
                                <div key={b.id} className="border border-slate-100 rounded-xl p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                                  <div>
                                        <div className="font-bold text-slate-900">{cli?.nome || b.nome_cliente_avulso || "Cliente sem cadastro"}</div>
                                        {!cli && !b.cliente_id && (
                                          <div className="text-[10px] text-slate-500 mt-1 bg-yellow-100 inline-block px-2 py-0.5 rounded">Cliente sem cadastro</div>
                                        )}
                                        <div className="text-slate-500 font-medium mt-0.5">{srv ? srv.nome : "Atendimento"}</div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{formatPhone(cli?.telefone || b.telefone_cliente_avulso || "")}</p>
                                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatDate(b.data_hora_inicio)} às {formatTime(b.data_hora_inicio)} ({srv?.duracao_estimada_minutos} min)
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleUpdateBookingStatus(b.id, "concluido")}
                                      className="bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-bold"
                                    >
                                      Concluir
                                    </button>

                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DETAILED AGENDA CONTROL */}
                {currentView === "agenda" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-bold text-slate-900">Agenda Completa</h3>
                          <button
                            onClick={() => reloadCurrentSalon()}
                            className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-slate-100 rounded-xl transition"
                            title="Atualizar Agenda"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Gerencie os horários marcados, mude status e registre pagamentos manuais.</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Filter by date */}
                        <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5">
                          <Filter className="h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="date"
                            value={agendaDateFilter}
                            onChange={(e) => setAgendaDateFilter(e.target.value)}
                            className="text-xs outline-none bg-transparent"
                          />
                          {agendaDateFilter && (
                            <button onClick={() => setAgendaDateFilter("")} className="text-[10px] text-red-500 font-bold">Limpar</button>
                          )}
                        </div>

                        <button
                          onClick={() => setShowWalkinForm(!showWalkinForm)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition"
                        >
                          {showWalkinForm ? "Fechar Agendador" : "Agendar Presencial"}
                        </button>
                      </div>
                    </div>

                    {/* Walkin booking form */}
                    {showWalkinForm && (
                      <div className="bg-white border border-pink-100 rounded-2xl p-6 shadow-md space-y-4 max-w-xl">
                        <h4 className="text-sm font-bold text-pink-950 flex items-center">
                          <User className="h-4 w-4 text-pink-600 mr-1.5" />
                          Agendar Atendimento Presencial / Avulso
                        </h4>
                        <form onSubmit={handleWalkinBooking} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da Cliente</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ex: Ana Silva"
                                  value={walkinClientName}
                                  onChange={(e) => {
                                    setWalkinClientName(e.target.value);
                                    // If user edits after selecting a client, clear selection
                                    if (isWalkinClientLocked) {
                                      setWalkinClientId(null);
                                      setIsWalkinClientLocked(false);
                                    }

                                    

                                    const q = e.target.value.trim().toLowerCase();

                                    const resultado = clients.filter((c) => c.nome.toLowerCase().includes(q));

                                    setWalkinSuggestions(resultado.slice(0, 6));
                                  }}
                                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none"
                                  disabled={isWalkinClientLocked}
                                />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone / Contato</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ex: (11) 99999-1111"
                                  value={walkinClientPhone}
                                  onChange={(e) => {
                                    const formatted = formatPhone(e.target.value);
                                    setWalkinClientPhone(formatted);
                                    if (isWalkinClientLocked) {
                                      setWalkinClientId(null);
                                      setIsWalkinClientLocked(false);
                                    }
                                    // phone-based suggestions: match by digits
                                    if (selectedSalon) {
                                      const digits = e.target.value.replace(/\D/g, "");
                                      if (digits.length === 0) {
                                        setWalkinSuggestions([]);
                                      } else {
                                        setWalkinSuggestions(
                                          clients
                                            .filter((c) => c.telefone.replace(/\D/g, "").includes(digits))
                                            .slice(0, 6)
                                        );
                                      }
                                    }
                                  }}
                                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none"
                                  disabled={isWalkinClientLocked}
                                />
                            </div>
                          </div>

                            {/* Suggestions list */}
                            {walkinSuggestions.length > 0 && !isWalkinClientLocked && (
                              <div className="bg-white border border-slate-100 rounded-xl p-2 mt-1 space-y-1 max-h-56 overflow-auto">
                                {walkinSuggestions.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setWalkinClientName(s.nome);
                                      setWalkinClientPhone(s.telefone);
                                      setWalkinClientId(s.id);
                                      setIsWalkinClientLocked(true);
                                      setWalkinSuggestions([]);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-start gap-3"
                                  >
                                    <div className="flex-1">
                                      <div className="font-bold text-slate-900 text-xs">👤 {s.nome}</div>
                                      <div className="text-[11px] text-slate-500 mt-0.5">📞 {s.telefone}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Selected client controls */}
                            {isWalkinClientLocked && walkinClientId && (
                              <div className="flex items-center justify-between mt-2">
                                <div className="text-[13px] text-slate-600">Cliente selecionado: <span className="font-bold text-slate-900">{walkinClientName}</span></div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWalkinClientId(null);
                                    setIsWalkinClientLocked(false);
                                    setWalkinSuggestions([]);
                                  }}
                                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl"
                                >
                                  Alterar Cliente
                                </button>
                              </div>
                            )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Serviço de Beleza</label>
                              <select
                                required
                                value={selectedServiceId}
                                onChange={(e) => setSelectedServiceId(e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none"
                              >
                                <option value="">-- Escolher Serviço --</option>
                                {services.filter((s) => s.ativo).map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.nome} ({s.duracao_estimada_minutos} min) - {formatCurrency(s.preco)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                              <input
                                type="date"
                                required
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none"
                              />
                            </div>
                          </div>

                          {selectedServiceId && selectedDate && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Escolha o horário livre</label>
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                {availableSlots.map((s) => (
                                  <button
                                    key={s.time}
                                    type="button"
                                    disabled={!s.available}
                                    onClick={() => setSelectedTime(s.time)}
                                    className={`text-xs py-1 px-1 rounded-lg font-bold transition border ${
                                      selectedTime === s.time
                                        ? "bg-slate-900 border-slate-900 text-white"
                                        : s.available
                                        ? "bg-pink-50 border-pink-100 text-pink-800"
                                        : "bg-slate-50 text-slate-300 line-through"
                                    }`}
                                  >
                                    {s.time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setShowWalkinForm(false)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={!selectedTime}
                              className={`text-xs font-bold py-2 px-4 rounded-xl transition ${
                                selectedTime ? "bg-pink-600 text-white hover:bg-pink-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              Marcar Agendamento
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Master agenda table */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      {/* Desktop View (Table) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold">
                              <th className="p-4">Cliente</th>
                              <th className="p-4">Serviço</th>
                              <th className="p-4">Data / Horário</th>
                              <th className="p-4">Valor</th>
                              <th className="p-4">Status Agenda</th>
                              <th className="p-4">Financeiro</th>
                              <th className="p-4 text-center">Ações Rápidas</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                            {bookings
                              .filter((b) => {
                                if (!agendaDateFilter) return true;
                                const bDate = new Date(b.data_hora_inicio).toISOString().split("T")[0];
                                return bDate === agendaDateFilter;
                              })
                              .map((b) => {
                                const srv = services.find((s) => s.id === b.servico_id);
                                return (
                                  <tr key={b.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-900">
                                      {b.cliente?.nome || b.nome_cliente_avulso || "Cliente sem cadastro"}
                                      {!b.cliente && !b.cliente_id && (
                                        <div className="text-[10px] text-slate-500 mt-1 bg-yellow-100 inline-block px-2 py-0.5 rounded">Cliente sem cadastro</div>
                                      )}
                                      <p className="text-[10px] font-medium text-slate-400">{formatPhone(b.cliente?.telefone || b.telefone_cliente_avulso || "") || "Sem telefone"}</p>
                                      {b.observacoes && (
                                        <p className="text-[11px] text-slate-500 italic mt-1">Nota: “{b.observacoes}”</p>
                                      )}
                                      {(b.quantidade_remarcacoes && b.quantidade_remarcacoes > 0) && (
                                        <BookingHistoryBadge count={b.quantidade_remarcacoes || 0} onClick={() => openHistoryFor(b)} />
                                      )}
                                    </td>
                                    <td className="p-4 font-semibold">{srv ? srv.nome : "Serviço"}</td>
                                    <td className="p-4 font-medium">
                                      {formatDate(b.data_hora_inicio)}
                                      <p className="text-[10px] font-mono text-pink-600 font-bold">
                                        {formatTime(b.data_hora_inicio)} - {formatTime(b.data_hora_fim)}
                                      </p>
                                    </td>
                                    <td className="p-4 font-bold">{formatCurrency(b.valor_cobrado)}</td>
                                    <td className="p-4">
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(b.status_atendimento)}`}>
                                        {b.status_atendimento}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                        b.status_financeiro === "pago"
                                          ? "bg-green-100 text-green-800"
                                          : b.status_financeiro === "estornado"
                                          ? "bg-rose-100 text-rose-800"
                                          : "bg-amber-100 text-amber-800"
                                      }`}>
                                        {b.status_financeiro === "pago" ? "Pago" : b.status_financeiro === "estornado" ? "Estornado" : "Pendente"}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center space-x-1">
                                      {b.status_atendimento === "pendente" && (
                                        <button
                                          onClick={() => handleUpdateBookingStatus(b.id, "confirmado")}
                                          className="bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold py-1 px-2 rounded"
                                        >
                                          Confirmar
                                        </button>
                                      )}
                                      {b.status_atendimento !== "concluido" && b.status_atendimento !== "cancelado" && (
                                        <>
                                          <button
                                            onClick={() => handleUpdateBookingStatus(b.id, "concluido")}
                                            className="bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold py-1 px-2 rounded"
                                          >
                                            Concluir
                                          </button>
                                          <button
                                            onClick={() => handleOpenReschedule(b)}
                                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold py-1 px-2 rounded"
                                          >
                                            Remarcar
                                          </button>
                                          <button
                                            onClick={() => handleUpdateBookingStatus(b.id, "cancelado")}
                                            className="bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold py-1 px-2 rounded"
                                          >
                                            Cancelar
                                          </button>
                                        </>
                                      )}
                                      {b.status_financeiro === "pendente" && b.status_atendimento !== "cancelado" && (
                                        <button
                                          onClick={() => handleRegisterPayment(b.id)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 px-2 rounded shadow-sm"
                                        >
                                          Registrar Pagamento
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View (Cards) */}
                      <div className="block md:hidden divide-y divide-slate-100">
                        {bookings
                          .filter((b) => {
                            if (!agendaDateFilter) return true;
                            const bDate = new Date(b.data_hora_inicio).toISOString().split("T")[0];
                            return bDate === agendaDateFilter;
                          }).length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs">
                              Nenhum agendamento encontrado para este dia.
                            </div>
                          ) : (
                            bookings
                              .filter((b) => {
                                if (!agendaDateFilter) return true;
                                const bDate = new Date(b.data_hora_inicio).toISOString().split("T")[0];
                                return bDate === agendaDateFilter;
                              })
                              .map((b) => {
                                const srv = services.find((s) => s.id === b.servico_id);
                                return (
                                  <div key={b.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{b.cliente?.nome || b.nome_cliente_avulso || "Cliente sem cadastro"}</h4>
                                        {!b.cliente && !b.cliente_id && (
                                          <div className="text-[10px] text-slate-500 mt-1 bg-yellow-100 inline-block px-2 py-0.5 rounded">Cliente sem cadastro</div>
                                        )}
                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{formatPhone(b.cliente?.telefone || b.telefone_cliente_avulso || "") || "Sem telefone"}</p>
                                      </div>
                                      <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-xl">
                                        {formatCurrency(b.valor_cobrado)}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                                      <div>
                                        <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Serviço</span>
                                        <span className="font-semibold text-slate-800">{srv ? srv.nome : "Atendimento"}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Horário</span>
                                        <span className="font-semibold text-pink-600 font-mono">
                                          {formatDate(b.data_hora_inicio)} {formatTime(b.data_hora_inicio)}
                                        </span>
                                      </div>
                                    </div>

                                    {b.observacoes && (
                                      <p className="text-xs text-slate-400 italic mt-2">Nota: “{b.observacoes}”</p>
                                    )}

                                    {(b.quantidade_remarcacoes && b.quantidade_remarcacoes > 0) && (
                                      <BookingHistoryBadge count={b.quantidade_remarcacoes || 0} onClick={() => openHistoryFor(b)} />
                                    )}

                                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-dashed border-slate-100">
                                      <div className="flex gap-1.5">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(b.status_atendimento)}`}>
                                          {b.status_atendimento}
                                        </span>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                          b.status_financeiro === "pago"
                                            ? "bg-green-100 text-green-800"
                                            : b.status_financeiro === "estornado"
                                            ? "bg-rose-100 text-rose-800"
                                            : "bg-amber-100 text-amber-800"
                                        }`}>
                                          {b.status_financeiro === "pago" ? "Pago" : b.status_financeiro === "estornado" ? "Estornado" : "Pendente"}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        {b.status_atendimento === "pendente" && (
                                          <button
                                            onClick={() => handleUpdateBookingStatus(b.id, "confirmado")}
                                            className="bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold py-1.5 px-2 rounded-lg transition"
                                          >
                                            Confirmar
                                          </button>
                                        )}
                                        {b.status_atendimento !== "concluido" && b.status_atendimento !== "cancelado" && (
                                          <>
                                            <button
                                              onClick={() => handleUpdateBookingStatus(b.id, "concluido")}
                                              className="bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold py-1.5 px-2 rounded-lg transition"
                                            >
                                              Concluir
                                            </button>
                                            <button
                                              onClick={() => handleOpenReschedule(b)}
                                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold py-1.5 px-2 rounded-lg transition"
                                            >
                                              Remarcar
                                            </button>
                                            <button
                                              onClick={() => handleUpdateBookingStatus(b.id, "cancelado")}
                                              className="bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold py-1.5 px-2 rounded-lg transition"
                                            >
                                              Cancelar
                                            </button>
                                          </>
                                        )}
                                        {b.status_financeiro === "pendente" && b.status_atendimento !== "cancelado" && (
                                          <button
                                            onClick={() => handleRegisterPayment(b.id)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition shadow-sm"
                                          >
                                            Registrar Pagamento
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CALENDAR TIME BLOCKING */}
                {currentView === "blocks" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Bloqueios & Pausas da Profissional</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Defina horários de almoço, folgas ou pausas especiais que bloqueiam a agenda online automaticamente.</p>
                      </div>
                      <button
                        onClick={() => setShowBlockForm(!showBlockForm)}
                        className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition"
                      >
                        {showBlockForm ? "Fechar Painel" : "Bloquear Novo Horário"}
                      </button>
                    </div>

                    {showBlockForm && (
                      <form onSubmit={handleCreateBlock} className="bg-white border border-pink-100 rounded-2xl p-6 shadow-md max-w-xl space-y-4">
                        <h4 className="text-sm font-bold text-pink-950">Novo Bloqueio de Período</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Pausa</label>
                            <select
                              value={blockType}
                              onChange={(e) => setBlockType(e.target.value as any)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                            >
                              <option value="almoco">Almoço</option>
                              <option value="folga">Folga / Descanso</option>
                              <option value="manual">Bloqueio Manual</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Dia do Bloqueio</label>
                            <input
                              type="date"
                              required
                              value={blockDate}
                              onChange={(e) => setBlockDate(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Consulta médica"
                              value={blockDescription}
                              onChange={(e) => setBlockDescription(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Hora de Início</label>
                            <input
                              type="time"
                              required
                              value={blockStartTime}
                              onChange={(e) => setBlockStartTime(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Hora de Término</label>
                            <input
                              type="time"
                              required
                              value={blockEndTime}
                              onChange={(e) => setBlockEndTime(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowBlockForm(false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition"
                          >
                            Ativar Bloqueio
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800">Bloqueios Ativos</h4>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {blocks.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs font-medium">
                            Nenhum bloqueio registrado. Sua agenda está 100% livre!
                          </div>
                        ) : (
                          blocks.map((block) => (
                            <div key={block.id} className="p-4 flex items-center justify-between hover:bg-slate-50 text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-900">{block.descricao}</span>
                                  <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
                                    {block.tipo}
                                  </span>
                                </div>
                                <p className="text-slate-500 font-medium">
                                  Data: {formatDate(block.data_hora_inicio)} &bull; Horário: {formatTime(block.data_hora_inicio)} até {formatTime(block.data_hora_fim)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteBlock(block.id)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                title="Excluir bloqueio"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SERVICE CONFIGURATION */}
                {currentView === "services" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Catálogo de Serviços Oferecidos</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Cadastre serviços, defina a duração estimada para a agenda e altere preços rapidamente.</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingService(null);
                          setServiceName("");
                          setServicePrice("");
                          setServiceDuration("30");
                          setServiceFotoUrl("");
                          setShowServiceForm(!showServiceForm);
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Cadastrar Novo Serviço</span>
                      </button>
                    </div>

                    {showServiceForm && (
                      <form onSubmit={handleSaveService} className="bg-white border border-pink-100 rounded-2xl p-6 shadow-md max-w-xl space-y-4">
                        <h4 className="text-sm font-bold text-pink-950">
                          {editingService ? `Editar Serviço: ${editingService.nome}` : "Cadastrar Novo Serviço"}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Serviço</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Design de Sobrancelha com Henna"
                              value={serviceName}
                              onChange={(e) => setServiceName(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Preço Cobrado (R$)</label>
                            <input
                              type="number"
                              required
                              placeholder="Ex: 50.00"
                              value={servicePrice}
                              onChange={(e) => setServicePrice(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Duração Estimada (minutos)</label>
                          <select
                            value={serviceDuration}
                            onChange={(e) => setServiceDuration(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                          >
                            <option value="15">15 minutos</option>
                            <option value="30">30 minutos</option>
                            <option value="45">45 minutos</option>
                            <option value="60">1 hora (60 min)</option>
                            <option value="90">1 hora e meia (90 min)</option>
                            <option value="120">2 horas (120 min)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Foto demonstrativa do Serviço (Para Clientes Visuais)</label>
                          <div className="mt-1.5 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            {serviceFotoUrl ? (
                              <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-slate-300 bg-white shrink-0 shadow-sm group">
                                <img src={serviceFotoUrl} alt="Preview do Serviço" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setServiceFotoUrl("")}
                                  className="absolute inset-0 bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Remover
                                </button>
                              </div>
                            ) : (
                              <div className="w-24 h-16 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-[10px] font-medium shrink-0 shadow-sm text-center px-1">
                                Sem foto
                              </div>
                            )}

                            <div className="flex-1">
                              <label className="inline-flex items-center px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold rounded-xl transition cursor-pointer shadow-sm">
                                <Upload className="h-3 w-3 mr-1.5" />
                                <span>Enviar Foto do Resultado</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleServiceImageUpload}
                                />
                              </label>
                              <p className="text-[10px] text-slate-400 mt-1">
                                Mostre como fica o serviço finalizado. Clientes decidem muito mais rápido vendo fotos de trabalhos reais!
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowServiceForm(false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition"
                          >
                            Salvar Serviço
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      {services.map((srv) => (
                        <div
                          key={srv.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:border-pink-100 transition gap-4"
                        >
                          <div className="flex items-center space-x-4">
                            {/* Service photo for professional preview */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-pink-50 border border-slate-100 shrink-0 flex items-center justify-center text-2xl shadow-sm">
                              {srv.foto_url ? (
                                <img src={srv.foto_url} alt={srv.nome} className="w-full h-full object-cover" />
                              ) : (
                                <span>💅</span>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-bold text-slate-900">{srv.nome}</h4>
                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  srv.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}>
                                  {srv.ativo ? "Ativo" : "Pausado"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                Duração estimada: {srv.duracao_estimada_minutos} minutos
                              </p>
                              <p className="text-sm font-black text-pink-600 mt-2">{formatCurrency(srv.preco)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setEditingService(srv);
                                setServiceName(srv.nome);
                                setServicePrice(srv.preco.toString());
                                setServiceDuration(srv.duracao_estimada_minutos.toString());
                                setServiceFotoUrl(srv.foto_url || "");
                                setShowServiceForm(true);
                              }}
                              className="text-pink-600 hover:bg-pink-50 text-[10px] font-bold py-1 px-3 rounded-lg border border-pink-100 transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleToggleServiceActive(srv)}
                              className="text-slate-500 hover:bg-slate-100 text-[10px] font-semibold py-1 px-3 rounded-lg border border-slate-200 transition"
                            >
                              {srv.ativo ? "Pausar" : "Ativar"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. CUSTOMER DIRECTORY */}
                {currentView === "clients" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Carteira de Clientes do Salão</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Veja a ficha de contatos, CPF de segurança e volume de agendamentos realizados.</p>
                      </div>

                      <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 w-full sm:w-64">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar cliente por nome..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="text-xs outline-none bg-transparent w-full"
                        />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      {/* Desktop View (Table) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold">
                              <th className="p-4">Nome Completo</th>
                              <th className="p-4">Telefone</th>
                              <th className="p-4">CPF (Segurança)</th>
                              <th className="p-4">Atendimentos</th>
                              <th className="p-4">Total Investido</th>
                              <th className="p-4">Fiel Desde</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                            {clients
                              .filter((c) => c.nome.toLowerCase().includes(clientSearch.toLowerCase()))
                              .map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50">
                                  <td className="p-4 font-bold text-slate-900">{c.nome}</td>
                                  <td className="p-4 font-mono font-medium">{c.telefone}</td>
                                  <td className="p-4 font-mono text-slate-400">{c.cpf}</td>
                                  <td className="p-4 font-semibold text-center sm:text-left">{c.total_agendamentos || 0} vezes</td>
                                  <td className="p-4 font-bold text-emerald-600">{formatCurrency(c.total_pago || 0)}</td>
                                  <td className="p-4 text-slate-400">{formatDate(c.criado_em)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View (Cards) */}
                      <div className="block md:hidden divide-y divide-slate-100">
                        {clients
                          .filter((c) => c.nome.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs">
                              Nenhum cliente encontrado.
                            </div>
                          ) : (
                            clients
                              .filter((c) => c.nome.toLowerCase().includes(clientSearch.toLowerCase()))
                              .map((c) => (
                                <div key={c.id} className="p-4 space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-bold text-slate-900 text-sm">{c.nome}</h4>
                                      <p className="text-[10px] text-slate-400 font-medium">Cliente ativo</p>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-xl">
                                      {formatCurrency(c.total_pago || 0)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                                    <div>
                                      <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Telefone</span>
                                      <span className="font-semibold text-slate-800 font-mono">{c.telefone}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">CPF</span>
                                      <span className="font-semibold text-slate-800 font-mono">{c.cpf}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Atendimentos</span>
                                      <span className="font-semibold text-slate-800">{c.total_agendamentos || 0} vezes</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-bold">Fiel Desde</span>
                                      <span className="font-semibold text-slate-800">{formatDate(c.criado_em)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. FINANCIAL CONTROL / CAIXA */}
                {currentView === "caixa" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-200 pb-4">
                      <h3 className="text-lg font-bold text-slate-900">Caixa Financeiro & Faturamento</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Consulte as entradas manuais automáticas, faturamento diário, semanal, mensal e registre vendas avulsas.</p>
                    </div>

                    {/* Consolidated Financial Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Faturamento Hoje</h4>
                        <p className="text-3xl font-black text-slate-900 mt-2">{formatCurrency(financeStats.dailyTotal)}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Faturamento Últimos 7 dias</h4>
                        <p className="text-3xl font-black text-slate-900 mt-2">{formatCurrency(financeStats.weeklyTotal)}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Faturamento Mensal (30 dias)</h4>
                        <p className="text-3xl font-black text-emerald-600 mt-2">{formatCurrency(financeStats.monthlyTotal)}</p>
                      </div>
                    </div>

                    {/* TWO-COLUMN FINANCIAL UTILITIES */}
                    <div className="grid lg:grid-cols-3 gap-8 items-start">
                      
                      {/* Interactive Visual Bar Chart Column */}
                      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-sm font-bold text-slate-800">Evolução do Faturamento Diário (Últimos 14 Dias)</h4>
                          <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Gráfico SVG Nativo</span>
                        </div>

                        {/* Custom Pure React SVG Chart (100% type-safe, lightweight) */}
                        <div className="pt-4">
                          <div className="h-48 w-full flex items-end justify-between space-x-2 border-b border-slate-200 pb-2">
                            {financeStats.dailyHistory.map((item) => {
                              // Find max value to normalize height
                              const maxTotal = Math.max(...financeStats.dailyHistory.map((h) => h.total), 50);
                              const heightPct = (item.total / maxTotal) * 100;

                              return (
                                <div key={item.label} className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end">
                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full mb-1 bg-slate-950 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap z-10">
                                    {formatCurrency(item.total)}
                                  </div>

                                  {/* Bar */}
                                  <div
                                    style={{ height: `${Math.max(heightPct, 3)}%` }}
                                    className={`w-full rounded-t-md transition-all duration-300 ${
                                      item.total > 0 ? "bg-pink-600 hover:bg-pink-700" : "bg-slate-100"
                                    }`}
                                  />

                                  {/* Date label */}
                                  <span className="text-[9px] text-slate-400 mt-1 font-semibold rotate-45 origin-top-left sm:rotate-0 truncate max-w-full">
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Manual Extra Cash Input Column */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <div className="border-b border-slate-100 pb-2">
                          <h4 className="text-sm font-bold text-slate-800">
                            {movTipo === "Entrada" ? "Registrar Entrada" : movTipo === "Saída" ? "Registrar Saída" : "Registrar Estorno"}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {movTipo === "Entrada"
                              ? "Utilize para registrar vendas avulsas de produtos ou outros recebimentos."
                              : movTipo === "Saída"
                              ? "Utilize para registrar qualquer saída de dinheiro do caixa."
                              : "Utilize para devolver valores pagos ou corrigir movimentações."}
                          </p>
                        </div>

                        <form onSubmit={handleCreateManualCash} className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo da Movimentação</label>
                            <select
                              value={movTipo}
                              onChange={(e) => setMovTipo(e.target.value as any)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                            >
                              <option value="Entrada">Entrada</option>
                              <option value="Saída">Saída</option>
                              <option value="Estorno">Estorno</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              {movTipo === "Entrada" ? "Valor Recebido (R$)" : movTipo === "Saída" ? "Valor Retirado (R$)" : "Valor Estornado (R$)"}
                            </label>
                            <input
                              type="number"
                              required
                              placeholder={movTipo === "Entrada" ? "Ex: 45,00" : movTipo === "Saída" ? "Ex: 30,00" : "Ex: 50,00"}
                              value={movValor}
                              onChange={(e) => setMovValor(e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                            />
                          </div>

                          {/* Entrada: Descrição + Forma de Pagamento */}
                          {movTipo === "Entrada" && (
                            <>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ex: Venda de Óleo de Cutícula"
                                  value={movDescricao}
                                  onChange={(e) => setMovDescricao(e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Forma de Pagamento *</label>
                                <select
                                  required
                                  value={movFormaPagamento}
                                  onChange={(e) => setMovFormaPagamento(e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                                >
                                  <option value="">Selecione...</option>
                                  <option value="Dinheiro">Dinheiro</option>
                                  <option value="PIX">PIX</option>
                                  <option value="Cartão">Cartão</option>
                                  <option value="Transferência">Transferência</option>
                                </select>
                              </div>
                            </>
                          )}

                          {/* Saída / Estorno: Motivo apenas (sem forma de pagamento nem descrição) */}
                          {(movTipo === "Saída" || movTipo === "Estorno") && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo *</label>
                              <input
                                type="text"
                                required
                                placeholder={
                                  movTipo === "Saída"
                                    ? "Ex: Compra de material, pagamento de fornecedor ou retirada de caixa"
                                    : "Ex: Cliente desistiu da compra ou pagamento lançado incorretamente"
                                }
                                value={movMotivo}
                                onChange={(e) => setMovMotivo(e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                              />
                            </div>
                          )}

                          {movTipo === "Estorno" && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Estorno vinculado a agendamento (opcional)</label>
                              <select
                                value={selectedEstornoAgId || ""}
                                onChange={(e) => {
                                  const agId = e.target.value || null;
                                  setSelectedEstornoAgId(agId);
                                  if (agId) {
                                    // Preencher valor com o valor pago encontrado no caixa
                                    const payment = caixaEntries.find((c) => c.agendamento_id === agId && c.tipo_movimentacao !== "Estorno");
                                    if (payment) setMovValor(String(payment.valor));
                                  }
                                }}
                                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                              >
                                <option value="">Nenhum (estorno avulso)</option>
                                {eligibleEstornoBookings.map((b) => {
                                  const srv = services.find((s) => s.id === b.servico_id);
                                  const clientName = (b as any).cliente?.nome || b.nome_cliente_avulso || "Cliente";
                                  const payment = caixaEntries.find((c) => c.agendamento_id === b.id && c.tipo_movimentacao !== "Estorno");
                                  const val = payment ? formatCurrency(payment.valor) : formatCurrency(b.valor_cobrado || 0);
                                  return (
                                    <option key={b.id} value={b.id}>
                                          {`${clientName} — ${srv ? srv.nome : "Serviço"} — ${formatDate(b.data_hora_inicio)} ${formatTime(
                                            b.data_hora_inicio
                                          )} — ${val}`}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              )}
                          

                          {/* Informações adicionais (link discreto) */}
                          <div>
                            <button
                              type="button"
                              onClick={() => setShowAdditionalInfo((s) => !s)}
                              className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-2"
                            >
                              <span className="text-sm">{showAdditionalInfo ? "▲" : "▼"}</span>
                              <span>Informações adicionais (opcional)</span>
                            </button>
                          </div>

                          {showAdditionalInfo && (
                            <>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Observação (opcional)</label>
                                <input
                                  type="text"
                                  placeholder="Observações adicionais"
                                  value={movObservacao}
                                  onChange={(e) => setMovObservacao(e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Referência (opcional)</label>
                                <input
                                  type="text"
                                  placeholder="Ex: NF-1234, Pedido-456"
                                  value={movReferencia}
                                  onChange={(e) => setMovReferencia(e.target.value)}
                                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-pink-600"
                                />
                              </div>
                            </>
                          )}

                          <button
                            type="submit"
                            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition shadow-sm flex items-center justify-center space-x-2"
                          >
                            {movTipo === "Entrada" && <ArrowDownCircle className="w-4 h-4" />}
                            {movTipo === "Saída" && <ArrowUpCircle className="w-4 h-4" />}
                            {movTipo === "Estorno" && <RotateCcw className="w-4 h-4" />}
                            <span>{movTipo === "Entrada" ? "Registrar Entrada" : movTipo === "Saída" ? "Registrar Saída" : "Registrar Estorno"}</span>
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Cash register transaction log */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800">Fluxo de Caixa Consolidado (Entradas)</h4>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {caixaEntries.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs font-medium">
                            Nenhum registro de faturamento neste caixa.
                          </div>
                        ) : (
                          caixaEntries.map((item) => {
                            const anyItem = item as any;
                            const bkg = anyItem.agendamento_id ? bookings.find((b) => b.id === anyItem.agendamento_id) : null;
                            const srv = bkg ? services.find((s) => s.id === bkg.servico_id) : null;
                            const tm = anyItem.tipo_movimentacao;
                            const isAtendimento = !!item.agendamento_id;
                            const isSaida = tm === "Saída";
                            const isEstorno = tm === "Estorno";
                            const isEntradaManual = !isAtendimento && !isSaida && !isEstorno;
                            const valorNegativo = isSaida || isEstorno;

                            const title = isAtendimento
                              ? (srv ? srv.nome : item.descricao)
                              : (isSaida || isEstorno)
                              ? (anyItem.motivo || "—")
                              : (item.descricao || "—");

                            const tipoLabel = isEntradaManual ? "Entrada Manual" : isSaida ? "Saída de Caixa" : "Estorno";
                            const clientName = bkg?.cliente?.nome || bkg?.nome_cliente_avulso || "Cliente sem cadastro";
                            const dateStr = formatDate(item.data_pagamento);
                            const timeStr = formatTime(item.data_pagamento);
                            const origemLabel = anyItem.origem || (isAtendimento ? "Atendimento" : "Manual");

                            const statusLabel = isEstorno ? "Estornado" : isAtendimento ? "Pago" : isEntradaManual ? "Recebido" : isSaida ? "Registrada" : "Estornado";
                            const statusClass = valorNegativo
                              ? "inline-flex items-center text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full uppercase"
                              : "inline-flex items-center text-[9px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded-full uppercase";

                            const IconComp = isAtendimento ? CalendarCheck : isEntradaManual ? ArrowDownCircle : isSaida ? ArrowUpCircle : RotateCcw;
                            const iconClass = `h-3.5 w-3.5 shrink-0 ${valorNegativo ? "text-red-400" : "text-emerald-400"}`;

                            return (
                              <div key={item.id} className="p-4 hover:bg-slate-50 transition border-b border-slate-100 text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                  {/* Section 1: Título + Tipo ou Cliente */}
                                  <div className="space-y-0.5 md:col-span-2">
                                    <div className="flex items-center gap-1.5">
                                      {isAtendimento ? (
                                        <CalendarCheck className={iconClass} />
                                      ) : isEntradaManual ? (
                                        <ArrowDownCircle className={iconClass} />
                                      ) : isSaida ? (
                                        <ArrowUpCircle className={iconClass} />
                                      ) : (
                                        <RotateCcw className={iconClass} />
                                      )}
                                      <span className="font-bold text-slate-900 truncate" title={title}>
                                        {title}
                                      </span>
                                    </div>
                                    {isAtendimento ? (
                                      <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                                        <span className="font-semibold text-slate-400">Cliente:</span>
                                        <span className="font-medium">{clientName}</span>
                                      </div>
                                    ) : (
                                      <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                                        <span className="font-semibold text-slate-400">Tipo:</span>
                                        <span className="font-medium">{tipoLabel}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Section 2: DateTime e Origem */}
                                  <div className="text-[10px] text-slate-500 space-y-0.5">
                                    <div className="flex items-center space-x-1">
                                      <span className="font-semibold text-slate-400">Data/Hora:</span>
                                      <span>{dateStr} - {timeStr}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <span className="font-semibold text-slate-400">Origem:</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                        isAtendimento ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-purple-50 text-purple-700 border border-purple-100"
                                      }`}>
                                        {origemLabel}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Section 3: Valor e Status */}
                                  <div className="flex md:justify-end items-center space-x-2">
                                    <div className="text-right">
                                      <span className={`font-extrabold text-sm block ${valorNegativo ? "text-red-600" : "text-emerald-600"}`}>
                                        {valorNegativo ? "- " : "+ "}{formatCurrency(item.valor)}
                                      </span>
                                      <span className={statusClass}>
                                        {statusLabel}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentView === "pro-profile" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-200 pb-4">
                      <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                        <User className="h-6 w-6 text-pink-600 mr-2" />
                        Perfil do Profissional & Configurações do Salão
                      </h2>
                      <p className="text-sm text-slate-500 mt-0.5">Gerencie os seus dados de acesso, preferências visuais do seu salão e configurações de segurança.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Block: Photo/Avatar and Salon Summary */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 h-fit">
                        <div className="relative w-24 h-24 rounded-full bg-pink-50 border-2 border-pink-100 flex items-center justify-center text-5xl shadow-md overflow-hidden">
                          {proProfileUrl ? (
                            <img src={proProfileUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{proProfileEmoji}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{proProfileSalonName || "Meu Salão de Beleza"}</h3>
                          <p className="text-xs text-pink-600 font-medium tracking-wide">Dona: {proProfileName || "Profissional"}</p>
                          <p className="text-xs text-slate-400 mt-1">{currentUser?.email}</p>
                        </div>
                        <div className="w-full pt-4 border-t border-slate-100 space-y-2 text-left">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dados do Salão</div>
                          <div className="text-xs text-slate-600 flex items-center justify-between">
                            <span>Link de Agendamento:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-pink-600">/{proProfileSlug || ""}</span>
                              <button type="button" onClick={() => copySalonLink(proProfileSlug)} className="text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-xl">
                                📋 Copiar Link
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 flex justify-between">
                            <span>Telefone:</span>
                            <span className="text-slate-500">{proProfilePhone || "Não cadastrado"}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-2 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            🌍 <strong>Link público do seu workspace:</strong><br />
                            <a href={`#${proProfileSlug}`} className="text-pink-600 hover:underline break-all font-semibold block mt-1">
                              {window.location.origin}/#{proProfileSlug}
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Profile forms */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* General Info Form */}
                        <form onSubmit={handleUpdateProProfile} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                          <h3 className="text-base font-bold text-slate-900 flex items-center">
                            <Scissors className="h-5 w-5 text-pink-600 mr-2" />
                            Informações Cadastrais do Salão
                          </h3>
                          <p className="text-xs text-slate-500 -mt-4">
                            Mantenha os dados do seu salão atualizados. A alteração do Link de Agendamento altera o endereço do seu salão na internet.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Salão/Workspace</label>
                              <input
                                type="text"
                                required
                                value={proProfileSalonName}
                                onChange={(e) => setProProfileSalonName(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da Proprietária (Você)</label>
                              <input
                                type="text"
                                required
                                value={proProfileName}
                                onChange={(e) => setProProfileName(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Comercial</label>
                              <input
                                type="text"
                                required
                                placeholder="Ex: (11) 98888-7777"
                                value={proProfilePhone}
                                onChange={(e) => setProProfilePhone(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço do Salão</label>
                              <input
                                type="text"
                                placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo"
                                value={proProfileEndereco}
                                onChange={(e) => setProProfileEndereco(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Link de Agendamento (Identificador do Endereço)</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  required
                                  placeholder="Ex: bella-sobrancelha"
                                  value={proProfileSlug}
                                  onChange={(e) => setProProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition font-mono text-pink-600"
                                />
                                <button type="button" onClick={() => copySalonLink(proProfileSlug)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
                                  📋 Copiar Link
                                </button>
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Pequena Descrição do Salão (Aparece para os Clientes)</label>
                              <textarea
                                placeholder="Ex: Especialistas em cílios, sobrancelhas e manicure com atendimento personalizado."
                                value={proProfileDesc}
                                onChange={(e) => setProProfileDesc(e.target.value)}
                                rows={2}
                                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Escolha seu Emoji Avatar</label>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {["💅", "💇", "💄", "🧖", "🧼", "🌸", "👑", "✨", "🎀", "💖", "🧁", "🦄"].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setProProfileEmoji(emoji);
                                      setProProfileUrl(""); // Clear URL if emoji selected
                                    }}
                                    className={`text-xl p-2.5 rounded-xl border transition ${proProfileEmoji === emoji && !proProfileUrl ? "border-pink-500 bg-pink-50 scale-110 shadow-sm" : "border-slate-200 hover:bg-slate-50"}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Ou envie uma Logomarca/Foto do seu salão</label>
                              <div className="mt-1.5 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                {proProfileUrl ? (
                                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-300 bg-white shrink-0 shadow-sm group">
                                    <img src={proProfileUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setProProfileUrl("")}
                                      className="absolute inset-0 bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 rounded-2xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-xs font-medium shrink-0 shadow-sm">
                                    Sem Foto
                                  </div>
                                )}

                                <div className="flex-1">
                                  <label className="inline-flex items-center px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm">
                                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                                    <span>Selecionar Foto</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleProProfileImageUpload}
                                    />
                                  </label>
                                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                                    Sua foto será otimizada e salva diretamente no sistema. Ideal para uso em computadores e celulares.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">⏰ Horários de Atendimento e Almoço</h4>
                              <p className="text-xs text-slate-500 -mt-2 mb-4">
                                Defina o horário de início e término do seu expediente de atendimentos, bem como o seu intervalo de almoço padrão para bloquear novos agendamentos automaticamente.
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Início do Expediente</label>
                                  <input
                                    type="time"
                                    required
                                    value={proProfileStartExpediente}
                                    onChange={(e) => setProProfileStartExpediente(e.target.value)}
                                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fim do Expediente</label>
                                  <input
                                    type="time"
                                    required
                                    value={proProfileEndExpediente}
                                    onChange={(e) => setProProfileEndExpediente(e.target.value)}
                                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                                  />
                                </div>

                                <div className="sm:col-span-2 mt-2 bg-pink-50/50 p-4 rounded-2xl border border-pink-100/50">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={proProfileHasAlmoco}
                                      onChange={(e) => setProProfileHasAlmoco(e.target.checked)}
                                      className="rounded text-pink-600 focus:ring-pink-500 h-4 w-4 border-slate-300"
                                    />
                                    <span className="text-xs font-semibold text-slate-700 select-none">
                                      Possuo horário de almoço padrão (bloqueia automaticamente agendamentos neste intervalo)
                                    </span>
                                  </label>

                                  {proProfileHasAlmoco && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-pink-100/50">
                                      <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Início do Almoço</label>
                                        <input
                                          type="time"
                                          required={proProfileHasAlmoco}
                                          value={proProfileStartAlmoco}
                                          onChange={(e) => setProProfileStartAlmoco(e.target.value)}
                                          className="w-full bg-white text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Fim do Almoço</label>
                                        <input
                                          type="time"
                                          required={proProfileHasAlmoco}
                                          value={proProfileEndAlmoco}
                                          onChange={(e) => setProProfileEndAlmoco(e.target.value)}
                                          className="w-full bg-white text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">🛡️ Sistema de Recuperação de Senha por Pergunta de Segurança</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pergunta de Segurança</label>
                                  <select
                                    value={proProfileQuestion}
                                    onChange={(e) => setProProfileQuestion(e.target.value)}
                                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                                  >
                                    <option value="">-- Escolha uma pergunta --</option>
                                    <option value="Qual o nome do seu primeiro pet?">Qual o nome do seu primeiro pet?</option>
                                    <option value="Em qual cidade você nasceu?">Em qual cidade você nasceu?</option>
                                    <option value="Qual era o modelo do seu primeiro carro?">Qual era o modelo do seu primeiro carro?</option>
                                    <option value="Qual o nome da sua escola primária?">Qual o nome da sua escola primária?</option>
                                    <option value="Qual o seu prato preferido da infância?">Qual o seu prato preferido da infância?</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sua Resposta Secreta</label>
                                  <input
                                    type="password"
                                    placeholder="Nova resposta de segurança"
                                    value={proProfileAnswer}
                                    onChange={(e) => setProProfileAnswer(e.target.value)}
                                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-1">A resposta não diferencia maiúsculas/minúsculas nem espaços extras.</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition shadow-sm cursor-pointer"
                            >
                              Salvar Informações do Salão
                            </button>
                          </div>
                        </form>

                        {/* Change Password Form */}
                        <form onSubmit={handleChangeProPassword} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                          <h3 className="text-base font-bold text-slate-900 flex items-center">
                            <Lock className="h-5 w-5 text-pink-600 mr-2" />
                            Alterar Senha do Profissional
                          </h3>
                          <p className="text-xs text-slate-500 -mt-2">
                            Recomendamos usar uma senha forte e única para proteger as informações financeiras e agendamentos do seu salão.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Atual</label>
                              <input
                                type="password"
                                required
                                value={proCurrentPassword}
                                onChange={(e) => setProCurrentPassword(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha</label>
                              <input
                                type="password"
                                required
                                value={proNewPassword}
                                onChange={(e) => setProNewPassword(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nova Senha</label>
                              <input
                                type="password"
                                required
                                value={proConfirmPassword}
                                onChange={(e) => setProConfirmPassword(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition shadow-sm cursor-pointer"
                            >
                              Alterar Senha Profissional
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </main>

      {/* ==========================================
          CLIENT PASSWORD RECOVERY MODAL
         ========================================== */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-md w-full space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Lock className="h-5 w-5 text-pink-600 mr-2" />
                Recuperação de Senha Segura
              </h3>
              <button
                onClick={() => {
                  setShowRecoveryModal(false);
                  setClientRecoveryStep(1);
                  setRecoverPhone("");
                  setRecoverLastFourCpf("");
                  setRecoverNewPassword("");
                  setRecoverConfirmPassword("");
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {clientRecoveryStep === 1 ? (
              <form onSubmit={handleVerifyRecoveryPhone} className="space-y-4">
                <div className="text-center pb-1">
                  <p className="text-[11px] text-pink-600 font-semibold uppercase tracking-wider">Etapa 1 de 3: Identifique sua conta</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Cadastrado</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: (11) 99999-1111"
                    value={recoverPhone}
                    onChange={(e) => setRecoverPhone(formatPhone(e.target.value))}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-pink-600"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryModal(false);
                      setClientRecoveryStep(1);
                      setRecoverPhone("");
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Buscar Cadastro
                  </button>
                </div>
              </form>
            ) : clientRecoveryStep === 2 ? (
              <form onSubmit={handleVerifyRecoveryCpf} className="space-y-4">
                <div className="text-center pb-1">
                  <p className="text-[11px] text-pink-600 font-semibold uppercase tracking-wider">Etapa 2 de 3: Confirmação de Segurança</p>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs text-slate-600 mb-2 leading-relaxed">
                  <p><strong>Telefone:</strong> {recoverPhone}</p>
                  <p className="mt-1">Para concluir a validação, info os 4 últimos dígitos do seu CPF cadastrado.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">4 Últimos Dígitos do CPF</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="Apenas os últimos 4 números (Ex: 8900)"
                    value={recoverLastFourCpf}
                    onChange={(e) => setRecoverLastFourCpf(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-pink-600"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClientRecoveryStep(1);
                      setRecoverLastFourCpf("");
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Validar CPF
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordRecovery} className="space-y-4">
                <div className="text-center pb-1">
                  <p className="text-[11px] text-pink-600 font-semibold uppercase tracking-wider">Etapa 3 de 3: Cadastrar Nova Senha</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-start space-x-2 text-xs text-emerald-900 mb-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <p className="font-medium leading-normal">
                    Identidade confirmada! Por favor, escolha e confirme sua nova senha abaixo.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha Escolhida</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={recoverNewPassword}
                    onChange={(e) => setRecoverNewPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-pink-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirme a nova senha"
                    value={recoverConfirmPassword}
                    onChange={(e) => setRecoverConfirmPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-pink-600"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClientRecoveryStep(2);
                      setRecoverNewPassword("");
                      setRecoverConfirmPassword("");
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Salvar Nova Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          ADMIN PASSWORD RECOVERY MODAL
         ========================================== */}
      {showRecoverModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-md w-full space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Shield className="h-5 w-5 text-pink-600 mr-2" />
                Recuperação Master Admin
              </h3>
              <button
                onClick={() => {
                  setShowRecoverModal(false);
                  setRecoverStep(1);
                  setRecoverQuestion("");
                  setRecoverAnswer("");
                  setRecoverAdminNewPassword("");
                  setRecoverAdminConfirmPassword("");
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-pink-50 border border-pink-100 p-4 rounded-2xl flex items-start space-x-3 text-xs text-pink-900">
              <Info className="h-4.5 w-4.5 text-pink-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">
                A redefinição da conta master exige que você responda corretamente à pergunta de segurança cadastrada em seu perfil.
              </p>
            </div>

            {recoverStep === 1 ? (
              <form onSubmit={handleRecoverPasswordStep1} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail do Administrador</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: admin@salao.com"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-50"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowRecoverModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Buscar Pergunta
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRecoverPasswordStep2} className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sua Pergunta de Segurança:</span>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{recoverQuestion}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sua Resposta Secreta</label>
                  <input
                    type="password"
                    required
                    placeholder="Sua resposta secreta de segurança"
                    value={recoverAnswer}
                    onChange={(e) => setRecoverAnswer(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={recoverAdminNewPassword}
                    onChange={(e) => setRecoverAdminNewPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a nova senha"
                    value={recoverAdminConfirmPassword}
                    onChange={(e) => setRecoverAdminConfirmPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-50"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setRecoverStep(1)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Confirmar & Resetar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          PROFESSIONAL PASSWORD RECOVERY MODAL
         ========================================== */}
      {showProRecoverModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-md w-full space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Scissors className="h-5 w-5 text-pink-600 mr-2" />
                Recuperação de Acesso do Salão
              </h3>
              <button
                onClick={() => {
                  setShowProRecoverModal(false);
                  setProRecoverStep(1);
                  setProRecoverQuestion("");
                  setProRecoverAnswer("");
                  setProRecoverNewPassword("");
                  setProRecoverConfirmPassword("");
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-pink-50 border border-pink-100 p-4 rounded-2xl flex items-start space-x-3 text-xs text-pink-900">
              <Info className="h-4.5 w-4.5 text-pink-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">
                A redefinição da conta profissional exige que você responda corretamente à pergunta de segurança cadastrada em seu salão.
              </p>
            </div>

            {proRecoverStep === 1 ? (
              <form onSubmit={handleProRecoverPasswordStep1} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail Cadastrado do Salão</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: dono@bella.com"
                    value={proRecoverEmail}
                    onChange={(e) => setProRecoverEmail(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-50"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowProRecoverModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Buscar Pergunta
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleProRecoverPasswordStep2} className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pergunta de Segurança Cadastrada:</span>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{proRecoverQuestion}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sua Resposta Secreta</label>
                  <input
                    type="password"
                    required
                    placeholder="Sua resposta secreta de segurança"
                    value={proRecoverAnswer}
                    onChange={(e) => setProRecoverAnswer(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={proRecoverNewPassword}
                    onChange={(e) => setProRecoverNewPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a nova senha"
                    value={proRecoverConfirmPassword}
                    onChange={(e) => setProRecoverConfirmPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-50"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setProRecoverStep(1)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Confirmar & Resetar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          RESCHEDULING MODAL (PR-05)
         ========================================== */}
      {reschedulingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Calendar className="h-5 w-5 text-indigo-600 mr-2" />
                Remarcar Atendimento
              </h3>
              <button
                onClick={() => setReschedulingBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Preencha a nova data e o novo horário desejado para o atendimento. O sistema validará automaticamente os conflitos de horários de funcionamento, almoço e outros agendamentos.
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{
                      reschedulingBooking.cliente?.nome
                      || reschedulingBooking.nome_cliente_avulso
                      || (
                        currentUser?.role === "client"
                        && String(reschedulingBooking.cliente_id) === String(currentUser?.id)
                          ? currentUser.nome
                          : undefined
                      )
                      || "Cliente sem cadastro"
                    }</div>
                    {!reschedulingBooking.cliente && !reschedulingBooking.cliente_id && (
                      <div className="text-[10px] text-slate-500 mt-1 bg-yellow-100 inline-block px-2 py-0.5 rounded">Cliente sem cadastro</div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Serviço:</span>
                  <span className="font-semibold text-slate-800">
                    {services.find((s) => s.id === reschedulingBooking.servico_id)?.nome || "Atendimento"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data/Hora Atual:</span>
                  <span className="font-mono text-pink-600 font-bold">
                    {formatDate(reschedulingBooking.data_hora_inicio)} {formatTime(reschedulingBooking.data_hora_inicio)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveReschedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Data</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-pink-100 focus:border-pink-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Novo Horário</label>
                  {/* Reuse available slots UI: compute slots for the service/date, ignoring the booking itself */}
                  {reschedulingBooking && (
                    <div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {computeAvailableSlots(reschedulingBooking.servico_id, rescheduleDate, reschedulingBooking.id).map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setRescheduleTime(slot.time)}
                            className={`text-xs py-2 px-1 rounded-xl font-bold transition flex flex-col items-center justify-center border ${
                              rescheduleTime === slot.time
                                ? "bg-pink-600 border-pink-600 text-white"
                                : slot.available
                                ? "bg-pink-50 border-pink-100 text-pink-800 hover:bg-pink-100"
                                : "bg-slate-50 border-slate-100 text-slate-300 line-through cursor-not-allowed"
                            }`}
                            title={slot.conflictReason || "Horário livre"}
                          >
                            <span>{slot.time}</span>
                            {!slot.available && (
                              <span className="text-[7px] font-medium leading-none block mt-0.5 max-w-full truncate">Ocupado</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setReschedulingBooking(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingReschedule}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    {isSavingReschedule ? "Salvando..." : "Confirmar Alteração"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SALON DELETE CONFIRMATION MODAL (iFrame Safe)
         ========================================== */}
      {salonToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-md w-full space-y-6">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="bg-rose-50 p-2 rounded-xl">
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Confirmar Exclusão Permanente
              </h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Você está prestes a excluir permanentemente o salão:
              </p>
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-center">
                <span className="font-bold text-sm text-rose-900 font-display block">
                  {salonToDelete.nome}
                </span>
                <span className="text-[10px] text-rose-500 font-semibold block mt-1 uppercase tracking-wider">
                  ID: {salonToDelete.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta ação é <strong className="text-rose-600">irreversível</strong> e removerá automaticamente todos os dados associados, incluindo:
              </p>
              <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 bg-slate-50 p-3 rounded-2xl">
                <li>Todos os Serviços cadastrados</li>
                <li>Histórico e próximos Agendamentos</li>
                <li>Base de Clientes associada</li>
                <li>Todos os Lançamentos e fluxo de Caixa</li>
              </ul>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setSalonToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition"
              >
                Voltar (Cancelar)
              </button>
              <button
                type="button"
                onClick={executeAdminDeleteSalon}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-3 rounded-xl transition shadow-sm shadow-rose-100"
              >
                Sim, Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT CANCEL CONFIRMATION MODAL (reuse reschedule modal styling) */}
      {cancelingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-md w-full space-y-6">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="bg-rose-50 p-2 rounded-xl">
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">Cancelar Agendamento</h3>
              <button onClick={() => setCancelingBooking(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">Deseja realmente cancelar este agendamento?</p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{
                      cancelingBooking.cliente?.nome
                      || cancelingBooking.nome_cliente_avulso
                      || (
                        currentUser?.role === "client"
                        && String(cancelingBooking.cliente_id) === String(currentUser?.id)
                          ? currentUser.nome
                          : undefined
                      )
                      || "Cliente sem cadastro"
                    }</div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Serviço:</span>
                  <span className="font-semibold text-slate-800">{services.find((s) => s.id === cancelingBooking.servico_id)?.nome || "Atendimento"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data/Hora:</span>
                  <span className="font-mono text-pink-600 font-bold">{formatDate(cancelingBooking.data_hora_inicio)} {formatTime(cancelingBooking.data_hora_inicio)}</span>
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setCancelingBooking(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isCanceling}
                  onClick={async () => {
                    if (!cancelingBooking) return;
                    setIsCanceling(true);
                    await handleUpdateBookingStatus(cancelingBooking.id, "cancelado");
                    setIsCanceling(false);
                    setCancelingBooking(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {isCanceling ? "Cancelando..." : "Sim, cancelar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          FOOTER CREDIT LINE
         ========================================== */}
      {/* Booking history modal (UX-only) */}
      <BookingHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} remarcacoes={historyItems || undefined} />
      <footer className="bg-white border-t border-slate-100 py-3 text-center text-xs text-slate-400 font-medium">
        <p>&copy; {new Date().getFullYear()} StudioFlow. Todos os direitos reservados.</p>
        <p className="mt-1 text-[11px] text-slate-400/80">StudioFlow • Desenvolvido e gerenciado pela ConectaVTX</p>
      </footer>
    </div>
  );
}
