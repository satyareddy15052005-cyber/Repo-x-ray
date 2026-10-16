import { create } from 'zustand';

interface ReanalyzeState {
  isOpen: boolean;
  projectId: string | null;
  projectName: string | null;
  sourceType: string | null;
  openReanalyze: (projectId: string, projectName?: string, sourceType?: string) => void;
  closeReanalyze: () => void;
}

export const useReanalyzeStore = create<ReanalyzeState>((set) => ({
  isOpen: false,
  projectId: null,
  projectName: null,
  sourceType: null,
  openReanalyze: (projectId: string, projectName?: string, sourceType?: string) =>
    set({
      isOpen: true,
      projectId,
      projectName: projectName || null,
      sourceType: sourceType || null,
    }),
  closeReanalyze: () =>
    set({
      isOpen: false,
      projectId: null,
      projectName: null,
      sourceType: null,
    }),
}));
