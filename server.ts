import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { supabaseAdmin, supabaseAuth } from './src/lib/supabaseAdmin';
import {
  Lead,
  Activity,
  Contract,
  Commission,
  UserProfile,
  CrmSettings,
  RolePermissionConfig,
  RolePermissions,
  Funnel,
  UserRole,
  OutgoingWebhook,
  WebhookEvent,
  McpToken,
  Invite,
  AuditLogEntry,
  Client
} from './src/types';
import { mountMcpServer } from './src/services/mcpServer';

const app = express();
const PORT = 3000;

interface DatabaseSchema {
  users: UserProfile[];
  funnels: Funnel[];
  rolePermissions: Record<UserRole, RolePermissionConfig>;
  settings: CrmSettings;
  clients: Client[];
  leads: Lead[];
  activities: Activity[];
  contracts: Contract[];
  commissions: Commission[];
  notifications: any[];
  outgoingWebhooks: OutgoingWebhook[];
  mcpTokens: StoredMcpToken[];
  invites: Invite[];
  auditLog: AuditLogEntry[];
  // Server-side-only: maps a profile id (public.profiles.id, the app's own
  // id scheme) to the corresponding Supabase Auth (GoTrue) user id. Never
  // included in any client-facing response — see stripPrivate() below.
  authLinks: Record<string, string>;
}

// Server-side-only shape: the raw token is never persisted, only its SHA-256
// hash. Any response that includes mcpTokens must strip tokenHash first —
// see stripTokenHash() below.
interface StoredMcpToken extends McpToken {
  tokenHash: string;
}

function stripTokenHash(tokens: StoredMcpToken[]): McpToken[] {
  return tokens.map(({ tokenHash, ...rest }) => rest);
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// ------------------------------------------
// FILE STORAGE (Supabase Storage) — replaces embedding files as base64 in
// lead/contract records. Uploads go through this bucket; only the resulting
// public URL is persisted on the lead.
// ------------------------------------------
const STORAGE_BUCKET = 'lead-files';
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB — generous ceiling for multi-page contract PDFs

async function ensureStorageBucket() {
  const { data: existing, error: getErr } = await supabaseAdmin.storage.getBucket(STORAGE_BUCKET);
  if (existing && !getErr) return;

  const { error: createErr } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_UPLOAD_BYTES
  });
  if (createErr && !/already exists/i.test(createErr.message)) {
    console.error('Falha ao criar bucket de storage:', createErr.message);
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

async function uploadBase64ToStorage(fileName: string, mimeType: string, dataBase64: string) {
  const buffer = Buffer.from(dataBase64, 'base64');
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`Arquivo excede o limite de ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }

  const storagePath = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${sanitizeFileName(fileName)}`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType || 'application/octet-stream', upsert: false });
  if (uploadErr) throw uploadErr;

  const { data: publicUrlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return { url: publicUrlData.publicUrl, path: storagePath, size: buffer.byteLength };
}

function generateSecret(prefix: string, bytes = 24): string {
  return `${prefix}_${crypto.randomBytes(bytes).toString('hex')}`;
}

// Normalizes a Brazilian phone number to DDI(55)+DDD+number for WhatsApp.
// Restores the fuller logic the old client-side formatter had (deleted along
// with services/evolutionApi.ts) — the inline `if (!startsWith('55') && ...)`
// checks that replaced it dropped the old-format 10-digit "insert the mobile
// 9th digit" fix-up and the bare-9-digit default-DDD fallback.
function formatBrazilPhone(rawPhone: string): string {
  let phone = (rawPhone || '').replace(/\D/g, '');
  if (!phone) return '';

  if (phone.length >= 12 && phone.startsWith('55')) return phone;
  if (phone.length === 11) return `55${phone}`;

  if (phone.length === 10) {
    const ddd = phone.substring(0, 2);
    const firstDigit = phone.substring(2, 3);
    // Old 8-digit mobile numbers (pre-2012, no leading 9) started with
    // 6/7/8/9 depending on the carrier — not just 8.
    if (['6', '7', '8', '9'].includes(firstDigit)) phone = `${ddd}9${phone.substring(2)}`;
    return `55${phone}`;
  }

  if (phone.length === 9) return `5511${phone}`;

  return phone.startsWith('55') ? phone : `55${phone}`;
}

// How many recent audit entries to keep in memory / serve via GET /api/audit.
// The table itself is unbounded — this only caps what a single boot/request
// loads, so the log stays cheap without needing pagination yet.
const AUDIT_LOG_LIMIT = 300;

function signPayload(secret: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

// Strips server-only auth/secret state from a dbState-shaped object before
// it's sent to the client — mirrors stripTokenHash() for mcpTokens.
function stripPrivate(state: DatabaseSchema) {
  const { mcpTokens, authLinks, invites, ...publicState } = state;
  return { ...publicState, mcpTokens: stripTokenHash(mcpTokens) };
}

// ==========================================
// Supabase row <-> entity mapping helpers
// ==========================================
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
}
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

// Full 1:1 field mapping (every entity field is a real column).
function toSnakeRow(obj: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) row[camelToSnake(k)] = v;
  }
  return row;
}
function fromSnakeRow(row: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) obj[snakeToCamel(k)] = v;
  return obj;
}

// Hybrid mapping: known fields become real columns, everything else is
// folded into a `data` JSONB column — used for the richer entities (leads,
// activities, contracts, commissions, notifications) that carry a lot of
// detail-only nested data not worth normalizing yet.
function toHybridRow(obj: Record<string, any>, columnKeys: string[]): Record<string, any> {
  const row: Record<string, any> = {};
  const rest: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (columnKeys.includes(k)) row[camelToSnake(k)] = v;
    else rest[k] = v;
  }
  row.data = rest;
  return row;
}
function fromHybridRow(row: Record<string, any>): Record<string, any> {
  const { data, ...cols } = row;
  const obj: Record<string, any> = { ...(data || {}) };
  for (const [k, v] of Object.entries(cols)) {
    if (v !== null) obj[snakeToCamel(k)] = v;
  }
  return obj;
}

const LEAD_COLS = ['id', 'name', 'phone', 'email', 'funnelId', 'stageId', 'brokerId', 'status', 'temperature', 'estimatedValue', 'createdAt', 'archived', 'clientPortalToken'];
const ACTIVITY_COLS = ['id', 'leadId', 'brokerId', 'type', 'dateTime', 'reminderTime', 'completed', 'createdAt'];
const CONTRACT_COLS = ['id', 'leadId', 'brokerId', 'clientName', 'enterpriseName', 'value', 'status', 'closedAt', 'commissionPercent', 'brokerCommissionPercent', 'totalCommissionValue'];
const COMMISSION_COLS = ['id', 'contractId', 'brokerId', 'installmentNumber', 'totalInstallments', 'dueDate', 'paymentDate', 'amount', 'status'];
const NOTIFICATION_COLS = ['id', 'createdAt'];

async function syncTable(table: string, rows: Record<string, any>[], idKey = 'id') {
  const { data: existing, error: fetchErr } = await supabaseAdmin.from(table).select(idKey);
  if (fetchErr) throw fetchErr;
  const existingIds = new Set((existing || []).map((r: any) => r[idKey]));
  const incomingIds = new Set(rows.map(r => r[idKey]));
  const toDelete = [...existingIds].filter(id => !incomingIds.has(id));

  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from(table).upsert(rows, { onConflict: idKey });
    if (error) throw error;
  }
  if (toDelete.length > 0) {
    const { error } = await supabaseAdmin.from(table).delete().in(idKey, toDelete);
    if (error) throw error;
  }
}

async function fetchAll(table: string) {
  const { data, error } = await supabaseAdmin.from(table).select('*');
  if (error) throw error;
  return data || [];
}

