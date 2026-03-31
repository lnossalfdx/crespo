import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, PhoneCall, Monitor, Trash2, X, Search } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Avatar } from '../components/ui/Avatar';
import type { Event } from '../types';
import { useForm } from 'react-hook-form';
import { useClientsStore } from '../store/useClientsStore';
import { useEventsStore } from '../store/useEventsStore';

const eventTypeConfig = {
  reuniao: { label: 'Reunião', icon: <Users className="w-3 h-3" />, color: 'bg-blue-900 text-blue-300' },
  followup: { label: 'Follow-up', icon: <Clock className="w-3 h-3" />, color: 'bg-yellow-900 text-yellow-300' },
  demo: { label: 'Demo', icon: <Monitor className="w-3 h-3" />, color: 'bg-purple-900 text-purple-300' },
  ligacao: { label: 'Ligação', icon: <PhoneCall className="w-3 h-3" />, color: 'bg-green-900 text-green-300' },
};

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/* ── Client autocomplete ─────────────────────────────────────────────────── */
const ClientAutocomplete: React.FC<{
  value: string;
  onChange: (name: string) => void;
}> = ({ value, onChange }) => {
  const { clients } = useClientsStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = value.trim().length > 0
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(value.toLowerCase()) ||
          (c.company && c.company.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-sm font-medium text-gray-300 block mb-1.5">Cliente</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Nome do cliente (opcional)"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder-gray-500 outline-none focus:border-gray-500 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
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
                onClick={() => { onChange(c.name); setOpen(false); }}
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
      </AnimatePresence>
    </div>
  );
};

type EventFormData = {
  title: string;
  type: string;
  date: string;
  time: string;
  duration: string;
  notes: string;
};

export const Agenda: React.FC = () => {
  const { events, addEvent, deleteEvent } = useEventsStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Event | null>(null);
  const [eventClientName, setEventClientName] = useState('');

  const { register, handleSubmit, reset, setValue } = useForm<EventFormData>();

  const openModalForDay = (day: Date) => {
    setValue('date', format(day, 'yyyy-MM-dd'));
    setAddModalOpen(true);
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getEventsForDay = (date: Date) =>
    events.filter((e) => isSameDay(new Date(e.date), date));

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const onSubmit = async (data: EventFormData) => {
    await addEvent({
      title: data.title,
      type: data.type as Event['type'],
      date: data.date,
      time: data.time,
      clientName: eventClientName,
      notes: data.notes,
      duration: parseInt(data.duration) || 30,
    });
    reset();
    setEventClientName('');
    setAddModalOpen(false);
  };

  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Agenda</h2>
          <p className="text-gray-500 text-sm">Gerencie seus compromissos e reuniões</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-900 border border-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'month' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'week' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Semana
            </button>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddModalOpen(true)}
          >
            Novo Evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2">
          <Card padding="none">
            {/* Month Navigation */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-semibold text-white capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-800">
              {weekDays.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => openModalForDay(day)}
                    className={`
                      min-h-16 p-1.5 border-b border-r border-gray-800 text-left
                      hover:bg-gray-800/50 transition-colors relative
                      ${idx % 7 === 6 ? 'border-r-0' : ''}
                      ${isSelected ? 'bg-gray-800' : ''}
                    `}
                  >
                    <div
                      className={`
                        w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1
                        ${isCurrentDay ? 'bg-white text-black' : ''}
                        ${isSelected && !isCurrentDay ? 'bg-gray-600 text-white' : ''}
                        ${!isCurrentMonth ? 'text-gray-700' : !isCurrentDay && !isSelected ? 'text-gray-300' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${eventTypeConfig[event.type].color}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-600 px-1">
                          +{dayEvents.length - 2} mais
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected Day Events */}
          {selectedDate && selectedEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3 capitalize">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <div className="space-y-2">
                  {selectedEvents.map((event) => {
                    const config = eventTypeConfig[event.type];
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg group"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color.split(' ')[0]}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{event.title}</p>
                          <p className="text-xs text-gray-500">{event.clientName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-white">{event.time}</p>
                          <p className="text-xs text-gray-500">{event.duration} min</p>
                        </div>
                        <button
                  onClick={() => setConfirmDelete(event)}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0 ml-1"
                          title="Cancelar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar: Upcoming Events */}
        <div>
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Próximos Eventos</h3>
            <div className="space-y-3">
              {upcomingEvents.map((event) => {
                const config = eventTypeConfig[event.type];
                return (
                  <div key={event.id} className="flex items-start gap-3 group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${config.color.split(' ')[0]}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{event.title}</p>
                      {event.clientName && (
                        <p className="text-xs text-gray-500 truncate">{event.clientName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">
                          {format(new Date(event.date), 'dd/MM', { locale: ptBR })} às {event.time}
                        </span>
                        <span className={`text-xs ${config.color.split(' ')[1]}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmDelete(event)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0 mt-1"
                      title="Cancelar evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        size="sm"
      >
        {confirmDelete && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white mb-1">Cancelar evento?</p>
              <p className="text-sm text-gray-500">
                <span className="text-white">{confirmDelete.title}</span>
                {confirmDelete.clientName && ` — ${confirmDelete.clientName}`}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {format(new Date(confirmDelete.date), "dd 'de' MMMM", { locale: ptBR })} às {confirmDelete.time}
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="primary"
                fullWidth
                onClick={async () => {
                  await deleteEvent(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Cancelar evento
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Event Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); reset(); setEventClientName(''); }}
        title="Novo Evento"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Título" placeholder="Nome do evento" required {...register('title')} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo"
              options={[
                { value: 'reuniao', label: 'Reunião' },
                { value: 'demo', label: 'Demo' },
                { value: 'followup', label: 'Follow-up' },
                { value: 'ligacao', label: 'Ligação' },
              ]}
              placeholder="Selecionar"
              {...register('type')}
            />
            <div />
          </div>
          <ClientAutocomplete value={eventClientName} onChange={setEventClientName} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" {...register('date')} />
            <Input label="Horário" type="time" {...register('time')} />
          </div>
          <Select
            label="Duração"
            options={[
              { value: '15', label: '15 minutos' },
              { value: '30', label: '30 minutos' },
              { value: '45', label: '45 minutos' },
              { value: '60', label: '1 hora' },
              { value: '90', label: '1h 30min' },
              { value: '120', label: '2 horas' },
            ]}
            placeholder="Selecionar"
            {...register('duration')}
          />
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">Notas</label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm outline-none focus:border-gray-500 resize-none"
              rows={3}
              placeholder="Notas sobre o evento..."
              {...register('notes')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" fullWidth>Criar Evento</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setAddModalOpen(false); reset(); setEventClientName(''); }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
};
