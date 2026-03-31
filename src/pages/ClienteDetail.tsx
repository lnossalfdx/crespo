import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Mail, MessageCircle, Send } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { useAppStore } from '../store/useAppStore';
import { useClientsStore } from '../store/useClientsStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client } from '../types';

const statusLabels: Record<Client['status'], string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  prospecto: 'Prospecto',
};

const dealStageLabels: Record<string, string> = {
  fechado: 'Fechado',
  ativo: 'Ativo',
  negociacao: 'Em Negociação',
  proposta: 'Proposta',
};

const tabs = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'negocios', label: 'Negócios' },
  { id: 'atividades', label: 'Atividades' },
  { id: 'notas', label: 'Notas' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

export const ClienteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { getClientById, updateClient } = useClientsStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState('');
  const [chatInput, setChatInput] = useState('');

  const client = getClientById(id || '');

  if (!client) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-gray-500">Cliente não encontrado</p>
          <Button onClick={() => navigate('/clientes')}>Voltar</Button>
        </div>
      </PageWrapper>
    );
  }

  const clientActivityTimeline = client.activityTimeline ?? [];
  const messages = client.messages ?? [];
  const notesHistory = client.notesHistory ?? [];

  const addNote = async () => {
    if (notes.trim()) {
      await updateClient(client.id, {
        notesHistory: [
          {
            id: crypto.randomUUID(),
            text: notes.trim(),
            time: new Date().toISOString(),
            author: user?.name || 'Usuário',
          },
          ...notesHistory,
        ],
      });
      setNotes('');
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    await updateClient(client.id, {
      messages: [
        ...messages,
        {
          id: crypto.randomUUID(),
          from: 'me',
          text: chatInput.trim(),
          time: format(new Date(), 'HH:mm'),
        },
      ],
    });
    setChatInput('');
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/clientes')}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Clientes
        </button>

        <Card>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar name={client.name} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{client.name}</h2>
                <Badge variant={client.status}>{statusLabels[client.status]}</Badge>
              </div>
              <p className="text-gray-400 text-base mb-3">{client.company}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <a
                  href={`tel:${client.phone}`}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {client.phone}
                </a>
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {client.email}
                </a>
                <a
                  href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Valor Total</p>
              <p className="text-2xl font-bold text-white">
                R$ {client.totalValue.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center">
                <div className="text-2xl font-bold text-white">{client.deals.length}</div>
                <div className="text-xs text-gray-500 mt-1">Negócios</div>
              </Card>
              <Card className="text-center">
                <div className="text-2xl font-bold text-white">
                  {client.deals.filter((d) => d.stage === 'fechado').length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Fechados</div>
              </Card>
              <Card className="text-center">
                <div className="text-2xl font-bold text-white">
                  {Math.round((new Date().getTime() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))}
                </div>
                <div className="text-xs text-gray-500 mt-1">Meses</div>
              </Card>
            </div>
            {/* Notes preview */}
            {client.notes && (
              <Card>
                <p className="text-xs text-gray-500 mb-2">Observações</p>
                <p className="text-sm text-gray-300">{client.notes}</p>
              </Card>
            )}
          </div>
          {/* Recent Activity */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Atividade Recente</h3>
            <div className="space-y-3">
              {clientActivityTimeline.slice(0, 5).map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-300">{item.text}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(item.time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'negocios' && (
        <div className="space-y-3">
          {client.deals.length === 0 ? (
            <Card className="text-sm text-gray-500">Nenhum negócio vinculado a este cliente.</Card>
          ) : (
            client.deals.map((deal) => (
              <Card key={deal.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{deal.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Criado em {format(new Date(deal.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      {deal.closedAt && ` • Fechado em ${format(new Date(deal.closedAt), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-white">R$ {deal.value.toLocaleString('pt-BR')}</p>
                    <Badge variant={deal.stage === 'fechado' ? 'ganho' : deal.stage === 'ativo' ? 'ativo' : 'proposta'}>
                      {dealStageLabels[deal.stage] || deal.stage}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'atividades' && (
        <Card>
          {clientActivityTimeline.length === 0 ? (
            <div className="py-10 text-sm text-gray-600 text-center">Nenhuma atividade registrada ainda.</div>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-800" />
              <div className="space-y-6">
                {clientActivityTimeline.map((item) => (
                  <div key={item.id} className="flex gap-4 relative">
                    <div className="w-7 h-7 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center flex-shrink-0 z-10">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    </div>
                    <div className="pb-2">
                      <p className="text-sm text-white">{item.text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(item.time), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'notas' && (
        <div className="space-y-4">
          <Card>
            <div className="flex gap-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicionar nova nota..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm outline-none focus:border-gray-500 resize-none"
                rows={3}
              />
              <Button onClick={addNote} disabled={!notes.trim()} size="sm" className="self-start mt-1">
                Salvar
              </Button>
            </div>
          </Card>
          <div className="space-y-3">
            {notesHistory.map((note) => (
              <Card key={note.id}>
                <p className="text-sm text-gray-300">{note.text}</p>
                <p className="text-xs text-gray-600 mt-2">
                  {format(new Date(note.time), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
              </Card>
            ))}
            {client.notes && (
              <Card>
                <p className="text-sm text-gray-300">{client.notes}</p>
                <p className="text-xs text-gray-600 mt-2">
                  {format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'whatsapp' && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
            <Avatar name={client.name} size="sm" />
            <div>
              <p className="text-sm font-medium text-white">{client.name}</p>
              <p className="text-xs text-green-400">Online</p>
            </div>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-950">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-600">
                Nenhuma mensagem registrada ainda
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.from === 'me'
                        ? 'bg-white text-black rounded-tr-none'
                        : 'bg-gray-800 text-white rounded-tl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.from === 'me' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Mensagem..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 outline-none"
            />
            <button
              onClick={sendMessage}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-black hover:bg-gray-200 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </Card>
      )}
    </PageWrapper>
  );
};
