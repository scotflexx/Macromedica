const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'DashboardPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The helper components we want to add
const helperComponents = `
// Helper function to check reduced motion
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  return prefersReducedMotion;
};

// Skeleton Card Component
const SkeletonCard = () => (
  <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-4">
    <div className="h-3 bg-slate-200 rounded w-24 mb-3 animate-pulse" />
    <div className="h-7 bg-slate-200 rounded w-16 mb-2 animate-pulse" />
    <div className="h-4 bg-slate-200 rounded w-28 mb-2 animate-pulse" />
    <div className="h-6 bg-slate-200 rounded w-full animate-pulse" />
  </div>
);

// Drawer Component for Temps Moyen
const TempsMoyenDrawer = ({ isOpen, onClose }) => {
  const lastConsultations = [
    { time: "09:00", duration: 18, patient: "Sarah B." },
    { time: "09:15", duration: 19, patient: "Marc D." },
    { time: "09:30", duration: 18, patient: "Marie C." },
    { time: "09:50", duration: 20, patient: "Jean P." },
    { time: "10:10", duration: 21, patient: "Lucas F." },
    { time: "10:30", duration: 22, patient: "Amélie R." },
  ];
  const avgMobile = 19.5;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex max-w-sm">
      <div className="w-80 bg-white border-l border-slate-200 shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900">Détails du temps moyen</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <X size={24} />
          </button>
        </div>
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-600">Moyenne mobile aujourd'hui</p>
          <p className="text-3xl font-bold text-slate-900">{avgMobile} min</p>
        </div>
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-600 mb-3">Dernières consultations</h4>
          <div className="space-y-3">
            {lastConsultations.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.patient}</p>
                  <p className="text-xs text-slate-500">{item.time}</p>
                </div>
                <span className="text-sm font-semibold text-slate-800">{item.duration} min</span>
              </div>
            ))}
          </div>
        </div>
        <button
          className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
        >
          Voir l'historique complet
        </button>
      </div>
    </div>
  );
};

// Modal Component for Patients Traités
const TraitesModal = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState('ALL');
  const processedPatients = [
    { name: "Sarah B.", time: "09:15", motif: "Consultation annuelle", duration: "18 min" },
    { name: "Marc D.", time: "09:30", motif: "Suivi", duration: "19 min" },
    { name: "Marie C.", time: "09:50", motif: "Urgence", duration: "20 min" },
    { name: "Jean P.", time: "10:10", motif: "Consultation", duration: "21 min" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Patients traités aujourd'hui</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 border-b border-slate-200 flex gap-2">
          {['ALL', 'Consultations', 'Contrôles', 'Urgences'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={\`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors \${
                filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }\`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {processedPatients.map((patient, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
                    <p className="text-xs text-slate-500">{patient.time} • {patient.motif}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{patient.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
`;

