export function getSidebarForRole(role) {
  switch (role) {
    case 'docteur':
      return [
        {
          label: '',
          items: [
            { label: 'Tableau de bord', to: '/dashboard', icon: 'layout-dashboard' },
            { label: 'Secrétaire', to: '/secretaire', icon: 'clock-3' },
            { label: 'Agenda (RDV)', to: '/agenda', icon: 'calendar-days' },
            { label: 'Patients', to: '/patients', icon: 'folder-heart' },
            { label: 'Assistant IA', to: '/ai-scribe', icon: 'bot' },
            { label: 'Facturation', to: '/facturation', icon: 'credit-card' },
            { label: 'Paramètres', to: '/parametres', icon: 'settings-2' },
          ],
        },
      ]

    case 'secretaire':
      return [
        {
          label: '',
          items: [
            { label: 'Secrétaire (Dashboard)', to: '/secretaire', icon: 'layout-dashboard' },
            { label: 'Agenda (RDV)', to: '/agenda', icon: 'calendar-days' },
          ],
        },
        {
          label: '',
          items: [
            { label: 'Patients', to: '/patients', icon: 'folder-heart' },
            { label: 'Facturation', to: '/facturation', icon: 'credit-card' },
          ],
        },
      ]

    default:
      return getSidebarForRole('docteur')
  }
}