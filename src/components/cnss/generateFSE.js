import { PDFDocument } from 'pdf-lib'
import { fillFeuilleDeSoins } from './fillFeuilleDeSoins'

/**
 * generateFSE — AcroForm Interactive Form Filler Bridge for MacroMedica DB Objects
 * @param {Object} dbPatient - Patient record from DB
 * @param {Object} dbDoctor - Doctor profile record from DB
 * @param {Object} dbConsultation - Consultation/Visit record from DB
 */
export const generateFSE = async (dbPatient = {}, dbDoctor = {}, dbConsultation = {}) => {
  try {
    // 1. Fetch the template with form fields
    const existingPdfBytes = await fetch('/assets/FEUILLE-DE-SOINS-MALADIE_2.pdf').then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    
    let form = null
    try {
      form = pdfDoc.getForm()
    } catch (e) {
      console.warn('Aucun formulaire AcroForm interactif dans le PDF modèle. Utilisation de la méthode de rendu directe.')
    }

    if (!form || form.getFields().length === 0) {
      // Fallback to absolute canvas filling engine if no interactive fields exist
      const firstName = dbPatient.prenom || dbPatient.first_name || ''
      const lastName = dbPatient.nom || dbPatient.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim().toUpperCase() || 'PATIENT MACROMEDICA'
      const formattedDate = dbConsultation.date || dbConsultation.date_consult || new Date().toLocaleDateString('fr-FR')

      const pdfBytes = await fillFeuilleDeSoins({
        assure: {
          nomPrenom: fullName,
          immatriculation: dbPatient.n_immatriculation || dbPatient.immatriculation || dbPatient.cnss_number || '',
          cin: dbPatient.cin || '',
          adresse: dbPatient.adresse || dbPatient.address || '',
          montantTotal: String(dbConsultation.montant || dbConsultation.billing_amount || dbConsultation.price || '150.00'),
          nombrePieces: '1',
        },
        beneficiaire: {
          nomPrenom: fullName,
          dateNaissance: dbPatient.date_naissance || dbPatient.date_of_birth || '',
          cin: dbPatient.cin || '',
          sexe: (dbPatient.sexe === 'M' || dbPatient.gender === 'Male' || dbPatient.gender === 'M') ? 'M' : 'F',
        },
        consultation: {
          inpe: dbDoctor.inpe || dbDoctor.inpe_code || '',
          ville: dbDoctor.ville || dbDoctor.city || 'Casablanca',
          date: formattedDate,
        },
        actes: dbConsultation.actes || [
          {
            date: formattedDate,
            code: dbConsultation.code_acte || 'CS',
            cotation: dbConsultation.cotation || 'C x 1',
            montant: String(dbConsultation.montant || dbConsultation.billing_amount || dbConsultation.price || '150.00'),
            inpe: dbDoctor.inpe || dbDoctor.inpe_code || '',
          },
        ]
      })

      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `FSE_${dbPatient.nom || dbPatient.last_name || 'Patient'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    // 2. Safe Helper Functions
    const fillText = (fieldName, text) => {
      if (!text) return
      try {
        const field = form.getTextField(fieldName)
        if (field) field.setText(String(text))
      } catch (err) {
        console.warn(`Champ texte introuvable : ${fieldName}`)
      }
    }

    const checkCheckbox = (fieldName) => {
      try {
        const field = form.getCheckBox(fieldName)
        if (field) field.check()
      } catch (err) {
        console.warn(`Case à cocher introuvable : ${fieldName}`)
      }
    }

    // 3. Map the Database Objects to the PDF Fields
    const firstName = dbPatient.prenom || dbPatient.first_name || ''
    const lastName = dbPatient.nom || dbPatient.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim().toUpperCase()
    const today = dbConsultation.date || dbConsultation.date_consult || new Date().toLocaleDateString('fr-FR')
    const price = dbConsultation.montant || dbConsultation.billing_amount || dbConsultation.price || '150.00'

    // --- SECTION ASSURÉ ---
    fillText('nom_assure', fullName)
    fillText('immatriculation', dbPatient.n_immatriculation || dbPatient.immatriculation || dbPatient.cnss_number || '')
    fillText('cin_assure', dbPatient.cin || '')
    fillText('adresse', dbPatient.adresse || dbPatient.address || '')
    fillText('montant_total', `${price} DH`)
    fillText('pieces_jointes', '1')

    // --- SECTION BÉNÉFICIAIRE (Patient) ---
    fillText('nom_patient', fullName)
    fillText('date_naissance', dbPatient.date_naissance || dbPatient.date_of_birth || '')
    fillText('cin_patient', dbPatient.cin || '')
    
    if (dbPatient.sexe === 'M' || dbPatient.gender === 'Male' || dbPatient.gender === 'M') {
      checkCheckbox('check_sexe_m')
    } else {
      checkCheckbox('check_sexe_f')
    }

    // --- SECTION MÉDECIN & SOINS ---
    fillText('inpe_medecin', dbDoctor.inpe || dbDoctor.inpe_code || '')
    fillText('date_patient', today)
    fillText('date_medecin', today)
    checkCheckbox('check_maladie')

    // 4. THE MAGIC: Flatten the form to bake the text permanently
    try {
      form.flatten()
    } catch (e) {
      console.warn('Form flatten warning:', e)
    }

    // 5. Generate and Download
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `FSE_${lastName || dbPatient.nom || 'Patient'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

  } catch (error) {
    console.error("Erreur critique lors de la génération de la FSE :", error)
  }
}
