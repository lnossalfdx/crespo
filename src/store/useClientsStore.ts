import { create } from 'zustand';
import type { Client } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { clientToRow, mapClient } from '../lib/supabaseMappers';
import { useAppStore } from './useAppStore';

interface ClientsState {
  clients: Client[];
  initialized: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  fetchClients: () => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClientById: (id: string) => Client | undefined;
  reset: () => void;
}

let initPromise: Promise<void> | null = null;
let realtimeAttached = false;

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({ clients: [], initialized: true, loading: false });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ loading: true });
      await get().fetchClients();

      if (!realtimeAttached) {
        assertSupabase()
          .channel('crm-clients')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'clients' },
            () => void get().fetchClients()
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

  fetchClients: async () => {
    if (!supabaseEnabled) {
      set({ clients: [] });
      return;
    }

    const { data, error } = await assertSupabase()
      .from('clients')
      .select('*')
      .order('last_interaction', { ascending: false });

    if (error) throw error;
    set({ clients: data.map((row) => mapClient(row)) });
  },

  addClient: async (client) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const currentUser = useAppStore.getState().user;
    const payload = {
      ...clientToRow(client),
      created_by: currentUser?.id ?? null,
    };

    delete (payload as { id?: string }).id;

    const { data, error } = await assertSupabase()
      .from('clients')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    set((state) => ({ clients: [mapClient(data), ...state.clients] }));
  },

  updateClient: async (id, updates) => {
    const current = get().clients.find((client) => client.id === id);
    if (!current) return;

    const merged: Client = {
      ...current,
      ...updates,
    };

    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const payload = clientToRow(merged);
    delete (payload as { id?: string }).id;

    const { error } = await assertSupabase().from('clients').update(payload).eq('id', id);
    if (error) throw error;

    set((state) => ({
      clients: state.clients.map((client) => (client.id === id ? merged : client)),
    }));
  },

  deleteClient: async (id) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const { error } = await assertSupabase().from('clients').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({ clients: state.clients.filter((client) => client.id !== id) }));
  },

  getClientById: (id) => {
    return get().clients.find((client) => client.id === id);
  },

  reset: () => {
    set({
      clients: [],
      initialized: false,
      loading: false,
    });
  },
}));
