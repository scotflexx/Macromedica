import React from 'react'
import { Building2, FileText, AlertCircle, ShieldAlert } from 'lucide-react'

export default function AdminTaskViewer({ task }) {
  const isUrgent = task?.category === 'urgences' || task?.isUrgent || task?.status === 'CRITIQUE'

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${
            isUrgent ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {isUrgent ? <ShieldAlert size={20} /> : <Building2 size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{task?.description || 'Dossier Administratif'}</h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                isUrgent ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {task?.category ? task.category.toUpperCase() : 'Secrétariat'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Patient: <strong className="text-slate-800">{task?.patientName}</strong> • {task?.metadata || 'Priorité normale'}
            </p>
          </div>
        </div>

        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
          isUrgent ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          {isUrgent ? 'Urgence à traiter' : 'En attente secrétariat'}
        </span>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
            Détails du dossier
          </h3>

          <div className="space-y-3.5 text-sm bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Objet / Motif:</span>
              <span className="font-bold text-slate-900">{task?.description}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Patient concerné:</span>
              <span className="font-bold text-blue-700">{task?.patientName}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-medium">Numéro de dossier / référence:</span>
              <span className="font-semibold text-slate-700">#DOS-{task?.id?.slice(-6) || '2026-88'}</span>
            </div>
          </div>
        </div>

        {/* Action Instruction Box */}
        <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-100 text-sm text-blue-900 leading-relaxed font-medium">
          💡 <strong>Instruction du système:</strong> Utilisez la barre d'action principale au bas du panneau pour encaisser le règlement, valider le dossier administratif ou contacter le patient.
        </div>
      </div>
    </div>
  )
}
