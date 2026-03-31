import { create } from 'zustand';
import type { CompanySettings, IntegrationSetting, NotificationSettings, User } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import {
  companySettingsToRow,
  defaultCompanySettings,
  defaultIntegrationSettings,
  defaultNotificationSettings,
  integrationToRow,
  mapCompanySettings,
  mapIntegrationSetting,
  mapNotificationSettings,
} from '../lib/supabaseMappers';
import { useAppStore } from './useAppStore';

interface SettingsState {
  companySettings: CompanySettings;
  integrations: IntegrationSetting[];
  notificationSettings: NotificationSettings;
  initialized: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  updateCompanySettings: (updates: Partial<CompanySettings>) => Promise<void>;
  toggleIntegration: (id: string) => Promise<void>;
  toggleNotification: (key: keyof NotificationSettings) => Promise<void>;
  sendInvite: (payload: { name: string; email: string; role: User['role'] }) => Promise<void>;
  reset: () => void;
}

let initPromise: Promise<void> | null = null;
let companyRealtimeAttached = false;
let integrationRealtimeAttached = false;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  companySettings: defaultCompanySettings,
  integrations: defaultIntegrationSettings,
  notificationSettings: defaultNotificationSettings,
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({
        companySettings: defaultCompanySettings,
        integrations: defaultIntegrationSettings,
        notificationSettings: defaultNotificationSettings,
        initialized: true,
        loading: false,
      });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ loading: true });

      const supabase = assertSupabase();
      const user = useAppStore.getState().user;

      const [companyResult, integrationsResult, preferencesResult] = await Promise.all([
        supabase.from('company_settings').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('integration_settings').select('*').order('name', { ascending: true }),
        user
          ? supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (companyResult.error) throw companyResult.error;
      if (integrationsResult.error) throw integrationsResult.error;
      if (preferencesResult.error) throw preferencesResult.error;

      set({
        companySettings: companyResult.data
          ? mapCompanySettings(companyResult.data)
          : defaultCompanySettings,
        integrations:
          integrationsResult.data.length > 0
            ? integrationsResult.data.map((row) => mapIntegrationSetting(row))
            : defaultIntegrationSettings,
        notificationSettings: preferencesResult.data
          ? mapNotificationSettings(preferencesResult.data)
          : defaultNotificationSettings,
        initialized: true,
        loading: false,
      });

      if (!companyRealtimeAttached) {
        supabase
          .channel('crm-company-settings')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'company_settings' },
            async () => {
              const { data } = await supabase
                .from('company_settings')
                .select('*')
                .eq('id', 'default')
                .maybeSingle();
              if (data) set({ companySettings: mapCompanySettings(data) });
            }
          )
          .subscribe();
        companyRealtimeAttached = true;
      }

      if (!integrationRealtimeAttached) {
        supabase
          .channel('crm-integration-settings')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'integration_settings' },
            async () => {
              const { data } = await supabase
                .from('integration_settings')
                .select('*')
                .order('name', { ascending: true });
              if (data) set({ integrations: data.map((row) => mapIntegrationSetting(row)) });
            }
          )
          .subscribe();
        integrationRealtimeAttached = true;
      }
    })().finally(() => {
      initPromise = null;
    });

    return initPromise;
  },

  updateCompanySettings: async (updates) => {
    const next = {
      ...get().companySettings,
      ...updates,
    };

    if (!supabaseEnabled) {
      set({ companySettings: next });
      return;
    }

    const { error } = await assertSupabase()
      .from('company_settings')
      .upsert(companySettingsToRow(next));

    if (error) throw error;
    set({ companySettings: next });
  },

  toggleIntegration: async (id) => {
    const current = get().integrations.find((item) => item.id === id);
    if (!current) return;

    const next: IntegrationSetting = {
      ...current,
      connected: !current.connected,
      status: !current.connected ? 'Conectado' : 'Desconectado',
    };

    if (!supabaseEnabled) {
      set((state) => ({
        integrations: state.integrations.map((item) => (item.id === id ? next : item)),
      }));
      return;
    }

    const { error } = await assertSupabase()
      .from('integration_settings')
      .upsert(integrationToRow(next));

    if (error) throw error;

    set((state) => ({
      integrations: state.integrations.map((item) => (item.id === id ? next : item)),
    }));
  },

  toggleNotification: async (key) => {
    const next = {
      ...get().notificationSettings,
      [key]: !get().notificationSettings[key],
    };

    if (!supabaseEnabled) {
      set({ notificationSettings: next });
      return;
    }

    const user = useAppStore.getState().user;
    if (!user) return;

    const { error } = await assertSupabase().from('user_preferences').upsert({
      user_id: user.id,
      notification_settings: next,
      theme: useAppStore.getState().theme,
    });

    if (error) throw error;
    set({ notificationSettings: next });
  },

  sendInvite: async ({ name, email, role }) => {
    if (!supabaseEnabled) return;

    const currentUser = useAppStore.getState().user;
    const { error } = await assertSupabase().from('user_invites').insert({
      name,
      email,
      role,
      invited_by: currentUser?.id ?? null,
    });

    if (error) throw error;
  },

  reset: () => {
    set({
      companySettings: defaultCompanySettings,
      integrations: defaultIntegrationSettings,
      notificationSettings: defaultNotificationSettings,
      initialized: false,
      loading: false,
    });
  },
}));
