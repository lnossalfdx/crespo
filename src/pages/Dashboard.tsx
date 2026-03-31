import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { endOfMonth, eachWeekOfInterval, format, isSameDay, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, RefreshCw, Plus, Calendar, MessageSquare, Activity } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DashboardOrb } from '../components/three/DashboardOrb';
import { LineChartWrapper } from '../components/charts/LineChartWrapper';
import { BarChartWrapper } from '../components/charts/BarChartWrapper';
import { DonutChartWrapper } from '../components/charts/DonutChartWrapper';
import { useAnimatedCount } from '../hooks/useAnimatedCount';
import { useAppStore } from '../store/useAppStore';
import { useEventsStore } from '../store/useEventsStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useLeadsStore } from '../store/useLeadsStore';

const eventTypeLabels = {
  reuniao: 'Reunião',
  followup: 'Follow-up',
  demo: 'Demo',
  ligacao: 'Ligação',
};

const eventTypeColors = {
  reuniao: 'text-blue-400',
  followup: 'text-yellow-400',
  demo: 'text-purple-400',
  ligacao: 'text-green-400',
};

export const Dashboard: React.FC = () => {
  const { user } = useAppStore();
  const { leads } = useLeadsStore();
  const { events } = useEventsStore();
  const transactions = useFinanceStore((state) => state.transactions);
  const receitaAtual = useFinanceStore((state) => state.getTotalEntradas());
  const navigate = useNavigate();

  const leadsPerDay = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = subDays(new Date(), 6 - index);
        return {
          name: format(day, 'dd/MM', { locale: ptBR }),
          value: leads.filter((lead) => isSameDay(new Date(lead.createdAt), day)).length,
        };
      }),
    [leads]
  );

  const revenuePerWeek = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks.map((weekStart, index) => {
      const total = transactions
        .filter((tx) => tx.type === 'entrada')
        .filter((tx) => {
          const txDate = new Date(tx.date);
          return txDate >= weekStart && txDate <= monthEnd;
        })
        .filter((tx) => {
          const txDate = new Date(tx.date);
          const nextWeek = weeks[index + 1];
          return !nextWeek || txDate < nextWeek;
        })
        .reduce((sum, tx) => sum + tx.value, 0);

      return {
        name: `Sem ${index + 1}`,
        value: total,
      };
    });
  }, [transactions]);

  const dealStatus = useMemo(
    () => [
      { name: 'Novo Lead', value: leads.filter((lead) => lead.stage === 'novo').length, color: '#3D3D3D' },
      { name: 'Qualificado', value: leads.filter((lead) => lead.stage === 'qualificando').length, color: '#666666' },
      { name: 'Proposta', value: leads.filter((lead) => lead.stage === 'proposta').length, color: '#999999' },
      { name: 'Negociação', value: leads.filter((lead) => lead.stage === 'negociacao').length, color: '#CCCCCC' },
      { name: 'Ganho', value: leads.filter((lead) => lead.stage === 'ganho').length, color: '#FFFFFF' },
    ],
    [leads]
  );

  // Recorrência: soma das mensalidades dos leads ganhos atribuídos ao usuário × percentual
  const userId = user?.id ?? '';
  const ganhoLeads = leads.filter(
    (l) => l.stage === 'ganho' && (!l.assignedTo || l.assignedTo === userId || (l.sharedWith ?? []).includes(userId))
  );
  const recorrenciaValue = ganhoLeads.reduce((sum, l) => {
    if (!l.mensalidade) return sum;
    const pct = l.recorrenciaPercentual ?? 30;
    return sum + Math.round(l.mensalidade * pct / 100);
  }, 0);

  const leadsHojeCount = leads.filter((lead) => {
    const created = new Date(lead.createdAt);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  }).length;
  const ganhoCount = leads.filter((lead) => lead.stage === 'ganho').length;
  const conversaoCount = leads.length > 0 ? Math.round((ganhoCount / leads.length) * 100) : 0;

  const leadsHoje = useAnimatedCount(leadsHojeCount);
  const conversao = useAnimatedCount(conversaoCount);
  const receita = useAnimatedCount(Math.round(receitaAtual));

  const firstName = user?.name?.split(' ')[0] || 'Usuário';
  const todayStr = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const upcomingEvents = [...events]
    .filter((event) => new Date(event.date) >= new Date())
    .sort((a, b) => {
      const left = `${a.date}T${a.time}`;
      const right = `${b.date}T${b.time}`;
      return new Date(left).getTime() - new Date(right).getTime();
    })
    .slice(0, 8);
  const hasLeadHistory = leadsPerDay.some((item) => item.value > 0);
  const hasRevenueHistory = revenuePerWeek.some((item) => item.value > 0);
  const hasDealStatus = dealStatus.some((item) => item.value > 0);

  return (
    <PageWrapper>
      {/* Hero */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-white mb-1"
          >
            Olá, {firstName} 👋
          </motion.h2>
          <p className="text-gray-500 text-sm capitalize">{todayStr}</p>
          <p className="text-gray-400 mt-3 text-lg font-light">
            Transforme conversas em receita.
          </p>
        </div>
        <div className="flex-shrink-0">
          <DashboardOrb />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Leads Hoje</span>
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{leadsHoje}</div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {leadsHojeCount === 1 ? '1 lead criada hoje' : `${leadsHojeCount} leads criadas hoje`}
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Conversão</span>
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{conversao}%</div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {ganhoCount} lead{ganhoCount !== 1 ? 's' : ''} ganha{ganhoCount !== 1 ? 's' : ''}
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Receita/Mês</span>
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            R$ {receita.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {transactions.length === 0
              ? 'Sem transações registradas'
              : `${transactions.length} transaç${transactions.length === 1 ? 'ão' : 'ões'} no período`}
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Recorrência</span>
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            R$ {recorrenciaValue.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            {ganhoLeads.length} cliente{ganhoLeads.length !== 1 ? 's' : ''} fechado{ganhoLeads.length !== 1 ? 's' : ''}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button
          onClick={() => navigate('/kanban')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nova Lead
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate('/kanban')}
          leftIcon={<TrendingUp className="w-4 h-4" />}
        >
          Novo Negócio
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate('/agenda')}
          leftIcon={<Calendar className="w-4 h-4" />}
        >
          Agendar
        </Button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white">Leads por Dia</h3>
            <p className="text-xs text-gray-500">Últimos 7 dias</p>
          </div>
          {hasLeadHistory ? (
            <LineChartWrapper data={leadsPerDay} height={180} />
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-600">
              Nenhuma lead criada nos últimos 7 dias
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white">Receita Semanal</h3>
            <p className="text-xs text-gray-500">Mês atual</p>
          </div>
          {hasRevenueHistory ? (
            <BarChartWrapper
              data={revenuePerWeek}
              height={180}
              formatValue={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
            />
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-600">
              Nenhuma entrada registrada neste mês
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white">Status dos Negócios</h3>
            <p className="text-xs text-gray-500">Pipeline completo</p>
          </div>
          {hasDealStatus ? (
            <DonutChartWrapper data={dealStatus} height={200} />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-600">
              Nenhum negócio no funil ainda
            </div>
          )}
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Próximas Atividades</h3>
          <button
            onClick={() => navigate('/agenda')}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Ver agenda →
          </button>
        </div>
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="py-8 text-sm text-gray-600 text-center">
              Nenhuma atividade futura agendada
            </div>
          ) : (
            upcomingEvents.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0"
              >
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  {event.type === 'reuniao' && <Users className="w-4 h-4 text-blue-400" />}
                  {event.type === 'demo' && <Activity className="w-4 h-4 text-purple-400" />}
                  {event.type === 'followup' && <MessageSquare className="w-4 h-4 text-yellow-400" />}
                  {event.type === 'ligacao' && <Activity className="w-4 h-4 text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{event.title}</p>
                  <p className="text-xs text-gray-500">{event.clientName || 'Sem cliente vinculado'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{format(new Date(event.date), 'dd/MM')}</p>
                  <p className={`text-xs font-medium ${eventTypeColors[event.type]}`}>
                    {eventTypeLabels[event.type]}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </PageWrapper>
  );
};
