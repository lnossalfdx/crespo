import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Search, X, Circle } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { useProjectsStore } from '../store/useProjectsStore';
import { useClientsStore } from '../store/useClientsStore';
import { Select } from '../components/ui/Select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Project } from '../types';

const statusLabels: Record<Project['status'], string> = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  pausado: 'Pausado',
};

/* ── Client search autocomplete ──────────────────────────────────────────── */
interface ClientOption { id: string; name: string; company: string; }

const ClientSearch: React.FC<{
  value: ClientOption | null;
  onChange: (c: ClientOption | null) => void;
}> = ({ value, onChange }) => {
  const { clients } = useClientsStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = query.trim()
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.company.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5">
        <Avatar name={value.name} size="xs" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{value.name}</p>
          {value.company && <p className="text-xs text-gray-500 truncate">{value.company}</p>}
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente cadastrado..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
        />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden"
          >
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange({ id: c.id, name: c.name, company: c.company }); setQuery(''); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left"
              >
                <Avatar name={c.name} size="xs" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{c.name}</p>
                  {c.company && <p className="text-xs text-gray-500 truncate">{c.company}</p>}
                </div>
              </button>
            ))}
          </motion.div>
        )}
        {open && query.trim() && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute z-50 top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3"
          >
            <p className="text-xs text-gray-500">Nenhum cliente encontrado</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Field wrapper ───────────────────────────────────────────────────────── */
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label className="text-xs font-medium text-gray-400 block mb-1.5">
      {label}{required && <span className="text-gray-600 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

/* ── New project modal ───────────────────────────────────────────────────── */
const NewProjectModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addProject } = useProjectsStore();
  const navigate = useNavigate();

  const [linkedClient, setLinkedClient] = useState<ClientOption | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Project['status']>('em_andamento');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);

  const addTask = () => {
    const t = taskInput.trim();
    if (t) { setTasks((prev) => [...prev, t]); setTaskInput(''); }
  };

  const removeTask = (idx: number) => setTasks((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const id = await addProject({
      name: name.trim(),
      clientId: linkedClient?.id ?? '',
      clientName: linkedClient?.name ?? '',
      status,
      progress: 0,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      deadline: deadline || '',
      description: description.trim(),
      team: [],
      tasks: tasks.map((title, i) => ({
        id: `task-new-${Date.now()}-${i}`,
        title,
        completed: false,
      })),
    });
    navigate(`/projetos/${id}`);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Novo Projeto" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name */}
        <Field label="Nome do projeto" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Implementação CRM — Empresa X"
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
          />
        </Field>

        {/* Client */}
        <Field label="Cliente vinculado">
          <ClientSearch value={linkedClient} onChange={setLinkedClient} />
          {!linkedClient && (
            <p className="text-xs text-gray-700 mt-1">Busque pelo nome ou empresa de um cliente cadastrado</p>
          )}
        </Field>

        {/* Status + dates */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Project['status'])}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-gray-500 transition-colors"
            >
              <option value="em_andamento">Em andamento</option>
              <option value="pausado">Pausado</option>
            </select>
          </Field>
          <Field label="Início">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-gray-500 transition-colors"
            />
          </Field>
          <Field label="Prazo">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-gray-500 transition-colors"
            />
          </Field>
        </div>

        {/* Description */}
        <Field label="Descrição">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Descreva o escopo do projeto..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 resize-none transition-colors"
          />
        </Field>

        {/* Tasks */}
        <Field label="Tarefas iniciais">
          <div className="flex gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
              placeholder="Adicionar tarefa e pressionar Enter..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
            />
            <button
              type="button"
              onClick={addTask}
              disabled={!taskInput.trim()}
              className="px-3 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded-lg transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {tasks.length > 0 && (
            <div className="mt-2 space-y-1">
              {tasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/60 rounded-lg group">
                  <Circle className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-300">{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(i)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        <div className="flex gap-3 pt-1">
          <Button type="submit" fullWidth disabled={!canSubmit}>
            Criar Projeto
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const Projetos: React.FC = () => {
  const navigate = useNavigate();
  const { projects } = useProjectsStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  const filtered = projects.filter((p) => !statusFilter || p.status === statusFilter);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Projetos</h2>
          <p className="text-gray-500 text-sm">{projects.length} projetos no total</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setAddModalOpen(true)}
        >
          Novo Projeto
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <Select
          options={[
            { value: 'em_andamento', label: 'Em andamento' },
            { value: 'concluido', label: 'Concluído' },
            { value: 'pausado', label: 'Pausado' },
          ]}
          placeholder="Todos os status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((project, idx) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card
              hover
              onClick={() => navigate(`/projetos/${project.id}`)}
              className="flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{project.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{project.clientName || '—'}</p>
                </div>
                <Badge variant={project.status}>{statusLabels[project.status]}</Badge>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Progresso</span>
                  <span className="text-xs font-semibold text-white">{project.progress}%</span>
                </div>
                <ProgressBar
                  value={project.progress}
                  size="md"
                  color={
                    project.status === 'concluido' ? 'green' :
                    project.status === 'pausado' ? 'yellow' : 'white'
                  }
                />
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {project.deadline
                    ? `Prazo: ${format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Prazo não definido'}
                </span>
              </div>

              {/* Tasks summary */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {project.tasks.filter((t) => t.completed).length}/{project.tasks.length} tarefas
                </span>
                {project.team.length > 0 && (
                  <div className="flex -space-x-2">
                    {project.team.slice(0, 4).map((member) => (
                      <Avatar
                        key={member.id}
                        name={member.name}
                        size="xs"
                        className="border border-gray-900"
                      />
                    ))}
                    {project.team.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-gray-700 border border-gray-900 flex items-center justify-center text-xs text-gray-300">
                        +{project.team.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {addModalOpen && (
        <NewProjectModal onClose={() => setAddModalOpen(false)} />
      )}
    </PageWrapper>
  );
};
