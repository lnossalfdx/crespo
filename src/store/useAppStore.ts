import { create } from 'zustand';
import type { User as AuthUser } from '@supabase/supabase-js';
import type { Notification, User } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { mapNotification, mapUser } from '../lib/supabaseMappers';
import { resetAllDomainStores } from './useDomainReset';

interface AppState {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: User | null;
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  initializeAuth: () => Promise<void>;
  loadUserContext: (authUser?: AuthUser | null) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  toggleTheme: () => Promise<void>;
  toggleSidebar: () => void;
  markNotificationRead: (id: string) => Promise<void>;
  reset: () => void;
}

let authInitPromise: Promise<void> | null = null;
let authListenerAttached = false;

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  isAuthLoading: true,
  user: null,
  theme: 'dark',
  sidebarCollapsed: false,
  notifications: [],

  initializeAuth: async () => {
    if (!supabaseEnabled) {
      set({
        isAuthenticated: false,
        isAuthLoading: false,
        user: null,
        notifications: [],
      });
      return;
    }

    if (authInitPromise) return authInitPromise;

    authInitPromise = (async () => {
      const supabase = assertSupabase();

      if (!authListenerAttached) {
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            void get().loadUserContext(session.user).catch((err) => {
              console.error('[onAuthStateChange] loadUserContext failed:', err);
              set({ isAuthLoading: false });
            });
          } else {
            resetAllDomainStores();
            set({
              isAuthenticated: false,
              isAuthLoading: false,
              user: null,
              notifications: [],
            });
          }
        });
        authListenerAttached = true;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        set({ isAuthenticated: false, isAuthLoading: false });
        throw error;
      }

      if (data.session?.user) {
        await get().loadUserContext(data.session.user);
      } else {
        set({
          isAuthenticated: false,
          isAuthLoading: false,
          user: null,
          notifications: [],
        });
      }
    })().finally(() => {
      authInitPromise = null;
    });

    return authInitPromise;
  },

  loadUserContext: async (authUser) => {
    if (!supabaseEnabled || !authUser) {
      set({ isAuthLoading: false });
      return;
    }

    const supabase = assertSupabase();

    // Only show loading spinner on first load, not on silent token refreshes
    if (!get().isAuthenticated) {
      set({ isAuthLoading: true });
    }

    try {
      const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      let profileRow = profileResult.data;

      if (!profileRow) {
        const upsertResult = await supabase
          .from('profiles')
          .upsert({
            id: authUser.id,
            email: authUser.email ?? '',
            name:
              (typeof authUser.user_metadata?.name === 'string' && authUser.user_metadata.name) ||
              (authUser.email?.split('@')[0] ?? 'Responsyva User'),
          })
          .select('*')
          .single();
        if (upsertResult.error) throw upsertResult.error;
        profileRow = upsertResult.data;
      }

      const [prefsResult, notificationsResult] = await Promise.all([
        supabase.from('user_preferences').select('*').eq('user_id', authUser.id).maybeSingle(),
        supabase.from('notifications').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      ]);

      if (prefsResult.error) throw prefsResult.error;
      if (notificationsResult.error) throw notificationsResult.error;

      set({
        isAuthenticated: true,
        isAuthLoading: false,
        user: mapUser({
          ...profileRow,
          email: profileRow?.email ?? authUser.email ?? '',
        }),
        theme: prefsResult.data?.theme === 'light' ? 'light' : 'dark',
        notifications: (notificationsResult.data ?? []).map((row) => mapNotification(row)),
      });
    } catch (err) {
      console.error('[loadUserContext] error:', err);
      set({ isAuthLoading: false });
      throw err;
    }
  },

  login: async (email, password) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
    }

    const supabase = assertSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await get().loadUserContext(data.user);
  },

  logout: async () => {
    resetAllDomainStores();

    if (!supabaseEnabled) {
      set({
        isAuthenticated: false,
        isAuthLoading: false,
        user: null,
        notifications: [],
      });
      return;
    }

    const supabase = assertSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    set({
      isAuthenticated: false,
      isAuthLoading: false,
      user: null,
      notifications: [],
    });
  },

  updateProfile: async (updates) => {
    const currentUser = get().user;
    if (!currentUser) return;

    if (!supabaseEnabled) {
      set({ user: { ...currentUser, ...updates } });
      return;
    }

    const supabase = assertSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name ?? currentUser.name,
        email: updates.email ?? currentUser.email,
        phone: updates.phone ?? currentUser.phone,
        role: updates.role ?? currentUser.role,
        avatar: updates.avatar ?? currentUser.avatar ?? null,
      })
      .eq('id', currentUser.id)
      .select('*')
      .single();

    if (error) throw error;
    set({ user: mapUser(data) });
  },

  toggleTheme: async () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    const user = get().user;

    set({ theme: nextTheme });

    if (!supabaseEnabled || !user) return;

    const supabase = assertSupabase();
    const { error } = await supabase.from('user_preferences').upsert({
      user_id: user.id,
      theme: nextTheme,
    });
    if (error) throw error;
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  markNotificationRead: async (id) => {
    if (!supabaseEnabled) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
      return;
    }

    const supabase = assertSupabase();
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  reset: () => {
    set({
      isAuthenticated: false,
      isAuthLoading: !supabaseEnabled,
      user: null,
      theme: 'dark',
      sidebarCollapsed: false,
      notifications: [],
    });
  },
}));