// Body Parsers with generous limits for documents & media base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Clean Default Dataset
const DEFAULT_DATABASE_STATE: DatabaseSchema = {
  users: [
    {
      id: 'user-admin-1',
      name: 'Administrador',
      email: '',
      role: 'admin',
      roleLabel: 'Diretor / Administrador',
      creci: '',
      phone: '',
      initials: 'AD',
      avatarColor: '#344E41',
      active: true,
      assignedLeadCount: 0
    }
  ],
  funnels: [
    { id: 'investidores', name: 'Investidores', description: 'Funil para compradores de alta renda e investidores' },
    { id: 'moradia', name: 'Moradia', description: 'Funil para famílias e primeiro/segundo imóvel próprio' },
    { id: 'lancamentos', name: 'Lançamentos', description: 'Funil de pré-lançamentos e plantas' }
  ],
  rolePermissions: {
    admin: {
      role: 'admin',
      name: 'Administrador / Gestor',
      badgeLabel: 'ADMINISTRADOR',
      description: 'Acesso irrestrito a todos os módulos, relatórios de toda a equipe e permissões.',
      allowedModules: ['dashboard', 'funnels', 'agenda', 'birthdays', 'contracts', 'commissions', 'settings'],
      permissions: {
        canViewAllLeads: true,
        canDeleteLeads: true,
        canExportLeads: true,
        canViewAllCommissions: true,
        canManageContracts: true,
        canSetGoals: true,
        canManageTeam: true,
        canAccessSettings: true,
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteContracts: true,
        canMarkCommissionsPaid: true,
        canManageWebhooks: true,
        canManageMcp: true,
        canManageWhatsApp: true,
        canViewTeamLeads: true
      }
    },
    broker: {
      role: 'broker',
      name: 'Corretor de Imóveis',
      badgeLabel: 'CORRETOR',
      description: 'Visualiza estritamente os seus próprios leads, visitas, aniversariantes e comissões.',
      allowedModules: ['dashboard', 'funnels', 'agenda', 'birthdays', 'contracts', 'commissions'],
      permissions: {
        canViewAllLeads: false,
        canDeleteLeads: false,
        canExportLeads: true,
        canViewAllCommissions: false,
        canManageContracts: true,
        canSetGoals: false,
        canManageTeam: false,
        canAccessSettings: false,
        canCreateLeads: true,
        canEditLeads: true,
        canDeleteContracts: false,
        canMarkCommissionsPaid: false,
        canManageWebhooks: false,
        canManageMcp: false,
        canManageWhatsApp: false,
        canViewTeamLeads: false
      }
    }
  },
  settings: {
    companyName: '',
    slogan: '',
    brokerName: 'Administrador',
    brokerRole: 'Diretor / Administrador',
    brokerInitials: 'AD',
    creci: '',
    brokerPhone: '',
    brokerEmail: '',
    alertsEnabled: true,
    defaultReminderAdvance: '30 minutos antes',
    birthdayTemplate: `Olá {primeiro_nome}! 🎂🥂✨\n\nA {empresa} passa para te desejar um feliz aniversário! Que este novo ciclo venha repleto de saúde, realizações e novas conquistas — incluindo o seu projeto imobiliário no {imovel}. 🏡✨\n\nConte sempre comigo!\n\n{assinatura}`,
    quickTemplates: [
      {
        id: 'tmpl-link-portal',
        title: '🔗 Envio do Link Seguro de Documentos & Ficha Cadastral',
        category: 'coleta_documentos',
        stage: 'documentacao',
        message: 'Olá {primeiro_nome}, tudo bem? 📑✨\n\nPara agilizar a análise e garantir a reserva exclusiva da sua unidade no *{imovel}*, criamos um portal seguro e criptografado para você preencher seus dados e anexar fotos dos documentos pelo celular:\n\n👉 *Acesse seu link exclusivo:*\n{link_portal}\n\nLeva menos de 3 minutinhos e seus dados ficam 100% protegidos conforme a LGPD. Qualquer dúvida, estou à disposição!',
        audioTip: 'Explique que o link é seguro, criptografado e evita ter que enviar documentos soltos por email.',
        tags: ['Portal', 'Documentos', 'Link do Cliente', 'LGPD']
      },
      {
        id: 'tmpl-1',
        title: '⚡ 1º Contato Imediato (Lead Novo < 5min)',
        category: 'primeiro_contato',
        stage: 'primeiro_contato',
        message: 'Olá {primeiro_nome}, {saudacao}! Aqui é o {corretor}, consultor imobiliário da {empresa}. 🏡\n\nRecebi seu interesse exclusivo no *{imovel}*. Para que eu possa te enviar a apresentação completa e a tabela de valores atualizada, você prefere receber em PDF por aqui ou tem 2 minutinhos para falarmos?',
        audioTip: 'Fale com tom acolhedor e seguro. Mencione o nome do cliente logo nos primeiros 2 segundos.',
        tags: ['Velocidade', 'Lead Novo', 'Apresentação']
      },
      {
        id: 'tmpl-2',
        title: '☕ Convite para Café no Decorado / Stand',
        category: 'visita',
        stage: 'apresentacao',
        message: 'Olá {primeiro_nome}, tudo bem? Separei os melhores horários para receber você e sua família no decorado do *{imovel}*. Tomamos um café especial e você sente a experiência real do espaço! ☕🏢\n\nFica melhor para você nesta *quinta-feira às 16h* ou no *sábado pela manhã*?',
        audioTip: 'Dê sempre duas opções de horário para facilitar a tomada de decisão.',
        tags: ['Visita', 'Decorado', 'Fechamento']
      },
      {
        id: 'tmpl-3',
        title: '📊 Envio de Simulação & Condição Comercial',
        category: 'simulacao',
        stage: 'simulacao',
        message: 'Olá {primeiro_nome}! Preparei a simulação de fluxo para a unidade no *{imovel}* (estimado em *{valor}*). 📄\n\nConseguimos estruturar um fluxo suave com entrada parcelada direto com a construtora e saldo via financiamento bancário com as melhores taxas do mercado. Posso te enviar os números detalhados?',
        audioTip: 'Destaque o poder de negociação e a flexibilidade do fluxo de obras.',
        tags: ['Simulação', 'Financiamento', 'Fluxo']
      }
    ],
    monthlySalesGoalCount: 4,
    monthlySalesGoalVgv: 3500000,
    evolutionApiUrl: '',
    evolutionApiKey: '',
    evolutionInstance: '',
    evolutionEnabled: false,
    evolutionAutoSendOnMove: false,
    inboundWebhookSecret: '',
    inboundWebhookDefaults: {
      funnelId: 'investidores',
      stageId: 'lead_novo'
    },
    mcpEnabled: false
  },
  clients: [] as Client[],
  leads: [] as Lead[],
  activities: [] as Activity[],
  contracts: [] as Contract[],
  commissions: [] as Commission[],
  notifications: [] as any[],
  outgoingWebhooks: [] as OutgoingWebhook[],
  mcpTokens: [] as StoredMcpToken[],
  invites: [] as Invite[],
  auditLog: [] as AuditLogEntry[],
  authLinks: {} as Record<string, string>
};

// Database state in memory — hydrated from / persisted to Supabase Postgres
// (via the service role client) instead of a local db.json file.
let dbState: DatabaseSchema = { ...DEFAULT_DATABASE_STATE };

async function loadDatabase() {
  // Sequential for the same reason as persistAll() (see comment there).
  const profileRows = await fetchAll('profiles');
  const funnelRows = await fetchAll('funnels');
  const rolePermRows = await fetchAll('role_permissions');
  const settingsRows = await fetchAll('settings');
  // Tolerant of the clients table not existing yet (schema_clients.sql not
  // applied) — dedup/repeat-purchase linking degrades gracefully rather than
  // blocking boot, same pattern as audit_log below.
  let clientRows: any[] = [];
  try {
    clientRows = await fetchAll('clients');
  } catch (err) {
    console.warn('Tabela clients indisponível (rode supabase/schema_clients.sql) — dedup de clientes desativado por ora.');
  }
  const leadRows = await fetchAll('leads');
  const activityRows = await fetchAll('activities');
  const contractRows = await fetchAll('contracts');
  const commissionRows = await fetchAll('commissions');
  const notificationRows = await fetchAll('notifications');
  const webhookRows = await fetchAll('outgoing_webhooks');
  const mcpTokenRows = await fetchAll('mcp_tokens');
  const inviteRows = await fetchAll('invites');
  // Tolerant of the audit_log table not existing yet (schema_audit.sql not
  // applied) — audit logging degrades to a no-op rather than blocking boot.
  let auditLogRows: any[] = [];
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(AUDIT_LOG_LIMIT);
    if (error) throw error;
    auditLogRows = data || [];
  } catch (err) {
    console.warn('Tabela audit_log indisponível (rode supabase/schema_audit.sql) — auditoria desativada por ora.');
  }

  const authLinks: Record<string, string> = {};
  const users: UserProfile[] = profileRows.map((row: any) => {
    if (row.auth_user_id) authLinks[row.id] = row.auth_user_id;
    const { auth_user_id, ...rest } = row;
    return fromSnakeRow(rest) as UserProfile;
  });

  const rolePermissions = { ...DEFAULT_DATABASE_STATE.rolePermissions };
  for (const row of rolePermRows) {
    const role = row.role as UserRole;
    const defaults = DEFAULT_DATABASE_STATE.rolePermissions[role];
    // Merge onto the code defaults (not just spread the stored row) so a
    // permission key added after this row was last saved — like
    // canManageWhatsApp — doesn't silently evaluate to false/undefined for
    // an admin whose row predates it.
    rolePermissions[role] = {
      ...defaults,
      ...row.config,
      permissions: { ...defaults?.permissions, ...row.config?.permissions }
    };
  }

  const settingsRow = settingsRows.find((r: any) => r.id === 'singleton');

  const isFreshDatabase = profileRows.length === 0 && funnelRows.length === 0;

  dbState = {
    users: isFreshDatabase ? DEFAULT_DATABASE_STATE.users : users,
    funnels: funnelRows.length ? (funnelRows.map(fromSnakeRow) as Funnel[]) : DEFAULT_DATABASE_STATE.funnels,
    rolePermissions: rolePermRows.length ? rolePermissions : DEFAULT_DATABASE_STATE.rolePermissions,
    settings: settingsRow ? { ...DEFAULT_DATABASE_STATE.settings, ...settingsRow.data } : DEFAULT_DATABASE_STATE.settings,
    clients: clientRows.map(fromSnakeRow) as Client[],
    leads: leadRows.map(fromHybridRow) as Lead[],
    activities: activityRows.map(fromHybridRow) as Activity[],
    contracts: contractRows.map(fromHybridRow) as Contract[],
    commissions: commissionRows.map(fromHybridRow) as Commission[],
    notifications: notificationRows.map(fromHybridRow),
    outgoingWebhooks: webhookRows.map(fromSnakeRow) as OutgoingWebhook[],
    mcpTokens: mcpTokenRows.map(fromSnakeRow) as StoredMcpToken[],
    invites: inviteRows.map(fromSnakeRow) as Invite[],
    auditLog: auditLogRows.map(fromSnakeRow) as AuditLogEntry[],
    authLinks: isFreshDatabase ? {} : authLinks
  };

  if (!dbState.settings.inboundWebhookSecret) {
    dbState.settings.inboundWebhookSecret = generateSecret('inbound');
  }

  await persistAll();
}

async function persistAll() {
  // Sequential rather than Promise.all — no correctness requirement forces
  // it, but keeps write ordering predictable and easy to reason about.
  // Data volume here is low (a handful of brokers), so this is cheap.
  const profileRows = dbState.users.map(u => toSnakeRow({ ...u, authUserId: dbState.authLinks[u.id] }));
  const rolePermRows = Object.entries(dbState.rolePermissions).map(([role, config]) => ({ role, config }));

  await syncTable('profiles', profileRows);
  // PostgREST's batch upsert requires a uniform column set across the whole
  // array — any row missing a key that a sibling row has gets that column
  // sent as NULL (not the Postgres column DEFAULT), which blows up on
  // NOT NULL columns like leads.archived/funnels.is_default. Since our
  // entity objects don't always carry every field (e.g. a lead created via
  // a bare API call without `archived`), spread explicit defaults first so
  // every row is fully populated before it ever reaches PostgREST.
  await syncTable('funnels', dbState.funnels.map(f => toSnakeRow({ isDefault: false, ...f })));
  {
    const { error } = await supabaseAdmin.from('role_permissions').upsert(rolePermRows, { onConflict: 'role' });
    if (error) throw error;
  }
  {
    const { error } = await supabaseAdmin.from('settings').upsert([{ id: 'singleton', data: dbState.settings }], { onConflict: 'id' });
    if (error) throw error;
  }
  try {
    await syncTable('clients', dbState.clients.map(toSnakeRow));
  } catch (err: any) {
    console.warn('Falha ao salvar clients (tabela existe? rode supabase/schema_clients.sql):', err?.message || err);
  }
  await syncTable('leads', dbState.leads.map(l => toHybridRow({ archived: false, ...l }, LEAD_COLS)));
  await syncTable('activities', dbState.activities.map(a => toHybridRow({ completed: false, ...a }, ACTIVITY_COLS)));
  await syncTable('contracts', dbState.contracts.map(c => toHybridRow(c, CONTRACT_COLS)));
  await syncTable('commissions', dbState.commissions.map(c => toHybridRow(c, COMMISSION_COLS)));
  await syncTable('notifications', dbState.notifications.map(n => toHybridRow(n, NOTIFICATION_COLS)));
  await syncTable('outgoing_webhooks', dbState.outgoingWebhooks.map(toSnakeRow));
  await syncTable('mcp_tokens', dbState.mcpTokens.map(toSnakeRow));
  await syncTable('invites', dbState.invites.map(toSnakeRow));
}

