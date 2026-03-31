import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useLeadsStore } from '../store/useLeadsStore';

const funnelStageMeta = [
  { id: 'leads', label: 'Leads', color: '#666666' },
  { id: 'qualificados', label: 'Qualificados', color: '#888888' },
  { id: 'proposta', label: 'Proposta', color: '#AAAAAA' },
  { id: 'negociacao', label: 'Negociação', color: '#CCCCCC' },
  { id: 'fechado', label: 'Fechado', color: '#EEEEEE' },
  { id: 'perdido', label: 'Perdido', color: '#3D3D3D' },
];

const stageMap: Record<string, string> = {
  leads: 'novo',
  qualificados: 'qualificando',
  proposta: 'proposta',
  negociacao: 'negociacao',
  fechado: 'ganho',
  perdido: 'perdido',
};

const stageBadgeMap: Record<string, 'novo' | 'qualificando' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'> = {
  novo: 'novo',
  qualificando: 'qualificando',
  proposta: 'proposta',
  negociacao: 'negociacao',
  ganho: 'ganho',
  perdido: 'perdido',
};

const stageLabels: Record<string, string> = {
  novo: 'Novo Lead',
  qualificando: 'Qualificando',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

export const Funil: React.FC = () => {
  const { leads } = useLeadsStore();
  const [selectedStage, setSelectedStage] = useState<string>('leads');

  const stageCounts = {
    leads: leads.filter((lead) => lead.stage === 'novo').length,
    qualificados: leads.filter((lead) => lead.stage === 'qualificando').length,
    proposta: leads.filter((lead) => lead.stage === 'proposta').length,
    negociacao: leads.filter((lead) => lead.stage === 'negociacao').length,
    fechado: leads.filter((lead) => lead.stage === 'ganho').length,
    perdido: leads.filter((lead) => lead.stage === 'perdido').length,
  };

  const funnelStages = funnelStageMeta.map((stage, index) => {
    const prev = index === 0 ? null : stageCounts[funnelStageMeta[index - 1].id as keyof typeof stageCounts];
    const current = stageCounts[stage.id as keyof typeof stageCounts];

    return {
      ...stage,
      count: current,
      convRate: prev && prev > 0 ? Math.round((current / prev) * 100) : null,
    };
  });

  const filteredLeads = leads.filter(
    (lead) => lead.stage === stageMap[selectedStage]
  );

  return (
    <PageWrapper>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Funil de Vendas</h2>
        <p className="text-gray-500 text-sm">Visualize e analise a progressão das suas oportunidades</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel Diagram */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-white mb-6">Funil Visual</h3>
          <div className="space-y-2">
            {funnelStages.map((stage, idx) => {
              const width = 100 - (idx * (100 - 40)) / (funnelStages.length - 1);
              const isSelected = selectedStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-gray-400 w-24 flex-shrink-0">{stage.label}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-8 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                          className={`h-full rounded-full flex items-center px-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}`}
                          style={{ backgroundColor: stage.color }}
                        >
                          <span className="text-xs font-semibold text-gray-900">
                            {stage.count}
                          </span>
                        </motion.div>
                      </div>
                      {stage.convRate !== null && (
                        <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0">
                          {stage.convRate}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Stage Stats */}
        <div className="grid grid-cols-2 gap-3">
          {funnelStages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selectedStage === stage.id
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="text-2xl font-bold text-white mb-1">{stage.count}</div>
              <div className="text-xs text-gray-400">{stage.label}</div>
              {stage.convRate !== null && (
                <div className="mt-2 text-xs text-gray-500">
                  Conversão: <span className="text-white">{stage.convRate}%</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filtered Leads Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Leads em "{funnelStages.find((s) => s.id === selectedStage)?.label}"
            <span className="ml-2 text-gray-500 font-normal">({filteredLeads.length})</span>
          </h3>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            Nenhuma lead neste estágio
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Nome</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Empresa</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Telefone</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Valor</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Estágio</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="text-sm font-medium text-white">{lead.name}</div>
                      <div className="text-xs text-gray-500">{lead.email}</div>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-300">{lead.company}</td>
                    <td className="py-3 px-3 text-sm text-gray-400">{lead.phone}</td>
                    <td className="py-3 px-3 text-sm font-medium text-white">
                      R$ {lead.value.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={stageBadgeMap[lead.stage]}>
                        {stageLabels[lead.stage]}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
};
