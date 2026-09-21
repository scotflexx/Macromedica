import React from 'react';
import { KpiCards } from './KpiCards';
import { TopListes } from './TopListes';

// Operational overview: the four figures to watch, then the latest invoices.
export function Overview() {
  return (
    <div className="space-y-6 pb-12">
      <KpiCards />
      <TopListes />
    </div>
  );
}
