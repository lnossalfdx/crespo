import type {
  BriefingQuestion,
  Client,
  ClientMessage,
  CompanySettings,
  Credential,
  Event,
  IntegrationSetting,
  Lead,
  NoteEntry,
  Notification,
  NotificationSettings,
  Project,
  ProjectComment,
  ProjectFile,
  Task,
  TeamMember,
  TimelineEntry,
  Transaction,
  User,
} from '../types';

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asArray<T>(value: unknown, map: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(map) : [];
}

function parseJson<T>(value: JsonValue | undefined, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export const defaultNotificationSettings: NotificationSettings = {
  novaLead: true,
  negocioFechado: true,
  pagamentoRecebido: true,
  tarefaVencendo: true,
  followupPendente: false,
  relatorioSemanal: true,
};

export const defaultCompanySettings: CompanySettings = {
  id: 'default',
  name: '',
  cnpj: '',
  address: '',
  segment: '',
  website: '',
  logoUrl: '',
};

export const defaultIntegrationSettings: IntegrationSetting[] = [];

export function mapTimelineEntry(item: unknown): TimelineEntry {
  const row = asRecord(item);
  return {
    id: asString(row.id, crypto.randomUUID()),
    type: asString(row.type),
    text: asString(row.text),
    time: asString(row.time, new Date().toISOString()),
  };
}

export function mapNoteEntry(item: unknown): NoteEntry {
  const row = asRecord(item);
  return {
    id: asString(row.id, crypto.randomUUID()),
    text: asString(row.text),
    time: asString(row.time, new Date().toISOString()),
    author: asString(row.author) || undefined,
  };
}

export function mapClientMessage(item: unknown): ClientMessage {
  const row = asRecord(item);
  const from = asString(row.from) === 'me' ? 'me' : 'client';
  return {
    id: asString(row.id, crypto.randomUUID()),
    from,
    text: asString(row.text),
    time: asString(row.time),
  };
}

export function mapTask(item: unknown): Task {
  const row = asRecord(item);
  return {
    id: asString(row.id, crypto.randomUUID()),
    title: asString(row.title),
    completed: asBoolean(row.completed),
    dueDate: asString(row.dueDate) || undefined,
    assignee: asString(row.assignee) || undefined,
  };
}

export function mapTeamMember(item: unknown): TeamMember {
  const row = asRecord(item);
  return {
    id: asString(row.id, crypto.randomUUID()),
    name: asString(row.name),
    role: asString(row.role),
    avatar: asString(row.avatar) || undefined,
    userId: asString(row.userId) || undefined,
    percentual: row.percentual == null ? undefined : asNumber(row.percentual),
  };
}

export function mapBriefingQuestion(item: unknown): BriefingQuestion {
  const row = asRecord(item);
  return {
    id: asString(row.id, crypto.randomUUID()),
    question: asString(row.question),
    hint: asString(row.hint),
    answer: asString(row.answer),
  };
}

export function mapCredential(item: unknown): Credential {
  const row = asRecord(item);
  return {
    id: asString(row.id, crypto.randomUUID()),
    label: asString(row.label),
    site: asString(row.site),
    login: asString(row.login),
    password: asString(row.password),
    description: asString(row.description),
  };
}

export function mapProjectFile(item: unknown): ProjectFile {
  const row = asRecord(item);
  return {
    id: asString(row.id, crypto.randomUUID()),
    name: asString(row.name),
    size: asString(row.size),
    mimeType: asString(row.mimeType),
    url: asString(row.url),
    uploadedAt: asString(row.uploadedAt, new Date().toISOString()),
    restricted: asBoolean(row.restricted),
    storagePath: asString(row.storagePath) || undefined,
  };
}

export function mapProjectComment(item: unknown): ProjectComment {
  const row = asRecord(item);
  return {
    id: asString(row.id, crypto.randomUUID()),
    author: asString(row.author),
    text: asString(row.text),
    time: asString(row.time, new Date().toISOString()),
  };
}

export function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: asString(row.id),
    name: asString(row.name),
    company: asString(row.company),
    phone: asString(row.phone),
    email: asString(row.email),
    value: asNumber(row.value),
    setup: row.setup == null ? undefined : asNumber(row.setup),
    mensalidade: row.mensalidade == null ? undefined : asNumber(row.mensalidade),
    stage: asString(row.stage, 'novo') as Lead['stage'],
    createdAt: asString(row.created_at ?? row.createdAt, new Date().toISOString()),
    lastActivity: asString(row.last_activity ?? row.lastActivity, new Date().toISOString()),
    notes: asString(row.notes),
    tags: asStringArray(parseJson(row.tags as JsonValue | undefined, [])),
    assignedTo: asString(row.assigned_to ?? row.assignedTo) || undefined,
    sharedWith: asStringArray(parseJson(row.shared_with as JsonValue | undefined, [])),
    recorrenciaPercentual:
      row.recorrencia_percentual == null ? undefined : asNumber(row.recorrencia_percentual),
    activityTimeline: asArray(parseJson(row.activity_timeline as JsonValue | undefined, []), mapTimelineEntry),
    notesHistory: asArray(parseJson(row.notes_history as JsonValue | undefined, []), mapNoteEntry),
  };
}

