import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { endOfMonth, eachWeekOfInterval, format, isSameDay, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, RefreshCw, Plus, Calendar, MessageSquare, Activity, Trophy } from 'lucide-react';
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
import { useLeadAcceptancesStore } from '../store/useLeadAcceptancesStore';

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
  const todayRanking = useLeadAcceptancesStore((state) => state.todayRanking);
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

      {/* Gamification: Lead Acceptance Ranking */}
      <div className="mb-8 rounded-2xl overflow-hidden relative" style={{
        background: '#000',
        border: '1px solid rgba(255,255,255,0.09)',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}>
        {/* top spotlight */}
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: '220px', background: 'radial-gradient(ellipse at 50% -10%, rgba(255,255,255,0.055) 0%, transparent 70%)' }} />

        <div className="relative p-6 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <Trophy className="w-5 h-5 text-white" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' }} />
                <h3 className="text-lg font-black text-white tracking-widest uppercase">Ranking Diário</h3>
              </div>
              <p className="text-xs text-gray-700 pl-8">quem aceita mais leads hoje leva a coroa</p>
            </div>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.9)' }} />
              <span className="text-xs text-red-400 font-bold tracking-widest">AO VIVO</span>
            </motion.div>
          </div>

          {todayRanking.length === 0 ? (
            <div className="py-16 text-center">
              <motion.span
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="text-5xl mb-4 block"
                style={{ filter: 'grayscale(1) drop-shadow(0 0 12px rgba(255,255,255,0.4))' }}
              >👑</motion.span>
              <p className="text-white font-bold mt-4">A coroa está disponível!</p>
              <p className="text-xs text-gray-700 mt-1">Aceite um lead e entre no ranking</p>
            </div>
          ) : (
            <>
              {/* ── Podium ── */}
              <div className="flex items-end justify-center gap-2 px-4 mb-0">

                {/* 2nd */}
                <div className="flex-1 flex flex-col items-center">
                  {todayRanking[1] ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="flex flex-col items-center w-full">
                      <div className="w-10 h-10 rounded-full mb-1.5 flex items-center justify-center text-sm font-black"
                        style={{ background: 'linear-gradient(135deg,#3a3a3a,#1c1c1c)', color: '#888', border: '1.5px solid rgba(255,255,255,0.12)', boxShadow: '0 0 0 3px rgba(255,255,255,0.03)' }}>
                        {todayRanking[1].userName.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-400 font-semibold truncate max-w-[80px] text-center leading-tight">{todayRanking[1].userName}</p>
                      <p className="text-xs text-gray-700 mb-3 font-medium">{todayRanking[1].count} leads</p>
                      <div className="w-full rounded-t-2xl relative overflow-hidden" style={{ height: '92px', background: 'linear-gradient(180deg,#252525 0%,#0f0f0f 100%)', borderTop: '1px solid rgba(255,255,255,0.13)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 -4px 30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
                        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-black" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'serif', lineHeight: 1 }}>2</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : <div className="flex-1" />}
                </div>

                {/* 1st */}
                <div className="flex-1 flex flex-col items-center">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="flex flex-col items-center w-full">
                    <motion.span
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-xl mb-0.5 block text-center"
                      style={{ filter: 'grayscale(1) brightness(2) drop-shadow(0 0 10px rgba(255,255,255,0.7))' }}
                    >👑</motion.span>
                    <div className="w-14 h-14 rounded-full mb-1.5 flex items-center justify-center text-xl font-black"
                      style={{ background: 'linear-gradient(135deg,#ffffff,#d4d4d4)', color: '#000', boxShadow: '0 4px 32px rgba(255,255,255,0.28), 0 0 0 2px rgba(255,255,255,0.18)' }}>
                      {todayRanking[0].userName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-white font-black truncate max-w-[90px] text-center leading-tight">{todayRanking[0].userName}</p>
                    <p className="text-xs text-gray-500 mb-3 font-semibold">{todayRanking[0].count} leads</p>
                    <div className="w-full rounded-t-2xl relative overflow-hidden" style={{ height: '132px', background: 'linear-gradient(180deg,#353535 0%,#111 100%)', borderTop: '1px solid rgba(255,255,255,0.22)', borderLeft: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 -10px 60px rgba(255,255,255,0.07), 0 -2px 16px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)' }} />
                      {/* shimmer */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ x: ['-120%', '220%'] }}
                        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 4.5 }}
                        style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)', width: '50%' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-black" style={{ color: 'rgba(255,255,255,0.12)', fontFamily: 'serif', lineHeight: 1, textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>1</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* 3rd */}
                <div className="flex-1 flex flex-col items-center">
                  {todayRanking[2] ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="flex flex-col items-center w-full">
                      <div className="w-10 h-10 rounded-full mb-1.5 flex items-center justify-center text-sm font-black"
                        style={{ background: 'linear-gradient(135deg,#222,#111)', color: '#555', border: '1.5px solid rgba(255,255,255,0.07)', boxShadow: '0 0 0 3px rgba(255,255,255,0.02)' }}>
                        {todayRanking[2].userName.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-600 font-semibold truncate max-w-[80px] text-center leading-tight">{todayRanking[2].userName}</p>
                      <p className="text-xs text-gray-800 mb-3 font-medium">{todayRanking[2].count} leads</p>
                      <div className="w-full rounded-t-2xl relative overflow-hidden" style={{ height: '65px', background: 'linear-gradient(180deg,#1a1a1a 0%,#080808 100%)', borderTop: '1px solid rgba(255,255,255,0.08)', borderLeft: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)', boxShadow: '0 -4px 20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.1)', fontFamily: 'serif', lineHeight: 1 }}>3</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : <div className="flex-1" />}
                </div>
              </div>

              {/* base line */}
              <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)', marginBottom: '20px' }} />

              {/* 4th+ list */}
              {todayRanking.length > 3 && (
                <div className="space-y-1.5">
                  {todayRanking.slice(3, 8).map((entry, idx) => {
                    const rank = idx + 4;
                    const barMax = todayRanking[0].count;
                    const barPct = Math.round((entry.count / barMax) * 100);
                    const isCurrentUser = entry.userId === user?.id;
                    return (
                      <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 + 0.3 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: isCurrentUser ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.015)', border: isCurrentUser ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span className="text-xs font-black w-5 text-center flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>#{rank}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-gray-500'}`}>
                              {entry.userName}
                              {isCurrentUser && <span className="ml-1 font-normal" style={{ color: 'rgba(255,255,255,0.25)' }}>(você)</span>}
                            </span>
                            <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: isCurrentUser ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}>{entry.count}</span>
                          </div>
                          <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: isCurrentUser ? '#fff' : 'rgba(255,255,255,0.18)' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 0.7, delay: idx * 0.05 + 0.5, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {todayRanking.length > 8 && (
                    <p className="text-xs text-center pt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>+{todayRanking.length - 8} outros hoje</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
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
