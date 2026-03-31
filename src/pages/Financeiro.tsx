import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, DollarSign, Clock, Lock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { AreaChartWrapper } from '../components/charts/AreaChartWrapper';
import { useAnimatedCount } from '../hooks/useAnimatedCount';
import { useFinanceStore } from '../store/useFinanceStore';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';

const categoryOptions = [
  { value: 'Mensalidade', label: 'Mensalidade' },
  { value: 'Setup', label: 'Setup' },
  { value: 'Upsell', label: 'Upsell' },
  { value: 'Infraestrutura', label: 'Infraestrutura' },
  { value: 'Folha de Pagamento', label: 'Folha de Pagamento' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Ferramentas', label: 'Ferramentas' },
  { value: 'Serviços', label: 'Serviços' },
  { value: 'Aluguel', label: 'Aluguel' },
  { value: 'Benefícios', label: 'Benefícios' },
];

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const areaSeries = [
  { dataKey: 'receita', color: '#FFFFFF', label: 'Receita' },
  { dataKey: 'despesas', color: '#666666', label: 'Despesas' },
];

type TransactionFormData = {
  description: string;
  category: string;
  type: string;
  value: string;
  date: string;
};

export const Financeiro: React.FC = () => {
  const { user } = useAppStore();
  const { transactions, addTransaction, getTotalEntradas, getTotalSaidas, getLucroLiquido } = useFinanceStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const receitaTotal = useAnimatedCount(Math.round(getTotalEntradas()));
  const despesas = useAnimatedCount(Math.round(getTotalSaidas()));
  const lucroLiquido = useAnimatedCount(Math.round(getLucroLiquido()));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TransactionFormData>();

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchCategory = !categoryFilter || t.category === categoryFilter;
      const matchType = !typeFilter || t.type === typeFilter;
      return matchCategory && matchType;
    });
  }, [transactions, categoryFilter, typeFilter]);
  const monthlyRevenueData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const date = subMonths(startOfMonth(new Date()), 11 - index);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        const monthTransactions = transactions.filter((tx) => {
          const txDate = new Date(tx.date);
          return txDate >= start && txDate <= end;
        });

        return {
          month: format(date, 'MMM/yy', { locale: ptBR }),
          receita: monthTransactions
            .filter((tx) => tx.type === 'entrada')
            .reduce((sum, tx) => sum + tx.value, 0),
          despesas: monthTransactions
            .filter((tx) => tx.type === 'saida')
            .reduce((sum, tx) => sum + tx.value, 0),
        };
      }),
    [transactions]
  );
  const entradaCount = transactions.filter((tx) => tx.type === 'entrada').length;
  const saidaCount = transactions.filter((tx) => tx.type === 'saida').length;
  const ticketMedio = entradaCount > 0 ? getTotalEntradas() / entradaCount : 0;
  const ticketMedioAnimated = useAnimatedCount(Math.round(ticketMedio));
  const hasMonthlyData = monthlyRevenueData.some((item) => item.receita > 0 || item.despesas > 0);

  if (user?.role === 'agent') {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
          <div className="w-14 h-14 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p className="text-white font-semibold mb-1">Acesso restrito</p>
            <p className="text-sm text-gray-500">Apenas administradores podem acessar o financeiro.</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const onSubmit = (data: TransactionFormData) => {
    addTransaction({
      description: data.description,
      category: data.category,
      type: data.type as 'entrada' | 'saida',
      value: parseFloat(data.value) || 0,
      date: data.date,
    });
    reset();
    setAddModalOpen(false);
  };

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Financeiro</h2>
          <p className="text-gray-500 text-sm">Visão geral das finanças</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setAddModalOpen(true)}
        >
          Nova Transação
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Receita Total</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-xl font-bold text-white">
            R$ {receitaTotal.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-gray-500">{entradaCount} entrada{entradaCount !== 1 ? 's' : ''} registrada{entradaCount !== 1 ? 's' : ''}</div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Despesas</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-white">
            R$ {despesas.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-gray-500">{saidaCount} saída{saidaCount !== 1 ? 's' : ''} registrada{saidaCount !== 1 ? 's' : ''}</div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Lucro Líquido</span>
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div className="text-xl font-bold text-white">
            R$ {lucroLiquido.toLocaleString('pt-BR')}
          </div>
          <div className={`text-xs ${getLucroLiquido() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {getLucroLiquido() >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Ticket Médio</span>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-xl font-bold text-white">
            R$ {ticketMedioAnimated.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-gray-500">Média por entrada registrada</div>
        </Card>
      </div>

      {/* Area Chart */}
      <Card className="mb-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Receita x Despesas (12 meses)</h3>
        </div>
        {hasMonthlyData ? (
          <AreaChartWrapper
            data={monthlyRevenueData}
            series={areaSeries}
            xDataKey="month"
            height={260}
            formatValue={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
          />
        ) : (
          <div className="h-[260px] flex items-center justify-center text-sm text-gray-600">
            Nenhuma movimentação registrada nos últimos 12 meses
          </div>
        )}
      </Card>

      {/* Transactions Table */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-white">Transações</h3>
          <div className="flex flex-wrap gap-2">
            <Select
              options={categoryOptions}
              placeholder="Categoria"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-40"
            />
            <Select
              options={[
                { value: 'entrada', label: 'Entrada' },
                { value: 'saida', label: 'Saída' },
              ]}
              placeholder="Tipo"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-32"
            />
            {(categoryFilter || typeFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCategoryFilter(''); setTypeFilter(''); }}
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Data</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Descrição</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 hidden md:table-cell">Categoria</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Tipo</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, idx) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-3 px-3 text-sm text-gray-400">
                    {format(new Date(tx.date), 'dd/MM/yy', { locale: ptBR })}
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-sm text-white">{tx.description}</p>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-500 hidden md:table-cell">{tx.category}</td>
                  <td className="py-3 px-3">
                    <Badge variant={tx.type === 'entrada' ? 'success' : 'danger'}>
                      {tx.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </td>
                  <td className={`py-3 px-3 text-right text-sm font-semibold ${
                    tx.type === 'entrada' ? 'text-white' : 'text-gray-400'
                  }`}>
                    {tx.type === 'saida' && '-'}
                    {formatCurrency(tx.value)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); reset(); }}
        title="Nova Transação"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Descrição da transação"
            error={errors.description?.message}
            {...register('description', { required: 'Descrição obrigatória' })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo"
              options={[
                { value: 'entrada', label: 'Entrada' },
                { value: 'saida', label: 'Saída' },
              ]}
              placeholder="Selecionar"
              {...register('type', { required: true })}
            />
            <Select
              label="Categoria"
              options={categoryOptions}
              placeholder="Selecionar"
              {...register('category', { required: true })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor (R$)"
              type="number"
              placeholder="0,00"
              min="0"
              step="0.01"
              error={errors.value?.message}
              {...register('value', { required: 'Valor obrigatório' })}
            />
            <Input
              label="Data"
              type="date"
              error={errors.date?.message}
              {...register('date', { required: 'Data obrigatória' })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" fullWidth>Salvar</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setAddModalOpen(false); reset(); }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
};
