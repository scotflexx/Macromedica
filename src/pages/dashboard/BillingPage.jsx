
import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { Activity, CheckCircle, AlertTriangle, TrendingUp, BarChart3, ChevronRight, Plus, Printer, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { openPrintWindow } from '../../components/common/ReceiptPrint'
import { useAppContext } from '../../context/AppContext'
import { getBillingQueue, processVisitPayment } from '../../lib/visitService'
import { can } from '../../lib/rbac'
import { MOCK_VISITS, MOCK_PATIENTS } from '../../lib/mockData'

const fmtMAD = (n) => (n || 0).toLocaleString('fr-FR') + ' MAD'

const avatarColor = (str) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#7C3AED', '#EF4444', '#3B82F6', '#06B6D4', '#F97316']
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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Casablanca'
  })
}

const MOCK_BILLING_QUEUE = MOCK_VISITS
  .filter(v => v.status === 'billing' || v.status === 'completed')
  .map(v => {
    const patient = MOCK_PATIENTS.find(p => p.id === v.patient_id)
    return {
      id: `pay_${v.id}`,
      visit_id: v.id,
      consultation_id: `con_${v.id}`,
      patients: patient || v.patients,
      montant: v.billing_amount || 300,
      status: v.status === 'completed' ? 'paid' : 'pending',
      paymentMethod: v.billing_type === 'cash' ? 'especes' : (v.billing_type === 'insurance' ? 'assurance' : 'tpe'),
      created_at: v.updated_at || v.created_at,
      notes: v.motif || 'Consultation'
    }
  })

const MOCK_EVOLUTION_DATA = [
  { jour: 'Lun', value: 12000 },
  { jour: 'Mar', value: 18000 },
  { jour: 'Mer', value: 22000 },
  { jour: 'Jeu', value: 15000 },
  { jour: 'Ven', value: 28000 },
  { jour: 'Sam', value: 25000 },
  { jour: 'Dim', value: 20000 }
]

const MOCK_PAYMENT_MODES = [
  { name: 'Espèces', value: 40, color: '#2563eb' },
  { name: 'Assurance', value: 25, color: '#f97316' },
  { name: 'TPE', value: 20, color: '#3B82F6' },
  { name: 'Chèque', value: 15, color: '#6b7280' }
]

const MOCK_TRANSACTIONS = [
  { name: 'Karim Benali', amount: 350, status: 'success' },
  { name: 'Youssef Cherkaoui', amount: 400, status: 'pending' },
  { name: 'Nadia El Fassi', amount: 300, status: 'success' },
  { name: 'Hassan Moussaoui', amount: 500, status: 'failed' }
]

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']
const HEATMAP_DATA = Array.from({ length: 7 }, () =>
  Array.from({ length: 12 }, () => Math.floor(Math.random() * 4))
)

const CountUp = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let startTime
    let animationFrame
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * value))
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])
  return <>{count}</>
}

