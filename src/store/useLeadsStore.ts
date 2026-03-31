import { create } from 'zustand';
import type { Lead } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { leadToRow, mapLead } from '../lib/supabaseMappers';
import { useAppStore } from './useAppStore';

interface LeadsState {
  leads: Lead[];
  initialized: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  fetchLeads: () => Promise<void>;
  addLead: (lead: Omit<Lead, 'id'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  moveLead: (id: string, stage: Lead['stage']) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  reset: () => void;
}

let initPromise: Promise<void> | null = null;
let realtimeAttached = false;

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({ leads: [], initialized: true, loading: false });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ loading: true });
      await get().fetchLeads();

      if (!realtimeAttached) {
        assertSupabase()
          .channel('crm-leads')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'leads' },
            () => void get().fetchLeads()
          )
          .subscribe();
        realtimeAttached = true;
      }

      set({ initialized: true, loading: false });
    })().finally(() => {
      initPromise = null;
    });

    return initPromise;
  },

  fetchLeads: async () => {
    if (!supabaseEnabled) {
      set({ leads: [] });
      return;
    }

    const { data, error } = await assertSupabase()
      .from('leads')
      .select('*')
      .order('last_activity', { ascending: false });

    if (error) throw error;
    set({ leads: data.map((row) => mapLead(row)) });
  },

  addLead: async (lead) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const currentUser = useAppStore.getState().user;
    const payload = {
      ...leadToRow(lead),
      created_by: currentUser?.id ?? null,
      last_activity: lead.lastActivity || new Date().toISOString(),
    };

    delete (payload as { id?: string }).id;

    const { data, error } = await assertSupabase()
      .from('leads')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    set((state) => ({ leads: [mapLead(data), ...state.leads] }));
  },

  updateLead: async (id, updates) => {
    const current = get().leads.find((lead) => lead.id === id);
    if (!current) return;

    const merged: Lead = {
      ...current,
      ...updates,
    };

    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const payload = leadToRow(merged);
    delete (payload as { id?: string }).id;

    const { error } = await assertSupabase().from('leads').update(payload).eq('id', id);
    if (error) throw error;

    set((state) => ({
      leads: state.leads.map((lead) => (lead.id === id ? merged : lead)),
    }));
  },

  moveLead: async (id, stage) => {
    await get().updateLead(id, {
      stage,
      lastActivity: new Date().toISOString(),
    });
  },

  deleteLead: async (id) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const { error } = await assertSupabase().from('leads').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({ leads: state.leads.filter((lead) => lead.id !== id) }));
  },

  reset: () => {
    set({
      leads: [],
      initialized: false,
      loading: false,
    });
  },
}));