// Fire-and-forget persist, chained so overlapping mutations don't race each
// other's full-table writes. Route handlers call this synchronously after
// mutating dbState, same call pattern as the old fs.writeFileSync version.
let saveInFlight: Promise<void> = Promise.resolve();
function saveDatabase() {
  saveInFlight = saveInFlight.then(persistAll).catch(err => {
    console.error('Erro ao salvar no Supabase:', err);
  });
}

// Audit trail for admin actions. Append-only, so this writes a single row
// directly via insert() rather than going through syncTable's full-array
// diff-and-delete pattern used for everything else — diffing/deleting audit
// rows on every unrelated save would be wasteful and risks losing history if
// the in-memory list is ever truncated for the response cap.
function logAudit(actor: { id: string; name: string } | undefined | null, action: string, targetLabel: string, details?: string) {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    actorId: actor?.id || 'system',
    actorName: actor?.name || 'Sistema',
    action,
    targetLabel,
    details,
    createdAt: new Date().toISOString()
  };
  dbState.auditLog.unshift(entry);
  if (dbState.auditLog.length > AUDIT_LOG_LIMIT) dbState.auditLog.length = AUDIT_LOG_LIMIT;

  (async () => {
    try {
      const { error } = await supabaseAdmin.from('audit_log').insert(toSnakeRow(entry));
      if (error) console.warn('Falha ao gravar audit_log (tabela existe? rode supabase/schema_audit.sql):', error.message);
    } catch (err: any) {
      console.warn('Falha ao gravar audit_log:', err?.message || err);
    }
  })();
}

// ==========================================
// AUTH: Supabase GoTrue-backed sessions (JWT, real expiration)
// ==========================================
async function getSessionUser(req: express.Request): Promise<UserProfile | null> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) return null;

  const profileId = Object.entries(dbState.authLinks).find(([, authId]) => authId === data.user.id)?.[0];
  if (!profileId) return null;
  return dbState.users.find(u => u.id === profileId) || null;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  (req as any).user = user;
  next();
}

// Initialize database, then start listening.
loadDatabase()
  .then(() => ensureStorageBucket())
  .then(() => setupViteOrStatic())
  .catch(err => {
    console.error('Falha ao inicializar o banco de dados (Supabase):', err);
    process.exit(1);
  });

// Fire an outgoing webhook event to every enabled subscriber. Non-blocking —
// callers should not await this in a way that delays the HTTP response.
async function dispatchWebhookEvent(event: WebhookEvent, payload: any) {
  const targets = dbState.outgoingWebhooks.filter(w => w.enabled && w.events.includes(event));
  if (targets.length === 0) return;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  await Promise.all(
    targets.map(async webhook => {
      const signature = signPayload(webhook.secret, body);
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Aurum-Signature': `sha256=${signature}`,
            'X-Aurum-Event': event
          },
          body
        });
        webhook.lastTriggeredAt = new Date().toISOString();
        webhook.lastStatus = response.ok ? 'success' : 'failed';
        webhook.lastError = response.ok ? undefined : `HTTP ${response.status}`;
      } catch (err: any) {
        webhook.lastTriggeredAt = new Date().toISOString();
        webhook.lastStatus = 'failed';
        webhook.lastError = err?.message || 'Erro de conexão';
      }
    })
  );

  saveDatabase();
}

// Finds an existing Client by normalized phone, or creates one. Used
// wherever a lead is created (manual, import, inbound webhook) so the same
// buyer is recognized across negotiations instead of siloed per-lead.
function findOrCreateClient(name: string, phone: string, email?: string): { client: Client; isNew: boolean } {
  const normalized = formatBrazilPhone(phone);
  const existing = normalized ? dbState.clients.find(c => formatBrazilPhone(c.phone) === normalized) : undefined;
  if (existing) {
    if (email && !existing.email) existing.email = email;
    return { client: existing, isNew: false };
  }
  const client: Client = {
    id: `client-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name,
    phone,
    email,
    createdAt: new Date().toISOString()
  };
  dbState.clients.push(client);
  return { client, isNew: true };
}

// Builds and inserts the Lead object (with client dedup/link) but leaves
// persistence/webhook dispatch to the caller — lets bulk import do those
// once for the whole batch instead of once per row.
function buildLeadRecord(body: Partial<Lead> & { name: string; phone: string }): Lead {
  const newId = `lead-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const nowStr = new Date().toISOString().split('T')[0];
  const { client } = findOrCreateClient(body.name, body.phone, body.email);
  const newLead = {
    ...body,
    id: newId,
    clientId: body.clientId || client.id,
    clientPortalToken: body.clientPortalToken || `portal-${newId}`,
    createdAt: nowStr,
    history: [
      {
        id: `h-${Date.now()}`,
        leadId: newId,
        type: 'created',
        description: 'Lead cadastrado no sistema.',
        date: new Date().toLocaleString('pt-BR'),
        author: body.brokerName || 'Sistema'
      },
      ...(body.history || [])
    ]
  } as Lead;

  dbState.leads.unshift(newLead);

  if (newLead.brokerId) {
    const broker = dbState.users.find(u => u.id === newLead.brokerId);
    if (broker) {
      broker.assignedLeadCount = (broker.assignedLeadCount || 0) + 1;
    }
  }

  return newLead;
}

// Shared lead-creation logic, reused by POST /api/leads and the inbound
// lead-capture webhook so both paths behave identically.
function createLeadRecord(body: Partial<Lead> & { name: string; phone: string }): Lead {
  const newLead = buildLeadRecord(body);
  saveDatabase();
  dispatchWebhookEvent('lead.created', newLead).catch(() => {});
  return newLead;
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    records: {
      leads: dbState.leads.length,
      activities: dbState.activities.length,
      contracts: dbState.contracts.length,
      commissions: dbState.commissions.length,
      users: dbState.users.length
    }
  });
});

// Full State API (GET, POST full sync, RESET, CLEAR)
app.get('/api/state', requireAuth, (req, res) => {
  res.json(stripPrivate(dbState));
});

app.post('/api/state/sync', requireAuth, (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  // The SPA persists its whole in-memory state on a debounce, not through
  // the per-entity REST routes above — so outgoing-webhook events for
  // leads/contracts have to be detected here by diffing against what was
  // previously stored, mirroring the logic those REST routes already apply.
  const prevLeadsById = new Map(dbState.leads.map(l => [l.id, l]));
  const prevContractIds = new Set(dbState.contracts.map(c => c.id));
  const events: { event: WebhookEvent; payload: any }[] = [];

  if (Array.isArray(incoming.leads)) {
    for (const lead of incoming.leads) {
      const prev = prevLeadsById.get(lead.id);
      if (!prev) {
        events.push({ event: 'lead.created', payload: lead });
        continue;
      }
      if (prev.stageId !== lead.stageId) {
        events.push({ event: 'lead.stage_changed', payload: { ...lead, previousStageId: prev.stageId } });
      }
      if (!prev.won && lead.won) {
        events.push({ event: 'lead.won', payload: lead });
      }
      if (!prev.lost && lead.lost) {
        events.push({ event: 'lead.lost', payload: lead });
      }
    }
    dbState.leads = incoming.leads;
  }
  if (Array.isArray(incoming.contracts)) {
    for (const contract of incoming.contracts) {
      if (!prevContractIds.has(contract.id)) {
        events.push({ event: 'contract.created', payload: contract });
      }
    }
    dbState.contracts = incoming.contracts;
  }

  if (Array.isArray(incoming.funnels)) dbState.funnels = incoming.funnels;
  if (Array.isArray(incoming.clients)) dbState.clients = incoming.clients;
  if (Array.isArray(incoming.activities)) dbState.activities = incoming.activities;
  if (Array.isArray(incoming.commissions)) dbState.commissions = incoming.commissions;

  // User management (activate/deactivate, delete, manager reassignment,
  // adding a user directly) all flow through this generic sync too — there's
  // no dedicated REST call from the SPA for any of it. That means this route
  // has to re-implement the same authorization the dedicated PUT/DELETE
  // /api/users/:id routes enforce (self-escalation guard, canManageTeam gate,
  // last-active-admin protection) instead of trusting the array wholesale —
  // otherwise any authenticated user could grant themselves admin or edit/
  // delete teammates by posting a crafted body straight to this endpoint.
  const requester = (req as any).user as UserProfile;
  const requesterCanManageTeam = requester.role === 'admin' || userHasPermission(requester, 'canManageTeam');

  if (Array.isArray(incoming.users)) {
    const prevUsersById = new Map(dbState.users.map(u => [u.id, u]));
    const nextUsersById = new Map((incoming.users as UserProfile[]).map(u => [u.id, u]));
    const resolvedUsers: UserProfile[] = [];

    // Deletions: keep any user the requester wasn't allowed to remove.
    for (const prevUser of dbState.users) {
      if (nextUsersById.has(prevUser.id)) continue;
      const isLastActiveAdmin = prevUser.role === 'admin' && dbState.users.filter(u => u.role === 'admin' && u.active).length <= 1;
      if (!requesterCanManageTeam || isLastActiveAdmin) {
        resolvedUsers.push(prevUser);
        continue;
      }
      logAudit(requester, 'user_deleted', prevUser.name);
    }

    for (const nextUser of incoming.users as UserProfile[]) {
      const prev = prevUsersById.get(nextUser.id);

      if (!prev) {
        // Creation requires canManageTeam; a non-admin creator can't hand out admin.
        if (!requesterCanManageTeam) continue;
        const safeNewUser = { ...nextUser };
        if (requester.role !== 'admin') {
          safeNewUser.role = 'broker';
          safeNewUser.roleLabel = safeNewUser.roleLabel || 'Corretor';
        }
        resolvedUsers.push(safeNewUser);
        logAudit(requester, 'user_created', safeNewUser.name, safeNewUser.roleLabel);
        continue;
      }

      const isOwnRow = nextUser.id === requester.id;
      if (!isOwnRow && !requesterCanManageTeam) {
        resolvedUsers.push(prev); // no permission to touch someone else's row — keep as-is
        continue;
      }

      const merged = { ...nextUser };
      if ((merged.role !== prev.role || merged.roleLabel !== prev.roleLabel) && requester.role !== 'admin') {
        merged.role = prev.role;
        merged.roleLabel = prev.roleLabel;
      }

      if (prev.active !== merged.active) {
        logAudit(requester, merged.active ? 'user_activated' : 'user_deactivated', merged.name);
      }
      if (prev.managerId !== merged.managerId) {
        const managerName = merged.managerId ? prevUsersById.get(merged.managerId)?.name || merged.managerId : 'nenhum';
        logAudit(requester, 'manager_changed', merged.name, `Gestor: ${managerName}`);
      }

      resolvedUsers.push(merged);
    }

    dbState.users = resolvedUsers;
  }

  if (incoming.settings) {
    // inboundWebhookSecret/mcpEnabled are legitimate to round-trip from the
    // client, but mcpTokens/outgoingWebhooks are managed exclusively through
    // their own routes below and must never be clobbered by this generic sync.
    dbState.settings = { ...dbState.settings, ...incoming.settings };
  }

  // The permissions matrix is admin-only everywhere else (PUT
  // /api/settings/permissions requires requireAdmin) — silently drop the
  // change here too instead of applying it, otherwise this generic sync
  // route would be a wide-open bypass of that restriction.
  if (incoming.rolePermissions && requester.role === 'admin') {
    const prevPerms = dbState.rolePermissions;
    const nextPerms = incoming.rolePermissions as Record<UserRole, RolePermissionConfig>;
    for (const role of Object.keys(nextPerms) as UserRole[]) {
      const prevConfig = prevPerms[role];
      const nextConfig = nextPerms[role];
      if (!prevConfig || !nextConfig) continue;

      const prevModules = new Set(prevConfig.allowedModules);
      const nextModules = new Set(nextConfig.allowedModules);
      if (prevModules.size !== nextModules.size || [...prevModules].some(m => !nextModules.has(m))) {
        logAudit(requester, 'module_access_changed', nextConfig.name, `Módulos: ${nextConfig.allowedModules.join(', ') || '(nenhum)'}`);
      }

      for (const key of Object.keys(nextConfig.permissions) as (keyof RolePermissionConfig['permissions'])[]) {
        if (prevConfig.permissions[key] !== nextConfig.permissions[key]) {
          logAudit(requester, 'permission_changed', nextConfig.name, `${key}: ${nextConfig.permissions[key] ? 'liberado' : 'bloqueado'}`);
        }
      }
    }
    dbState.rolePermissions = incoming.rolePermissions;
  }

  if (Array.isArray(incoming.notifications)) dbState.notifications = incoming.notifications;

  saveDatabase();
  for (const { event, payload } of events) {
    dispatchWebhookEvent(event, payload).catch(() => {});
  }

  res.json({ success: true, message: 'Estado sincronizado com sucesso', state: stripPrivate(dbState) });
});

