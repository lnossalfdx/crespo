import { create } from 'zustand';
import type { Transaction } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { mapTransaction, transactionToRow } from '../lib/supabaseMappers';
import { useAppStore } from './useAppStore';

interface FinanceState {
  transactions: Transaction[];
  initialized: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTotalEntradas: () => number;
  getTotalSaidas: () => number;
  getLucroLiquido: () => number;
  reset: () => void;
}

let initPromise: Promise<void> | null = null;
let realtimeAttached = false;

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({ transactions: [], initialized: true, loading: false });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ loading: true });
      await get().fetchTransactions();

      if (!realtimeAttached) {
        assertSupabase()
          .channel('crm-transactions')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'transactions' },
            () => void get().fetchTransactions()
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

  fetchTransactions: async () => {
    if (!supabaseEnabled) {
      set({ transactions: [] });
      return;
    }

    const { data, error } = await assertSupabase()
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    set({ transactions: data.map((row) => mapTransaction(row)) });
  },

  addTransaction: async (transaction) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const currentUser = useAppStore.getState().user;
    const payload = {
      ...transactionToRow(transaction),
      created_by: currentUser?.id ?? null,
    };

    delete (payload as { id?: string }).id;

    const { data, error } = await assertSupabase()
      .from('transactions')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    set((state) => ({ transactions: [mapTransaction(data), ...state.transactions] }));
  },

  updateTransaction: async (id, updates) => {
    const current = get().transactions.find((tx) => tx.id === id);
    if (!current) return;

    const merged: Transaction = {
      ...current,
      ...updates,
    };

    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const payload = transactionToRow(merged);
    delete (payload as { id?: string }).id;

    const { error } = await assertSupabase().from('transactions').update(payload).eq('id', id);
    if (error) throw error;

    set((state) => ({
      transactions: state.transactions.map((tx) => (tx.id === id ? merged : tx)),
    }));
  },

  deleteTransaction: async (id) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const { error } = await assertSupabase().from('transactions').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.id !== id),
    }));
  },

  getTotalEntradas: () => {
    return get().transactions
      .filter((tx) => tx.type === 'entrada')
      .reduce((sum, tx) => sum + tx.value, 0);
  },

  getTotalSaidas: () => {
    return get().transactions
      .filter((tx) => tx.type === 'saida')
      .reduce((sum, tx) => sum + tx.value, 0);
  },

  getLucroLiquido: () => {
    return get().getTotalEntradas() - get().getTotalSaidas();
  },

  reset: () => {
    set({
      transactions: [],
      initialized: false,
      loading: false,
    });
  },
}));
