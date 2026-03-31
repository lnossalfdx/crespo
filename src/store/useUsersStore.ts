import { create } from 'zustand';
import type { User } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { mapUser } from '../lib/supabaseMappers';

const SYSTEM_USERS: User[] = [];

interface UsersState {
  users: User[];
  initialized: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  reset: () => void;
}

let initPromise: Promise<void> | null = null;
let realtimeAttached = false;

export const useUsersStore = create<UsersState>((set, get) => ({
  users: SYSTEM_USERS,
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({ users: SYSTEM_USERS, initialized: true, loading: false });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ loading: true });
      await get().fetchUsers();

      if (!realtimeAttached) {
        assertSupabase()
          .channel('crm-profiles')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
            () => void get().fetchUsers()
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

  fetchUsers: async () => {
    if (!supabaseEnabled) {
      set({ users: SYSTEM_USERS });
      return;
    }

    const { data, error } = await assertSupabase()
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    set({ users: data.map((row) => mapUser(row)) });
  },

  reset: () => {
    set({
      users: SYSTEM_USERS,
      initialized: false,
      loading: false,
    });
  },
}));
