import React, { useState } from 'react';
import { User, Mail, Phone, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useUsersStore } from '../store/useUsersStore';

const tabs = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'empresa', label: 'Empresa' },
  { id: 'integracoes', label: 'Integrações' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'usuarios', label: 'Usuários' },
];

const roleLabels = {
  admin: 'Administrador',
  manager: 'Gerente',
  agent: 'Agente',
};

const ProfileSettingsCard: React.FC<{
  user: ReturnType<typeof useAppStore.getState>['user'];
  onSave: (form: { name: string; email: string; phone: string }) => Promise<void>;
}> = ({ user, onSave }) => {
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });

  return (
    <Card className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <Avatar name={user?.name || 'Usuário'} size="xl" />
          <button className="absolute bottom-0 right-0 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs hover:bg-gray-200 transition-colors">
            +
          </button>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{user?.name || 'Usuário'}</p>
          <p className="text-sm text-gray-500">{user?.role ? roleLabels[user.role] : 'Sem perfil definido'}</p>
        </div>
      </div>
      <div className="space-y-4">
        <Input
          label="Nome completo"
          value={profileForm.name}
          onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
          leftIcon={<User className="w-4 h-4" />}
        />
        <Input
          label="E-mail"
          type="email"
          value={profileForm.email}
          onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
          leftIcon={<Mail className="w-4 h-4" />}
        />
        <Input
          label="Telefone"
          value={profileForm.phone}
          onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
          leftIcon={<Phone className="w-4 h-4" />}
        />
        <Button
          className="mt-2"
          onClick={() => void onSave(profileForm)}
        >
          Salvar Alterações
        </Button>
      </div>
    </Card>
  );
};

const CompanySettingsCard: React.FC<{
  companySettings: ReturnType<typeof useSettingsStore.getState>['companySettings'];
  onSave: (form: {
    name: string;
    cnpj: string;
    address: string;
    segment: string;
    website: string;
  }) => Promise<void>;
}> = ({ companySettings, onSave }) => {
  const [companyForm, setCompanyForm] = useState({
    name: companySettings.name,
    cnpj: companySettings.cnpj,
    address: companySettings.address,
    segment: companySettings.segment,
    website: companySettings.website,
  });

  return (
    <Card className="max-w-lg">
      <h3 className="text-sm font-semibold text-white mb-4">Dados da Empresa</h3>
      <div className="space-y-4">
        <div className="w-20 h-20 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-gray-600 transition-colors mb-4">
          <span className="text-xs text-gray-500 text-center">Logo</span>
        </div>
        <Input
          label="Nome da Empresa"
          value={companyForm.name}
          onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <Input
          label="CNPJ"
          placeholder="00.000.000/0001-00"
          value={companyForm.cnpj}
          onChange={(e) => setCompanyForm((prev) => ({ ...prev, cnpj: e.target.value }))}
        />
        <Input
          label="Endereço"
          placeholder="Rua, número, cidade"
          value={companyForm.address}
          onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
        />
        <Input
          label="Segmento"
          placeholder="Tecnologia / SaaS"
          value={companyForm.segment}
          onChange={(e) => setCompanyForm((prev) => ({ ...prev, segment: e.target.value }))}
        />
        <Input
          label="Website"
          placeholder="https://responsyva.com"
          type="url"
          value={companyForm.website}
          onChange={(e) => setCompanyForm((prev) => ({ ...prev, website: e.target.value }))}
        />
        <Button onClick={() => void onSave(companyForm)}>Salvar</Button>
      </div>
    </Card>
  );
};

