import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageCircle, Mail, Clock, Tag, DollarSign, GripVertical, Save, Users } from 'lucide-react';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { brlToFloat } from '../components/ui/currency';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import { useLeadsStore } from '../store/useLeadsStore';
import { useAppStore } from '../store/useAppStore';
import { useUsersStore } from '../store/useUsersStore';
import type { Lead } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';

type KanbanStage = Lead['stage'];

interface Column {
  id: KanbanStage;
  label: string;
}

const columns: Column[] = [
  { id: 'novo', label: 'Novo Lead' },
  { id: 'qualificando', label: 'Qualificando' },
  { id: 'proposta', label: 'Proposta Enviada' },
  { id: 'negociacao', label: 'Em Negociação' },
  { id: 'ganho', label: 'Ganho' },
  { id: 'perdido', label: 'Perdido' },
];

const stageBadgeVariant: Record<KanbanStage, 'novo' | 'qualificando' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'> = {
  novo: 'novo',
  qualificando: 'qualificando',
  proposta: 'proposta',
  negociacao: 'negociacao',
  ganho: 'ganho',
  perdido: 'perdido',
};

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

const LeadCard: React.FC<LeadCardProps & { isDragging?: boolean }> = ({ lead, onClick, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`
          bg-gray-900 border border-gray-800 rounded-lg p-3
          hover:border-gray-600 transition-colors
          ${isDragging ? 'shadow-2xl shadow-black/50 rotate-1' : ''}
        `}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Drag handle */}
          <div
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-gray-700 hover:text-gray-500 transition-colors"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1 cursor-pointer">
            <p className="text-sm font-medium text-white truncate">{lead.name}</p>
            <p className="text-xs text-gray-500 truncate">{lead.company}</p>
          </div>
          <a
            href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-green-500 hover:text-green-400 transition-colors flex-shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-semibold text-white">
            R$ {lead.value.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs text-gray-600">
            {format(new Date(lead.lastActivity), 'dd/MM', { locale: ptBR })}
          </span>
        </div>
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {lead.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-gray-800 text-gray-500 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

interface DroppableColumnProps {
  column: Column;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onAddClick: () => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ column, leads, onCardClick, onAddClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const totalValue = leads.reduce((sum, l) => sum + l.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-64 w-64 flex-shrink-0 rounded-xl border transition-colors ${
        isOver ? 'border-gray-500 bg-gray-800/30' : 'border-gray-800 bg-gray-900/50'
      }`}
    >
      {/* Column Header */}
      <div className="px-3 py-3 border-b border-gray-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={stageBadgeVariant[column.id]}>{column.label}</Badge>
            <span className="text-xs text-gray-500 font-medium">{leads.length}</span>
          </div>
          {totalValue > 0 && (
            <p className="text-xs text-gray-600 mt-0.5">
              R$ {totalValue.toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <button
          onClick={onAddClick}
          className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center text-gray-500 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 min-h-20 max-h-[calc(100vh-240px)] overflow-y-auto">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onCardClick(lead)}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
};

const stageColumnLabel: Record<string, string> = {
  novo: 'Novo Lead',
  qualificando: 'Qualificando',
  proposta: 'Proposta Enviada',
  negociacao: 'Em Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

type EditLeadFormData = {
  name: string;
  company: string;
  phone: string;
  email: string;
  stage: KanbanStage;
  notes: string;
};

/* Converts a float to raw cents string for CurrencyInput */
function floatToRaw(v?: number): string {
  if (!v) return '';
  return String(Math.round(v * 100));
}

/* ── Full lead profile modal ─────────────────────────────────────────────── */
const LeadProfileModal: React.FC<{ lead: Lead; onClose: () => void }> = ({ lead: initialLead, onClose }) => {
  const { leads, updateLead } = useLeadsStore();
  const { user } = useAppStore();
  const { users } = useUsersStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  // Always read the live version of the lead from the store
  const lead = leads.find((l) => l.id === initialLead.id) ?? initialLead;
  const activityTimeline = lead.activityTimeline ?? [];
  const notesHistory = lead.notesHistory ?? [];

  const [activeTab, setActiveTab] = useState('editar');
  const [noteText, setNoteText] = useState('');
  const [saved, setSaved] = useState(false);
  const [setupRaw, setSetupRaw] = useState(floatToRaw(initialLead.setup));
  const [mensalidadeRaw, setMensalidadeRaw] = useState(floatToRaw(initialLead.mensalidade));
  const [percentualRec, setPercentualRec] = useState<number>(lead.recorrenciaPercentual ?? 30);
  const [editingPct, setEditingPct] = useState(false);
  const [pctInput, setPctInput] = useState('');

  const { register, handleSubmit } = useForm<EditLeadFormData>({
    defaultValues: {
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      email: lead.email,
      stage: lead.stage,
      notes: lead.notes,
    },
  });

  const onSave = async (data: EditLeadFormData) => {
    const setup = setupRaw ? brlToFloat(setupRaw) : undefined;
    const mensalidade = mensalidadeRaw ? brlToFloat(mensalidadeRaw) : undefined;
    await updateLead(lead.id, {
      name: data.name,
      company: data.company,
      phone: data.phone,
      email: data.email,
      value: (setup ?? 0) + (mensalidade ?? 0),
      setup,
      mensalidade,
      stage: data.stage,
      notes: data.notes,
      recorrenciaPercentual: percentualRec,
      lastActivity: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const savePct = async () => {
    const p = Math.min(100, Math.max(0, parseFloat(pctInput) || 0));
    setPercentualRec(p);
    await updateLead(lead.id, { recorrenciaPercentual: p });
    setEditingPct(false);
  };

  const addNote = async () => {
    if (noteText.trim()) {
      const next = [
        {
          id: crypto.randomUUID(),
          text: noteText.trim(),
          time: new Date().toISOString(),
          author: user?.name ?? 'Responsyva',
        },
        ...notesHistory,
      ];
      await updateLead(lead.id, { notesHistory: next });
      setNoteText('');
    }
  };

  const localTabs = [
    { id: 'editar', label: 'Editar' },
    { id: 'atividades', label: 'Atividades' },
    { id: 'notas', label: 'Notas' },
  ];

  return (
    <Modal isOpen onClose={onClose} size="xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <Avatar name={lead.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">{lead.name}</h2>
            <Badge variant={stageBadgeVariant[lead.stage]}>
              {stageColumnLabel[lead.stage]}
            </Badge>
          </div>
          <p className="text-gray-400 text-sm mb-2">{lead.company}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {lead.phone}
            </a>
            <a
              href={`mailto:${lead.email}`}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {lead.email}
            </a>
          </div>
        </div>
        <div className="text-right flex-shrink-0 space-y-1">
          {lead.mensalidade && (
            <div>
              <p className="text-xs text-gray-500">Mensalidade</p>
              <p className="text-base font-bold text-white">R$ {lead.mensalidade.toLocaleString('pt-BR')}</p>
            </div>
          )}
          {lead.setup && (
            <div>
              <p className="text-xs text-gray-500">Setup</p>
              <p className="text-sm font-semibold text-gray-300">R$ {lead.setup.toLocaleString('pt-BR')}</p>
            </div>
          )}
          {!lead.mensalidade && !lead.setup && (
            <div>
              <p className="text-xs text-gray-500">Valor</p>
              <p className="text-xl font-bold text-white">R$ {lead.value.toLocaleString('pt-BR')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={localTabs} activeTab={activeTab} onChange={setActiveTab} className="mb-5" />

      {/* Tab: Editar */}
      {activeTab === 'editar' && (
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nome</label>
              <input
                {...register('name', { required: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Empresa</label>
              <input
                {...register('company')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Telefone</label>
              <input
                {...register('phone')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">E-mail</label>
              <input
                {...register('email')}
                type="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
              />
            </div>
          </div>

          {/* Valores financeiros */}
          <div className="border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Valores
            </p>
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
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Estágio</label>
            <select
              {...register('stage')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Recorrência — visible when ganho */}
          {lead.stage === 'ganho' && lead.mensalidade && (
            <div className="border border-gray-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Recorrência do agente
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Mensalidade: R$ {lead.mensalidade.toLocaleString('pt-BR')}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    R$ {Math.round(lead.mensalidade * percentualRec / 100).toLocaleString('pt-BR')}/mês
                  </p>
                </div>
                {isAdmin ? (
                  editingPct ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type="number"
                        value={pctInput}
                        onChange={(e) => setPctInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') savePct(); if (e.key === 'Escape') setEditingPct(false); }}
                        className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm outline-none"
                        min="0" max="100"
                      />
                      <span className="text-gray-500 text-sm">%</span>
                      <button type="button" onClick={savePct} className="text-green-400 hover:text-green-300">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setEditingPct(false)} className="text-gray-600 hover:text-white">
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setPctInput(String(percentualRec)); setEditingPct(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                    >
                      {percentualRec}%
                      <Tag className="w-3 h-3 text-gray-600" />
                    </button>
                  )
                ) : (
                  <span className="text-sm text-gray-400">{percentualRec}%</span>
                )}
              </div>
            </div>
          )}

          {/* Shared with */}
          <div className="border border-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Compartilhar com
            </p>
            <p className="text-xs text-gray-600">Outros usuários que poderão ver este card no Kanban</p>
            <div className="space-y-1.5 pt-1">
              {users.map((u) => {
                const isShared = (lead.sharedWith ?? []).includes(u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} size="xs" />
                      <span className="text-sm text-gray-300">{u.name}</span>
                      <span className="text-xs text-gray-600">{u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'Gerente' : 'Agente'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = lead.sharedWith ?? [];
                        const next = isShared
                          ? current.filter((id) => id !== u.id)
                          : [...current, u.id];
                        updateLead(lead.id, { sharedWith: next });
                      }}
                      className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${isShared ? 'bg-white' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${isShared ? 'left-4 bg-black' : 'left-0.5 bg-gray-400'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Observações</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Notas sobre esta lead..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm outline-none focus:border-gray-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {saved ? 'Salvo!' : 'Salvar alterações'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}
              leftIcon={<MessageCircle className="w-3.5 h-3.5" />}
            >
              WhatsApp
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Atividades */}
      {activeTab === 'atividades' && (
        activityTimeline.length === 0 ? (
          <div className="py-8 text-sm text-gray-600 text-center">Nenhuma atividade registrada para esta lead.</div>
        ) : (
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-800" />
            <div className="space-y-5">
              {activityTimeline.map((item) => (
                <div key={item.id} className="flex gap-4 relative">
                  <div className="w-7 h-7 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center flex-shrink-0 z-10">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  </div>
                  <div className="pb-1">
                    <p className="text-sm text-white">{item.text}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {format(new Date(item.time), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Tab: Notas */}
      {activeTab === 'notas' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Adicionar nova nota..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm outline-none focus:border-gray-500 resize-none"
              rows={3}
            />
            <Button onClick={addNote} disabled={!noteText.trim()} size="sm" className="self-start mt-1">
              Salvar
            </Button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notesHistory.map((note) => (
              <div key={note.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-300">{note.text}</p>
                <p className="text-xs text-gray-600 mt-1.5">
                  {format(new Date(note.time), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
              </div>
            ))}
            {lead.notes && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-300">{lead.notes}</p>
                <p className="text-xs text-gray-600 mt-1.5">
                  {format(new Date(lead.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            )}
            {notesHistory.length === 0 && !lead.notes && (
              <p className="text-sm text-gray-600 text-center py-6">Nenhuma nota ainda</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

type AddLeadFormData = {
  name: string;
  company: string;
  phone: string;
  email: string;
  value: string;
  notes: string;
};

export const Kanban: React.FC = () => {
  const { leads, moveLead, addLead } = useLeadsStore();
  const { user } = useAppStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [viewAll, setViewAll] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [addModalStage, setAddModalStage] = useState<KanbanStage | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const visibleLeads = leads.filter((l) => {
    if (isAdmin && viewAll) return true;
    if (!l.assignedTo) return true; // unassigned = visible to all
    if (l.assignedTo === user?.id) return true;
    if (l.sharedWith?.includes(user?.id ?? '')) return true;
    return false;
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddLeadFormData>();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column directly
    const columnTarget = columns.find((c) => c.id === overId);
    if (columnTarget) {
      moveLead(leadId, columnTarget.id);
      return;
    }

    // Check if dropped on another card - find its column
    const targetLead = leads.find((l) => l.id === overId);
    if (targetLead && targetLead.stage) {
      const sourceLead = leads.find((l) => l.id === leadId);
      if (sourceLead && sourceLead.stage !== targetLead.stage) {
        moveLead(leadId, targetLead.stage);
      }
    }
  };

  const onAddLead = async (data: AddLeadFormData) => {
    if (!addModalStage) return;
    await addLead({
      name: data.name,
      company: data.company,
      phone: data.phone,
      email: data.email,
      value: parseFloat(data.value) || 0,
      stage: addModalStage,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      notes: data.notes,
      tags: [],
    });
    reset();
    setAddModalStage(null);
  };

  const activeLead = visibleLeads.find((l) => l.id === activeId);

  return (
    <PageWrapper className="overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Kanban</h2>
          <p className="text-gray-500 text-sm">Gerencie suas leads arrastando entre colunas</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setViewAll((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              viewAll
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
            }`}
          >
            <span className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${viewAll ? 'bg-black' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${viewAll ? 'left-4' : 'left-0.5'}`} />
            </span>
            {viewAll ? 'Ver todos os leads' : 'Meus leads'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-4">
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {columns.map((column) => {
              const columnLeads = visibleLeads.filter((l) => l.stage === column.id);
              return (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  leads={columnLeads}
                  onCardClick={(lead) => setSelectedLead(lead)}
                  onAddClick={() => setAddModalStage(column.id)}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-2xl w-64 rotate-1 cursor-grabbing">
                <p className="text-sm font-medium text-white truncate">{activeLead.name}</p>
                <p className="text-xs text-gray-500 truncate">{activeLead.company}</p>
                <div className="mt-2">
                  <span className="text-sm font-semibold text-white">
                    R$ {activeLead.value.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Lead Profile Modal */}
      {selectedLead && (
        <LeadProfileModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* Add Lead Modal */}
      <Modal
        isOpen={!!addModalStage}
        onClose={() => { setAddModalStage(null); reset(); }}
        title="Nova Lead"
        size="md"
      >
        <form onSubmit={handleSubmit(onAddLead)} className="space-y-4">
          <Input
            label="Nome"
            placeholder="Nome do contato"
            error={errors.name?.message}
            {...register('name', { required: 'Nome obrigatório' })}
          />
          <Input
            label="Empresa"
            placeholder="Nome da empresa"
            {...register('company')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Telefone"
              placeholder="+55 11 99999-9999"
              {...register('phone')}
            />
            <Input
              label="Valor (R$)"
              placeholder="0"
              type="number"
              {...register('value')}
            />
          </div>
          <Input
            label="E-mail"
            type="email"
            placeholder="email@empresa.com"
            {...register('email')}
          />
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">Observações</label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm outline-none focus:border-gray-500 resize-none"
              rows={3}
              placeholder="Notas sobre esta lead..."
              {...register('notes')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" fullWidth>Criar Lead</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setAddModalStage(null); reset(); }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
};