app.post('/api/state/reset', requireAuth, (req, res) => {
  dbState = JSON.parse(JSON.stringify(DEFAULT_DATABASE_STATE));
  dbState.authLinks = {};
  dbState.settings.inboundWebhookSecret = generateSecret('inbound');
  saveDatabase();
  res.json({ success: true, message: 'Base de dados restaurada para o padrão', state: stripPrivate(dbState) });
});

app.post('/api/state/clear', requireAuth, (req, res) => {
  dbState.clients = [];
  dbState.leads = [];
  dbState.activities = [];
  dbState.contracts = [];
  dbState.commissions = [];
  dbState.notifications = [];
  saveDatabase();
  res.json({ success: true, message: 'Base limpa com sucesso', state: stripPrivate(dbState) });
});

// ------------------------------------------
// CLIENTS API (read-only — clients are created/linked implicitly via lead
// creation/import; see findOrCreateClient)
// ------------------------------------------
app.get('/api/clients/:id/leads', requireAuth, (req, res) => {
  const client = dbState.clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  const leads = dbState.leads.filter(l => l.clientId === client.id);
  res.json({ client, leads });
});

// ------------------------------------------
// LEADS API
// ------------------------------------------
app.get('/api/leads', requireAuth, (req, res) => {
  let list = [...dbState.leads];
  const { funnelId, brokerId, stageId, search, status } = req.query;

  if (funnelId) {
    list = list.filter(l => l.funnelId === funnelId);
  }
  if (brokerId && brokerId !== 'all') {
    list = list.filter(l => l.brokerId === brokerId);
  }
  if (stageId) {
    list = list.filter(l => l.stageId === stageId);
  }
  if (status === 'ativos') {
    list = list.filter(l => !l.won && !l.lost);
  } else if (status === 'ganhos') {
    list = list.filter(l => l.won || l.stageId === 'venda_concluida');
  } else if (status === 'perdidos') {
    list = list.filter(l => l.lost);
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.phone && l.phone.includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.propertyInterest && l.propertyInterest.toLowerCase().includes(q))
    );
  }

  res.json(list);
});

app.get('/api/leads/:id', requireAuth, (req, res) => {
  const lead = dbState.leads.find(l => l.id === req.params.id || l.clientPortalToken === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  res.json(lead);
});

app.post('/api/leads', requireAuth, requirePermission('canCreateLeads'), (req, res) => {
  const body = req.body;
  if (!body.name || !body.phone) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  }
  res.status(201).json(createLeadRecord(body));
});

// Bulk import (CSV/XLS parsed client-side into rows) — reuses the same
// per-row dedup as manual creation, so an imported phone that already
// matches a Client gets linked to it instead of creating a duplicate person.
app.post('/api/leads/import', requireAuth, requirePermission('canCreateLeads'), (req, res) => {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Nenhuma linha para importar' });
  }
  if (rows.length > 2000) {
    return res.status(400).json({ error: 'Máximo de 2000 linhas por importação' });
  }

  let created = 0;
  let linkedToExistingClient = 0;
  const errors: { row: number; error: string }[] = [];

  rows.forEach((row: any, i: number) => {
    if (!row?.name || !row?.phone) {
      errors.push({ row: i + 1, error: 'Nome e telefone são obrigatórios' });
      return;
    }
    const wasKnownClient = !!(row.phone && dbState.clients.some(c => formatBrazilPhone(c.phone) === formatBrazilPhone(row.phone)));
    buildLeadRecord({
      name: row.name,
      phone: row.phone,
      email: row.email || undefined,
      propertyInterest: row.propertyInterest || 'Imóvel em Prospecção',
      estimatedValue: Number(row.estimatedValue) || 0,
      funnelId: row.funnelId || dbState.settings.inboundWebhookDefaults?.funnelId || 'investidores',
      stageId: row.stageId || dbState.settings.inboundWebhookDefaults?.stageId || 'lead_novo',
      temperature: row.temperature || 'morno',
      origin: row.origin || 'Importação',
      brokerId: row.brokerId || undefined,
      notes: row.notes || 'Importado em lote.'
    } as any);
    created++;
    if (wasKnownClient) linkedToExistingClient++;
  });

  saveDatabase();
  res.json({ success: true, created, linkedToExistingClient, errors });
});

app.put('/api/leads/:id', requireAuth, requirePermission('canEditLeads'), (req, res) => {
  const idx = dbState.leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Lead não encontrado' });

  const existing = dbState.leads[idx];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id // protect id
  };

  dbState.leads[idx] = updated;
  saveDatabase();
  res.json(updated);
});

app.delete('/api/leads/:id', requireAuth, (req, res) => {
  const lead = dbState.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  dbState.leads = dbState.leads.filter(l => l.id !== req.params.id);
  dbState.activities = dbState.activities.filter(a => a.leadId !== req.params.id);

  if (lead.brokerId) {
    const broker = dbState.users.find(u => u.id === lead.brokerId);
    if (broker && broker.assignedLeadCount && broker.assignedLeadCount > 0) {
      broker.assignedLeadCount -= 1;
    }
  }

  saveDatabase();
  res.json({ success: true, message: 'Lead excluído com sucesso' });
});

// Stage transition & History
app.post('/api/leads/:id/stage', requireAuth, (req, res) => {
  const { stageId, author } = req.body;
  const lead = dbState.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const oldStage = lead.stageId;
  lead.stageId = stageId;
  if (!lead.history) lead.history = [];

  lead.history.unshift({
    id: `h-stage-${Date.now()}`,
    leadId: lead.id,
    type: 'stage_change',
    description: `Etapa alterada de "${oldStage}" para "${stageId}".`,
    date: new Date().toLocaleString('pt-BR'),
    author: author || lead.brokerName || 'Sistema'
  });

  saveDatabase();
  dispatchWebhookEvent('lead.stage_changed', { ...lead, previousStageId: oldStage }).catch(() => {});
  res.json(lead);
});

// Mark Won
app.post('/api/leads/:id/won', requireAuth, (req, res) => {
  const lead = dbState.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  lead.won = true;
  lead.lost = false;
  lead.stageId = 'venda_concluida';
  if (!lead.history) lead.history = [];

  lead.history.unshift({
    id: `h-won-${Date.now()}`,
    leadId: lead.id,
    type: 'deal_won',
    description: 'Negociação marcada como VENDA GANHA / CONCLUÍDA! 🥂🎉',
    date: new Date().toLocaleString('pt-BR'),
    author: lead.brokerName || 'Sistema'
  });

  saveDatabase();
  dispatchWebhookEvent('lead.won', lead).catch(() => {});
  res.json(lead);
});

