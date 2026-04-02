// C:/Users/MonPc/Downloads/MMFR/src/pages/dashboards/AdminDashboard.tsx
import { User, Wallet, Activity, TrendingUp, Coins } from 'lucide-react'

type AppointmentStatus = 'scheduled' | 'done' | 'waiting' | 'cancelled'

const stats = [
  {
    label: "Patients aujourd'hui",
    value: '12',
    suffix: '',
    icon: User,
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50/50',
    badgeText: '+12%',
    badgeColor: 'text-teal-700 bg-teal-50/80',
  },
  {
    label: "CA aujourd'hui",
    value: '3,450',
    suffix: 'MAD',
    icon: Coins,
    iconColor: 'text-slate-500',
    iconBg: 'bg-slate-50',
    badgeText: 'Stable',
    badgeColor: 'text-slate-500 bg-slate-50/80 font-medium',
  },
  {
    label: 'Crédits en attente',
    value: '1,050',
    suffix: 'MAD',
    icon: Wallet,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50/50',
    badgeText: 'Action requise',
    badgeColor: 'text-rose-600 bg-rose-50/80',
  },
  {
    label: 'Consultations totales',
    value: '156',
    suffix: 'Ce mois',
    icon: Activity,
    iconColor: 'text-slate-500',
    iconBg: 'bg-slate-50/50',
    badgeText: '',
    badgeColor: '',
  },
]

const appointments: Array<{
  time: string
  name: string
  doctor: string
  status: AppointmentStatus
}> = [
  { time: '08:30', name: 'Hajar Ait El Cadi', doctor: 'Dr Idrissi', status: 'scheduled' },
  { time: '09:00', name: 'Mehdi Benali', doctor: 'Dr Chraibi', status: 'done' },
  { time: '09:20', name: 'Soukaina Tazi', doctor: 'Dr Idrissi', status: 'waiting' },
  { time: '10:10', name: 'Yassine Amine', doctor: 'Dr Belkadi', status: 'cancelled' },
  { time: '10:45', name: 'Kenza Naciri', doctor: 'Dr Idrissi', status: 'scheduled' },
]

const monthlyActivity = [
  { month: 'JAN', height: '40%', opacity: 'opacity-15' },
  { month: 'FEB', height: '60%', opacity: 'opacity-25' },
  { month: 'MAR', height: '50%', opacity: 'opacity-40' },
  { month: 'APR', height: '75%', opacity: 'opacity-60' },
  { month: 'MAY', height: '95%', opacity: 'opacity-80' },
  { month: 'JUN', height: '70%', opacity: 'opacity-100' },
]

const invoices = [
  { patient: 'Rachid Lamrani', amount: '1 200 MAD', due: 'Depuis 5 jours' },
  { patient: 'Salma El Fassi', amount: '800 MAD', due: 'Depuis 3 jours' },
  { patient: 'Imane Chami', amount: '450 MAD', due: 'Depuis 2 jours' },
]

const staffPresence = [
  { name: 'Dr Idrissi', role: 'Medecin', state: 'Present' },
  { name: 'Dr Chraibi', role: 'Medecin', state: 'En consultation' },
  { name: 'Nadia Bennani', role: 'Secretaire', state: 'Accueil' },
  { name: 'Youssef Amrani', role: 'Assistant', state: 'Pre-triage' },
  { name: 'Samira Alaoui', role: 'Facturation', state: 'Present' },
  { name: 'Kamal Nouri', role: 'Support', state: 'Pause' },
]

const statusClasses: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  done: 'bg-emerald-50 text-emerald-700',
  waiting: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-rose-50 text-rose-700',
}

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Planifie',
  done: 'Termine',
  waiting: 'En attente',
  cancelled: 'Annule',
}

