import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Palette for the analytical page (Détail avancé), built from the colors the rest of the app already
// uses: the accent blue of the primary actions, the emerald of "encaissé / paid", amber and red for
// attention, plus violet. Change the values here to re-theme every chart.
export const CHART = {
  primary: '#2563EB', // accent blue (same as the accent buttons) - main series
  secondary: '#10b981', // emerald - money collected
  // one color per category (assureurs, praticiens)
  series: ['#2563EB', '#7c3aed', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899'],
  // receivable age, oldest = most severe
  ramp: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
  grid: '#f1f5f9',
  axis: '#64748b',
  cursor: '#f8fafc',
} as const;

// Payment statuses keep their functional colors (the same ones as the status badges), because
// the meaning of a status (paid / partial / waiting / late) must read the same everywhere.
export const STATUT_CHART_COLORS: Record<string, string> = {
  payee: '#16a34a', // green-600 (success token)
  partielle: '#d97706', // amber-600
  en_attente: '#94a3b8', // slate-400
  en_retard: '#dc2626', // red-600
};

// Subtle entrance: 300-450 ms. Honors prefers-reduced-motion (no movement, no chart drawing).
export function useChartMotion() {
  const reduced = useReducedMotion();
  return {
    reduced: Boolean(reduced),
    // recharts draws the marks itself (bars grow from the baseline, the pie sweeps, the path draws)
    recharts: { isAnimationActive: !reduced, animationDuration: 450, animationEasing: 'ease-out' as const },
  };
}

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduced ? 0 : delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
