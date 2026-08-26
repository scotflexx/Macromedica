import { PDFDocument } from 'pdf-lib'

export const generateFSE = async (dbPatient, dbDoctor, dbConsultation) => {
  try {
    // 1. Define the URL (ensure the filename perfectly matches the file in public/assets/)
    const fileName = 'FEUILLE-DE-SOINS-MALADIE_2.pdf';
    const pdfUrl = `/assets/${fileName}?t=${new Date().getTime()}`;
    
    // 2. Fetch with error handling & strict network 404 validation
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      throw new Error(`Fichier introuvable (404) : Le fichier ${fileName} n'existe pas dans le dossier public/assets/. Vérifiez le nom exact du fichier.`);
    }

    // 3. Only parse if we have a valid PDF response
    const existingPdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // Safe Helper Functions
    const fillText = (fieldName, text) => {
      if (!text) return;
      try {
        const field = form.getTextField(fieldName);
        if (field) field.setText(String(text));
      } catch (err) {
        console.warn(`Champ introuvable : ${fieldName}`);
      }
    };

    const checkCheckbox = (fieldName) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (field) field.check();
      } catch (err) {
        console.warn(`Case introuvable : ${fieldName}`);
      }
    };

    // Variables
    const firstName = dbPatient?.prenom || dbPatient?.first_name || '';
    const lastName = dbPatient?.nom || dbPatient?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim().toUpperCase();
    const today = dbConsultation?.date || dbConsultation?.date_consult || new Date().toLocaleDateString('fr-FR');
    const price = dbConsultation?.price || dbConsultation?.montant || dbConsultation?.billing_amount || '150.00';

    // Fill Fields
    fillText('nom_assure', fullName);
    fillText('nom_patient', fullName);
    fillText('immatriculation', dbPatient?.cnss_number || dbPatient?.n_immatriculation || dbPatient?.immatriculation || '');
    fillText('cin_assure', dbPatient?.cin || '');
    fillText('cin_patient', dbPatient?.cin || '');
    fillText('adresse', dbPatient?.address || dbPatient?.adresse || '');
    fillText('montant_total', `${price} DH`);
    fillText('pieces_jointes', '1');
    fillText('date_naissance', dbPatient?.date_of_birth || dbPatient?.date_naissance || '');
    fillText('inpe_medecin', dbDoctor?.inpe_code || dbDoctor?.inpe || '');
    fillText('date_patient', today);
    fillText('date_medecin', today);

    // Logic for Checkboxes
    checkCheckbox('check_maladie');
    if (dbPatient?.gender === 'Male' || dbPatient?.gender === 'M' || dbPatient?.sexe === 'M') {
      checkCheckbox('check_sexe_m');
    } else if (dbPatient?.gender || dbPatient?.sexe) {
      checkCheckbox('check_sexe_f');
    }

    // Flatten to lock the data and remove invisible boxes
    form.flatten();

    // Download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `FSE_${lastName || dbPatient?.nom || 'Patient'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return blobUrl;

  } catch (error) {
    console.error("Erreur FSE :", error);
    throw error;
  }
};
