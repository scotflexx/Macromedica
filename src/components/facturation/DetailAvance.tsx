import React from 'react';
import { DetailKpis } from './DetailKpis';
import { ChartsGrid } from './ChartsGrid';

// "Détail avancé": analytical breakdowns (the operational overview stays on Aperçu).
export function DetailAvance() {
  return (
    <div className="space-y-6 pb-12">
      <DetailKpis />
      <ChartsGrid />
    </div>
  );
}
