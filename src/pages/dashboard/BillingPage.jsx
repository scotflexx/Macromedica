import { useMemo, useState } from 'react'
import { Activity, CheckCircle, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Modal from '../../components/common/Modal'
import { openPrintWindow } from '../../components/common/ReceiptPrint'
import { getConsultations } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAppContext } from '../../context/AppContext'
import { RDV_STATUSES } from '../../lib/workflow'

// Helpers
const fmtMAD = (n) => (n || 0).toLocaleString('fr-FR') + ' MAD'

const avatarColor = (str) => {
  const colors = ['#0D9488','#10B981','#F59E0B','#7C3AED','#EF4444','#0D9488','#06B6D4','#F97316']
  let h = 0
  for (let i = 0; i < (str || '').length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % colors.length
  }
  return colors[h]
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'Africa/Casablanca'
  }) + ' à ' + d.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Africa/Casablanca'
  })
}

const TODAY = new Date().toISOString().slice(0, 10)

const MOCK_PATIENTS = [
  { id:'p1', prenom:'Fatima Zahra', nom:'Benali', assurance:'CNSS', telephone:'0661234567' },
  { id:'p2', prenom:'Mohammed', nom:'Tazi', assurance:'CNSS', telephone:'0662345678' },
  { id:'p3', prenom:'Nadia', nom:'Chraibi', assurance:'CNOPS', telephone:'0663456789' },
  { id:'p4', prenom:'Hassan', nom:'Benkiran', assurance:'Aucune', telephone:'0664567890' },
  { id:'p5', prenom:'Samira', nom:'Naciri', assurance:'CNSS', telephone:'0665678901' },
  { id:'p6', prenom:'Omar', nom:'Skalli', assurance:'Mutuelle', telephone:'0666789012' },
]

const MOCK_INVOICES = [
  { id:'inv1', montant: 200, status: 'paid', paymentMethod: 'especes', created_at: new Date().toISOString(), patients: MOCK_PATIENTS[0] },
  { id:'inv2', montant: 350, status: 'paid', paymentMethod: 'tpe', created_at: new Date().toISOString(), patients: MOCK_PATIENTS[1] },
  { id:'inv3', montant: 450, status: 'pending', created_at: new Date().toISOString(), patients: MOCK_PATIENTS[2] },
  { id:'inv4', montant: 300, status: 'pending', created_at: new Date().toISOString(), patients: MOCK_PATIENTS[3] },
  { id:'inv5', montant: 200, status: 'pending', paymentMethod: 'cheque', created_at: new Date().toISOString(), patients: MOCK_PATIENTS[4] },
  { id:'inv6', montant: 150, status: 'paid', paymentMethod: 'especes', created_at: new Date().toISOString(), patients: MOCK_PATIENTS[5] },
]

