import { create } from 'zustand';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { useAppStore } from './useAppStore';

export interface AcceptanceEntry {
  userId: string;
  userName: string;
  count: number;
}

interface LeadAcceptancesState {
  todayRanking: AcceptanceEntry[];
  initialized: boolean;
  initialize: () => Promise<void>;
  recordAcceptance: () => Promise<void>;
  reset: () => void;
}

let initPromise: Promise<void> | null = null;
let realtimeAttached = false;

async function fetchTodayRanking(): Promise<AcceptanceEntry[]> {
  if (!supabaseEnabled) return [];

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await assertSupabase()
    .from('lead_acceptances')
    .select('user_id, user_name')
    .eq('date', today);

  if (error || !data) return [];

  const counts: Record<string, { userName: string; count: number }> = {};
  for (const row of data) {
    const uid = String(row.user_id);
    if (!counts[uid]) counts[uid] = { userName: String(row.user_name), count: 0 };
    counts[uid].count++;
  }

  return Object.entries(counts)
    .map(([userId, { userName, count }]) => ({ userId, userName, count }))
    .sort((a, b) => b.count - a.count);
}

export const useLeadAcceptancesStore = create<LeadAcceptancesState>((set, get) => ({
  todayRanking: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({ initialized: true });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      const ranking = await fetchTodayRanking();
      set({ todayRanking: ranking, initialized: true });

      if (!realtimeAttached) {
        assertSupabase()
          .channel('crm-lead-acceptances')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_acceptances' }, async () => {
            const fresh = await fetchTodayRanking();
            set({ todayRanking: fresh });
          })
          .subscribe();
        realtimeAttached = true;
      }
    })().finally(() => { initPromise = null; });

    return initPromise;
  },

  recordAcceptance: async () => {
    if (!supabaseEnabled) return;

    const user = useAppStore.getState().user;
    if (!user) return;

    const today = new Date().toISOString().slice(0, 10);

    await assertSupabase().from('lead_acceptances').insert({
      user_id: user.id,
      user_name: user.name,
      date: today,
    });

    // optimistic update
    set((state) => {
      const existing = state.todayRanking.find((e) => e.userId === user.id);
      let next: AcceptanceEntry[];
      if (existing) {
        next = state.todayRanking.map((e) =>
          e.userId === user.id ? { ...e, count: e.count + 1 } : e
        );
      } else {
        next = [...state.todayRanking, { userId: user.id, userName: user.name, count: 1 }];
      }
      return { todayRanking: next.sort((a, b) => b.count - a.count) };
    });
  },

  reset: () => {
    set({ todayRanking: [], initialized: false });
    realtimeAttached = false;
  },
}));