// Mark Lost
app.post('/api/leads/:id/lost', requireAuth, (req, res) => {
  const { reason, notes } = req.body;
  const lead = dbState.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  lead.lost = true;
  lead.won = false;
  lead.lostReason = reason || 'Outro';
  lead.lostNotes = notes || '';
  if (!lead.history) lead.history = [];

  lead.history.unshift({
    id: `h-lost-${Date.now()}`,
    leadId: lead.id,
    type: 'deal_lost',
    description: `Lead marcado como Perdido. Motivo: ${reason || 'Não informado'}. ${notes ? `(${notes})` : ''}`,
    date: new Date().toLocaleString('pt-BR'),
    author: lead.brokerName || 'Sistema'
  });

  saveDatabase();
  dispatchWebhookEvent('lead.lost', lead).catch(() => {});
  res.json(lead);
});

// ------------------------------------------
// CLIENT PORTAL (PUBLIC / TOKEN-BASED)
// ------------------------------------------
app.get('/api/portal/:token', (req, res) => {
  const token = req.params.token;
  const lead = dbState.leads.find(l => l.clientPortalToken === token || l.id === token);
  if (!lead) return res.status(404).json({ error: 'Portal do cliente não encontrado ou link expirado' });

  res.json({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    propertyInterest: lead.propertyInterest,
    brokerName: lead.brokerName,
    clientData: lead.clientData || null,
    companyName: dbState.settings.companyName
  });
});

app.post('/api/portal/:token', (req, res) => {
  const token = req.params.token;
  const lead = dbState.leads.find(l => l.clientPortalToken === token || l.id === token);
  if (!lead) return res.status(404).json({ error: 'Portal do cliente não encontrado' });

  const clientData = req.body;
  const docCount = clientData.documents?.length || 0;

  lead.name = clientData.fullName || lead.name;
  lead.phone = clientData.phone || lead.phone;
  lead.email = clientData.email || lead.email;
  lead.stageId = lead.stageId === 'lead_novo' || lead.stageId === 'primeiro_contato' ? 'documentacao' : lead.stageId;
  lead.clientData = {
    ...clientData,
    submittedAt: new Date().toLocaleString('pt-BR'),
    status: 'enviado'
  };

  if (!lead.history) lead.history = [];
  lead.history.unshift({
    id: `h-portal-${Date.now()}`,
    leadId: lead.id,
    type: 'client_portal',
    description: `Cliente preencheu ficha cadastral e enviou ${docCount} documento(s) com sucesso via Portal do Cliente.`,
    date: new Date().toLocaleString('pt-BR'),
    author: 'Portal do Cliente'
  });

  dbState.notifications.unshift({
    id: `notif-doc-${Date.now()}`,
    title: 'Documentos Recebidos!',
    message: `${clientData.fullName || lead.name} enviou ficha cadastral e ${docCount} documento(s) pelo Portal.`,
    date: 'Agora',
    read: false,
    type: 'activity'
  });

  saveDatabase();
  res.json({ success: true, message: 'Dados e documentos enviados com sucesso!', lead });
});

// Public upload endpoint for the client self-service portal — token-authenticated
// against the lead's clientPortalToken instead of a logged-in session.
app.post('/api/portal/:token/upload', async (req, res) => {
  const token = req.params.token;
  const lead = dbState.leads.find(l => l.clientPortalToken === token || l.id === token);
  if (!lead) return res.status(404).json({ error: 'Portal do cliente não encontrado ou link expirado' });

  const { fileName, mimeType, dataBase64 } = req.body || {};
  if (!fileName || !dataBase64) return res.status(400).json({ error: 'fileName e dataBase64 são obrigatórios' });

  try {
    const result = await uploadBase64ToStorage(fileName, mimeType, dataBase64);
    res.json(result);
  } catch (err: any) {
    console.error('Falha no upload via portal:', err);
    res.status(400).json({ error: err?.message || 'Falha ao enviar arquivo' });
  }
});

// ------------------------------------------
// FILE UPLOADS (authenticated — used by the CRM UI for lead documents,
// signed contracts and other attachments)
// ------------------------------------------
app.post('/api/uploads', requireAuth, async (req, res) => {
  const { fileName, mimeType, dataBase64 } = req.body || {};
  if (!fileName || !dataBase64) return res.status(400).json({ error: 'fileName e dataBase64 são obrigatórios' });

  try {
    const result = await uploadBase64ToStorage(fileName, mimeType, dataBase64);
    res.json(result);
  } catch (err: any) {
    console.error('Falha no upload:', err);
    res.status(400).json({ error: err?.message || 'Falha ao enviar arquivo' });
  }
});

// ------------------------------------------
// ACTIVITIES API
// ------------------------------------------
app.get('/api/activities', requireAuth, (req, res) => {
  res.json(dbState.activities);
});

app.post('/api/activities', requireAuth, (req, res) => {
  const body = req.body;
  const newActivity = {
    ...body,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    completed: false,
    createdAt: new Date().toISOString().split('T')[0]
  };

  dbState.activities.unshift(newActivity);

  // Update lead follow-up date and history
  if (newActivity.leadId) {
    const lead = dbState.leads.find(l => l.id === newActivity.leadId);
    if (lead) {
      lead.nextFollowUpDate = newActivity.dateTime;
      if (!lead.history) lead.history = [];
      lead.history.unshift({
        id: `h-act-${Date.now()}`,
        leadId: lead.id,
        type: newActivity.type || 'activity',
        description: `Agendado: ${newActivity.type?.toUpperCase()} para ${newActivity.dateTime}. ${newActivity.notes ? `(${newActivity.notes})` : ''}`,
        date: new Date().toLocaleString('pt-BR'),
        author: newActivity.brokerName || 'Sistema'
      });
    }
  }

  saveDatabase();
  res.status(201).json(newActivity);
});

app.put('/api/activities/:id', requireAuth, (req, res) => {
  const idx = dbState.activities.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Atividade não encontrada' });

  dbState.activities[idx] = { ...dbState.activities[idx], ...req.body };
  saveDatabase();
  res.json(dbState.activities[idx]);
});

app.put('/api/activities/:id/toggle', requireAuth, (req, res) => {
  const act = dbState.activities.find(a => a.id === req.params.id);
  if (!act) return res.status(404).json({ error: 'Atividade não encontrada' });

  act.completed = !act.completed;
  saveDatabase();
  res.json(act);
});

app.delete('/api/activities/:id', requireAuth, (req, res) => {
  dbState.activities = dbState.activities.filter(a => a.id !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Atividade excluída' });
});

// ------------------------------------------
// CONTRACTS & COMMISSIONS API
// ------------------------------------------
app.get('/api/contracts', requireAuth, (req, res) => {
  res.json(dbState.contracts);
});

app.post('/api/contracts', requireAuth, (req, res) => {
  const body = req.body;
  const contractId = `cont-${Date.now()}`;
  const totalCommValue = (body.value * (body.commissionPercent !== undefined ? body.commissionPercent : 5)) / 100;
  const brokerPerc = body.brokerCommissionPercent !== undefined ? body.brokerCommissionPercent : (body.splitPercents?.broker || 50);
  const brokerCommVal = (totalCommValue * brokerPerc) / 100;

  const newContract = {
    ...body,
    id: contractId,
    totalCommissionValue: totalCommValue,
    brokerCommissionValue: brokerCommVal,
    status: body.isCompletedDirectly ? 'concluido' : 'assinado',
    attachments: body.attachments || []
  };

  dbState.contracts.unshift(newContract);

  // Auto-generate commission installments
  const instCount = body.installmentsCount || 1;
  const instAmount = brokerCommVal / instCount;
  const bonusPerInst = (body.splitBonus?.broker || 0) / instCount;
  const baseDate = body.firstDueDate ? new Date(body.firstDueDate) : new Date(body.closedAt);

  for (let i = 1; i <= instCount; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    const dueDateStr = dueDate.toISOString().split('T')[0];

    dbState.commissions.unshift({
      id: `comm-${contractId}-${i}`,
      contractId: contractId,
      brokerId: body.brokerId,
      brokerName: body.brokerName,
      enterpriseName: body.enterpriseName,
      clientName: body.clientName,
      recipientRole: 'corretor',
      installmentNumber: i,
      totalInstallments: instCount,
      dueDate: dueDateStr,
      amount: instAmount,
      bonusAmount: bonusPerInst,
      status: body.isCompletedDirectly ? 'recebido' : 'a_receber',
      paymentDate: body.isCompletedDirectly ? new Date().toISOString().split('T')[0] : undefined
    });
  }

  // If tied to a lead, update lead to won
  if (body.leadId) {
    const lead = dbState.leads.find(l => l.id === body.leadId);
    if (lead) {
      lead.won = true;
      lead.stageId = 'venda_concluida';
      if (!lead.history) lead.history = [];
      lead.history.unshift({
        id: `h-sale-${Date.now()}`,
        leadId: lead.id,
        type: 'deal_won',
        description: `Contrato de Venda registrado: ${body.enterpriseName} (${body.unit || 'Unidade'}). VGV: R$ ${body.value.toLocaleString('pt-BR')}.`,
        date: new Date().toLocaleString('pt-BR'),
        author: body.brokerName || 'Sistema'
      });
    }
  }

  saveDatabase();
  dispatchWebhookEvent('contract.created', newContract).catch(() => {});
  res.status(201).json(newContract);
});

app.put('/api/contracts/:id', requireAuth, (req, res) => {
  const idx = dbState.contracts.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Contrato não encontrado' });

  dbState.contracts[idx] = { ...dbState.contracts[idx], ...req.body };
  saveDatabase();
  res.json(dbState.contracts[idx]);
});

app.delete('/api/contracts/:id', requireAuth, requirePermission('canDeleteContracts'), (req, res) => {
  dbState.contracts = dbState.contracts.filter(c => c.id !== req.params.id);
  dbState.commissions = dbState.commissions.filter(cm => cm.contractId !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Contrato e parcelas excluídos com sucesso' });
});

app.get('/api/commissions', requireAuth, (req, res) => {
  res.json(dbState.commissions);
});

app.put('/api/commissions/:id/pay', requireAuth, requirePermission('canMarkCommissionsPaid'), (req, res) => {
  const comm = dbState.commissions.find(c => c.id === req.params.id);
  if (!comm) return res.status(404).json({ error: 'Comissão não encontrada' });

  comm.status = comm.status === 'recebido' ? 'a_receber' : 'recebido';
  comm.paymentDate = comm.status === 'recebido' ? new Date().toISOString().split('T')[0] : undefined;

  saveDatabase();
  res.json(comm);
});

// ------------------------------------------
// USERS & SETTINGS API
// ------------------------------------------
app.get('/api/users', requireAuth, (req, res) => {
  res.json(dbState.users);
});

app.post('/api/users', requireAuth, requirePermission('canManageTeam'), (req, res) => {
  const requester = (req as any).user as UserProfile;
  const body = { ...req.body };
  // Same self-escalation guard as PUT /api/users/:id — canManageTeam alone
  // doesn't mean "may create admins," only an actual admin does.
  if (requester.role !== 'admin') {
    body.role = 'broker';
    body.roleLabel = body.roleLabel || 'Corretor';
  }

  const newUser = {
    ...body,
    id: `user-${Date.now()}`,
    active: true,
    assignedLeadCount: 0
  };
  dbState.users.push(newUser);
  saveDatabase();
  res.status(201).json(newUser);
});

app.put('/api/users/:id', requireAuth, requirePermission('canManageTeam'), (req, res) => {
  const requester = (req as any).user as UserProfile;
  const idx = dbState.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

  const updates = { ...req.body };
  // Role changes are how someone would self-escalate — only an actual admin
  // (not just anyone holding canManageTeam) may change who is/isn't admin.
  if ((updates.role !== undefined || updates.roleLabel !== undefined) && requester.role !== 'admin') {
    delete updates.role;
    delete updates.roleLabel;
  }

  dbState.users[idx] = { ...dbState.users[idx], ...updates };
  saveDatabase();
  res.json(dbState.users[idx]);
});

app.delete('/api/users/:id', requireAuth, requirePermission('canManageTeam'), (req, res) => {
  const target = dbState.users.find(u => u.id === req.params.id);
  if (target?.role === 'admin' && dbState.users.filter(u => u.role === 'admin' && u.active).length <= 1) {
    return res.status(400).json({ error: 'Não é possível remover o último administrador ativo.' });
  }

  const authId = dbState.authLinks[req.params.id];
  if (authId) {
    supabaseAdmin.auth.admin.deleteUser(authId).catch(() => {});
    delete dbState.authLinks[req.params.id];
  }
  dbState.users = dbState.users.filter(u => u.id !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Usuário removido' });
});

app.get('/api/settings', requireAuth, (req, res) => {
  res.json({
    settings: dbState.settings,
    rolePermissions: dbState.rolePermissions
  });
});

app.put('/api/settings', requireAuth, (req, res) => {
  dbState.settings = { ...dbState.settings, ...req.body };
  saveDatabase();
  res.json(dbState.settings);
});

// The permissions matrix is the source of truth every other requirePermission()
// check reads from — letting anyone below admin edit it would let a role grant
// itself more access, so this stays requireAdmin regardless of canManageTeam.
app.put('/api/settings/permissions', requireAuth, requireAdmin, (req, res) => {
  dbState.rolePermissions = req.body;
  saveDatabase();
  res.json(dbState.rolePermissions);
});

// ------------------------------------------
// OUTGOING WEBHOOKS API
// ------------------------------------------
app.get('/api/webhooks', requireAuth, (req, res) => {
  res.json(dbState.outgoingWebhooks);
});

app.post('/api/webhooks', requireAuth, requirePermission('canManageWebhooks'), (req, res) => {
  const { name, url, events } = req.body;
  if (!name || !url || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Nome, URL e ao menos um evento são obrigatórios' });
  }
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'URL inválida' });
  }

  const webhook: OutgoingWebhook = {
    id: `wh-${Date.now()}`,
    name,
    url,
    events,
    secret: generateSecret('whsec'),
    enabled: true,
    createdAt: new Date().toISOString()
  };
  dbState.outgoingWebhooks.unshift(webhook);
  saveDatabase();
  res.status(201).json(webhook);
});

