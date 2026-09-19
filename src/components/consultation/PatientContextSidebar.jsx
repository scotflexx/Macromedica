const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function ContextCard({ title, tone = 'neutral', onClick, children }) {
  const tones = {
    neutral: 'border-slate-200 bg-white hover:border-slate-300',
    alert: 'border-red-200 bg-red-50 hover:border-red-300',
  }
  return (
    <button type="button" onClick={onClick} title="Ouvrir le dossier patient"
      className={`block w-full rounded-lg border px-3.5 py-3 text-left transition-colors ${tones[tone]}`}>
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${tone === 'alert' ? 'text-red-700' : 'text-slate-400'}`}>{title}</p>
      {children}
    </button>
  )
}

const Empty = ({ children }) => <p className="text-[13px] text-slate-400">{children}</p>

// Read/reference only: never edits historical data. Clicking a card opens the
// existing patient dossier drawer without leaving the consultation.
export default function PatientContextSidebar({ patient, age, meds, medsState, lastVitals, vitalsState, onOpenContext, className = '' }) {
  const allergies = patient?.allergies?.trim()
  const allergiesKnown = Boolean(allergies) && allergies.toLowerCase() !== 'aucune'
  const antecedents = patient?.antecedents?.trim()
  const initials = `${patient?.prenom?.[0] || ''}${patient?.nom?.[0] || ''}`.toUpperCase()
  const genre = patient?.sexe === 'homme' ? 'Homme' : patient?.sexe === 'femme' ? 'Femme' : null

  return (
    <aside aria-label="Contexte patient" className={`space-y-2.5 overflow-y-auto bg-white p-4 ${className}`}>
      <div className="flex items-center gap-3 pb-1">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-[14px] font-bold text-white">{initials}</div>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-bold text-slate-900">{`${patient?.prenom || ''} ${patient?.nom || ''}`.trim()}</p>
          <p className="text-[12.5px] text-slate-500">{[age != null ? `${age} ans` : 'Âge non renseigné', genre].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <ContextCard title="Allergies" tone={allergiesKnown ? 'alert' : 'neutral'} onClick={() => onOpenContext?.('allergies')}>
        {allergiesKnown ? <p className="text-[13px] font-semibold text-red-800">{allergies}</p> : <Empty>Non renseignées</Empty>}
      </ContextCard>

      <ContextCard title="Antécédents" onClick={() => onOpenContext?.('antecedents')}>
        {antecedents ? <p className="line-clamp-3 text-[13px] text-slate-700">{antecedents}</p> : <Empty>Non renseignés</Empty>}
      </ContextCard>

      <ContextCard title="Traitements" onClick={() => onOpenContext?.('traitements')}>
        {medsState === 'loading' ? <Empty>Chargement…</Empty>
          : medsState === 'error' ? <Empty>Indisponible</Empty>
          : meds.length === 0 ? <Empty>Aucun traitement actif</Empty>
          : <ul className="space-y-0.5">{meds.slice(0, 4).map((m) => (
              <li key={m.id} className="truncate text-[13px] text-slate-700"><span className="font-semibold">{m.medication_name}</span>{m.dosage ? ` · ${m.dosage}` : ''}</li>
            ))}{meds.length > 4 && <li className="text-[12px] text-slate-400">+ {meds.length - 4} autre(s)</li>}</ul>}
      </ContextCard>

      <ContextCard title="Dernières constantes" onClick={() => onOpenContext?.('constantes')}>
        {vitalsState === 'loading' ? <Empty>Chargement…</Empty>
          : vitalsState === 'error' ? <Empty>Indisponible</Empty>
          : !lastVitals ? <Empty>Aucune mesure enregistrée</Empty>
          : <div className="space-y-0.5 text-[13px] text-slate-700">
              <p className="text-[12px] text-slate-400">{fmtDate(lastVitals.date_mesure)}</p>
              <p>{[
                lastVitals.blood_pressure && `TA ${lastVitals.blood_pressure}`,
                lastVitals.heart_rate != null && `FC ${lastVitals.heart_rate}`,
                lastVitals.temperature != null && `${lastVitals.temperature} °C`,
                lastVitals.spo2 != null && `SpO₂ ${lastVitals.spo2} %`,
                lastVitals.weight != null && `${lastVitals.weight} kg`,
              ].filter(Boolean).join(' · ')}</p>
            </div>}
      </ContextCard>
    </aside>
  )
}
