import { useState, useEffect } from 'react'
import { Loader2, UserPlus, Mail, Shield, Trash2, Users } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import PinLock from '../../components/common/PinLock'
import { supabase } from '../../lib/supabase'

function StaffManagementPage() {
  const { cabinetId, notify, profile } = useAppContext()
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [form, setForm] = useState({
    nom_complet: '',
    email: '',
    password: '',
    role: 'secretaire',
  })
  const [error, setError] = useState(null)

  // Load staff members for this cabinet
  const loadStaff = async () => {
    if (!cabinetId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, nom_complet, role, created_at')
        .eq('cabinet_id', cabinetId)
        .order('created_at', { ascending: true })
      if (err) throw err
      setStaffList(data || [])
    } catch (err) {
      console.error('Error loading staff:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [cabinetId])

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!form.nom_complet || !form.email || !form.password) {
      setError('Veuillez remplir tous les champs')
      return
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    // Capture cabinetId and current session NOW, before signUp potentially
    // disrupts the auth state (Supabase client-side signUp can reset the session)
    const activeCabinetId = cabinetId || profile?.cabinet_id
    if (!activeCabinetId) {
      setError('Cabinet introuvable — rechargez la page et réessayez.')
      return
    }

    // Save the current admin session so we can restore it after signUp
    const { data: { session: adminSession } } = await supabase.auth.getSession()

    setFormLoading(true)
    setError(null)

    try {
      // 1. Create the new auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            nom_complet: form.nom_complet,
            role: form.role,
            cabinet_id: activeCabinetId,
          },
        },
      })

      if (authError) {
        if (authError.message?.includes('already registered') || authError.message?.includes('already been registered')) {
          throw new Error('Cet email est déjà utilisé.')
        }
        throw authError
      }

      if (!authData.user) throw new Error('Erreur lors de la création du compte')

      // 2. Restore the admin session if signUp changed it
      if (adminSession && authData.session?.user?.id !== adminSession.user?.id) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })
      }

      // 3. Create the profile for the new user linked to the same cabinet
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: authData.user.id,
          cabinet_id: activeCabinetId,
          role: form.role,
          nom_complet: form.nom_complet.trim(),
        }], { onConflict: 'id' })

      if (profileError) {
        console.error('Profile creation failed:', profileError)
        throw new Error(`Erreur création profil: ${profileError.message}`)
      }

      // 4. Success
      notify({ title: 'Utilisateur ajouté', description: `${form.nom_complet} a été ajouté en tant que ${form.role}.` })
      setForm({ nom_complet: '', email: '', password: '', role: 'secretaire' })
      setShowForm(false)
      loadStaff()
    } catch (err) {
      console.error('Add user error:', err)
      setError(err.message || 'Erreur lors de l\'ajout')
    } finally {
      setFormLoading(false)
    }
  }

  const roleLabels = {
    medecin: 'Médecin',
    secretaire: 'Secrétaire',
    admin: 'Administrateur',
  }

  const roleBadgeColors = {
    medecin: 'bg-blue-50 text-blue-700',
    secretaire: 'bg-blue-50 text-blue-700',
    admin: 'bg-purple-50 text-purple-700',
  }

  return (
    <PinLock>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion de l'équipe</h1>
          <p className="mt-1 text-base text-slate-500">Gérez les membres de votre cabinet</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-base font-medium text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <UserPlus className="h-5 w-5" />
          Ajouter un utilisateur
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Nouveau membre</h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Nom complet</span>
                <input
                  type="text"
                  value={form.nom_complet}
                  onChange={(e) => setForm(f => ({ ...f, nom_complet: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Nadia Bennani"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="nadia@cabinet.ma"
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Mot de passe temporaire</span>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="min. 8 caractères"
                  minLength={8}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Rôle</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="secretaire">Secrétaire</option>
                  <option value="admin">Administrateur</option>
                </select>
              </label>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-70"
              >
                {formLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Création...</> : <><UserPlus className="h-4 w-4" /> Créer le compte</>}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff List */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">
            Membres du cabinet ({staffList.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>Aucun membre trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staffList.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {(member.nom_complet || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{member.nom_complet || 'Utilisateur'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeColors[member.role] || 'bg-slate-100 text-slate-600'}`}>
                        {roleLabels[member.role] || member.role}
                      </span>
                      {member.id === profile?.id && (
                        <span className="text-xs text-slate-400">(vous)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </PinLock>
  )
}

export default StaffManagementPage
