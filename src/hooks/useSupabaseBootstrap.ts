import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useClientsStore } from '../store/useClientsStore';
import { useEventsStore } from '../store/useEventsStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useImportStore } from '../store/useImportStore';
import { useLeadAcceptancesStore } from '../store/useLeadAcceptancesStore';
import { useLeadsStore } from '../store/useLeadsStore';
import { useProjectsStore } from '../store/useProjectsStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useUsersStore } from '../store/useUsersStore';

export function useSupabaseBootstrap() {
  const initializeAuth = useAppStore((state) => state.initializeAuth);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const userId = useAppStore((state) => state.user?.id);

  const initializeLeads = useLeadsStore((state) => state.initialize);
  const initializeClients = useClientsStore((state) => state.initialize);
  const initializeProjects = useProjectsStore((state) => state.initialize);
  const initializeFinance = useFinanceStore((state) => state.initialize);
  const initializeUsers = useUsersStore((state) => state.initialize);
  const initializeEvents = useEventsStore((state) => state.initialize);
  const initializeSettings = useSettingsStore((state) => state.initialize);
  const initializeImport = useImportStore((state) => state.initialize);
  const initializeAcceptances = useLeadAcceptancesStore((state) => state.initialize);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    void Promise.all([
      initializeLeads(),
      initializeClients(),
      initializeProjects(),
      initializeFinance(),
      initializeUsers(),
      initializeEvents(),
      initializeSettings(),
      initializeImport(),
      initializeAcceptances(),
    ]);
  }, [
    initializeAcceptances,
    initializeClients,
    initializeEvents,
    initializeFinance,
    initializeImport,
    initializeLeads,
    initializeProjects,
    initializeSettings,
    initializeUsers,
    isAuthenticated,
    userId,
  ]);
}
