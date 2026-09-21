import { create } from 'zustand';

// UI state only (filters, open panels, toast). Billing data comes from react-query (queries.ts).

export interface FilterState {
  recherche: string;
  periode: '1d' | '7d' | '1m' | '3m' | '6m' | '12m' | 'all';
  praticienId: string;
  assureurId: string;
  statut: string;
}

export interface UIState {
  tab: 'apercu' | 'factures' | 'paiements' | 'debiteurs' | 'avance';
  factureOuverteId: string | null;
  recuPaiementId: string | null; // references a paiement.id
  toast: { message: string; type: 'success' | 'error' } | null;
}

interface FacturationStore {
  filters: FilterState;
  ui: UIState;
  toastTimeout: ReturnType<typeof setTimeout> | null;

  setFilter: (key: keyof FilterState, value: string) => void;
  setTab: (tab: UIState['tab']) => void;
  setFactureOuverteId: (id: string | null) => void;
  setRecuPaiementId: (id: string | null) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  hideToast: () => void;
}

export const useFacturationStore = create<FacturationStore>((set, get) => ({
  filters: {
    recherche: '',
    periode: '6m',
    praticienId: '',
    assureurId: '',
    statut: '',
  },
  ui: {
    tab: 'apercu',
    factureOuverteId: null,
    recuPaiementId: null,
    toast: null,
  },
  toastTimeout: null,

  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),

  setTab: (tab) => set((state) => ({ ui: { ...state.ui, tab } })),
  setFactureOuverteId: (id) => set((state) => ({ ui: { ...state.ui, factureOuverteId: id } })),
  setRecuPaiementId: (id) => set((state) => ({ ui: { ...state.ui, recuPaiementId: id } })),

  showToast: (message, type = 'success') => {
    const currentTimeout = get().toastTimeout;
    if (currentTimeout) clearTimeout(currentTimeout);

    const timeout = setTimeout(() => {
      set((state) => ({ ui: { ...state.ui, toast: null }, toastTimeout: null }));
    }, 3000);

    set((state) => ({
      ui: { ...state.ui, toast: { message, type } },
      toastTimeout: timeout
    }));
  },

  hideToast: () => {
    const currentTimeout = get().toastTimeout;
    if (currentTimeout) clearTimeout(currentTimeout);
    set((state) => ({ ui: { ...state.ui, toast: null }, toastTimeout: null }));
  }
}));
