import { create } from 'zustand';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { useAppStore } from './useAppStore';

export interface PendingLead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  value: number;
  notes: string;
  importedBy?: string;
  createdAt: string;
}

interface ImportState {
  pending: PendingLead[];
  initialized: boolean;
  initialize: () => Promise<void>;
  addPending: (leads: Omit<PendingLead, 'id' | 'createdAt' | 'importedBy'>[]) => Promise<void>;
  removePending: (id: string) => Promise<void>;
  clearPending: () => Promise<void>;
  reset: () => void;
}

function mapRow(row: Record<string, unknown>): PendingLead {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    company: String(row.company ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    value: Number(row.value ?? 0),
    notes: String(row.notes ?? ''),
    importedBy: row.imported_by ? String(row.imported_by) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

let initPromise: Promise<void> | null = null;
let realtimeAttached = false;

export const useImportStore = create<ImportState>((set, get) => ({
  pending: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({ initialized: true });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      const supabase = assertSupabase();

      const { data, error } = await supabase
        .from('pending_leads')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        set({ pending: data.map(mapRow), initialized: true });
      } else {
        set({ initialized: true });
      }

      if (!realtimeAttached) {
        supabase
          .channel('crm-pending-leads')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_leads' }, async () => {
            const { data: fresh } = await supabase
              .from('pending_leads')
              .select('*')
              .order('created_at', { ascending: true });
            if (fresh) set({ pending: fresh.map(mapRow) });
          })
          .subscribe();
        realtimeAttached = true;
      }
    })().finally(() => { initPromise = null; });

    return initPromise;
  },

  addPending: async (leads) => {
    if (!supabaseEnabled) return;

    const currentUser = useAppStore.getState().user;
    const rows = leads.map((l) => ({
      name: l.name,
      company: l.company,
      phone: l.phone,
      email: l.email,
      value: l.value,
      notes: l.notes,
      imported_by: currentUser?.id ?? null,
    }));

    const { data, error } = await assertSupabase()
      .from('pending_leads')
      .insert(rows)
      .select('*');

    if (!error && data) {
      set((state) => ({ pending: [...state.pending, ...data.map(mapRow)] }));
    }
  },

  removePending: async (id) => {
    if (!supabaseEnabled) return;

    const { error } = await assertSupabase()
      .from('pending_leads')
      .delete()
      .eq('id', id);

    if (!error) {
      set((state) => ({ pending: state.pending.filter((l) => l.id !== id) }));
    }
  },

  clearPending: async () => {
    if (!supabaseEnabled) return;

    const { error } = await assertSupabase()
      .from('pending_leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    if (!error) {
      set({ pending: [] });
    }
  },

  reset: () => {
    set({ pending: [], initialized: false });
    realtimeAttached = false;
  },
}));