app.put('/api/webhooks/:id', requireAuth, requirePermission('canManageWebhooks'), (req, res) => {
  const idx = dbState.outgoingWebhooks.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Webhook não encontrado' });

  const { name, url, events, enabled } = req.body;
  if (url) {
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'URL inválida' });
    }
  }

  dbState.outgoingWebhooks[idx] = {
    ...dbState.outgoingWebhooks[idx],
    ...(name !== undefined ? { name } : {}),
    ...(url !== undefined ? { url } : {}),
    ...(events !== undefined ? { events } : {}),
    ...(enabled !== undefined ? { enabled } : {})
  };
  saveDatabase();
  res.json(dbState.outgoingWebhooks[idx]);
});

app.delete('/api/webhooks/:id', requireAuth, requirePermission('canManageWebhooks'), (req, res) => {
  dbState.outgoingWebhooks = dbState.outgoingWebhooks.filter(w => w.id !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Webhook removido' });
});

app.post('/api/webhooks/:id/test', requireAuth, requirePermission('canManageWebhooks'), async (req, res) => {
  const webhook = dbState.outgoingWebhooks.find(w => w.id === req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook não encontrado' });

  const body = JSON.stringify({
    event: 'webhook.test',
    data: { message: 'Ping de teste do Aurum CRM' },
    timestamp: new Date().toISOString()
  });
  const signature = signPayload(webhook.secret, body);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aurum-Signature': `sha256=${signature}`,
        'X-Aurum-Event': 'webhook.test'
      },
      body
    });
    webhook.lastTriggeredAt = new Date().toISOString();
    webhook.lastStatus = response.ok ? 'success' : 'failed';
    webhook.lastError = response.ok ? undefined : `HTTP ${response.status}`;
    saveDatabase();
    res.json({ success: response.ok, status: response.status });
  } catch (err: any) {
    webhook.lastTriggeredAt = new Date().toISOString();
    webhook.lastStatus = 'failed';
    webhook.lastError = err?.message || 'Erro de conexão';
    saveDatabase();
    res.status(502).json({ success: false, error: webhook.lastError });
  }
});

// ------------------------------------------
// INBOUND LEAD-CAPTURE WEBHOOK (public, secret-authenticated via URL path)
// ------------------------------------------
// Minimal in-memory rate limiter for the public lead-capture endpoint —
// anyone with the link can POST leads with no auth, so an unbounded flood
// (accidental or malicious) could fill the funnel with junk. Keyed by
// secret+IP rather than IP alone, since the secret can be regenerated
// independently to recover from abuse without touching shared infra.
const inboundRateLimitLog = new Map<string, number[]>();
const INBOUND_RATE_LIMIT = 20;
const INBOUND_RATE_WINDOW_MS = 60_000;

function isInboundRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (inboundRateLimitLog.get(key) || []).filter(t => now - t < INBOUND_RATE_WINDOW_MS);
  recent.push(now);
  inboundRateLimitLog.set(key, recent);
  return recent.length > INBOUND_RATE_LIMIT;
}

app.post('/api/webhooks/inbound/leads/:secret', (req, res) => {
  if (req.params.secret !== dbState.settings.inboundWebhookSecret) {
    return res.status(401).json({ error: 'Segredo inválido' });
  }

  const rateLimitKey = `${req.params.secret}:${req.ip}`;
  if (isInboundRateLimited(rateLimitKey)) {
    return res.status(429).json({ error: 'Muitas requisições — tente novamente em instantes.' });
  }

  const { name, phone, email, origin, propertyInterest, estimatedValue, notes } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  }

  const defaults = dbState.settings.inboundWebhookDefaults;
  const lead = createLeadRecord({
    name,
    phone,
    email,
    funnelId: defaults.funnelId,
    stageId: defaults.stageId,
    temperature: 'morno',
    origin: origin || 'Outro',
    propertyInterest: propertyInterest || 'Não especificado',
    estimatedValue: estimatedValue || 0,
    notes,
    brokerId: defaults.brokerId
  } as any);

  res.status(201).json({ success: true, leadId: lead.id });
});

// ------------------------------------------
// MCP TOKENS API (raw token is only ever returned on creation)
// ------------------------------------------
app.get('/api/mcp/tokens', requireAuth, (req, res) => {
  res.json(stripTokenHash(dbState.mcpTokens));
});

app.post('/api/mcp/tokens', requireAuth, requirePermission('canManageMcp'), (req, res) => {
  const { name, scopes, expiresInDays } = req.body;
  if (!name || !Array.isArray(scopes) || scopes.length === 0) {
    return res.status(400).json({ error: 'Nome e ao menos um escopo são obrigatórios' });
  }

  const rawToken = generateSecret('mcp', 32);
  const token: StoredMcpToken = {
    id: `mcptok-${Date.now()}`,
    name,
    tokenPreview: rawToken.slice(-4),
    scopes,
    createdAt: new Date().toISOString(),
    expiresAt:
      typeof expiresInDays === 'number' && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    revoked: false,
    tokenHash: sha256Hex(rawToken)
  };
  dbState.mcpTokens.unshift(token);
  saveDatabase();

  const { tokenHash, ...publicToken } = token;
  res.status(201).json({ ...publicToken, token: rawToken });
});

app.delete('/api/mcp/tokens/:id', requireAuth, requirePermission('canManageMcp'), (req, res) => {
  const token = dbState.mcpTokens.find(t => t.id === req.params.id);
  if (!token) return res.status(404).json({ error: 'Token não encontrado' });
  token.revoked = true;
  saveDatabase();
  res.json({ success: true, message: 'Token revogado' });
});

// ------------------------------------------
// INVITES API (link-based team invites — USUARIOS_MELHORIAS.md Fase 1)
// ------------------------------------------
const INVITE_TTL_DAYS = 7;

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const requester = (req as any).user as UserProfile;
  if (requester.role !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem gerenciar convites' });
  next();
}

function userHasPermission(user: UserProfile, key: keyof RolePermissions): boolean {
  return !!dbState.rolePermissions[user.role]?.permissions[key];
}

// Generic permission gate, for actions that should follow the granular
// RolePermissions matrix (settable per-role in Perfis & Permissões) instead
// of the hardcoded admin-only check above.
function requirePermission(key: keyof RolePermissions) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requester = (req as any).user as UserProfile;
    if (!userHasPermission(requester, key)) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    next();
  };
}

app.get('/api/invites', requireAuth, requireAdmin, (req, res) => {
  const now = Date.now();
  const list = dbState.invites
    .filter(inv => !inv.usedAt)
    .map(inv => ({ ...inv, expired: new Date(inv.expiresAt).getTime() < now }));
  res.json(list);
});

