import { create } from 'zustand';
import type { Project } from '../types';
import { assertSupabase, supabaseEnabled } from '../lib/supabase';
import { mapProject, projectToRow } from '../lib/supabaseMappers';
import { useAppStore } from './useAppStore';

interface ProjectsState {
  projects: Project[];
  initialized: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<string>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  reset: () => void;
}

let initPromise: Promise<void> | null = null;
let realtimeAttached = false;

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  initialized: false,
  loading: false,

  initialize: async () => {
    if (get().initialized) return;
    if (!supabaseEnabled) {
      set({ projects: [], initialized: true, loading: false });
      return;
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      set({ loading: true });
      await get().fetchProjects();

      if (!realtimeAttached) {
        assertSupabase()
          .channel('crm-projects')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'projects' },
            () => void get().fetchProjects()
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

  fetchProjects: async () => {
    if (!supabaseEnabled) {
      set({ projects: [] });
      return;
    }

    const { data, error } = await assertSupabase()
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    set({ projects: data.map((row) => mapProject(row)) });
  },

  addProject: async (project) => {
    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const currentUser = useAppStore.getState().user;
    const payload = {
      ...projectToRow(project),
      created_by: currentUser?.id ?? null,
    };

    delete (payload as { id?: string }).id;

    const { data, error } = await assertSupabase()
      .from('projects')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    const mapped = mapProject(data);
    set((state) => ({ projects: [mapped, ...state.projects] }));
    return mapped.id;
  },

  updateProject: async (id, updates) => {
    const current = get().projects.find((project) => project.id === id);
    if (!current) return;

    const merged: Project = {
      ...current,
      ...updates,
      team: updates.team ?? current.team,
      tasks: updates.tasks ?? current.tasks,
      briefingQuestions: updates.briefingQuestions ?? current.briefingQuestions,
      credentials: updates.credentials ?? current.credentials,
      files: updates.files ?? current.files,
      comments: updates.comments ?? current.comments,
    };

    if (!supabaseEnabled) {
      throw new Error('Supabase nao configurado.');
    }

    const payload = projectToRow(merged);
    delete (payload as { id?: string }).id;

    const { error } = await assertSupabase().from('projects').update(payload).eq('id', id);
    if (error) throw error;

    set((state) => ({
      projects: state.projects.map((project) => (project.id === id ? merged : project)),
    }));
  },

  reset: () => {
    set({
      projects: [],
      initialized: false,
      loading: false,
    });
  },
}));
