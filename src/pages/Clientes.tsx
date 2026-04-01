import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Grid3X3, List, Phone, Mail, Upload, CheckCircle, X, FileSpreadsheet, ChevronDown, ChevronUp, Trash2, UserPlus, PhoneCall, PhoneOff, Building2, AtSign, DollarSign, StickyNote } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useClientsStore } from '../store/useClientsStore';
import { useLeadsStore } from '../store/useLeadsStore';
import { Modal } from '../components/ui/Modal';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { brlToFloat } from '../components/ui/currency';
import { useForm } from 'react-hook-form';
import { useImportStore } from '../store/useImportStore';
import type { PendingLead } from '../store/useImportStore';
import { useLeadAcceptancesStore } from '../store/useLeadAcceptancesStore';
import { useDebounce } from '../hooks/useDebounce';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client } from '../types';

const statusLabels: Record<Client['status'], string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  prospecto: 'Prospecto',
};

const PAGE_SIZE = 10;

/* ── Column name aliases for flexible Excel mapping ── */
const FIELD_ALIASES: Record<string, string[]> = {
  name:    ['nome', 'name', 'contato', 'cliente'],
  company: ['empresa', 'company', 'negócio', 'negocio', 'razão social'],
  phone:   ['telefone', 'phone', 'celular', 'whatsapp', 'fone'],
  email:   ['email', 'e-mail', 'correio'],
  value:   ['valor', 'value', 'deal', 'receita'],
  notes:   ['observações', 'observacoes', 'notas', 'notes', 'obs'],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function mapRow(row: Record<string, unknown>): Omit<PendingLead, 'id' | 'createdAt' | 'importedBy'> {
  const get = (field: string): string => {
    const aliases = FIELD_ALIASES[field] ?? [];
    for (const key of Object.keys(row)) {
      if (aliases.some((a) => normalizeHeader(a) === normalizeHeader(key))) {
        return String(row[key] ?? '').trim();
      }
    }
    return '';
  };
  return {
    name:    get('name')    || 'Sem nome',
    company: get('company') || '',
    phone:   get('phone')   || '',
    email:   get('email')   || '',
    value:   parseFloat(get('value').replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
    notes:   get('notes')   || '',
  };
}

/* ── Import panel ─────────────────────────────────────────────────────────── */
/* ── Atendimento Modal ── */
interface AtendimentoModalProps {
  lead: PendingLead;
  onAtendeu: () => Promise<void>;
  onNaoAtendeu: () => Promise<void>;
  onClose: () => void;
}

const AtendimentoModal: React.FC<AtendimentoModalProps> = ({ lead, onAtendeu, onNaoAtendeu, onClose }) => {
  const [loading, setLoading] = useState<'atendeu' | 'nao' | null>(null);

  const handleAtendeu = async () => {
    setLoading('atendeu');
    await onAtendeu();
  };
  const handleNao = async () => {
    setLoading('nao');
    await onNaoAtendeu();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 24 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #111 0%, #0a0a0a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Top glow */}
          <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: '180px', background: 'radial-gradient(ellipse at 50% -20%, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 border-b border-white/5">
            <button onClick={onClose} className="absolute top-5 right-5 text-gray-600 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#fff,#d4d4d4)', color: '#000', boxShadow: '0 4px 20px rgba(255,255,255,0.15)' }}>
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">{lead.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">Lead importado</p>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="relative px-6 py-4 grid grid-cols-2 gap-3">
            {[
              { icon: Building2, label: 'Empresa', value: lead.company || '—' },
              { icon: Phone, label: 'Telefone', value: lead.phone || '—' },
              { icon: AtSign, label: 'E-mail', value: lead.email || '—' },
              { icon: DollarSign, label: 'Valor', value: lead.value > 0 ? `R$ ${lead.value.toLocaleString('pt-BR')}` : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-gray-600" />
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-xs text-gray-300 font-medium truncate">{value}</p>
              </div>
            ))}
            {lead.notes && (
              <div className="col-span-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <StickyNote className="w-3 h-3 text-gray-600" />
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Observações</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Divider + question */}
          <div className="relative px-6 pb-2">
            <div className="h-px w-full mb-4" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />
            <p className="text-center text-xs text-gray-500 font-medium uppercase tracking-widest mb-4">O cliente atendeu?</p>

            <div className="grid grid-cols-2 gap-3 pb-6">
              {/* Não Atendeu */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleNao}
                disabled={loading !== null}
                className="relative flex flex-col items-center gap-2 py-4 rounded-2xl overflow-hidden transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(185,28,28,0.08) 100%)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  boxShadow: '0 8px 24px rgba(239,68,68,0.08)',
                  opacity: loading === 'atendeu' ? 0.4 : 1,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {loading === 'nao'
                    ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <PhoneOff className="w-5 h-5 text-red-400" />}
                </div>
                <span className="text-sm font-bold text-red-400">Não Atendeu</span>
                <span className="text-[10px] text-red-500/60 font-medium">→ Mover para NA</span>
              </motion.button>

              {/* Atendeu */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAtendeu}
                disabled={loading !== null}
                className="relative flex flex-col items-center gap-2 py-4 rounded-2xl overflow-hidden transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow: '0 8px 24px rgba(255,255,255,0.05)',
                  opacity: loading === 'nao' ? 0.4 : 1,
                }}
              >
                {/* shimmer */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ x: ['-120%', '220%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3 }}
                  style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)', width: '50%' }}
                />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center relative z-10"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  {loading === 'atendeu'
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <PhoneCall className="w-5 h-5 text-white" />}
                </div>
                <span className="text-sm font-bold text-white relative z-10">Atendeu</span>
                <span className="text-[10px] text-gray-500 font-medium relative z-10">→ Qualificando</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ImportPanel: React.FC = () => {
  const { pending, addPending, removePending, clearPending } = useImportStore();
  const { addLead } = useLeadsStore();
  const { addClient } = useClientsStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(true);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [atendimentoLead, setAtendimentoLead] = useState<PendingLead | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const leads = rows.map((row) => mapRow(row));
      void addPending(leads);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const finishAccept = async (lead: PendingLead, stage: 'qualificando' | 'na') => {
    await Promise.all([
      addLead({
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        email: lead.email,
        value: lead.value,
        stage,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        notes: lead.notes,
        tags: ['importado'],
      }),
      addClient({
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        email: lead.email,
        status: 'prospecto',
        tags: ['importado'],
        lastInteraction: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        totalValue: lead.value,
        deals: [],
        notes: lead.notes,
      }),
    ]);
    void useLeadAcceptancesStore.getState().recordAcceptance();
    setAccepted((prev) => new Set(prev).add(lead.id));
    setAtendimentoLead(null);
    setTimeout(() => void removePending(lead.id), 800);
  };


  if (pending.length === 0 && accepted.size === 0) {
    return (
      <div
        className="border-2 border-dashed border-gray-800 rounded-xl p-8 text-center cursor-pointer hover:border-gray-600 transition-colors mb-6"
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        <FileSpreadsheet className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400 font-medium mb-1">Importar lista de leads</p>
        <p className="text-xs text-gray-600">Arraste ou clique para selecionar um arquivo Excel (.xlsx, .xls) ou CSV</p>
        <p className="text-xs text-gray-700 mt-2">Colunas reconhecidas: nome, empresa, telefone, email, valor, observações</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-800 rounded-xl mb-6 overflow-hidden">
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-900 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-white">Leads importados pendentes</span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{pending.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar mais
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); clearPending(); setAccepted(new Set()); }}
            className="p-1 text-gray-600 hover:text-gray-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      {/* Table */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-950">
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Nome</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 hidden sm:table-cell">Empresa</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Telefone</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">E-mail</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">Valor</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {pending.map((lead) => {
                      const isAccepted = accepted.has(lead.id);
                      return (
                        <motion.tr
                          key={lead.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: isAccepted ? 0.4 : 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-b border-gray-800 last:border-0"
                        >
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar name={lead.name} size="xs" />
                              <span className="text-sm text-white font-medium">{lead.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-sm text-gray-400 hidden sm:table-cell">{lead.company || '—'}</td>
                          <td className="py-2.5 px-4 text-sm text-gray-400 hidden md:table-cell">{lead.phone || '—'}</td>
                          <td className="py-2.5 px-4 text-sm text-gray-400 hidden lg:table-cell">{lead.email || '—'}</td>
                          <td className="py-2.5 px-4 text-right text-sm text-white">
                            {lead.value > 0 ? `R$ ${lead.value.toLocaleString('pt-BR')}` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {isAccepted ? (
                              <span className="text-xs text-green-400 flex items-center justify-end gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Aceito
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setAtendimentoLead(lead)}
                                  className="text-xs bg-white text-black px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                  Aceitar
                                </button>
                                <button
                                  onClick={() => removePending(lead.id)}
                                  className="text-gray-600 hover:text-gray-300 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Atendimento Modal */}
      {atendimentoLead && (
        <AtendimentoModal
          lead={atendimentoLead}
          onAtendeu={() => finishAccept(atendimentoLead, 'qualificando')}
          onNaoAtendeu={() => finishAccept(atendimentoLead, 'na')}
          onClose={() => setAtendimentoLead(null)}
        />
      )}
    </div>
  );
};

/* ── New client form ──────────────────────────────────────────────────────── */
type NewClientForm = {
  name: string;
  phone: string;
  email: string;
  company: string;
};

const NewClientModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addClient } = useClientsStore();
  const { addLead } = useLeadsStore();
  const { register, handleSubmit, formState: { errors } } = useForm<NewClientForm>();
  const [setupRaw, setSetupRaw] = useState('');
  const [mensalidadeRaw, setMensalidadeRaw] = useState('');

  const onSubmit = async (data: NewClientForm) => {
    const setup = brlToFloat(setupRaw);
    const mensalidade = brlToFloat(mensalidadeRaw);
    const totalValue = setup + mensalidade;
    await addClient({
      name: data.name,
      phone: data.phone,
      email: data.email || '',
      company: data.company || '',
      status: 'prospecto',
      tags: [],
      lastInteraction: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      totalValue,
      deals: [],
      notes: setup || mensalidade
        ? `Setup: R$ ${setup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Mensalidade: R$ ${mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '',
    });
    // Also add to Kanban as first stage
    await addLead({
      name: data.name,
      phone: data.phone,
      email: data.email || '',
      company: data.company || '',
      value: totalValue,
      setup: setup || undefined,
      mensalidade: mensalidade || undefined,
      stage: 'novo',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      notes: '',
      tags: [],
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Novo Cliente" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Required */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Nome <span className="text-gray-600">*</span>
          </label>
          <input
            {...register('name', { required: 'Nome obrigatório' })}
            placeholder="Nome do cliente"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
          />
          {errors.name && <p className="text-xs text-gray-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Telefone / WhatsApp <span className="text-gray-600">*</span>
          </label>
          <input
            {...register('phone', { required: 'Telefone obrigatório' })}
            placeholder="+55 11 99999-9999"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
          />
          {errors.phone && <p className="text-xs text-gray-500 mt-1">{errors.phone.message}</p>}
        </div>

        {/* Optional divider */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">campos opcionais</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">E-mail</label>
            <input
              {...register('email')}
              type="email"
              placeholder="email@exemplo.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Empresa</label>
            <input
              {...register('company')}
              placeholder="Nome da empresa"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput
            label="Setup"
            value={setupRaw}
            onChange={(raw) => setSetupRaw(raw)}
          />
          <CurrencyInput
            label="Mensalidade"
            value={mensalidadeRaw}
            onChange={(raw) => setMensalidadeRaw(raw)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" fullWidth>Cadastrar cliente</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
};

export const Clientes: React.FC = () => {
  const { clients } = useClientsStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewClient, setShowNewClient] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 250);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        !debouncedSearch ||
        c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.company.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <PageWrapper>
      {showNewClient && <NewClientModal onClose={() => setShowNewClient(false)} />}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Clientes</h2>
          <p className="text-gray-500 text-sm">{clients.length} clientes no total</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setShowNewClient(true)}
        >
          Novo cliente
        </Button>
      </div>

      {/* Import panel */}
      <ImportPanel />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={handleSearchChange}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          options={[
            { value: 'ativo', label: 'Ativo' },
            { value: 'inativo', label: 'Inativo' },
            { value: 'prospecto', label: 'Prospecto' },
          ]}
          placeholder="Todos os status"
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="w-full sm:w-44"
        />
        <div className="flex gap-1 bg-gray-900 border border-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-500 mb-4">
        Mostrando {Math.min(paginated.length, PAGE_SIZE)} de {filtered.length} resultados
      </p>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {paginated.map((client, idx) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card
                hover
                onClick={() => navigate(`/clientes/${client.id}`)}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={client.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                    <p className="text-xs text-gray-500 truncate">{client.company}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={client.status}>{statusLabels[client.status]}</Badge>
                  <span className="text-xs text-gray-600">
                    {format(new Date(client.lastInteraction), 'dd/MM/yy', { locale: ptBR })}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-gray-800">
                  <span className="text-sm font-semibold text-white">
                    R$ {client.totalValue.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-gray-600 ml-1">total</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <Card padding="none" className="mb-6 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Telefone</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 hidden lg:table-cell">Última Interação</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((client, idx) => (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => navigate(`/clientes/${client.id}`)}
                  className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={client.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-white">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400 hidden md:table-cell">{client.phone}</td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <Badge variant={client.status}>{statusLabels[client.status]}</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 hidden lg:table-cell">
                    {format(new Date(client.lastInteraction), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-white">
                    R$ {client.totalValue.toLocaleString('pt-BR')}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  p === page ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próximo
          </Button>
        </div>
      )}
    </PageWrapper>
  );
};
