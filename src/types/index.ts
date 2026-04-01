export interface TimelineEntry {
  id: string;
  type: string;
  text: string;
  time: string;
}

export interface NoteEntry {
  id: string;
  text: string;
  time: string;
  author?: string;
}

export interface ClientMessage {
  id: string;
  from: 'client' | 'me';
  text: string;
  time: string;
}

export interface BriefingQuestion {
  id: string;
  question: string;
  hint: string;
  answer: string;
}

export interface Credential {
  id: string;
  label: string;
  site: string;
  login: string;
  password: string;
  description: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  size: string;
  mimeType: string;
  url: string;
  uploadedAt: string;
  restricted: boolean;
  storagePath?: string;
}

export interface ProjectComment {
  id: string;
  author: string;
  text: string;
  time: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  value: number;
  setup?: number;
  mensalidade?: number;
  stage: 'novo' | 'qualificando' | 'proposta' | 'negociacao' | 'ganho' | 'perdido' | 'na';
  createdAt: string;
  lastActivity: string;
  notes: string;
  tags: string[];
  assignedTo?: string;
  sharedWith?: string[]; // additional user IDs who can also see this lead
  recorrenciaPercentual?: number; // % of mensalidade as recorrência (default 30)
  activityTimeline?: TimelineEntry[];
  notesHistory?: NoteEntry[];
}

export interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  status: 'ativo' | 'inativo' | 'prospecto';
  tags: string[];
  lastInteraction: string;
  createdAt: string;
  totalValue: number;
  deals: Deal[];
  notes: string;
  activityTimeline?: TimelineEntry[];
  messages?: ClientMessage[];
  notesHistory?: NoteEntry[];
}

export interface Deal {
  id: string;
  title: string;
  clientId: string;
  value: number;
  stage: string;
  createdAt: string;
  closedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: 'em_andamento' | 'concluido' | 'pausado';
  progress: number;
  deadline: string;
  startDate: string;
  team: TeamMember[];
  tasks: Task[];
  description: string;
  mensalidade?: number; // monthly value for commission calculation
  briefingQuestions?: BriefingQuestion[];
  credentials?: Credential[];
  files?: ProjectFile[];
  comments?: ProjectComment[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  userId?: string;
  percentual?: number; // % of project mensalidade as recorrência
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  assignee?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'entrada' | 'saida';
  value: number;
}

export interface Event {
  id: string;
  title: string;
  type: 'reuniao' | 'followup' | 'demo' | 'ligacao';
  date: string;
  time: string;
  clientId?: string;
  clientName?: string;
  notes: string;
  duration: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'agent';
  avatar?: string;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  novaLead: boolean;
  negocioFechado: boolean;
  pagamentoRecebido: boolean;
  tarefaVencendo: boolean;
  followupPendente: boolean;
  relatorioSemanal: boolean;
}

export interface IntegrationSetting {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  status: string;
  config?: Record<string, unknown>;
}

export interface CompanySettings {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  segment: string;
  website: string;
  logoUrl?: string;
}