export default function BillingPage() {
  const navigate = useNavigate()
  const { notify } = useAppContext()
  const [filter, setFilter] = useState('pending')
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [processing, setProcessing] = useState(false)

  const { data: dbConsultations = [], isLoading, refetch } = useQuery({
    queryKey: ['billing_consultations'],
    queryFn: getConsultations,
  })

  const mappedConsultationsOriginal = useMemo(() => {
    return dbConsultations.map(c => ({
      ...c,
      status: c.statut === 'paye' ? 'paid' : c.statut === 'credit' ? 'pending' : 'cancelled',
      paymentMethod: null // Add if your DB has this
    }))
  }, [dbConsultations])

  // Fallback to MOCK_INVOICES if no live data
  const mappedConsultations = mappedConsultationsOriginal.length > 0 ? mappedConsultationsOriginal : MOCK_INVOICES

  const todayStr = useMemo(() => new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' }), [])

  const todaysConsultations = useMemo(() => {
    return mappedConsultations.filter(c => {
      const dateStr = (c.date_consult || c.created_at || '').split('T')[0]
      return dateStr === todayStr
    })
  }, [mappedConsultations, todayStr])

  const filteredConsultations = useMemo(() => {
    if (filter === 'today') return todaysConsultations
    if (filter === 'pending') return mappedConsultations.filter(c => c.status === 'pending')
    return mappedConsultations
  }, [mappedConsultations, todaysConsultations, filter])

  const totals = useMemo(() => ({
    total: todaysConsultations.length,
    paid: todaysConsultations.filter(c => c.status === 'paid').length,
    paidAmount: todaysConsultations.filter(c => c.status === 'paid').reduce((acc, c) => acc + Number(c.montant), 0),
    pending: todaysConsultations.filter(c => c.status === 'pending').length,
    pendingAmount: todaysConsultations.filter(c => c.status === 'pending').reduce((acc, c) => acc + Number(c.montant), 0),
  }), [todaysConsultations])

  const processPayment = async (consultation) => {
    if (consultation.id.startsWith('inv')) {
       notify({ title: 'Alerte', description: 'Action impossible sur les fausses données (Mock).', variant: 'warning' })
       return
    }
    setProcessing(true)
    try {
      const { error: consultError } = await supabase
        .from('consultations')
        .update({ statut: 'paye' })
        .eq('id', consultation.id)
      if (consultError) throw consultError
      
      if (consultation.rdv_id) {
         await supabase.from('rdv').update({ status: RDV_STATUSES.PAID }).eq('id', consultation.rdv_id)
      }

      notify({ title: 'Paiement Valide', description: 'Le dossier a été encaissé avec succès.', variant: 'success'})
      refetch()
    } catch (e) {
      notify({ title: 'Erreur', description: 'Échec de l\'encaissement.', variant: 'error'})
    } finally {
      setProcessing(false)
    }
  }

  const printInvoice = (consultation) => {
    openPrintWindow({
      title: `Honoraires de Consultation`,
      subtitle: `${consultation.patients?.prenom} ${consultation.patients?.nom} • ${formatDateTime(consultation.created_at)}`,
      sections: [
        {
          title: 'Actes Médicaux',
          content: `<table><thead><tr><th>Désignation</th><th>Montant</th></tr></thead><tbody><tr><td>Consultation Médicale</td><td>${consultation.montant} MAD</td></tr></tbody></table>`,
        },
        { title: 'Total', content: `<p><strong>${consultation.montant} MAD</strong></p><p>${consultation.notes || ''}</p>` },
      ],
    })
  }

  // Insurance Badge Rendering
  const renderAssuranceBadge = (assurance) => {
    let bg = '#F8FAFC', color = '#6B7280'
    const cleanAssurance = (assurance || '').toUpperCase()
    if (cleanAssurance.includes('CNSS')) { bg = '#EFF6FF'; color = '#1D4ED8' }
    else if (cleanAssurance.includes('CNOPS')) { bg = '#F5F3FF'; color = '#7C3AED' }
    else if (cleanAssurance.includes('PRIV') || cleanAssurance.includes('PRIVEE')) { bg = '#ECFDF5'; color = '#065F46' }
    else if (cleanAssurance.includes('MUTUELLE')) { bg = '#F0FDF4'; color = '#166534' }
    
    return (
      <span style={{ background: bg, color: color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
        {assurance || 'Aucune'}
      </span>
    )
  }

  const renderPaymentMethod = (method) => {
     if (!method) return <span style={{ color: '#9CA3AF' }}>—</span>
     let bg = '#F1F5F9', color = '#475569', label = method
     if (method === 'especes') { bg = '#ECFDF5'; color = '#065F46'; label = 'Espèces' }
     if (method === 'tpe') { bg = '#EFF6FF'; color = '#1D4ED8'; label = 'TPE' }
     if (method === 'cheque') { bg = '#FFFBEB'; color = '#92400E'; label = 'Chèque' }
     if (method === 'assurance') { bg = '#F5F3FF'; color = '#7C3AED'; label = 'Assurance' }
     return (
       <span style={{ background: bg, color: color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8 }}>
         {label}
       </span>
     )
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      boxSizing: 'border-box',
      background: '#F0F2F5',
      minHeight: '100vh',
      padding: '24px 28px'
    }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, marginBottom: 4 }}>
            Encaissements
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Validez et facturez les consultations terminées
          </p>
        </div>
        <button type="button" style={{ background: '#0F172A', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          + Nouvelle facture
        </button>
      </div>

      {/* KPI CARDS aligned with AdminDashboard styling (New pristine layout) */}
      <section className="grid gap-4 md:grid-cols-3 mb-6">
        
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
              <Activity className="text-teal-600 w-5 h-5" strokeWidth={2} />
            </div>
            <span className="bg-teal-50 text-teal-600 text-xs font-bold px-3 py-1 rounded-full">Aujourd'hui</span>
          </div>
          <div>
            <p className="text-[13px] text-gray-500 font-medium mb-1">Consultations</p>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">{totals.total}</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="text-emerald-500 w-5 h-5" strokeWidth={2} />
            </div>
            <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full">Encaissé</span>
          </div>
          <div>
            <p className="text-[13px] text-gray-500 font-medium mb-1">Payées ({fmtMAD(totals.paidAmount)})</p>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">{totals.paid}</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Wallet className="text-amber-500 w-5 h-5" strokeWidth={2} />
            </div>
            <span className="bg-amber-50 text-amber-600 text-xs font-bold px-3 py-1 rounded-full">À recouvrer</span>
          </div>
          <div>
            <p className="text-[13px] text-gray-500 font-medium mb-1">En attente ({fmtMAD(totals.pendingAmount)})</p>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">{totals.pending}</p>
          </div>
        </div>

      </section>

      {/* TABLE CARD */}
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #E5E7EB', overflow: 'hidden' }}>
        {/* Table Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #F3F4F6' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Dossiers cliniques</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Historique et paiements en attente</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[ {id: 'pending', label: 'En attente'}, {id: 'today', label: "Aujourd'hui"}, {id: 'all', label: 'Tout'} ].map((item) => {
              const active = filter === item.id;
              return (
                <button 
                  key={item.id} 
                  type="button" 
                  onClick={() => setFilter(item.id)} 
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: active ? '#0F172A' : '#F1F5F9', color: active ? 'white' : '#6B7280'
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        {filteredConsultations.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Aucun encaissement</div>
            <div style={{ fontSize: 13 }}>Les consultations terminées apparaîtront ici</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '0.5px solid #F3F4F6' }}>
                {['Patient', 'Date', 'Montant', 'Mode', 'Statut', 'Actions'].map((c, i) => (
                  <th key={i} style={{ padding: '10px 18px', fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 5 ? 'right' : 'left', whiteSpace: 'nowrap' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredConsultations.map((c) => {
                const patientName = c.patients ? `${c.patients.prenom} ${c.patients.nom}` : 'Patient Inconnu'
                const initial = patientName.charAt(0).toUpperCase()
                
                return (
                  <tr key={c.id} style={{ borderBottom: '0.5px solid #F9FAFB', background: 'white' }} 
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(patientName), color: 'white', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                            {patientName}
                          </div>
                          {renderAssuranceBadge(c.patients?.assurance || c.patients?.mutuelle)}
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', fontSize: 12, color: '#6B7280' }}>
                      {formatDateTime(c.created_at)}
                    </td>
                    
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                      {fmtMAD(c.montant)}
                    </td>
                    
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      {renderPaymentMethod(c.paymentMethod)}
                    </td>
                    
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      {c.status === 'paid' ? (
                        <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: '1px solid #BBF7D0', display: 'inline-block' }}>
                          ✓ Payée
                        </span>
                      ) : (
                        <span style={{ background: '#FFFBEB', color: '#92400E', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: '1px solid #FDE68A', display: 'inline-block' }}>
                          ⏳ En attente
                        </span>
                      )}
                    </td>
                    
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                        {c.status === 'pending' && (
                          <>
                            <button type="button" onClick={() => processPayment(c)} disabled={processing} style={{ background: '#0D9488', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: processing ? 0.5 : 1 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                              Encaisser
                            </button>
                            <button type="button" onClick={() => processPayment(c)} disabled={processing} style={{ background: '#0F172A', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: processing ? 0.5 : 1 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                              Marquer payé
                            </button>
                          </>
                        )}
                        <button type="button" onClick={() => printInvoice(c)} style={{ background: '#F8FAFC', border: '0.5px solid #E5E7EB', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