export function leadToRow(lead: Omit<Lead, 'id'> | Lead) {
  return {
    id: 'id' in lead ? lead.id : undefined,
    name: lead.name,
    company: lead.company,
    phone: lead.phone,
    email: lead.email,
    value: lead.value,
    setup: lead.setup ?? null,
    mensalidade: lead.mensalidade ?? null,
    stage: lead.stage,
    created_at: lead.createdAt,
    last_activity: lead.lastActivity,
    notes: lead.notes,
    tags: lead.tags,
    assigned_to: lead.assignedTo ?? null,
    shared_with: lead.sharedWith ?? [],
    recorrencia_percentual: lead.recorrenciaPercentual ?? null,
    activity_timeline: lead.activityTimeline ?? [],
    notes_history: lead.notesHistory ?? [],
  };
}

export function mapClient(row: Record<string, unknown>): Client {
  return {
    id: asString(row.id),
    name: asString(row.name),
    company: asString(row.company),
    phone: asString(row.phone),
    email: asString(row.email),
    status: asString(row.status, 'prospecto') as Client['status'],
    tags: asStringArray(parseJson(row.tags as JsonValue | undefined, [])),
    lastInteraction: asString(row.last_interaction ?? row.lastInteraction, new Date().toISOString()),
    createdAt: asString(row.created_at ?? row.createdAt, new Date().toISOString()),
    totalValue: asNumber(row.total_value ?? row.totalValue),
    deals: asArray(parseJson(row.deals as JsonValue | undefined, []), (item) => {
      const deal = asRecord(item);
      return {
        id: asString(deal.id, crypto.randomUUID()),
        title: asString(deal.title),
        clientId: asString(deal.clientId),
        value: asNumber(deal.value),
        stage: asString(deal.stage),
        createdAt: asString(deal.createdAt, new Date().toISOString()),
        closedAt: asString(deal.closedAt) || undefined,
      };
    }),
    notes: asString(row.notes),
    activityTimeline: asArray(parseJson(row.activity_timeline as JsonValue | undefined, []), mapTimelineEntry),
    messages: asArray(parseJson(row.messages as JsonValue | undefined, []), mapClientMessage),
    notesHistory: asArray(parseJson(row.notes_history as JsonValue | undefined, []), mapNoteEntry),
  };
}

export function clientToRow(client: Omit<Client, 'id'> | Client) {
  return {
    id: 'id' in client ? client.id : undefined,
    name: client.name,
    company: client.company,
    phone: client.phone,
    email: client.email,
    status: client.status,
    tags: client.tags,
    last_interaction: client.lastInteraction,
    created_at: client.createdAt,
    total_value: client.totalValue,
    deals: client.deals,
    notes: client.notes,
    activity_timeline: client.activityTimeline ?? [],
    messages: client.messages ?? [],
    notes_history: client.notesHistory ?? [],
  };
}

export function mapProject(row: Record<string, unknown>): Project {
  return {
    id: asString(row.id),
    name: asString(row.name),
    clientId: asString(row.client_id ?? row.clientId),
    clientName: asString(row.client_name ?? row.clientName),
    status: asString(row.status, 'em_andamento') as Project['status'],
    progress: Math.max(0, Math.min(100, Math.round(asNumber(row.progress)))),
    deadline: asString(row.deadline),
    startDate: asString(row.start_date ?? row.startDate),
    team: asArray(parseJson(row.team as JsonValue | undefined, []), mapTeamMember),
    tasks: asArray(parseJson(row.tasks as JsonValue | undefined, []), mapTask),
    description: asString(row.description),
    mensalidade: row.mensalidade == null ? undefined : asNumber(row.mensalidade),
    briefingQuestions: asArray(
      parseJson(row.briefing_questions as JsonValue | undefined, []),
      mapBriefingQuestion
    ),
    credentials: asArray(parseJson(row.credentials as JsonValue | undefined, []), mapCredential),
    files: asArray(parseJson(row.files as JsonValue | undefined, []), mapProjectFile),
    comments: asArray(parseJson(row.comments as JsonValue | undefined, []), mapProjectComment),
  };
}