// Thrown by createInviteRecord for expected validation failures, so callers
// don't need a result-union + narrowing (this repo's tsconfig doesn't set
// `strict`, and discriminated-union narrowing on a boolean field is
// unreliable without strictNullChecks — a plain throw/catch sidesteps that).
class InviteValidationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Shared validation + creation, used by both POST /api/invites and the
// resend endpoint below (resend creates the replacement before touching the
// old invite, so a failure here never leaves the invitee with nothing).
function createInviteRecord(
  requester: UserProfile,
  body: { name?: string; email?: string; role?: UserRole; roleLabel?: string; creci?: string; phone?: string },
  opts: { excludeInviteId?: string } = {}
): Invite {
  const { name, email, role, roleLabel, creci, phone } = body;
  if (!name || !email || !role) {
    throw new InviteValidationError(400, 'Nome, e-mail e perfil de acesso são obrigatórios');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const emailTaken = dbState.users.some(u => u.email && u.email.trim().toLowerCase() === normalizedEmail);
  if (emailTaken) {
    throw new InviteValidationError(409, 'Já existe um usuário com este e-mail');
  }
  const pendingInvite = dbState.invites.find(
    inv =>
      inv.id !== opts.excludeInviteId &&
      !inv.usedAt &&
      inv.email.trim().toLowerCase() === normalizedEmail &&
      new Date(inv.expiresAt).getTime() > Date.now()
  );
  if (pendingInvite) {
    throw new InviteValidationError(409, 'Já existe um convite pendente para este e-mail');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const invite: Invite = {
    id: `inv-${Date.now()}`,
    name: String(name).trim(),
    email: normalizedEmail,
    role,
    roleLabel: roleLabel || (role === 'admin' ? 'Administrador' : 'Corretor'),
    creci: creci || '',
    phone: phone || '',
    token: generateSecret('invite', 24),
    invitedBy: requester.id,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  dbState.invites.unshift(invite);
  return invite;
}

app.post('/api/invites', requireAuth, requireAdmin, (req, res) => {
  const requester = (req as any).user as UserProfile;
  let invite: Invite;
  try {
    invite = createInviteRecord(requester, req.body || {});
  } catch (err) {
    if (err instanceof InviteValidationError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  saveDatabase();
  logAudit(requester, 'invite_created', invite.name, invite.email);
  res.status(201).json(invite);
});

app.delete('/api/invites/:id', requireAuth, requireAdmin, (req, res) => {
  const requester = (req as any).user as UserProfile;
  const invite = dbState.invites.find(inv => inv.id === req.params.id);
  if (!invite) return res.status(404).json({ error: 'Convite não encontrado' });
  dbState.invites = dbState.invites.filter(inv => inv.id !== req.params.id);
  saveDatabase();
  logAudit(requester, 'invite_revoked', invite.name, invite.email);
  res.json({ success: true, message: 'Convite revogado' });
});

// Atomic resend: creates the replacement invite first and only removes the
// old one once that succeeds, so a failure never leaves the invitee with no
// valid invite at all (the old two-call client-side revoke-then-create
// pattern could do exactly that if the create failed after the revoke).
app.post('/api/invites/:id/resend', requireAuth, requireAdmin, (req, res) => {
  const requester = (req as any).user as UserProfile;
  const existing = dbState.invites.find(inv => inv.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Convite não encontrado' });

  let invite: Invite;
  try {
    invite = createInviteRecord(
      requester,
      { name: existing.name, email: existing.email, role: existing.role, roleLabel: existing.roleLabel, creci: existing.creci, phone: existing.phone },
      { excludeInviteId: existing.id }
    );
  } catch (err) {
    if (err instanceof InviteValidationError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  dbState.invites = dbState.invites.filter(inv => inv.id !== existing.id);
  saveDatabase();
  logAudit(requester, 'invite_resent', invite.name, invite.email);
  res.status(201).json(invite);
});

app.get('/api/audit', requireAuth, requireAdmin, (req, res) => {
  res.json(dbState.auditLog);
});

// Public — the invited person opens the link before having any session.
app.get('/api/invites/token/:token', (req, res) => {
  const invite = dbState.invites.find(inv => inv.token === req.params.token);
  if (!invite) return res.status(404).json({ error: 'Convite não encontrado' });
  if (invite.usedAt) return res.status(409).json({ error: 'Este convite já foi utilizado' });
  if (new Date(invite.expiresAt).getTime() < Date.now()) return res.status(410).json({ error: 'Este convite expirou' });

  res.json({ name: invite.name, email: invite.email, roleLabel: invite.roleLabel });
});

app.post('/api/invites/token/:token/accept', async (req, res) => {
  const invite = dbState.invites.find(inv => inv.token === req.params.token);
  if (!invite) return res.status(404).json({ error: 'Convite não encontrado' });
  if (invite.usedAt) return res.status(409).json({ error: 'Este convite já foi utilizado' });
  if (new Date(invite.expiresAt).getTime() < Date.now()) return res.status(410).json({ error: 'Este convite expirou' });

  const { password } = req.body || {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'A senha precisa ter ao menos 6 caracteres' });
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true
  });
  if (createErr || !created?.user) {
    return res.status(500).json({ error: createErr?.message || 'Falha ao criar credenciais' });
  }

  const initials = invite.name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    name: invite.name,
    email: invite.email,
    role: invite.role,
    roleLabel: invite.roleLabel,
    creci: invite.creci || '',
    phone: invite.phone || '',
    initials: initials || 'CO',
    avatarColor: invite.role === 'admin' ? '#344E41' : '#588157',
    active: true,
    assignedLeadCount: 0
  };

  newUser.lastLoginAt = new Date().toISOString();
  dbState.users.push(newUser);
  dbState.authLinks[newUser.id] = created.user.id;
  invite.usedAt = new Date().toISOString();
  saveDatabase();

  const { data: signInData, error: signInErr } = await supabaseAuth.auth.signInWithPassword({ email: invite.email, password });
  if (signInErr || !signInData?.session) {
    return res.status(500).json({ error: 'Conta criada, mas falha ao iniciar sessão. Faça login normalmente.' });
  }

  res.json({ token: signInData.session.access_token, user: newUser });
});

// ------------------------------------------
// AUTH API (Supabase GoTrue-backed, real JWT sessions, no impersonation)
// ------------------------------------------

// Lists users who haven't completed their account setup yet (id/name/role
// only) so the login screen can offer a "primeiro acesso" flow — safe to
// expose unauthenticated for a local single-tenant deployment. A user is
// considered "pending" while it has no email set yet (matches the seeded
// admin's initial state).
app.get('/api/auth/setup-status', (req, res) => {
  const pendingUsers = dbState.users
    .filter(u => u.active && !u.email)
    .map(u => ({ id: u.id, name: u.name, role: u.role }));
  res.json({ pendingUsers });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = dbState.users.find(u => u.active && u.email && u.email.trim().toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  if (!dbState.authLinks[user.id]) {
    return res.status(409).json({ error: 'NO_PASSWORD_SET' });
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error || !data?.session) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  user.lastLoginAt = new Date().toISOString();
  saveDatabase();

  res.json({ token: data.session.access_token, user });
});

// First-access flow: lets a user who has never set a password (the seeded
// admin, or a teammate freshly added in Configurações) create one. Targets
// a user either by id (picked from the setup-status list) or by email.
app.post('/api/auth/first-access', async (req, res) => {
  const { userId, email, password } = req.body || {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'A senha precisa ter ao menos 6 caracteres' });
  }
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }

  let user: UserProfile | undefined;
  if (userId) {
    user = dbState.users.find(u => u.id === userId);
  } else {
    const normalizedEmail = String(email).trim().toLowerCase();
    user = dbState.users.find(u => u.email && u.email.trim().toLowerCase() === normalizedEmail);
  }

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  if (dbState.authLinks[user.id]) {
    return res.status(409).json({ error: 'Este usuário já tem senha configurada. Faça login normalmente.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const emailTaken = dbState.users.some(u => u.id !== user!.id && u.email && u.email.trim().toLowerCase() === normalizedEmail);
  if (emailTaken) {
    return res.status(409).json({ error: 'Este e-mail já está em uso por outro usuário' });
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true
  });
  if (createErr || !created?.user) {
    return res.status(500).json({ error: createErr?.message || 'Falha ao criar credenciais' });
  }

  user.email = String(email).trim();
  dbState.authLinks[user.id] = created.user.id;
  user.lastLoginAt = new Date().toISOString();
  saveDatabase();

  const { data: signInData, error: signInErr } = await supabaseAuth.auth.signInWithPassword({ email: normalizedEmail, password });
  if (signInErr || !signInData?.session) {
    return res.status(500).json({ error: 'Credenciais criadas, mas falha ao iniciar sessão. Faça login normalmente.' });
  }

  res.json({ token: signInData.session.access_token, user });
});

app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    try {
      await supabaseAdmin.auth.admin.signOut(token, 'global');
    } catch {
      // JWT is stateless — the client already discards it locally either way.
    }
  }
  res.json({ success: true });
});

app.get('/api/auth/session', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  res.json({ user });
});

// Admin (or self) sets/resets another user's password — used by the "Novo
// Usuário" form and the "Redefinir senha" action in Configurações.
app.post('/api/auth/set-password', requireAuth, async (req, res) => {
  const requester = (req as any).user as UserProfile;

  const { userId, newPassword, currentPassword } = req.body || {};
  if (!userId || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Usuário e senha (mín. 6 caracteres) são obrigatórios' });
  }
  if (requester.role !== 'admin' && requester.id !== userId) {
    return res.status(403).json({ error: 'Sem permissão para definir a senha deste usuário' });
  }

  const target = dbState.users.find(u => u.id === userId);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  const existingAuthId = dbState.authLinks[target.id];

  // Self-service (changing your own password, not an admin resetting
  // someone else's) requires proving you know the current one first.
  const isSelfService = requester.id === userId;
  if (isSelfService && existingAuthId) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Informe sua senha atual' });
    }
    const { error: verifyErr } = await supabaseAuth.auth.signInWithPassword({ email: target.email, password: currentPassword });
    if (verifyErr) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
  }

  if (existingAuthId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existingAuthId, { password: newPassword });
    if (error) return res.status(500).json({ error: error.message });
  } else {
    if (!target.email) {
      return res.status(400).json({ error: 'Usuário sem e-mail definido — use o fluxo de primeiro acesso.' });
    }
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: target.email,
      password: newPassword,
      email_confirm: true
    });
    if (error || !created?.user) return res.status(500).json({ error: error?.message || 'Falha ao criar credenciais' });
    dbState.authLinks[target.id] = created.user.id;
  }

  saveDatabase();
  logAudit(
    requester,
    isSelfService ? 'password_changed_self' : 'password_reset',
    target.name,
    isSelfService ? undefined : `Redefinida por ${requester.name}`
  );
  res.json({ success: true });
});

