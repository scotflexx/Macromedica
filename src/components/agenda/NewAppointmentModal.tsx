import React, { useState, useEffect } from 'react';
import { X, Loader2, Phone, User, Calendar, Clock, ChevronDown, Plus, Lock, AlertTriangle, UserCircle, CheckCircle2 } from 'lucide-react';
import { format, differenceInMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AppointmentType } from '../../types/appointment';
import { getPatients } from '../../lib/api';

interface Patient {
  id: string;
  prenom: string;
  nom: string;
  telephone?: string;
  date_naissance?: string;
  sexe?: 'homme' | 'femme' | string;
  mutuelle?: string;
  cin?: string;
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onCreate: (appointment: any) => Promise<void>;
  onCreatePatientAndAppointment?: (patient: any, appointment: any) => Promise<void>;
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onCreate,
  onCreatePatientAndAppointment
}) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Button hover/pressed state
  const [cancelHovered, setCancelHovered] = useState(false);
  const [cancelPressed, setCancelPressed] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);
  const [submitPressed, setSubmitPressed] = useState(false);
  
  const [existingForm, setExistingForm] = useState({
    searchQuery: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    time: '08:00',
    type: 'Consultation' as AppointmentType,
    motif: ''
  });

  const [newPatientForm, setNewPatientForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    date_naissance: '',
    sexe: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    time: '08:00',
    type: 'Première consultation' as AppointmentType,
    motif: ''
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mockLastVisits: Record<string, string> = {
    '1': '19 juin 2026',
    '2': '14 juin 2026',
    '3': '10 juin 2026'
  };

  const mockAlerts: Record<string, number> = {
    '1': 1,
    '2': 0,
    '3': 0
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await getPatients();
        setPatients(data || []);
      } catch (e) {
        console.error('Error fetching patients:', e);
      }
    };
    if (isOpen) fetchPatients();
  }, [isOpen]);

  useEffect(() => {
    if (existingForm.searchQuery.trim()) {
      const filtered = patients.filter(p =>
        `${p.prenom} ${p.nom}`.toLowerCase().includes(existingForm.searchQuery.toLowerCase())
      );
      setFilteredPatients(filtered);
      setShowDropdown(true);
    } else {
      setFilteredPatients([]);
      setShowDropdown(false);
    }
  }, [existingForm.searchQuery, patients]);

  const calculateAge = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const birth = parseISO(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? age : 0;
  };

  const getInitials = (prenom: string, nom: string): string => {
    return `${prenom[0]?.toUpperCase() || ''}${nom[0]?.toUpperCase() || ''}`;
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setExistingForm(prev => ({
      ...prev,
      searchQuery: `${patient.prenom} ${patient.nom}`
    }));
    setShowDropdown(false);
    
    const lastVisitDateStr = mockLastVisits[patient.id];
    let defaultType: AppointmentType = 'Consultation';
    if (lastVisitDateStr) {
      try {
        const today = new Date();
        const lastVisit = new Date();
        const monthMap: Record<string, number> = {
          'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
          'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
        };
        const parts = lastVisitDateStr.split(' ');
        const day = parseInt(parts[0]);
        const month = monthMap[parts[1].toLowerCase()];
        const year = parseInt(parts[2]);
        lastVisit.setFullYear(year, month, day);
        
        const monthsSince = differenceInMonths(today, lastVisit);
        if (monthsSince < 6) {
          defaultType = 'Contrôle';
        }
      } catch (e) {
        console.error('Error parsing last visit date:', e);
      }
    }
    setExistingForm(prev => ({ ...prev, type: defaultType }));
  };

  const handleSwitchToNewPatient = () => {
    setMode('new');
    setSelectedPatient(null);
    setShowDropdown(false);
  };

  const handleSwitchToExistingPatient = () => {
    setMode('existing');
    setNewPatientForm({
      nom: '',
      prenom: '',
      telephone: '',
      date_naissance: '',
      sexe: '',
      date: existingForm.date,
      time: existingForm.time,
      type: 'Première consultation',
      motif: ''
    });
  };

  const validateExistingForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedPatient) newErrors.searchQuery = 'Veuillez sélectionner un patient';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateNewPatientForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!newPatientForm.nom.trim() || newPatientForm.nom.length < 2) {
      newErrors.nom = 'Nom requis (2 caractères minimum)';
    }
    
    if (!newPatientForm.prenom.trim() || newPatientForm.prenom.length < 2) {
      newErrors.prenom = 'Prénom requis (2 caractères minimum)';
    }
    
    if (!newPatientForm.telephone.trim()) {
      newErrors.telephone = 'Téléphone requis';
    } else {
      const phoneRegex = /^(\+212|0)[1-9]\d{8}$/;
      if (!phoneRegex.test(newPatientForm.telephone.replace(/\s/g, ''))) {
        newErrors.telephone = 'Format invalide (06 XX XX XX XX ou +212)';
      }
    }
    
    if (newPatientForm.date_naissance) {
      const date = parseISO(newPatientForm.date_naissance);
      if (isNaN(date.getTime())) {
        newErrors.date_naissance = 'Format de date invalide';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'existing') {
      if (!validateExistingForm()) return;
      
      setLoading(true);
      try {
        await onCreate({
          ...existingForm,
          patientId: selectedPatient?.id,
          patientName: `${selectedPatient?.prenom} ${selectedPatient?.nom}`
        });
        onClose();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      if (!validateNewPatientForm()) return;
      
      setLoading(true);
      try {
        if (onCreatePatientAndAppointment) {
          await onCreatePatientAndAppointment(
            {
              nom: newPatientForm.nom,
              prenom: newPatientForm.prenom,
              telephone: newPatientForm.telephone,
              date_naissance: newPatientForm.date_naissance,
              sexe: newPatientForm.sexe
            },
            {
              date: newPatientForm.date,
              time: newPatientForm.time,
              type: newPatientForm.type,
              motif: newPatientForm.motif
            }
          );
        } else {
          await onCreate({
            ...newPatientForm,
            patientName: `${newPatientForm.prenom} ${newPatientForm.nom}`
          });
        }
        onClose();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-[500px] bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col"
        style={{ animation: 'modalIn 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-3">
            <h2 id="modal-title" className="text-[17px] font-semibold text-[#111827]">
              {mode === 'existing' ? 'Nouveau rendez-vous' : 'Nouveau patient · Rendez-vous'}
            </h2>
            {mode === 'new' && (
              <button
                type="button"
                onClick={handleSwitchToExistingPatient}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <X size={12} />
                Rechercher un patient existant
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-[8px] border-none bg-transparent text-[#9CA3AF] cursor-pointer flex items-center justify-center transition-all hover:bg-[#F3F4F6] hover:text-[#374151]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-5 py-5 flex flex-col gap-[14px]">
            {/* Mode: Existing Patient */}
            {mode === 'existing' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                    Patient
                  </label>
                  <div className="relative">
                    <div className={`flex items-center gap-3 rounded-[10px] border ${
                      errors.searchQuery ? 'border-red-500' : 
                      selectedPatient ? 'border-blue-500 ring-2 ring-blue-100' : 
                      'border-[#E5E7EB]'
                    } bg-white px-3 h-[44px] transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100`}>
                      <User size={18} className="text-[#9CA3AF] flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Chercher un patient..."
                        value={existingForm.searchQuery}
                        onChange={(e) => setExistingForm(prev => ({ ...prev, searchQuery: e.target.value }))}
                        onFocus={() => existingForm.searchQuery && setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        className="w-full bg-transparent outline-none text-[#111827] text-[14px] placeholder:text-[#9CA3AF]"
                        aria-autocomplete="list"
                        aria-expanded={showDropdown}
                        aria-controls="patient-listbox"
                      />
                      {selectedPatient && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatient(null);
                            setExistingForm(prev => ({ ...prev, searchQuery: '' }));
                          }}
                          className="ml-2 flex-shrink-0"
                        >
                          <X size={16} className="text-[#9CA3AF] hover:text-[#374151]" />
                        </button>
                      )}
                      {!selectedPatient && <ChevronDown size={16} className="text-[#9CA3AF] flex-shrink-0" />}
                    </div>

                    {/* Search Dropdown */}
                    {showDropdown && (
                      <div id="patient-listbox" role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] z-50 max-h-[240px] overflow-y-auto">
                        {filteredPatients.length > 0 ? (
                          filteredPatients.map(p => (
                            <div
                              key={p.id}
                              role="option"
                              aria-selected={selectedPatient?.id === p.id}
                              onClick={() => handleSelectPatient(p)}
                              className="px-4 py-3 hover:bg-[#F9FAFB] cursor-pointer transition-colors border-b border-[#F3F4F6] last:border-0 flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[12px] font-semibold text-[#6B7280]">
                                {getInitials(p.prenom, p.nom)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#111827] truncate text-[14px]">{p.prenom} {p.nom}</p>
                                <div className="flex items-center gap-2 text-[12px] text-[#9CA3AF]">
                                  <span>{p.telephone || 'Pas de téléphone'}</span>
                                  {mockLastVisits[p.id] && (
                                    <>
                                      <span>•</span>
                                      <span>Dernière visite: {mockLastVisits[p.id]}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4">
                            <div className="bg-[#F9FAFB] border-l-4 border-[#9CA3AF] rounded-r-lg px-4 py-3 mb-3">
                              <p className="text-[14px] text-[#6B7280] font-medium">
                                {existingForm.searchQuery.trim() 
                                  ? `Aucun patient trouvé pour "${existingForm.searchQuery}"` 
                                  : 'Commencez à taper pour chercher un patient'}
                              </p>
                            </div>
                            {existingForm.searchQuery.trim() && (
                              <button
                                type="button"
                                onClick={handleSwitchToNewPatient}
                                className="w-full h-[44px] px-4 bg-blue-50 border border-blue-200 rounded-[10px] text-blue-700 font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                              >
                                <Plus size={16} />
                                Créer un nouveau patient
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.searchQuery && (
                    <p className="text-[12px] text-red-500 mt-1">{errors.searchQuery}</p>
                  )}
                </div>

                {/* Mini Patient Summary */}
                {selectedPatient && (
                  <div 
                    className={`p-3 rounded-[10px] border cursor-pointer transition-all ${
                      (mockAlerts[selectedPatient.id] || 0) > 0 
                        ? 'bg-red-50 border-red-200 border-l-4 border-l-red-500' 
                        : 'bg-[#F9FAFB] border-[#E5E7EB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                        (mockAlerts[selectedPatient.id] || 0) > 0 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {getInitials(selectedPatient.prenom, selectedPatient.nom)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#111827] truncate">
                          {selectedPatient.prenom} {selectedPatient.nom}
                        </p>
                        <p className="text-[12px] text-[#9CA3AF]">
                          Dernière visite: {mockLastVisits[selectedPatient.id] || 'Aucune visite'}
                        </p>
                        {(mockAlerts[selectedPatient.id] || 0) > 0 && (
                          <p className="text-[12px] text-red-600 flex items-center gap-1 mt-1">
                            <AlertTriangle size={12} />
                            {mockAlerts[selectedPatient.id]} alerte{mockAlerts[selectedPatient.id] > 1 ? 's' : ''} active{mockAlerts[selectedPatient.id] > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                    Téléphone
                  </label>
                  <div className="relative">
                    <div className="flex items-center gap-3 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 h-[44px]">
                      <Phone size={18} className="text-[#9CA3AF] flex-shrink-0" />
                      <input
                        type="tel"
                        value={selectedPatient?.telephone || ''}
                        readOnly
                        aria-readonly="true"
                        className="w-full bg-transparent outline-none text-[#6B7280] text-[14px]"
                      />
                      <Lock size={16} className="text-[#9CA3AF] flex-shrink-0 cursor-help" title="Depuis le dossier" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Mode: New Patient */}
            {mode === 'new' && (
              <>
                <div className="grid grid-cols-2 gap-[10px]">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                      Nom
                    </label>
                    <div className={`flex items-center gap-3 rounded-[10px] border ${
                      errors.nom ? 'border-red-500' : 'border-[#E5E7EB]'
                    } bg-white px-3 h-[44px] transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100`}>
                      <User size={18} className="text-[#9CA3AF] flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Nom"
                        value={newPatientForm.nom}
                        onChange={(e) => setNewPatientForm(prev => ({ ...prev, nom: e.target.value }))}
                        className="w-full bg-transparent outline-none text-[#111827] text-[14px] placeholder:text-[#9CA3AF]"
                      />
                    </div>
                    {errors.nom && (
                      <p className="text-[12px] text-red-500 mt-1">{errors.nom}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                      Prénom
                    </label>
                    <div className={`flex items-center gap-3 rounded-[10px] border ${
                      errors.prenom ? 'border-red-500' : 'border-[#E5E7EB]'
                    } bg-white px-3 h-[44px] transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100`}>
                      <UserCircle size={18} className="text-[#9CA3AF] flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Prénom"
                        value={newPatientForm.prenom}
                        onChange={(e) => setNewPatientForm(prev => ({ ...prev, prenom: e.target.value }))}
                        className="w-full bg-transparent outline-none text-[#111827] text-[14px] placeholder:text-[#9CA3AF]"
                      />
                    </div>
                    {errors.prenom && (
                      <p className="text-[12px] text-red-500 mt-1">{errors.prenom}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                    Téléphone
                  </label>
                  <div className={`flex items-center gap-3 rounded-[10px] border ${
                    errors.telephone ? 'border-red-500' : 'border-[#E5E7EB]'
                  } bg-white px-3 h-[44px] transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100`}>
                    <Phone size={18} className="text-[#9CA3AF] flex-shrink-0" />
                    <input
                      type="tel"
                      placeholder="06 XX XX XX XX"
                      value={newPatientForm.telephone}
                      onChange={(e) => setNewPatientForm(prev => ({ ...prev, telephone: e.target.value }))}
                      className="w-full bg-transparent outline-none text-[#111827] text-[14px] placeholder:text-[#9CA3AF]"
                    />
                  </div>
                  {errors.telephone && (
                    <p className="text-[12px] text-red-500 mt-1">{errors.telephone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                    Date de naissance
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={newPatientForm.date_naissance}
                      onChange={(e) => setNewPatientForm(prev => ({ ...prev, date_naissance: e.target.value }))}
                      className="w-full h-[44px] px-3 pr-9 bg-white border border-[#E5E7EB] rounded-[10px] text-[#111827] text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF] pointer-events-none" />
                  </div>
                  {errors.date_naissance && (
                    <p className="text-[12px] text-red-500 mt-1">{errors.date_naissance}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                    Sexe
                  </label>
                  <div role="radiogroup" aria-label="Sexe du patient" className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewPatientForm(prev => ({ ...prev, sexe: 'homme' }))}
                      className={`flex-1 h-[44px] px-4 rounded-[10px] text-[14px] font-medium transition-all flex items-center justify-center gap-2 ${
                        newPatientForm.sexe === 'homme'
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {newPatientForm.sexe === 'homme' && <CheckCircle2 size={16} />}
                      Homme
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPatientForm(prev => ({ ...prev, sexe: 'femme' }))}
                      className={`flex-1 h-[44px] px-4 rounded-[10px] text-[14px] font-medium transition-all flex items-center justify-center gap-2 ${
                        newPatientForm.sexe === 'femme'
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {newPatientForm.sexe === 'femme' && <CheckCircle2 size={16} />}
                      Femme
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Motif du RDV */}
            <div>
              <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                Motif du RDV
              </label>
              <textarea
                value={mode === 'existing' ? existingForm.motif : newPatientForm.motif}
                onChange={(e) => {
                  if (mode === 'existing') {
                    setExistingForm(prev => ({ ...prev, motif: e.target.value }));
                  } else {
                    setNewPatientForm(prev => ({ ...prev, motif: e.target.value }));
                  }
                }}
                placeholder="Douleurs abdominales..."
                className="w-full h-[80px] px-4 py-3 border border-[#E5E7EB] rounded-[10px] bg-white text-[14px] leading-[1.5] text-[#111827] resize-none transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-inherit placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* Date / Heure / Type Grid */}
            <div className="grid grid-cols-[140px_100px_1fr] gap-[10px]">
              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={mode === 'existing' ? existingForm.date : newPatientForm.date}
                    onChange={(e) => {
                      if (mode === 'existing') {
                        setExistingForm(prev => ({ ...prev, date: e.target.value }));
                      } else {
                        setNewPatientForm(prev => ({ ...prev, date: e.target.value }));
                      }
                    }}
                    className="w-full h-[44px] px-3 pr-9 bg-white border border-[#E5E7EB] rounded-[10px] text-[#111827] text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF] pointer-events-none" />
                </div>
              </div>

              {/* Heure */}
              <div>
                <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                  Heure
                </label>
                <div className="relative">
                  <select
                    value={mode === 'existing' ? existingForm.time : newPatientForm.time}
                    onChange={(e) => {
                      if (mode === 'existing') {
                        setExistingForm(prev => ({ ...prev, time: e.target.value }));
                      } else {
                        setNewPatientForm(prev => ({ ...prev, time: e.target.value }));
                      }
                    }}
                    className="w-full h-[44px] px-3 pr-7 bg-white border border-[#E5E7EB] rounded-[10px] text-[#111827] text-[14px] appearance-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    style={{ minWidth: '80px' }}
                  >
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = Math.floor(i / 4) + 8;
                      const m = (i % 4) * 15;
                      const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                      return <option key={t} value={t}>{t}</option>;
                    })}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#9CA3AF] pointer-events-none" />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] mb-[6px]">
                  Type de RDV
                </label>
                <div className="relative">
                  <select
                    value={mode === 'existing' ? existingForm.type : newPatientForm.type}
                    onChange={(e) => {
                      if (mode === 'existing') {
                        setExistingForm(prev => ({ ...prev, type: e.target.value as AppointmentType }));
                      } else {
                        setNewPatientForm(prev => ({ ...prev, type: e.target.value as AppointmentType }));
                      }
                    }}
                    className="w-full h-[44px] px-3 pr-7 bg-white border border-[#E5E7EB] rounded-[10px] text-[#111827] text-[14px] appearance-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all whitespace-nowrap overflow-hidden text-ellipsis"
                    title={mode === 'existing' ? existingForm.type : newPatientForm.type}
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Contrôle">Contrôle</option>
                    <option value="Première consultation">Première consultation</option>
                    <option value="Urgence">Urgence</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#9CA3AF] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-[#F3F4F6] bg-white flex gap-3">
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: cancelHovered ? '#F9FAFB' : '#FFFFFF',
                color: '#374151',
                border: `2px solid ${cancelHovered ? '#D1D5DB' : '#E5E7EB'}`,
                padding: '0.625rem 1.25rem',
                minHeight: '44px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                whiteSpace: 'nowrap',
                fontSize: '14px',
                fontWeight: 'bold',
                width: 'auto',
                flex: 1,
                transform: cancelPressed ? 'translateY(-1px) scale(0.98)' : cancelHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: cancelHovered ? '0 6px 16px -4px rgba(148, 163, 184, 0.15)' : 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={() => setCancelHovered(true)}
              onMouseLeave={() => { setCancelHovered(false); setCancelPressed(false); }}
              onMouseDown={() => setCancelPressed(true)}
              onMouseUp={() => setCancelPressed(false)}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: submitHovered ? '#2563EB' : '#3B82F6',
                color: '#FFFFFF',
                border: `2px solid ${submitHovered ? '#1E40AF' : '#60A5FA'}`,
                padding: '0.625rem 1.25rem',
                minHeight: '44px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                whiteSpace: 'nowrap',
                fontSize: '14px',
                fontWeight: 'bold',
                width: 'auto',
                flex: 1,
                transform: submitPressed ? 'translateY(-1px) scale(0.98)' : submitHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: submitHovered ? '0 6px 16px -4px rgba(37, 99, 235, 0.15)' : 'none',
                opacity: loading ? 0.8 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={() => setSubmitHovered(true)}
              onMouseLeave={() => { setSubmitHovered(false); setSubmitPressed(false); }}
              onMouseDown={() => setSubmitPressed(true)}
              onMouseUp={() => setSubmitPressed(false)}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                mode === 'existing' ? 'Créer le rendez-vous' : 'Créer le patient et le rendez-vous'
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .modal, .modal-overlay {
            animation: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 480px) {
          .fixed.inset-0 {
            padding: 0 !important;
            align-items: flex-end !important;
          }
          .relative.w-full {
            max-width: 100% !important;
            max-height: 90vh !important;
            border-radius: 16px 16px 0 0 !important;
            animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) !important;
          }
          .grid-cols-\\[140px_100px_1fr\\] {
            grid-template-columns: 1fr 1fr !important;
          }
          .grid-cols-\\[140px_100px_1fr\\] > div:nth-child(3) {
            grid-column: span 2 !important;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NewAppointmentModal;
