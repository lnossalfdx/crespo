import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Circle, Upload, KeyRound, Plus, Eye, EyeOff, Copy, Trash2, ExternalLink, Download, Lock, LockOpen, FileText, ImageIcon, File, X as XIcon, Pencil, Check } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useProjectsStore } from '../store/useProjectsStore';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BriefingQuestion, Credential, Project, ProjectFile, Task } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';

const statusLabels: Record<Project['status'], string> = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  pausado: 'Pausado',
};

const tabs = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'files', label: 'Arquivos' },
  { id: 'comments', label: 'Comentários' },
  { id: 'senhas', label: 'Senhas' },
];

/* ── Single credential card ──────────────────────────────────────────────── */
const CredentialCard: React.FC<{
  cred: Credential;
  onDelete: (id: string) => void;
}> = ({ cred, onDelete }) => {
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="border border-gray-800 rounded-xl p-4 bg-gray-900/60 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{cred.label}</p>
            {cred.description && (
              <p className="text-xs text-gray-500">{cred.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(cred.id)}
          className="text-gray-700 hover:text-gray-400 transition-colors p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-2">
        {/* Site */}
        {cred.site && (
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0">Site</span>
            <span className="text-xs text-gray-300 flex-1 truncate">{cred.site}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => copy(cred.site, 'site')}
                className="text-gray-600 hover:text-white transition-colors"
                title="Copiar"
              >
                <Copy className="w-3 h-3" />
              </button>
              <a
                href={cred.site.startsWith('http') ? cred.site : `https://${cred.site}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-white transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {copied === 'site' && <span className="text-xs text-green-400 absolute">Copiado!</span>}
          </div>
        )}

        {/* Login */}
        {cred.login && (
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0">Login</span>
            <span className="text-xs text-gray-300 flex-1 truncate">{cred.login}</span>
            <button
              onClick={() => copy(cred.login, 'login')}
              className="text-gray-600 hover:text-white transition-colors flex-shrink-0"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Password */}
        {cred.password && (
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0">Senha</span>
            <span className="text-xs text-gray-300 flex-1 font-mono tracking-wider">
              {showPass ? cred.password : '••••••••••'}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowPass((v) => !v)}
                className="text-gray-600 hover:text-white transition-colors"
              >
                {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                onClick={() => copy(cred.password, 'password')}
                className="text-gray-600 hover:text-white transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {copied && (
        <p className="text-xs text-green-400 text-right">Copiado!</p>
      )}
    </motion.div>
  );
};

/* ── Add credential form ──────────────────────────────────────────────────── */
const AddCredentialForm: React.FC<{ onAdd: (c: Omit<Credential, 'id'>) => void; onCancel: () => void }> = ({ onAdd, onCancel }) => {
  const [form, setForm] = useState({ label: '', site: '', login: '', password: '', description: '' });
  const [showPass, setShowPass] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) return;
    onAdd(form);
    setForm({ label: '', site: '', login: '', password: '', description: '' });
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors';

  return (
    <motion.form
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onSubmit={handle}
      className="border border-gray-700 rounded-xl p-4 bg-gray-900 space-y-3 mb-4"
    >
      <p className="text-sm font-semibold text-white">Novo acesso</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nome / Label <span className="text-gray-600">*</span></label>
          <input value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Ex: Painel Admin" className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Site / URL</label>
          <input value={form.site} onChange={(e) => set('site', e.target.value)} placeholder="https://..." className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Login / E-mail</label>
          <input value={form.login} onChange={(e) => set('login', e.target.value)} placeholder="usuario@exemplo.com" className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Senha</label>
          <div className="relative">
            <input
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Descrição</label>
        <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Para que serve este acesso..." className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={!form.label.trim()}>Salvar acesso</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </motion.form>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType, name }: { mimeType: string; name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-blue-400" />;
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return <FileText className="w-4 h-4 text-red-400" />;
  }
  return <File className="w-4 h-4 text-gray-400" />;
}

export const ProjetoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { projects, updateProject } = useProjectsStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [activeTab, setActiveTab] = useState('tasks');
  const [commentText, setCommentText] = useState('');

  const project = projects.find((p) => p.id === id);
  const projectData: Project = project ?? {
    id: '',
    name: '',
    clientId: '',
    clientName: '',
    status: 'pausado',
    progress: 0,
    deadline: new Date().toISOString(),
    startDate: new Date().toISOString(),
    team: [],
    tasks: [],
    description: '',
    mensalidade: 0,
  };

  const [projectTasks, setProjectTasks] = useState<Task[]>(projectData.tasks);
  const [mensalidade, setMensalidade] = useState<number>(projectData.mensalidade ?? 0);
  const [editingMensalidade, setEditingMensalidade] = useState(false);
  const [mensalidadeInput, setMensalidadeInput] = useState('');
  const [memberPercentuals, setMemberPercentuals] = useState<Record<string, number>>(
    Object.fromEntries(projectData.team.map((m) => [m.id, m.percentual ?? 0]))
  );
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [percentualInput, setPercentualInput] = useState('');

  const [files, setFiles] = useState<ProjectFile[]>(projectData.files ?? []);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [credentials, setCredentials] = useState<Credential[]>(projectData.credentials ?? []);
  const [showAddCred, setShowAddCred] = useState(false);

  const [briefing, setBriefing] = useState<BriefingQuestion[]>(projectData.briefingQuestions ?? []);
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [comments, setComments] = useState(projectData.comments ?? []);

  const persistProject = async (updates: Partial<Project>) => {
    await updateProject(projectData.id, updates);
  };

  const updateAnswer = (id: string, answer: string) => {
    setBriefing((prev) => {
      const next = prev.map((q) => (q.id === id ? { ...q, answer } : q));
      void persistProject({ briefingQuestions: next });
      return next;
    });
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setBriefing((prev) => {
      const next = [
        ...prev,
        { id: `custom-${Date.now()}`, question: newQuestion.trim(), hint: '', answer: '' },
      ];
      void persistProject({ briefingQuestions: next });
      return next;
    });
    setNewQuestion('');
    setShowAddQuestion(false);
  };

  const removeQuestion = (id: string) => {
    setBriefing((prev) => {
      const next = prev.filter((q) => q.id !== id);
      void persistProject({ briefingQuestions: next });
      return next;
    });
  };

  const answeredCount = briefing.filter((q) => q.answer.trim()).length;

  const addCredential = (c: Omit<Credential, 'id'>) => {
    setCredentials((prev) => {
      const next = [...prev, { ...c, id: `cred-${Date.now()}` }];
      void persistProject({ credentials: next });
      return next;
    });
    setShowAddCred(false);
  };

  const deleteCredential = (id: string) => {
    setCredentials((prev) => {
      const next = prev.filter((c) => c.id !== id);
      void persistProject({ credentials: next });
      return next;
    });
  };

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  if (!project) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-gray-500">Projeto não encontrado</p>
          <Button onClick={() => navigate('/projetos')}>Voltar</Button>
        </div>
      </PageWrapper>
    );
  }

  const toggleTask = (taskId: string) => {
    setProjectTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
      const completed = next.filter((t) => t.completed).length;
      const progress = next.length ? Math.round((completed / next.length) * 100) : 0;
      void persistProject({ tasks: next, progress });
      return next;
    });
  };

  const deleteTask = (taskId: string) => {
    setProjectTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      const completed = next.filter((t) => t.completed).length;
      const progress = next.length ? Math.round((completed / next.length) * 100) : 0;
      void persistProject({ tasks: next, progress });
      return next;
    });
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    setProjectTasks((prev) => {
      const next = [
        ...prev,
        {
          id: `task-${Date.now()}`,
          title: newTaskTitle.trim(),
          completed: false,
          dueDate: newTaskDueDate || undefined,
          assignee: newTaskAssignee.trim() || undefined,
        },
      ];
      const completed = next.filter((t) => t.completed).length;
      const progress = next.length ? Math.round((completed / next.length) * 100) : 0;
      void persistProject({ tasks: next, progress });
      return next;
    });
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskAssignee('');
    setShowAddTask(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const newFiles: ProjectFile[] = [];

    for (const [index, file] of picked.entries()) {
      const fileKey = `${file.lastModified}-${file.size}-${index}`;
      let url = URL.createObjectURL(file);
      let storagePath: string | undefined;

      if (supabaseEnabled) {
        storagePath = `${project.id}/${fileKey}-${file.name}`;
        const supabase = assertSupabase();
        const { error } = await supabase.storage
          .from('project-files')
          .upload(storagePath, file, { upsert: true });

        if (!error) {
          const { data } = supabase.storage.from('project-files').getPublicUrl(storagePath);
          url = data.publicUrl;
        }
      }

      newFiles.push({
        id: `f-${project.id}-${fileKey}`,
        name: file.name,
        size: formatBytes(file.size),
        mimeType: file.type || 'application/octet-stream',
        url,
        uploadedAt: new Date().toISOString(),
        restricted: false,
        storagePath,
      });
    }

    setFiles((prev) => {
      const next = [...prev, ...newFiles];
      void persistProject({ files: next });
      return next;
    });
    e.target.value = '';
  };

  const downloadFile = (file: ProjectFile) => {
    if (!file.url) return;
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  const toggleRestrict = (fileId: string) => {
    setFiles((prev) => {
      const next = prev.map((f) => f.id === fileId ? { ...f, restricted: !f.restricted } : f);
      void persistProject({ files: next });
      return next;
    });
  };

  const deleteFile = async (fileId: string) => {
    const currentFile = files.find((file) => file.id === fileId);
    if (supabaseEnabled && currentFile?.storagePath) {
      await assertSupabase().storage.from('project-files').remove([currentFile.storagePath]);
    }

    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      void persistProject({ files: next });
      return next;
    });
  };

  const visibleFiles = files.filter((f) => isAdmin || !f.restricted);

  const completedCount = projectTasks.filter((t) => t.completed).length;
  const progress = projectTasks.length ? Math.round((completedCount / projectTasks.length) * 100) : 0;
  const daysLeft = differenceInDays(new Date(project.deadline), new Date());

  const startDate = new Date(project.startDate);
  const endDate = new Date(project.deadline);
  const totalDays = differenceInDays(endDate, startDate);
  const elapsedDays = differenceInDays(new Date(), startDate);

  return (
    <PageWrapper>
      {/* Back */}
      <button
        onClick={() => navigate('/projetos')}
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Projetos
      </button>

      {/* Project Header */}
      <Card className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">{project.name}</h2>
              <Badge variant={project.status}>{statusLabels[project.status]}</Badge>
            </div>
            <p className="text-gray-400 text-sm mb-2">{project.clientName}</p>
            <p className="text-gray-500 text-sm">{project.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-xs text-gray-500">Prazo</p>
              <p className={`text-sm font-semibold ${daysLeft < 7 ? 'text-red-400' : daysLeft < 14 ? 'text-yellow-400' : 'text-white'}`}>
                {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                {daysLeft > 0 ? ` (${daysLeft}d)` : ' (Vencido)'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Progresso geral</p>
              <div className="flex items-center gap-2">
                <ProgressBar value={progress} size="md" className="w-32" />
                <span className="text-sm font-semibold text-white">{progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team + Mensalidade */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">Equipe & Recorrência</p>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Mensalidade do projeto:</span>
                {editingMensalidade ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">R$</span>
                    <input
                      autoFocus
                      type="number"
                      value={mensalidadeInput}
                      onChange={(e) => setMensalidadeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const v = parseFloat(mensalidadeInput) || 0;
                          setMensalidade(v);
                          updateProject(project.id, { mensalidade: v });
                          setEditingMensalidade(false);
                        }
                        if (e.key === 'Escape') setEditingMensalidade(false);
                      }}
                      className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-white text-xs outline-none"
                    />
                    <button onClick={() => {
                      const v = parseFloat(mensalidadeInput) || 0;
                      setMensalidade(v);
                      updateProject(project.id, { mensalidade: v });
                      setEditingMensalidade(false);
                    }} className="text-green-400 hover:text-green-300">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingMensalidade(false)} className="text-gray-600 hover:text-white">
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setMensalidadeInput(String(mensalidade)); setEditingMensalidade(true); }}
                    className="flex items-center gap-1.5 text-xs text-white hover:text-gray-300 transition-colors"
                  >
                    R$ {mensalidade.toLocaleString('pt-BR')}
                    <Pencil className="w-3 h-3 text-gray-600" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {project.team.map((member) => {
              const pct = memberPercentuals[member.id] ?? 0;
              const recorrencia = Math.round(mensalidade * pct / 100);
              const isEditing = editingMemberId === member.id;
              return (
                <div key={member.id} className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2">
                  <Avatar name={member.name} size="xs" />
                  <div>
                    <p className="text-xs text-gray-300">{member.name.split(' ')[0]}</p>
                    {mensalidade > 0 && (
                      <p className="text-xs text-gray-600">
                        R$ {recorrencia.toLocaleString('pt-BR')}/mês
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="number"
                          value={percentualInput}
                          onChange={(e) => setPercentualInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const p = Math.min(100, Math.max(0, parseFloat(percentualInput) || 0));
                              const next = { ...memberPercentuals, [member.id]: p };
                              setMemberPercentuals(next);
                              updateProject(project.id, {
                                team: project.team.map((m) => m.id === member.id ? { ...m, percentual: p } : m),
                              });
                              setEditingMemberId(null);
                            }
                            if (e.key === 'Escape') setEditingMemberId(null);
                          }}
                          className="w-12 bg-gray-700 border border-gray-500 rounded px-1 py-0.5 text-white text-xs outline-none"
                          min="0" max="100"
                        />
                        <span className="text-xs text-gray-500">%</span>
                        <button onClick={() => {
                          const p = Math.min(100, Math.max(0, parseFloat(percentualInput) || 0));
                          const next = { ...memberPercentuals, [member.id]: p };
                          setMemberPercentuals(next);
                          updateProject(project.id, {
                            team: project.team.map((m) => m.id === member.id ? { ...m, percentual: p } : m),
                          });
                          setEditingMemberId(null);
                        }} className="text-green-400 hover:text-green-300">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setPercentualInput(String(pct)); setEditingMemberId(member.id); }}
                        className="flex items-center gap-0.5 text-xs text-gray-600 hover:text-gray-300 transition-colors"
                      >
                        {pct}%<Pencil className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={tabs.filter((t) => t.id !== 'senhas' || isAdmin)}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* Timeline */}
      {activeTab === 'timeline' && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Cronograma</h3>
          {/* Horizontal Gantt */}
          <div className="overflow-x-auto">
            <div className="min-w-96">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                <div className="w-48 flex-shrink-0">Tarefa</div>
                <div className="flex-1 flex justify-between">
                  <span>{format(startDate, 'dd/MM', { locale: ptBR })}</span>
                  <span>{format(endDate, 'dd/MM', { locale: ptBR })}</span>
                </div>
              </div>
              <div className="space-y-2">
                {projectTasks.map((task) => {
                  const taskStart = task.dueDate
                    ? Math.max(0, differenceInDays(new Date(task.dueDate), startDate) - 7)
                    : 0;
                  const taskWidth = 14;
                  const leftPercent = Math.min(90, (taskStart / totalDays) * 100);

                  return (
                    <div key={task.id} className="flex items-center gap-2">
                      <div className="w-48 flex-shrink-0 flex items-center gap-2">
                        {task.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                        )}
                        <span className="text-xs text-gray-300 truncate">{task.title}</span>
                      </div>
                      <div className="flex-1 h-5 bg-gray-800 rounded relative overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${taskWidth}%`, left: `${leftPercent}%` }}
                          transition={{ duration: 0.6 }}
                          className={`absolute top-0 h-full rounded ${task.completed ? 'bg-green-600' : 'bg-gray-600'}`}
                        />
                        {/* Today marker */}
                        <div
                          className="absolute top-0 bottom-0 w-px bg-white/40"
                          style={{ left: `${Math.min(100, (elapsedDays / totalDays) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tasks */}
      {activeTab === 'tasks' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Tarefas</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{completedCount}/{projectTasks.length} concluídas</span>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowAddTask((v) => !v)}
              >
                Nova tarefa
              </Button>
            </div>
          </div>

          {/* Add task form */}
          <AnimatePresence>
            {showAddTask && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden mb-3"
              >
                <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700 space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') { setShowAddTask(false); setNewTaskTitle(''); } }}
                    placeholder="Título da tarefa..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500 transition-colors"
                    />
                    <input
                      type="text"
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      placeholder="Responsável"
                      className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addTask} disabled={!newTaskTitle.trim()}>Adicionar</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddTask(false); setNewTaskTitle(''); setNewTaskDueDate(''); setNewTaskAssignee(''); }}>Cancelar</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {projectTasks.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-6">Nenhuma tarefa ainda. Crie a primeira!</p>
            )}
            {projectTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="flex-shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-600 hover:text-gray-400 transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {task.assignee && (
                      <span className="text-xs text-gray-600">{task.assignee}</span>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-gray-600">
                        {format(new Date(task.dueDate), 'dd/MM', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Briefing */}
      {activeTab === 'briefing' && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">
                <span className="text-white font-semibold">{answeredCount}</span>
                <span className="text-gray-600"> / {briefing.length} perguntas respondidas</span>
              </p>
              <div className="mt-1.5 h-1 w-48 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${briefing.length ? (answeredCount / briefing.length) * 100 : 0}%` }}
                  transition={{ duration: 0.4 }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowAddQuestion(true)}
            >
              Nova pergunta
            </Button>
          </div>

          {/* Add custom question form */}
          <AnimatePresence>
            {showAddQuestion && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="border border-gray-700 rounded-xl p-4 bg-gray-900 space-y-3"
              >
                <p className="text-xs font-semibold text-white">Nova pergunta personalizada</p>
                <input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
                  placeholder="Digite a pergunta..."
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addQuestion} disabled={!newQuestion.trim()}>Adicionar</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setShowAddQuestion(false); setNewQuestion(''); }}>Cancelar</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Questions */}
          <div className="space-y-3">
            {briefing.length === 0 && (
              <div className="border border-dashed border-gray-800 rounded-xl p-6 text-sm text-gray-600 text-center">
                Nenhuma pergunta cadastrada ainda.
              </div>
            )}
            {briefing.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="border border-gray-800 rounded-xl p-4 bg-gray-900/60 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xs font-mono text-gray-600 mt-0.5 flex-shrink-0 w-6">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white leading-snug">{q.question}</p>
                      {q.hint && (
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{q.hint}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {q.answer.trim() && (
                      <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" title="Respondida" />
                    )}
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-gray-700 hover:text-gray-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  value={q.answer}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  placeholder="Escreva a resposta do cliente aqui..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors resize-none"
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {activeTab === 'files' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Arquivos</h3>
              {!isAdmin && (
                <p className="text-xs text-gray-600 mt-0.5">Alguns arquivos podem estar restritos</p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
          </div>

          {/* File list */}
          <div className="space-y-2 mb-4">
            {visibleFiles.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-8">Nenhum arquivo disponível</p>
            )}
            {visibleFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
              >
                {/* Icon */}
                <div className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileIcon mimeType={file.mimeType} name={file.name} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white truncate">{file.name}</p>
                    {file.restricted && (
                      <span title="Restrito a agentes">
                        <Lock className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {file.size} · {format(new Date(file.uploadedAt), 'dd/MM/yy', { locale: ptBR })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Preview */}
                  {file.url && (
                    <button
                      onClick={() => {
                        if (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') {
                          setPreviewFile(file);
                        } else {
                          window.open(file.url, '_blank');
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-white transition-colors rounded"
                      title="Visualizar"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Download */}
                  {file.url && (
                    <button
                      onClick={() => downloadFile(file)}
                      className="p-1.5 text-gray-500 hover:text-white transition-colors rounded"
                      title="Baixar"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Lock toggle — admin only */}
                  {isAdmin && (
                    <button
                      onClick={() => toggleRestrict(file.id)}
                      className={`p-1.5 transition-colors rounded ${file.restricted ? 'text-yellow-500 hover:text-yellow-300' : 'text-gray-500 hover:text-yellow-400'}`}
                      title={file.restricted ? 'Remover restrição' : 'Restringir para agentes'}
                    >
                      {file.restricted ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {/* Delete */}
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-gray-600 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dt = e.dataTransfer.files;
              if (dt.length) {
                void handleFileUpload({
                  target: { files: dt, value: '' },
                } as React.ChangeEvent<HTMLInputElement>);
              }
            }}
          >
            <Upload className="w-7 h-7 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Arraste arquivos aqui ou clique para fazer upload</p>
          </div>
        </Card>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-4xl w-full max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <p className="text-sm font-medium text-white truncate">{previewFile.name}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFile(previewFile)}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    title="Baixar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-auto max-h-[80vh] flex items-center justify-center p-4">
                {previewFile.mimeType.startsWith('image/') ? (
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full rounded-lg" />
                ) : previewFile.mimeType === 'application/pdf' ? (
                  <iframe src={previewFile.url} className="w-full h-[75vh] rounded-lg" title={previewFile.name} />
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Senhas — admin/manager only */}
      {activeTab === 'senhas' && !isAdmin && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <KeyRound className="w-8 h-8 text-gray-700" />
          <p className="text-sm text-gray-500">Acesso restrito</p>
          <p className="text-xs text-gray-700">Apenas administradores podem ver as senhas do projeto.</p>
        </div>
      )}
      {activeTab === 'senhas' && isAdmin && (
        <div>
          <AnimatePresence>
            {showAddCred && (
              <AddCredentialForm onAdd={addCredential} onCancel={() => setShowAddCred(false)} />
            )}
          </AnimatePresence>

          {!showAddCred && (
            <button
              onClick={() => setShowAddCred(true)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-gray-700 hover:border-gray-500 rounded-xl px-4 py-3 w-full mb-4 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar acesso
            </button>
          )}

          {credentials.length === 0 && !showAddCred && (
            <div className="text-center py-16 text-gray-600">
              <KeyRound className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum acesso cadastrado ainda</p>
              <p className="text-xs mt-1">Adicione logins, senhas e URLs deste projeto</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {credentials.map((cred) => (
                <CredentialCard key={cred.id} cred={cred} onDelete={deleteCredential} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Comments */}
      {activeTab === 'comments' && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Comentários</h3>
          <div className="space-y-4 mb-6">
            {comments.length === 0 ? (
              <div className="py-8 text-sm text-gray-600 text-center">Nenhum comentário registrado ainda.</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar name={comment.author} size="sm" />
                  <div className="flex-1 bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{comment.author}</span>
                      <span className="text-xs text-gray-600">
                        {format(new Date(comment.time), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-3">
            <Avatar name={user?.name || 'Usuário'} size="sm" />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Adicionar comentário..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
              />
              <Button
                type="button"
                size="sm"
                disabled={!commentText.trim()}
                onClick={async () => {
                  if (!commentText.trim()) return;
                  const next = [
                    ...comments,
                    {
                      id: `comment-${Date.now()}`,
                      author: user?.name ?? 'Usuário',
                      text: commentText.trim(),
                      time: new Date().toISOString(),
                    },
                  ];
                  setComments(next);
                  await persistProject({ comments: next });
                  setCommentText('');
                }}
              >
                Enviar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </PageWrapper>
  );
};
