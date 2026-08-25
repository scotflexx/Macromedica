import { fillFeuilleDeSoins } from './fillFeuilleDeSoins'

/**
 * generateFSE — Bridge adapter connecting MacroMedica DB objects to the CNSS PDF Engine
 * @param {Object} dbPatient - Patient record from DB
 * @param {Object} dbDoctor - Doctor profile record from DB
 * @param {Object} dbConsultation - Consultation/Visit record from DB
 */
export const generateFSE = async (dbPatient = {}, dbDoctor = {}, dbConsultation = {}) => {
  const firstName = dbPatient.prenom || dbPatient.first_name || ''
  const lastName = dbPatient.nom || dbPatient.last_name || ''
  const fullName = `${firstName} ${lastName}`.trim().toUpperCase() || 'PATIENT MACROMEDICA'

  const formattedDate = dbConsultation.date ||
    dbConsultation.date_consult ||
    new Date().toLocaleDateString('fr-FR')

  // 1. THE BRIDGE: Map database fields to the exact PDF structure
  const mappedData = {
    assure: {
      nomPrenom: fullName,
      immatriculation: dbPatient.n_immatriculation || dbPatient.immatriculation || dbPatient.cnss_number || '123456789',
      cin: dbPatient.cin || 'AB88419',
      adresse: dbPatient.adresse || dbPatient.address || 'Casablanca, Maroc',
      montantTotal: String(dbConsultation.montant || dbConsultation.billing_amount || dbConsultation.price || '150.00'),
      nombrePieces: String(dbConsultation.nombrePieces || '1'),
    },
    beneficiaire: {
      nomPrenom: fullName,
      dateNaissance: dbPatient.date_naissance || dbPatient.date_of_birth || dbPatient.dateNaissance || '14/05/1998',
      cin: dbPatient.cin || 'AB88419',
      sexe: (dbPatient.sexe === 'M' || dbPatient.gender === 'Male' || dbPatient.gender === 'M') ? 'M' : 'F',
    },
    consultation: {
      inpe: dbDoctor.inpe || dbDoctor.inpe_code || dbDoctor.code_inpe || '191023456',
      ville: dbDoctor.ville || dbDoctor.city || 'Casablanca',
      date: formattedDate,
    },
    actes: dbConsultation.actes || [
      {
        date: formattedDate,
        code: dbConsultation.code_acte || 'CS',
        cotation: dbConsultation.cotation || 'C x 1',
        montant: String(dbConsultation.montant || dbConsultation.billing_amount || dbConsultation.price || '150.00'),
        inpe: dbDoctor.inpe || dbDoctor.inpe_code || '191023456',
      },
    ],
  }

  // 2. Pass the mapped data into the PDF engine & trigger download
  try {
    const pdfBytes = await fillFeuilleDeSoins(mappedData)
    
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `FSE_${(lastName || 'PATIENT').toUpperCase()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return blobUrl
  } catch (error) {
    console.error("Failed to generate FSE:", error)
    throw error
  }
}