// Removed barHeights since we are using inline styles for dynamic heights.

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="text-red-500 text-xl font-bold p-4 bg-red-50 rounded-lg">
        NEW DASHBOARD VERSION
      </div>

      {/* KPI CARDS aligned with AdminDashboard styling (New pristine layout) */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <User className="text-blue-500 w-5 h-5" strokeWidth={2} />
            </div>
            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full">+12%</span>
          </div>
          <div>
            <p className="text-[13px] text-gray-500 font-medium mb-1">Patients aujourd'hui</p>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">12</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <Coins className="text-gray-500 w-5 h-5" strokeWidth={2} />
            </div>
            <span className="bg-gray-50 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">Stable</span>
          </div>
          <div>
            <p className="text-[13px] text-gray-500 font-medium mb-1">CA aujourd'hui</p>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">3,450 MAD</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Wallet className="text-red-500 w-5 h-5" strokeWidth={2} />
            </div>
            <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full">Action requise</span>
          </div>
          <div>
            <p className="text-[13px] text-gray-500 font-medium mb-1">Crédits en attente</p>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">1,050 MAD</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Activity className="text-purple-500 w-5 h-5" strokeWidth={2} />
            </div>
            <span className="bg-purple-50 text-purple-600 text-xs font-bold px-3 py-1 rounded-full">Ce mois</span>
          </div>
          <div>
            <p className="text-[13px] text-gray-500 font-medium mb-1">Consultations totales</p>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">156</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Rendez-vous du jour</h2>
                <p className="text-base text-slate-500">Suivi centralise des consultations et des statuts</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                36 rendez-vous
              </span>
            </div>
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={`${appointment.time}-${appointment.name}`}
                  className="grid gap-3 rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4 md:grid-cols-[90px_1fr_160px_120px] md:items-center"
                >
                  <p className="text-base font-semibold text-slate-900">{appointment.time}</p>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{appointment.name}</p>
                    <p className="text-sm text-slate-500">Patient programme</p>
                  </div>
                  <p className="text-base text-slate-600">{appointment.doctor}</p>
                  <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusClasses[appointment.status]}`}>
                    {statusLabels[appointment.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <h2 className="text-xl font-bold text-gray-800">Chiffre d'Affaires</h2>
            <p className="text-gray-500 text-sm mb-8">Tendance des 6 derniers mois (MAD)</p>
            
            <div className="flex items-end justify-between gap-4 h-48 border-b border-gray-100 pb-2">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 rounded-full bg-teal-600 opacity-20 transition-all duration-200 hover:scale-110" style={{ height: "40px" }}></div>
                <span className="text-xs font-bold text-gray-400">JAN</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 rounded-full bg-teal-600 opacity-40 transition-all duration-200 hover:scale-110" style={{ height: "70px" }}></div>
                <span className="text-xs font-bold text-gray-400">FEB</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 rounded-full bg-teal-600 opacity-60 transition-all duration-200 hover:scale-110" style={{ height: "60px" }}></div>
                <span className="text-xs font-bold text-gray-400">MAR</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 rounded-full bg-teal-600 opacity-80 transition-all duration-200 hover:scale-110" style={{ height: "90px" }}></div>
                <span className="text-xs font-bold text-gray-400">APR</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 rounded-full bg-teal-600 opacity-90 transition-all duration-200 hover:scale-110" style={{ height: "130px" }}></div>
                <span className="text-xs font-bold text-gray-400">MAY</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 rounded-full bg-teal-600 opacity-100 transition-all duration-200 hover:scale-110" style={{ height: "100px" }}></div>
                <span className="text-xs font-bold text-gray-400">JUN</span>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center bg-gray-50 p-4 rounded-xl">
              <span className="text-gray-600 font-medium">Croissance moyenne</span>
              <span className="text-teal-600 font-bold bg-teal-50 px-3 py-1 rounded-full">+8.4%</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Factures en attente</h2>
              <p className="text-base text-slate-500">A relancer en priorite</p>
            </div>
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.patient} className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-slate-900">{invoice.patient}</p>
                    <p className="text-base font-semibold text-amber-700">{invoice.amount}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{invoice.due}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Presence du personnel</h2>
              <p className="text-base text-slate-500">Etat de presence de l equipe</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {staffPresence.map((member) => (
                <div key={member.name} className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                  <p className="text-base font-semibold text-slate-900">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{member.role}</p>
                  <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                    {member.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
