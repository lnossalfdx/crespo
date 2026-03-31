import { create } from 'zustand';
import type { Event } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { eventToRow, mapEvent } from '../lib/supabaseMappers';
import { useAppStore } from './useAppStore';

interface EventsState {
  events: Event[];
  initialized: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<Event, 'id'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  reset: () => void;
}

let initPromise: Promise<void> | null = null;
let realtimeAttached = false;

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({ events: [], initialized: true, loading: false });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ loading: true });
      await get().fetchEvents();

      if (!realtimeAttached) {
        assertSupabase()
          .channel('crm-events')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'events' },
            () => void get().fetchEvents()
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

  fetchEvents: async () => {
    if (!supabaseEnabled) {
      set({ events: [] });
      return;
    }

    const { data, error } = await assertSupabase()
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;
    set({ events: data.map((row) => mapEvent(row)) });
  },

  addEvent: async (event) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const currentUser = useAppStore.getState().user;
    const payload = {
      ...eventToRow(event),
      created_by: currentUser?.id ?? null,
    };

    delete (payload as { id?: string }).id;

    const { data, error } = await assertSupabase()
      .from('events')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    set((state) => ({ events: [...state.events, mapEvent(data)] }));
  },

  updateEvent: async (id, updates) => {
    const current = get().events.find((event) => event.id === id);
    if (!current) return;

    const merged: Event = {
      ...current,
      ...updates,
    };

    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const payload = eventToRow(merged);
    delete (payload as { id?: string }).id;

    const { error } = await assertSupabase().from('events').update(payload).eq('id', id);
    if (error) throw error;

    set((state) => ({
      events: state.events.map((event) => (event.id === id ? merged : event)),
    }));
  },

  deleteEvent: async (id) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const { error } = await assertSupabase().from('events').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({ events: state.events.filter((event) => event.id !== id) }));
  },

  reset: () => {
    set({
      events: [],
      initialized: false,
      loading: false,
    });
  },
}));