// The new ApercuDuJourCard
const newApercuCard = `
function ApercuDuJourCard() {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sparklineTooltip, setSparklineTooltip] = useState(null);
  
  // Initial mock data
  const [metrics, setMetrics] = useState({
    tempsMoyen: { value: 22, vsHier: 4, sparkline: [18, 19, 18, 20, 21, 22] },
    traites: { value: 14, total: 28, animateProgress: false },
    urgences: { count: 3, patients: ['Jean-Pierre B.', 'Marie D.', 'Lucas F.'] },
    analyses: [
      { id: 1, name: "Résultats ECG - Sarah B.", status: "REÇU" },
      { id: 2, name: "Labo Sanguin - Marc D.", status: "ATTENTE" },
      { id: 3, name: "Bilan Cardiaque - Jean-Pierre B.", status: "URGENT" },
    ],
  });

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (loading || error) return;

    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        tempsMoyen: {
          ...prev.tempsMoyen,
          value: Math.max(15, Math.min(25, prev.tempsMoyen.value + (Math.random() > 0.5 ? 1 : -1))),
          sparkline: [...prev.tempsMoyen.sparkline.slice(1), Math.max(15, Math.min(25, prev.tempsMoyen.sparkline[5] + (Math.random() > 0.5 ? 1 : -1)))],
        },
        traites: {
          ...prev.traites,
          value: Math.min(prev.traites.total, prev.traites.value + (Math.random() > 0.7 ? 1 : 0)),
        },
      }));
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loading, error]);

  // Calculate thresholds for Temps Moyen
  const getTimeDiffColor = (diff) => {
    if (diff < 0) return 'text-emerald-600';
    if (diff <= 2) return 'text-emerald-600';
    if (diff <= 5) return 'text-amber-600';
    return 'text-red-500';
  };
  const getTimeDiffSign = (diff) => diff >= 0 ? \`+\${diff}\` : diff;

  // Calculate thresholds for Progress Bar
  const getProgressBarColor = (percent) => {
    if (percent < 33) return 'bg-red-500';
    if (percent < 67) return 'bg-emerald-500';
    return 'bg-blue-500';
  };

  // Calculate thresholds for Urgences
  const getUrgencyBadge = (count) => {
    if (count === 0) return { text: 'Stable', bg: 'bg-emerald-50', textColor: 'text-emerald-800', shouldPulse: false };
    if (count <= 2) return { text: 'Modéré', bg: 'bg-amber-50', textColor: 'text-amber-800', shouldPulse: false };
    return { text: 'Critique', bg: 'bg-red-50', textColor: 'text-red-800', shouldPulse: true };
  };

  // Sparkline calculation
  const svgWidth = 100;
  const svgHeight = 30;
  const padding = 5;
  const { sparkline, vsHier, value: tempsValue } = metrics.tempsMoyen;
  const maxValue = Math.max(...sparkline);
  const minValue = Math.min(...sparkline);
  const range = maxValue - minValue || 1;
  const points = sparkline.map((value, index) => {
    const x = padding + (index / (sparkline.length - 1)) * (svgWidth - 2 * padding);
    const y = svgHeight - padding - ((value - minValue) / range) * (svgHeight - 2 * padding);
    return \`\${x},\${y}\`;
  }).join(' ');
  const sparklineColorMap = { 'text-emerald-600': '#10b981', 'text-amber-600': '#f59e0b', 'text-red-500': '#ef4444' };
  const sparklineColor = sparklineColorMap[getTimeDiffColor(vsHier)] || '#10b981';

  // Other metrics
  const progressPercent = Math.round((metrics.traites.value / metrics.traites.total) * 100);
  const remaining = metrics.traites.total - metrics.traites.value;
  const urgencyBadge = getUrgencyBadge(metrics.urgences.count);

  // Handle urgency click
  const handleUrgencyClick = () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });

  // Key handlers
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') { if (drawerOpen) setDrawerOpen(false); if (modalOpen) setModalOpen(false); } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, modalOpen]);

  if (error) {
    return (
      <section
        className="rounded-[21px] border border-red-200 bg-white px-5 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
        aria-label="Aperçu du jour - Erreur"
        role="region"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle size={32} className="text-red-600" />
          <p className="text-sm font-semibold text-red-700">Erreur de chargement</p>
          <button onClick={() => { setError(false); setLoading(true); setTimeout(() => setLoading(false), 1000); }} className="px-4 py-2 bg-slate-100 text-slate-800 rounded-lg text-sm font-semibold hover:bg-slate-200">
            Réessayer
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section
        className="rounded-[21px] border border-[#e2e8f0] bg-white px-5 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
        aria-label="Chargement"
        role="region"
        aria-busy="true"
      >
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className="rounded-[21px] border border-[#e2e8f0] bg-white px-5 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
        aria-label="Aperçu du jour"
        role="region"
      >
        {/* Metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {/* Metric 1: Temps moyen */}
          <article
            className="bg-white border border-[#e5e7eb] rounded-[12px] p-4 cursor-pointer transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-metric="temps-moyen"
            aria-label={\`Temps moyen de consultation aujourd'hui: \${tempsValue} minutes, \${vsHier} minutes par rapport à hier\`}
            role="article"
            tabIndex={0}
            onClick={() => setDrawerOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setDrawerOpen(true)}
          >
            <p className="text-[13px] font-medium text-[#6b7280] mb-1">Temps moyen</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-[28px] md:text-[24px] font-bold text-[#111827]">{tempsValue}</span>
              <span className="text-[13px] text-[#6b7280]">min</span>
            </div>
            <p className={\`text-[14px] font-medium \${getTimeDiffColor(vsHier)}\`}>{getTimeDiffSign(vsHier)} min vs hier</p>
            <div className="mt-2 relative h-8">
              <svg width="100%" height="100%" viewBox={\`0 0 \${svgWidth} \${svgHeight}\`} preserveAspectRatio="none" role="img" aria-label="Tendance du temps moyen sur les 6 dernières consultations">
                <polyline fill="none" stroke={sparklineColor} strokeWidth="2" points={points} strokeLinecap="round" />
                {sparkline.map((_, i) => (
                  <circle key={i} cx={padding + (i / (sparkline.length - 1)) * (svgWidth - 2 * padding)} cy={svgHeight - padding - ((sparkline[i] - minValue) / range) * (svgHeight - 2 * padding)} r="3" fill={sparklineColor} onMouseMove={(e) => setSparklineTooltip({ x: e.clientX, y: e.clientY, value: sparkline[i], time: '09:' + (15 + i * 10) })} onMouseLeave={() => setSparklineTooltip(null)} />
                ))}
              </svg>
              {sparklineTooltip && <div className="absolute z-10 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg" style={{ left: sparklineTooltip.x - (svgWidth / 2), top: sparklineTooltip.y - 60 }}>Consultation {sparklineTooltip.time}: {sparklineTooltip.value} min</div>}
            </div>
          </article>

          {/* Metric 2: Traités */}
          <article
            className="bg-white border border-[#e5e7eb] rounded-[12px] p-4 cursor-pointer transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-metric="traites"
            onClick={() => setModalOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setModalOpen(true)}
            aria-label={\`\${metrics.traites.value} patients traités sur \${metrics.traites.total}, \${progressPercent}% complété, \${remaining} restants\`}
            role="article"
            tabIndex={0}
          >
            <p className="text-[13px] font-medium text-[#6b7280] mb-1">Traités</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-[28px] md:text-[24px] font-bold text-[#111827]">{metrics.traites.value}</span>
              <span className="text-[18px] text-[#9ca3af]"> / {metrics.traites.total}</span>
            </div>
            <div className="w-full h-[6px] bg-[#e5e7eb] rounded-full mb-1 relative overflow-hidden">
              <div className={\`h-full \${getProgressBarColor(progressPercent)} rounded-full\`} style={{ width: \`\${metrics.traites.animateProgress ? progressPercent : 0}%\`, transition: reducedMotion ? 'none' : 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)' }} onAnimationEnd={() => setMetrics((p) => ({ ...p, traites: { ...p.traites, animateProgress: true } }))} />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[13px] text-[#6b7280]">{remaining} restants</p>
              <span className={\`text-[13px] font-semibold \${progressPercent < 33 ? 'text-red-600' : progressPercent < 67 ? 'text-emerald-700' : 'text-blue-700'}\`}>{progressPercent}%</span>
            </div>
          </article>

          {/* Metric 3: Urgences du jour */}
          <article
            className={\`bg-white border border-[#e5e7eb] rounded-[12px] p-4 cursor-pointer transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] \${urgencyBadge.shouldPulse ? 'md:hover:scale-102' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2\`}
            data-metric="urgences"
            onClick={handleUrgencyClick}
            onKeyDown={(e) => e.key === 'Enter' && handleUrgencyClick()}
            aria-label={\`\${metrics.urgences.count} urgences du jour, statut: \${urgencyBadge.text.toLowerCase()}\`}
            role="article"
            tabIndex={0}
          >
            <p className="text-[13px] font-medium text-[#6b7280] mb-1">Urgences du jour</p>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] md:text-[24px] font-bold text-[#111827]">{metrics.urgences.count}</span>
                <span className="text-[18px] text-[#9ca3af]">patients</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={\`px-2.5 py-1 rounded-full \${urgencyBadge.bg} \${urgencyBadge.textColor} text-xs font-semibold relative\`} role="status" aria-live="polite" style={urgencyBadge.shouldPulse && !reducedMotion ? { animation: 'subtle-pulse 2s ease-in-out infinite', boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.2)' } : {}}>{urgencyBadge.text}</span>
                {metrics.urgences.count >= 3 && <AlertCircle size={16} className="text-red-600" aria-hidden="true" />}
              </div>
            </div>
          </article>
        </div>

        {/* Prochaines analyses section */}
        <aside aria-label="Prochaines analyses médicales" className="border-t border-[#e5e7eb] pt-4 mt-1">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-[0.08em]">Prochaines analyses</h3>
            <button className="md:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}>{isMobileCollapsed ? <span className="text-sm font-semibold">Afficher</span> : <span className="text-sm font-semibold">Masquer</span>}</button>
          </div>
          <div className={\`overflow-hidden transition-all duration-300 \${isMobileCollapsed ? 'md:max-h-none max-h-0' : 'max-h-[100px] overflow-y-auto'}\`}>
            <div className="space-y-2">
              {metrics.analyses.map((analysis) => {
                let dotColor = "bg-slate-400";
                let badgeBg = "bg-slate-100";
                let badgeTextColor = "text-slate-700";
                if (analysis.status === "REÇU") { dotColor = "bg-emerald-500"; badgeBg = "bg-emerald-50"; badgeTextColor = "text-emerald-800"; }
                else if (analysis.status === "URGENT") { dotColor = "bg-red-500"; badgeBg = "bg-red-50"; badgeTextColor = "text-red-800"; }
                return (
                  <div key={analysis.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors" tabIndex={0} onClick={() => alert('Détail de l\\'analyse (mock)')}>
                    <span className={\`w-1.5 h-1.5 rounded-full \${dotColor} flex-shrink-0\`} aria-hidden="true" />
                    <span className="text-[13px] text-slate-800 flex-1 truncate">{analysis.name}</span>
                    <span className={\`ml-auto px-2 py-0.5 rounded text-[11px] font-semibold \${badgeBg} \${badgeTextColor}\`}>{analysis.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>

      {/* Drawer and Modal */}
      <TempsMoyenDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <TraitesModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      <style>{'@keyframes subtle-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.2); } 50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); } }'}</style>
    </>
  );
}
`;

// Now replace the old content!
// First find the end of PreviewCard
const previewCardEnd = `    </section>
  )
}
`;
// Find the start of ApercuDuJourCard
const apercuStart = `function ApercuDuJourCard() {`;
// Find the end of old ApercuDuJourCard (we'll find where PatientCard starts)
const patientCardStart = `function PatientCard({ rdv, index, isBusy, onAction }) {`;

// So we need to replace everything from previewCardEnd + apercuStart up to patientCardStart
const oldPart = previewCardEnd + apercuStart + content.split(apercuStart)[1].split(patientCardStart)[0];
const newPart = previewCardEnd + helperComponents + newApercuCard;

content = content.replace(oldPart, newPart);

// Also, we need to make sure that after the new ApercuDuJourCard, we have the PatientCard start
// Let's check!
fs.writeFileSync(filePath, content, 'utf8');

console.log('File updated successfully!');