export default function BillingPage() {
  const navigate = useNavigate()
  const { cabinetId, notify, refreshVisits, refreshConsultations, canonicalRole, role } = useAppContext()
  const userRole = canonicalRole || role
  const canProcessPayments = can(userRole, 'payments:write')
  const [filter, setFilter] = useState('pending')
  const [processing, setProcessing] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState({})

  const { data: billingQueueRaw = [], refetch } = useQuery({
    queryKey: ['billing_queue', cabinetId],
    queryFn: () => cabinetId ? getBillingQueue(cabinetId) : [],
    enabled: Boolean(cabinetId)
  })

  useEffect(() => {
    const onPaymentsChanged = () => refetch()
    window.addEventListener('mm:payments-changed', onPaymentsChanged)
    return () => window.removeEventListener('mm:payments-changed', onPaymentsChanged)
  }, [refetch])

  const mappedConsultations = useMemo(() => {
    const queue = (billingQueueRaw && billingQueueRaw.length > 0)
      ? billingQueueRaw.map(payment => ({
        id: payment.id,
        visit_id: payment.visit_id,
        consultation_id: payment.consultation_id,
        patients: payment.visits?.patients,
        montant: Number(payment.amount || payment.consultations?.billing_amount || 0),
        status: payment.status,
        paymentMethod: payment.method,
        created_at: payment.created_at,
        notes: payment.consultations?.notes || ''
      }))
      : MOCK_BILLING_QUEUE
    return queue
  }, [billingQueueRaw])

  const todayStr = useMemo(() =>
    new Date().toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' }),
  [])

  const todaysConsultations = useMemo(() =>
    mappedConsultations.filter(c => {
      const dateStr = (c.created_at || '').split('T')[0]
      return dateStr === todayStr
    }),
  [mappedConsultations, todayStr])

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
    pendingAmount: todaysConsultations.filter(c => c.status === 'pending').reduce((acc, c) => acc + Number(c.montant), 0)
  }), [todaysConsultations])

  const processPayment = async (consultation) => {
    setProcessing(true)
    const method = paymentMethods[consultation.visit_id] || 'cash'
    try {
      await processVisitPayment(consultation.visit_id, method, consultation.montant)
      await Promise.all([refreshVisits?.(), refreshConsultations?.()])
      notify({ title: 'Paiement valide', description: 'Le dossier a été encaissé avec succès.', variant: 'success' })
      refetch()
    } catch (e) {
      notify({ title: 'Erreur', description: e.message || 'Échec de l\'encaissement.', variant: 'error' })
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
          content: `<table><thead><tr><th>Désignation</th><th>Montant</th></tr></thead><tbody><tr><td>Consultation Médicale</td><td>${consultation.montant} MAD</td></tr></tbody></table>`
        },
        {
          title: 'Total',
          content: `<p><strong>${consultation.montant} MAD</strong></p><p>${consultation.notes || ''}</p>`
        }
      ]
    })
  }

  const renderAssuranceBadge = (assurance) => {
    let bg = 'bg-gray-50'
    let text = 'text-gray-600'
    const cleanAssurance = (assurance || '').toUpperCase()
    if (cleanAssurance.includes('CNSS')) {
      bg = 'bg-blue-50'
      text = 'text-blue-700'
    } else if (cleanAssurance.includes('CNOPS')) {
      bg = 'bg-purple-50'
      text = 'text-purple-700'
    } else if (cleanAssurance.includes('PRIV') || cleanAssurance.includes('PRIVEE')) {
      bg = 'bg-blue-50'
      text = 'text-blue-700'
    } else if (cleanAssurance.includes('MUTUELLE')) {
      bg = 'bg-emerald-50'
      text = 'text-emerald-700'
    }
    return <span className={`${bg} ${text} text-xs font-medium px-2 py-0.5 rounded-full`}>{assurance || 'Aucune'}</span>
  }

  const renderPaymentMethod = (method) => {
    if (!method) return <span className="text-gray-500 text-sm">—</span>
    let bg, color, label = method
    if (method === 'cash' || method === 'especes') {
      bg = 'bg-green-50'
      color = 'text-green-700'
      label = 'Espèces'
    } else if (method === 'card' || method === 'tpe') {
      bg = 'bg-blue-50'
      color = 'text-blue-700'
      label = 'TPE'
    } else if (method === 'transfer') {
      bg = 'bg-gray-50'
      color = 'text-gray-700'
      label = 'Virement'
    } else if (method === 'cheque') {
      bg = 'bg-amber-50'
      color = 'text-amber-700'
      label = 'Chèque'
    } else if (method === 'assurance') {
      bg = 'bg-purple-50'
      color = 'text-purple-700'
      label = 'Assurance'
    }
    return <span className={`${bg} ${color} text-xs font-semibold px-2.5 py-1 rounded-full`}>{label}</span>
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Encaissements</h1>
            <p className="text-gray-500 font-medium mt-1">Validez et facturez les consultations terminées</p>
          </div>
          <button className="h-11 px-5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2">
            <Plus size={16} />
            Nouvelle facture
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Chiffre d\'affaires total', value: 1284500, icon: BarChart3, color: 'blue', trend: '+2.4%', trendColor: 'green' },
            { title: 'Consultations aujourd\'hui', value: totals.total, icon: Activity, color: 'blue' },
            { title: 'Factures en attente', value: totals.pending, icon: AlertTriangle, color: 'amber', trend: 'CRITIQUE', trendColor: 'red' },
            { title: 'Revenu mensuel projeté', value: 450000, icon: TrendingUp, color: 'indigo' }
          ].map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden"
            >
              {card.trend && (
                <span className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-xs font-semibold ${card.trendColor === 'green' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {card.trend}
                </span>
              )}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                card.color === 'teal' ? 'bg-blue-50 text-blue-600' :
                card.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <card.icon size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                <CountUp value={card.value} />
                {card.title.includes('Consultations') ? '' : <span className="text-sm font-medium text-gray-500 ml-1">MAD</span>}
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1">{card.title}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Évolution des encaissements</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">Réel</button>
                <button className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-100">Prévisions</button>
              </div>
            </div>
            <AreaChart
              width={600}
              height={250}
              data={MOCK_EVOLUTION_DATA}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="jour" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', color: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                itemStyle={{ color: 'white', fontWeight: 500 }}
                formatter={(v) => [`${v} MAD`]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#colorValue)"
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </AreaChart>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Transactions récentes</h3>
            <div className="space-y-4">
              {MOCK_TRANSACTIONS.map((t, i) => (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  key={i}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: avatarColor(t.name) }}>
                      {t.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-sm">{fmtMAD(t.amount)}</span>
                    {t.status === 'success' ? (
                      <span className="bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Réussi</span>
                    ) : t.status === 'pending' ? (
                      <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">En attente</span>
                    ) : (
                      <span className="bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">Échoué</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            <button className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Voir tout l'historique
              <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Répartition par mode de paiement</h3>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48 relative">
                <PieChart width={192} height={192}>
                  <Pie
                    data={MOCK_PAYMENT_MODES}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1000}
                    animationEasing="ease-out"
                    animationBegin={200}
                  >
                    {MOCK_PAYMENT_MODES.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">100%</span>
                </div>
              </div>
              <div className="space-y-3">
                {MOCK_PAYMENT_MODES.map((mode, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: mode.color }} />
                    <span className="text-sm font-medium text-gray-600">{mode.name}</span>
                    <span className="text-sm font-bold text-gray-900 ml-auto">{mode.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pics d'activité - Heures</h3>
            <div className="space-y-1">
              {DAYS.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center">
                  <div className="text-xs text-gray-500 w-8">{d}</div>
                  {HOURS.map((_, j) => {
                    const intensity = HEATMAP_DATA[i][j]
                    let bg = 'bg-blue-100'
                    if (intensity === 1) bg = 'bg-blue-300'
                    if (intensity === 2) bg = 'bg-blue-500'
                    if (intensity === 3) bg = 'bg-blue-700'
                    return (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (i + j) * 0.01, duration: 0.8 }}
                        key={j}
                        className={`w-full aspect-square rounded-sm ${bg}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Dossiers cliniques</h3>
              <p className="text-sm text-gray-500 font-medium">Historique et paiements en attente</p>
            </div>
            <div className="bg-gray-100 rounded-full p-1 flex">
              {['pending', 'today', 'all'].map((f) => {
                const active = filter === f
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? 'bg-slate-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {f === 'pending' ? 'En attente' : f === 'today' ? "Aujourd'hui" : 'Tout'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Patient', 'Date', 'Montant', 'Mode', 'Statut', 'Actions'].map((c, i) => (
                    <th key={i} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 text-left">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredConsultations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-4xl mb-4">🧾</div>
                      <div className="text-base font-bold text-slate-900 mb-1">Aucun encaissement</div>
                      <div className="text-sm text-gray-500">Les consultations terminées apparaîtront ici</div>
                    </td>
                  </tr>
                ) : (
                  filteredConsultations.map((c, idx) => {
                    const patientName = c.patients ? `${c.patients.prenom} ${c.patients.nom}` : 'Patient Inconnu'
                    const initial = patientName.charAt(0).toUpperCase()
                    return (
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                        key={c.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: avatarColor(patientName) }}>
                              {initial}
                            </div>
                            <div className="flex flex-col items-start gap-1">
                              <div className="text-sm font-semibold text-gray-900">{patientName}</div>
                              {renderAssuranceBadge(c.patients?.assurance || c.patients?.mutuelle)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(c.created_at)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{fmtMAD(c.montant)}</td>
                        <td className="px-6 py-4">
                          {c.status === 'pending' && canProcessPayments ? (
                            <select
                              value={paymentMethods[c.visit_id] || 'cash'}
                              onChange={(e) => setPaymentMethods({ ...paymentMethods, [c.visit_id]: e.target.value })}
                              className="h-10 px-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                            >
                              <option value="cash">Espèces</option>
                              <option value="card">TPE</option>
                              <option value="transfer">Virement</option>
                              <option value="insurance">Assurance</option>
                              <option value="cheque">Chèque</option>
                            </select>
                          ) : renderPaymentMethod(c.paymentMethod)}
                        </td>
                        <td className="px-6 py-4">
                          {c.status === 'paid' ? (
                            <span className="bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle size={12} />
                              Payée
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Clock size={12} />
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {c.status === 'pending' && canProcessPayments ? (
                              <>
                                <button type="button" onClick={() => processPayment(c)} disabled={processing} className="h-8 px-3 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-70 transition-opacity">
                                  Encaisser
                                </button>
                                <button type="button" onClick={() => processPayment(c)} disabled={processing} className="h-8 px-3 bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold hover:bg-gray-300 disabled:opacity-70 transition-opacity">
                                  Marquer payé
                                </button>
                              </>
                            ) : null}
                            <button type="button" onClick={() => printInvoice(c)} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
