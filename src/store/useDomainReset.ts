import { useClientsStore } from './useClientsStore';
import { useEventsStore } from './useEventsStore';
import { useFinanceStore } from './useFinanceStore';
import { useImportStore } from './useImportStore';
import { useLeadAcceptancesStore } from './useLeadAcceptancesStore';
import { useLeadsStore } from './useLeadsStore';
import { useProjectsStore } from './useProjectsStore';
import { useSettingsStore } from './useSettingsStore';
import { useUsersStore } from './useUsersStore';

export function resetAllDomainStores() {
  useLeadsStore.getState().reset();
  useClientsStore.getState().reset();
  useProjectsStore.getState().reset();
  useFinanceStore.getState().reset();
  useUsersStore.getState().reset();
  useEventsStore.getState().reset();
  useSettingsStore.getState().reset();
  useImportStore.getState().reset();
  useLeadAcceptancesStore.getState().reset();
}
