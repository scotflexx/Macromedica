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

    // 1. Spacing Helper Function
    const formatForBoxes = (text, spaceCount = 2) => {
      if (!text) return '';
      // Remove slashes, dashes, and spaces
      const cleanText = String(text).replace(/[^a-zA-Z0-9]/g, '');
      // Join each character with empty spaces
      return cleanText.split('').join(' '.repeat(spaceCount));
    };

    // 2. Variables (Cleaned and formatted)
    const firstName = dbPatient?.prenom || dbPatient?.first_name || '';
    const lastName = dbPatient?.nom || dbPatient?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim().toUpperCase();
    
    // Format dates to DDMMYYYY without slashes, then spread them out
    const rawDate = dbConsultation?.date || dbConsultation?.date_consult || new Date().toLocaleDateString('fr-FR');
    const todaySpaced = formatForBoxes(rawDate, 2); 
    const birthDateSpaced = formatForBoxes(dbPatient?.date_of_birth || dbPatient?.date_naissance, 2);
    
    // Format IDs
    const immatSpaced = formatForBoxes(dbPatient?.cnss_number || dbPatient?.n_immatriculation || dbPatient?.immatriculation, 2);
    const cinSpaced = formatForBoxes(dbPatient?.cin, 2);
    const inpeSpaced = formatForBoxes(dbDoctor?.inpe_code || dbDoctor?.inpe, 2);

    // 3. Fill Fields (Using the spaced variables)
    fillText('nom_assure', fullName);
    fillText('nom_patient', fullName);
    fillText('immatriculation', immatSpaced);
    fillText('cin_assure', cinSpaced);
    fillText('cin_patient', cinSpaced);
    fillText('adresse', dbPatient?.address || dbPatient?.adresse || '');
    
    // Remove the ' DH' string here so it doesn't double-print on the form
    fillText('montant_total', String(dbConsultation?.price || dbConsultation?.montant || dbConsultation?.billing_amount || '150.00'));
    
    fillText('pieces_jointes', '1');
    fillText('date_naissance', birthDateSpaced);
    fillText('inpe_medecin', inpeSpaced);
    fillText('date_patient', todaySpaced);
    fillText('date_medecin', todaySpaced);

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