export function projectToRow(project: Omit<Project, 'id'> | Project) {
  return {
    id: 'id' in project ? project.id : undefined,
    name: project.name,
    client_id: project.clientId,
    client_name: project.clientName,
    status: project.status,
    progress: project.progress,
    deadline: project.deadline || null,
    start_date: project.startDate || null,
    team: project.team,
    tasks: project.tasks,
    description: project.description,
    mensalidade: project.mensalidade ?? null,
    briefing_questions: project.briefingQuestions ?? [],
    credentials: project.credentials ?? [],
    files: project.files ?? [],
    comments: project.comments ?? [],
  };
}

export function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: asString(row.id),
    date: asString(row.date),
    description: asString(row.description),
    category: asString(row.category),
    type: asString(row.type, 'entrada') as Transaction['type'],
    value: asNumber(row.value),
  };
}

export function transactionToRow(transaction: Omit<Transaction, 'id'> | Transaction) {
  return {
    id: 'id' in transaction ? transaction.id : undefined,
    date: transaction.date,
    description: transaction.description,
    category: transaction.category,
    type: transaction.type,
    value: transaction.value,
  };
}

export function mapEvent(row: Record<string, unknown>): Event {
  const rawTime = asString(row.time);
  return {
    id: asString(row.id),
    title: asString(row.title),
    type: asString(row.type, 'reuniao') as Event['type'],
    date: asString(row.date),
    time: rawTime.length >= 5 ? rawTime.slice(0, 5) : rawTime,
    clientId: asString(row.client_id ?? row.clientId) || undefined,
    clientName: asString(row.client_name ?? row.clientName) || undefined,
    notes: asString(row.notes),
    duration: asNumber(row.duration, 30),
  };
}

export function eventToRow(event: Omit<Event, 'id'> | Event) {
  return {
    id: 'id' in event ? event.id : undefined,
    title: event.title,
    type: event.type,
    date: event.date,
    time: event.time,
    client_id: event.clientId ?? null,
    client_name: event.clientName ?? null,
    notes: event.notes,
    duration: event.duration,
  };
}

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: asString(row.id),
    name: asString(row.name),
    email: asString(row.email),
    phone: asString(row.phone),
    role: asString(row.role, 'agent') as User['role'],
    avatar: asString(row.avatar) || undefined,
  };
}

export function userToRow(user: Omit<User, 'id'> | User) {
  return {
    id: 'id' in user ? user.id : undefined,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar ?? null,
  };
}

export function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: asString(row.id),
    type: asString(row.type),
    message: asString(row.message),
    read: asBoolean(row.read),
    createdAt: asString(row.created_at ?? row.createdAt, new Date().toISOString()),
  };
}

export function mapNotificationSettings(row: Record<string, unknown>): NotificationSettings {
  const parsed = parseJson(row.notification_settings as JsonValue | undefined, defaultNotificationSettings);
  return {
    ...defaultNotificationSettings,
    ...asRecord(parsed),
  } as NotificationSettings;
}

export function mapCompanySettings(row: Record<string, unknown>): CompanySettings {
  return {
    id: asString(row.id, 'default'),
    name: asString(row.name, defaultCompanySettings.name),
    cnpj: asString(row.cnpj),
    address: asString(row.address),
    segment: asString(row.segment, defaultCompanySettings.segment),
    website: asString(row.website, defaultCompanySettings.website),
    logoUrl: asString(row.logo_url ?? row.logoUrl) || undefined,
  };
}

export function companySettingsToRow(settings: CompanySettings) {
  return {
    id: settings.id,
    name: settings.name,
    cnpj: settings.cnpj,
    address: settings.address,
    segment: settings.segment,
    website: settings.website,
    logo_url: settings.logoUrl ?? null,
  };
}

export function mapIntegrationSetting(row: Record<string, unknown>): IntegrationSetting {
  return {
    id: asString(row.id),
    name: asString(row.name),
    description: asString(row.description),
    icon: asString(row.icon),
    connected: asBoolean(row.connected),
    status: asString(row.status, row.connected ? 'Conectado' : 'Desconectado'),
    config: asRecord(parseJson(row.config as JsonValue | undefined, {})),
  };
}

export function integrationToRow(integration: IntegrationSetting) {
  return {
    id: integration.id,
    name: integration.name,
    description: integration.description,
    icon: integration.icon,
    connected: integration.connected,
    status: integration.status,
    config: integration.config ?? {},
  };
}