export const Configuracoes: React.FC = () => {
  const { user, theme, toggleTheme, updateProfile } = useAppStore();
  const { users } = useUsersStore();
  const {
    companySettings,
    integrations,
    notificationSettings,
    toggleIntegration,
    toggleNotification,
    updateCompanySettings,
    sendInvite,
  } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('perfil');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'agent' as 'admin' | 'manager' | 'agent',
  });

  return (
    <PageWrapper>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Configurações</h2>
        <p className="text-gray-500 text-sm">Gerencie sua conta e preferências</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6 flex-wrap" />

      {/* Perfil */}
      {activeTab === 'perfil' && (
        <ProfileSettingsCard
          key={`${user?.id ?? 'profile'}:${user?.name ?? ''}:${user?.email ?? ''}:${user?.phone ?? ''}`}
          user={user}
          onSave={updateProfile}
        />
      )}

      {/* Empresa */}
      {activeTab === 'empresa' && (
        <CompanySettingsCard
          key={[
            companySettings.name,
            companySettings.cnpj,
            companySettings.address,
            companySettings.segment,
            companySettings.website,
          ].join(':')}
          companySettings={companySettings}
          onSave={updateCompanySettings}
        />
      )}

      {/* Integrações */}
      {activeTab === 'integracoes' && (
        integrations.length === 0 ? (
          <Card className="max-w-lg text-sm text-gray-500">
            Nenhuma integração cadastrada ainda.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {integrations.map((integration) => (
              <Card key={integration.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{integration.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {integration.connected ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-gray-600" />
                        )}
                        <span className={`text-xs ${integration.connected ? 'text-green-400' : 'text-gray-600'}`}>
                          {integration.connected ? 'Conectado' : 'Desconectado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Toggle
                    checked={integration.connected}
                    onChange={() => toggleIntegration(integration.id)}
                  />
                </div>
                <p className="text-xs text-gray-500">{integration.description}</p>
                {integration.connected && (
                  <Button variant="ghost" size="sm">Configurar</Button>
                )}
                {!integration.connected && (
                  <Button size="sm">Conectar</Button>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      {/* Notificações */}
      {activeTab === 'notificacoes' && (
        <Card className="max-w-lg">
          <h3 className="text-sm font-semibold text-white mb-6">Preferências de Notificação</h3>
          <div className="space-y-5">
            <Toggle
              checked={notificationSettings.novaLead}
              onChange={() => toggleNotification('novaLead')}
              label="Nova Lead"
              description="Notificar quando uma nova lead entrar no funil"
            />
            <Toggle
              checked={notificationSettings.negocioFechado}
              onChange={() => toggleNotification('negocioFechado')}
              label="Negócio Fechado"
              description="Notificar quando um negócio for ganho ou perdido"
            />
            <Toggle
              checked={notificationSettings.pagamentoRecebido}
              onChange={() => toggleNotification('pagamentoRecebido')}
              label="Pagamento Recebido"
              description="Notificar sobre novos pagamentos confirmados"
            />
            <Toggle
              checked={notificationSettings.tarefaVencendo}
              onChange={() => toggleNotification('tarefaVencendo')}
              label="Tarefa Vencendo"
              description="Lembrete 24h antes do prazo de uma tarefa"
            />
            <Toggle
              checked={notificationSettings.followupPendente}
              onChange={() => toggleNotification('followupPendente')}
              label="Follow-up Pendente"
              description="Alertar sobre follow-ups atrasados"
            />
            <Toggle
              checked={notificationSettings.relatorioSemanal}
              onChange={() => toggleNotification('relatorioSemanal')}
              label="Relatório Semanal"
              description="Receber resumo toda segunda-feira às 8h"
            />
          </div>
        </Card>
      )}

      {/* Aparência */}
      {activeTab === 'aparencia' && (
        <div className="max-w-lg space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Tema Escuro</p>
                <p className="text-xs text-gray-500 mt-0.5">Alterne entre tema escuro e claro</p>
              </div>
              <Toggle
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />
            </div>
          </Card>

          {/* Theme Previews */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-colors ${
                theme === 'dark' ? 'border-white' : 'border-gray-700'
              }`}
              onClick={() => theme !== 'dark' && toggleTheme()}
            >
              <div className="bg-gray-950 p-3">
                <div className="w-full h-2 bg-gray-800 rounded mb-2" />
                <div className="w-3/4 h-2 bg-gray-700 rounded mb-2" />
                <div className="w-1/2 h-2 bg-gray-700 rounded" />
              </div>
              <p className="text-xs text-center py-1.5 bg-gray-900 text-gray-400">Escuro</p>
            </div>
            <div
              className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-colors ${
                theme === 'light' ? 'border-white' : 'border-gray-700'
              }`}
              onClick={() => theme !== 'light' && toggleTheme()}
            >
              <div className="bg-gray-100 p-3">
                <div className="w-full h-2 bg-gray-300 rounded mb-2" />
                <div className="w-3/4 h-2 bg-gray-200 rounded mb-2" />
                <div className="w-1/2 h-2 bg-gray-200 rounded" />
              </div>
              <p className="text-xs text-center py-1.5 bg-white text-gray-600">Claro</p>
            </div>
          </div>
        </div>
      )}

      {/* Usuários */}
      {activeTab === 'usuarios' && (
        <div className="max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Equipe ({users.length})</h3>
            <Button
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setInviteModalOpen(true)}
            >
              Convidar
            </Button>
          </div>
          <Card padding="none">
            {users.map((member, idx) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  idx < users.length - 1 ? 'border-b border-gray-800' : ''
                }`}
              >
                <Avatar name={member.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <Badge variant={member.role === 'admin' ? 'success' : member.role === 'manager' ? 'info' : 'default'}>
                  {roleLabels[member.role]}
                </Badge>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Convidar Usuário"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            value={inviteForm.name}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="email@empresa.com"
            value={inviteForm.email}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">Função</label>
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm((prev) => ({
                  ...prev,
                  role: e.target.value as 'admin' | 'manager' | 'agent',
                }))
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-gray-500"
            >
              <option value="agent">Agente</option>
              <option value="manager">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              fullWidth
              onClick={async () => {
                await sendInvite(inviteForm);
                setInviteForm({ name: '', email: '', role: 'agent' });
                setInviteModalOpen(false);
              }}
            >
              Enviar Convite
            </Button>
            <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};