// Admin-only "panic button". GoTrue's admin.signOut() takes a session JWT,
// not a user id — there's no built-in "kill every session for user X" call,
// and JWTs are stateless (valid until they expire regardless of anything
// done server-side, up to JWT_EXP — 1h in this stack's docker-compose). So
// the practical version of this button: rotate the password to a random,
// never-shared value. That blocks every *future* login immediately; any
// session already open elsewhere still expires naturally within the hour
// rather than being cut instantly. The route/response is honest about that.
app.post('/api/users/:id/revoke-sessions', requireAuth, requireAdmin, async (req, res) => {
  const requester = (req as any).user as UserProfile;
  const authId = dbState.authLinks[req.params.id];
  if (!authId) return res.status(404).json({ error: 'Usuário não tem senha configurada ainda' });

  const randomPassword = generateSecret('revoked', 24);
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, { password: randomPassword });
  if (error) return res.status(500).json({ error: error.message });

  const target = dbState.users.find(u => u.id === req.params.id);
  logAudit(requester, 'sessions_revoked', target?.name || req.params.id);

  res.json({
    success: true,
    message: 'Login bloqueado imediatamente. Sessões já abertas em outros dispositivos expiram em até 1 hora.'
  });
});

// ------------------------------------------
// EVOLUTION API PROXY (Secure Server-Side)
// ------------------------------------------
app.get('/api/whatsapp/status', requireAuth, async (req, res) => {
  const targetUrl = (dbState.settings.evolutionApiUrl || process.env.EVOLUTION_API_URL || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const targetInstance = dbState.settings.evolutionInstance || process.env.EVOLUTION_INSTANCE || 'aurum-crm';
  const targetKey = dbState.settings.evolutionApiKey || process.env.EVOLUTION_API_KEY;

  if (!targetKey) {
    return res.json({ connected: false, state: 'unknown', message: 'Evolution API Key não configurada.' });
  }

  try {
    const endpoint = `${targetUrl}/instance/connectionState/${encodeURIComponent(targetInstance)}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'apikey': targetKey, 'Content-Type': 'application/json' }
    });

    if (response.status === 401 || response.status === 403) {
      return res.json({ connected: false, state: 'refused', message: 'Chave de API inválida ou não autorizada.' });
    }
    if (response.status === 404) {
      return res.json({ connected: false, state: 'close', message: `Instância "${targetInstance}" não encontrada.` });
    }
    if (!response.ok) {
      return res.json({ connected: false, state: 'unknown', message: `Servidor retornou status HTTP ${response.status}.` });
    }

    const data = await response.json();
    const stateStr = (data?.instance?.state || data?.state || 'unknown').toLowerCase();
    const isOpen = stateStr === 'open' || stateStr === 'connected';

    res.json({
      connected: isOpen,
      state: isOpen ? 'open' : stateStr,
      message: isOpen
        ? `Instância "${targetInstance}" conectada com sucesso ao WhatsApp!`
        : `Instância "${targetInstance}" está com status: ${stateStr.toUpperCase()}.`
    });
  } catch (err: any) {
    console.error('Evolution API status proxy error:', err);
    res.json({ connected: false, state: 'unknown', message: `Não foi possível conectar ao servidor Evolution API: ${err?.message || 'erro de rede'}` });
  }
});

app.post('/api/whatsapp/send', requireAuth, async (req, res) => {
  const { recipientPhone, text, instance, apiKey, apiUrl } = req.body;

  const targetUrl = (apiUrl || dbState.settings.evolutionApiUrl || process.env.EVOLUTION_API_URL || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const targetInstance = instance || dbState.settings.evolutionInstance || process.env.EVOLUTION_INSTANCE || 'aurum-crm';
  const targetKey = apiKey || dbState.settings.evolutionApiKey || process.env.EVOLUTION_API_KEY;

  if (!recipientPhone || !text) {
    return res.status(400).json({ success: false, error: 'Telefone e mensagem são obrigatórios' });
  }

  const cleanPhone = formatBrazilPhone(recipientPhone);

  if (!targetKey) {
    return res.status(400).json({
      success: false,
      error: 'Evolution API Key não configurada. Configure a chave nas configurações do sistema ou variável de ambiente.'
    });
  }

  try {
    const endpoint = `${targetUrl}/message/sendText/${encodeURIComponent(targetInstance)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': targetKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
        delay: 1200,
        linkPreview: true
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.message || data?.error || 'Erro no envio WhatsApp',
        details: data
      });
    }

    res.json({
      success: true,
      messageId: data?.key?.id || data?.messageId || `msg-${Date.now()}`,
      statusText: 'Mensagem enviada com sucesso pelo WhatsApp via Evolution API!',
      details: data
    });
  } catch (err: any) {
    console.error('Evolution API Proxy error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Falha ao conectar com o servidor da Evolution API'
    });
  }
});

// Credentials always come from server-side settings/env, never from the
// client — these routes manage the WhatsApp instance itself (create/pair/
// disconnect/delete), a higher-privilege action than sending a message.
function getEvolutionCreds() {
  return {
    url: (dbState.settings.evolutionApiUrl || process.env.EVOLUTION_API_URL || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, ''),
    instance: dbState.settings.evolutionInstance || process.env.EVOLUTION_INSTANCE || 'aurum-crm',
    key: dbState.settings.evolutionApiKey || process.env.EVOLUTION_API_KEY
  };
}

app.get('/api/whatsapp/qrcode', requireAuth, requirePermission('canManageWhatsApp'), async (req, res) => {
  const { url, instance, key } = getEvolutionCreds();
  if (!key) return res.status(400).json({ error: 'Evolution API Key não configurada' });

  try {
    const response = await fetch(`${url}/instance/connect/${encodeURIComponent(instance)}`, {
      method: 'GET',
      headers: { apikey: key, 'Content-Type': 'application/json' }
    });
    if (!response.ok) return res.status(response.status).json({ error: `Erro ao obter QR Code (HTTP ${response.status})` });

    const data = await response.json();
    let qrImg = data?.qrcode?.base64 || data?.base64 || data?.qrcode || null;
    if (typeof qrImg === 'string' && qrImg.length > 0 && !qrImg.startsWith('data:image')) {
      qrImg = `data:image/png;base64,${qrImg}`;
    }
    res.json({ ...data, base64: qrImg, qrcode: qrImg, pairingCode: data?.pairingCode || data?.code });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erro de conexão ao buscar QR Code' });
  }
});

app.post('/api/whatsapp/instance', requireAuth, requirePermission('canManageWhatsApp'), async (req, res) => {
  const { url, instance, key } = getEvolutionCreds();
  if (!key) return res.status(400).json({ success: false, error: 'Chave Global da Evolution API necessária para criar instâncias.' });

  try {
    const payload: Record<string, any> = { instanceName: instance, integration: 'WHATSAPP-BAILEYS', qrcode: true };
    const phoneNumber = req.body?.phoneNumber;
    if (phoneNumber) {
      payload.number = formatBrazilPhone(String(phoneNumber));
    }

    const response = await fetch(`${url}/instance/create`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok && response.status !== 403) {
      return res.status(response.status).json({ success: false, error: data?.message || data?.error || `Erro HTTP ${response.status}` });
    }

    const instanceToken = data?.hash || data?.instance?.token || data?.token;
    let qr = data?.qrcode?.base64 || data?.qrcode || data?.base64 || null;
    if (qr && typeof qr === 'string' && !qr.startsWith('data:image')) qr = `data:image/png;base64,${qr}`;

    if (instanceToken) {
      dbState.settings.evolutionInstanceToken = instanceToken;
      saveDatabase();
    }
    logAudit((req as any).user, 'whatsapp_instance_created', instance);
    res.status(201).json({ success: true, instanceName: instance, instanceToken, qrcode: qr });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erro ao comunicar com o servidor Evolution API.' });
  }
});

app.post('/api/whatsapp/logout', requireAuth, requirePermission('canManageWhatsApp'), async (req, res) => {
  const { url, instance, key } = getEvolutionCreds();
  if (!key) return res.status(400).json({ success: false, error: 'Evolution API Key não configurada' });

  try {
    const response = await fetch(`${url}/instance/logout/${encodeURIComponent(instance)}`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' }
    });
    if (!response.ok) return res.status(response.status).json({ success: false, error: `Erro HTTP ${response.status}` });
    logAudit((req as any).user, 'whatsapp_instance_disconnected', instance);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erro ao desconectar' });
  }
});

app.delete('/api/whatsapp/instance', requireAuth, requirePermission('canManageWhatsApp'), async (req, res) => {
  const { url, instance, key } = getEvolutionCreds();
  if (!key) return res.status(400).json({ success: false, error: 'Evolution API Key não configurada' });

  try {
    const response = await fetch(`${url}/instance/delete/${encodeURIComponent(instance)}`, {
      method: 'DELETE',
      headers: { apikey: key, 'Content-Type': 'application/json' }
    });
    if (!response.ok) return res.status(response.status).json({ success: false, error: `Erro HTTP ${response.status}` });
    dbState.settings.evolutionInstanceToken = '';
    saveDatabase();
    logAudit((req as any).user, 'whatsapp_instance_deleted', instance);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Erro ao deletar' });
  }
});

// ==========================================
// MCP SERVER (exposes CRM data/actions to AI assistants over HTTP)
// ==========================================
mountMcpServer(app, {
  isEnabled: () => dbState.settings.mcpEnabled,
  authenticate: (rawToken: string) => {
    const hash = sha256Hex(rawToken);
    const token = dbState.mcpTokens.find(t => !t.revoked && t.tokenHash === hash);
    if (!token) return null;
    if (token.expiresAt && new Date(token.expiresAt).getTime() < Date.now()) return null;
    token.lastUsedAt = new Date().toISOString();
    saveDatabase();
    return { scopes: token.scopes };
  },
  getState: () => dbState,
  createLead: (body: any) => createLeadRecord(body)
});

// ==========================================
// VITE OR STATIC SERVING
// ==========================================
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurum CRM Server running on port ${PORT}`);
  });
}
