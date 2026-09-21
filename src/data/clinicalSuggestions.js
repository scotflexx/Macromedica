// Ready-to-click clinical phrases for the consultation modal (médecine générale, FR).
// Documentation aids only: NO drug names/doses are prescribed here. A physician
// must review this list before clinical rollout. Frequency ordering follows
// general-practice studies (e.g. ECOGEN); ICD-10 codes are WHO ICD-10.
// Item shape: string  |  { text, code? }   (code is appended to diagnoses)

export const MOTIFS = [
  { group: 'Fréquents', items: [
    'Renouvellement d\'ordonnance', 'Suivi de maladie chronique', 'Résultats d\'examens', 'Bilan de santé / check-up',
    'Certificat médical', 'Vaccination', 'Arrêt de travail', 'Contrôle après traitement', 'Fièvre', 'Fatigue',
  ]},
  { group: 'ORL / Respiratoire', items: [
    'Toux', 'Toux sèche', 'Toux productive', 'Rhume / nez qui coule', 'Mal de gorge', 'Nez bouché', 'Douleur d\'oreille',
    'Baisse de l\'audition', 'Sinusite / douleur faciale', 'Essoufflement', 'Sifflements', 'Enrouement / voix cassée',
    'Saignement de nez', 'Bourdonnements d\'oreille',
  ]},
  { group: 'Cardio-vasculaire', items: [
    'Douleur thoracique', 'Palpitations', 'Contrôle tension artérielle', 'Œdème des jambes', 'Essoufflement à l\'effort',
    'Malaise / syncope', 'Jambes lourdes', 'Vertiges',
  ]},
  { group: 'Digestif', items: [
    'Douleur abdominale', 'Nausées / vomissements', 'Diarrhée', 'Constipation', 'Brûlures d\'estomac', 'Ballonnements',
    'Perte d\'appétit', 'Difficultés à avaler', 'Sang dans les selles', 'Jaunisse', 'Hémorroïdes',
  ]},
  { group: 'Neurologique', items: [
    'Maux de tête', 'Migraine', 'Vertiges', 'Fourmillements / engourdissements', 'Perte de connaissance', 'Tremblements',
    'Troubles de la mémoire', 'Troubles du sommeil / insomnie', 'Faiblesse d\'un membre',
  ]},
  { group: 'Ostéo-articulaire', items: [
    'Douleur lombaire', 'Douleur cervicale', 'Douleur d\'épaule', 'Douleur de genou', 'Douleur de hanche', 'Douleur de cheville / entorse',
    'Douleur du poignet / de la main', 'Douleurs articulaires diffuses', 'Douleurs musculaires', 'Traumatisme / chute', 'Sciatique',
    'Douleur du pied / talon',
  ]},
  { group: 'Urinaire / Génital', items: [
    'Brûlures urinaires', 'Envies fréquentes d\'uriner', 'Sang dans les urines', 'Douleur lombaire type colique néphrétique',
    'Difficulté à uriner', 'Pertes vaginales', 'Douleurs pelviennes', 'Troubles des règles', 'Retard de règles', 'Contraception',
    'Suivi de grossesse', 'Douleur testiculaire',
  ]},
  { group: 'Peau', items: [
    'Éruption cutanée', 'Démangeaisons', 'Acné', 'Plaie / coupure', 'Brûlure', 'Verrue', 'Mycose', 'Piqûre / morsure',
    'Grain de beauté à surveiller', 'Chute de cheveux', 'Abcès / furoncle', 'Ongle incarné',
  ]},
  { group: 'Œil', items: [
    'Œil rouge', 'Baisse de la vue', 'Larmoiement', 'Corps étranger oculaire', 'Paupière gonflée',
  ]},
  { group: 'Général / Psy', items: [
    'Perte de poids', 'Prise de poids', 'Soif intense', 'Anxiété / stress', 'Humeur triste', 'Épuisement / burn-out',
    'Sueurs nocturnes', 'Ganglions', 'Frissons', 'Courbatures', 'Sevrage tabagique',
  ]},
  { group: 'Pédiatrie', items: [
    'Fièvre chez l\'enfant', 'Suivi de croissance', 'Pleurs / coliques du nourrisson', 'Otites à répétition', 'Vomissements chez l\'enfant',
    'Éruption chez l\'enfant', 'Contrôle post-vaccinal', 'Retard de langage',
  ]},
]

export const HISTOIRE = [
  { group: 'Début', items: [
    'Début brutal.', 'Début progressif.', 'Depuis 24 heures.', 'Depuis 2-3 jours.', 'Depuis environ une semaine.',
    'Depuis plus de 2 semaines.', 'Depuis plusieurs mois.', 'Premier épisode.', 'Épisodes récidivants.', 'Symptômes stables depuis le début.',
    'Aggravation progressive.', 'Amélioration spontanée partielle.',
  ]},
  { group: 'Caractéristiques', items: [
    'Douleur type pesanteur.', 'Douleur type brûlure.', 'Douleur type crampe.', 'Douleur type coup de poignard.', 'Douleur pulsatile.',
    'Douleur intermittente.', 'Douleur permanente.', 'Douleur irradiant vers le bras.', 'Douleur irradiant vers le dos.',
    'Douleur irradiant vers la jambe.', 'Intensité estimée à /10.', 'Douleur nocturne réveillant le patient.',
  ]},
  { group: 'Facteurs', items: [
    'Aggravé par l\'effort.', 'Aggravé par les repas.', 'Aggravé par le mouvement.', 'Aggravé en position allongée.',
    'Soulagé par le repos.', 'Soulagé par la prise d\'antalgiques.', 'Soulagé par la position assise penchée en avant.',
    'Pas de facteur déclenchant identifié.', 'Suite à un effort inhabituel.', 'Suite à un traumatisme.', 'Suite à un repas.',
  ]},
  { group: 'Signes associés', items: [
    'Fièvre associée.', 'Frissons.', 'Sueurs nocturnes.', 'Perte d\'appétit.', 'Perte de poids non intentionnelle.', 'Fatigue.',
    'Nausées.', 'Vomissements.', 'Diarrhée.', 'Constipation.', 'Céphalées associées.', 'Vertiges associés.',
    'Essoufflement associé.', 'Toux associée.', 'Éruption cutanée associée.', 'Sans signe associé.',
    'Pas de fièvre.', 'Pas de perte de poids.', 'Pas de douleur thoracique.', 'Pas de dyspnée.',
  ]},
  { group: 'Traitements essayés', items: [
    'Automédication sans amélioration.', 'Traitement antérieur efficace.', 'Traitement antérieur mal toléré.',
    'Pas de traitement essayé.', 'Bonne observance du traitement habituel.', 'Observance irrégulière du traitement.',
    'Arrêt du traitement de sa propre initiative.',
  ]},
  { group: 'Contexte', items: [
    'Contage infectieux dans l\'entourage.', 'Voyage récent.', 'Notion de stress important.', 'Sommeil perturbé.',
    'Tabagisme actif.', 'Ancien fumeur.', 'Pas de tabagisme.', 'Consommation d\'alcool occasionnelle.', 'Pas de prise d\'alcool.',
    'Activité physique régulière.', 'Sédentarité.', 'Profession à risque (port de charges / station debout prolongée).',
    'Antécédents familiaux de la même pathologie.', 'Dernières règles il y a ... semaines.',
  ]},
]

export const EXAMEN = [
  { group: 'Général', items: [
    'État général conservé.', 'Patient apyrétique.', 'Patient fébrile.', 'Patient fatigué, asthénique.', 'Pâleur cutanéo-muqueuse.',
    'Conjonctives normalement colorées.', 'Pas d\'ictère.', 'Pas de déshydratation.', 'Pas d\'adénopathie périphérique palpable.',
    'Adénopathies cervicales palpables, mobiles, sensibles.', 'Pas d\'œdème des membres inférieurs.', 'Œdèmes des membres inférieurs bilatéraux.',
    'Conscient, orienté dans le temps et l\'espace.',
  ]},
  { group: 'ORL', items: [
    'Pharynx érythémateux.', 'Pharynx normal.', 'Amygdales hypertrophiées, érythémateuses.', 'Amygdales avec enduit.', 'Tympans normaux, bien visibles.',
    'Tympan rouge, bombé.', 'Tympan terne, épanchement rétro-tympanique.', 'Conduits auditifs libres.', 'Bouchon de cérumen.',
    'Fosses nasales congestives, rhinorrhée claire.', 'Rhinorrhée purulente.', 'Sensibilité à la palpation des sinus.', 'Adénopathies cervicales sensibles.',
  ]},
  { group: 'Cardio-pulmonaire', items: [
    'Bruits du cœur réguliers, sans souffle.', 'Souffle systolique.', 'Rythme irrégulier.', 'Tachycardie.', 'Bradycardie.',
    'Pouls périphériques perçus et symétriques.', 'Auscultation pulmonaire normale, murmure vésiculaire symétrique.', 'Râles crépitants.',
    'Râles sibilants.', 'Ronchi diffus.', 'Diminution du murmure vésiculaire.', 'Pas de signe de lutte respiratoire.', 'Polypnée.',
    'Pas de turgescence jugulaire.', 'Pas de signe de phlébite.',
  ]},
  { group: 'Abdomen', items: [
    'Abdomen souple, dépressible, indolore.', 'Abdomen sensible à la palpation.', 'Douleur épigastrique à la palpation.', 'Douleur de la fosse iliaque droite.',
    'Douleur de la fosse iliaque gauche.', 'Défense abdominale.', 'Pas de défense, pas de contracture.', 'Bruits hydro-aériques présents.',
    'Pas d\'hépatosplénomégalie.', 'Météorisme abdominal.', 'Points ureteraux non douloureux.', 'Fosses lombaires libres, Giordano négatif.',
    'Giordano positif à droite.', 'Giordano positif à gauche.', 'Orifices herniaires libres.',
  ]},
  { group: 'Neurologique', items: [
    'Examen neurologique sans particularité.', 'Pas de déficit moteur.', 'Force musculaire conservée aux 4 membres.', 'Réflexes ostéo-tendineux présents et symétriques.',
    'Pas de trouble sensitif.', 'Pas de raideur méningée.', 'Marche normale.', 'Équilibre conservé (Romberg négatif).', 'Pas de nystagmus.',
    'Paires crâniennes sans particularité.', 'Signe de Lasègue positif.', 'Signe de Lasègue négatif.',
  ]},
  { group: 'Ostéo-articulaire', items: [
    'Rachis lombaire : contracture paravertébrale.', 'Rachis cervical : mobilité limitée et douloureuse.', 'Mobilité articulaire conservée.', 'Mobilité limitée par la douleur.',
    'Articulation chaude, gonflée.', 'Pas de signe inflammatoire local.', 'Épanchement articulaire.', 'Douleur à la palpation de l\'interligne articulaire.',
    'Test de Lachman négatif.', 'Pas de laxité ligamentaire.', 'Œdème de la cheville, douleur à la palpation du ligament.', 'Ecchymose locale.',
    'Appui monopodal possible.', 'Douleur à la mobilisation de l\'épaule.',
  ]},
  { group: 'Peau', items: [
    'Éruption maculo-papuleuse.', 'Éruption érythémateuse, prurigineuse.', 'Lésions de grattage.', 'Vésicules groupées.', 'Plaques érythémato-squameuses.',
    'Lésion cutanée bien limitée.', 'Peau sèche.', 'Plaie propre, non infectée.', 'Signes d\'infection locale (rougeur, chaleur, pus).', 'Pas de lésion suspecte.',
    'Urticaire en plaques.', 'Lésions pustuleuses du visage.',
  ]},
  { group: 'Urogénital', items: [
    'Pas de globe vésical.', 'Bandelette urinaire : leucocytes positifs.', 'Bandelette urinaire : nitrites positifs.', 'Bandelette urinaire négative.',
    'Bandelette urinaire : hématurie.', 'Pas de douleur sus-pubienne.', 'Testicules indolores, sans masse.',
  ]},
  { group: 'Œil', items: [
    'Conjonctive rouge, sécrétions.', 'Acuité visuelle conservée.', 'Pupilles symétriques, réactives.', 'Pas de rougeur ciliaire.',
  ]},
  { group: 'Examens normaux (rapides)', items: [
    'Examen cardio-pulmonaire sans particularité.', 'Examen abdominal sans particularité.', 'Examen ORL sans particularité.',
    'Examen neurologique sans particularité.', 'Examen cutané sans particularité.', 'Examen ostéo-articulaire sans particularité.',
  ]},
]

const d = (text, code) => ({ text, code })

export const DIAGNOSTICS = [
  { group: 'Cardio-vasculaire', items: [
    d('Hypertension artérielle essentielle', 'I10'), d('Cardiopathie ischémique chronique', 'I25.9'), d('Fibrillation auriculaire', 'I48.9'),
    d('Insuffisance cardiaque', 'I50.9'), d('Varices des membres inférieurs', 'I83.9'), d('Hypotension orthostatique', 'I95.1'),
    d('Douleur thoracique non cardiaque à préciser', 'R07.4'), d('Palpitations', 'R00.2'), d('Insuffisance veineuse chronique', 'I87.2'),
  ]},
  { group: 'Endocrino-métabolique', items: [
    d('Diabète de type 2', 'E11.9'), d('Diabète de type 1', 'E10.9'), d('Dyslipidémie', 'E78.5'), d('Obésité', 'E66.9'),
    d('Hypothyroïdie', 'E03.9'), d('Hyperthyroïdie', 'E05.9'), d('Carence en vitamine D', 'E55.9'), d('Anémie ferriprive', 'D50.9'),
    d('Hyperuricémie', 'E79.0'), d('Surpoids', 'E66.3'),
  ]},
  { group: 'ORL / Respiratoire', items: [
    d('Rhinopharyngite aiguë', 'J00'), d('Pharyngite aiguë', 'J02.9'), d('Angine aiguë (amygdalite)', 'J03.9'), d('Sinusite aiguë', 'J01.9'),
    d('Infection aiguë des voies respiratoires supérieures', 'J06.9'), d('Bronchite aiguë', 'J20.9'), d('Pneumopathie', 'J18.9'),
    d('Asthme', 'J45.9'), d('BPCO', 'J44.9'), d('Rhinite allergique', 'J30.4'), d('Grippe', 'J11.1'), d('Otite moyenne aiguë', 'H66.9'),
    d('Otite externe', 'H60.9'), d('Laryngite aiguë', 'J04.0'), d('Toux à préciser', 'R05'),
  ]},
  { group: 'Digestif', items: [
    d('Gastrite', 'K29.7'), d('Reflux gastro-œsophagien', 'K21.9'), d('Dyspepsie fonctionnelle', 'K30'), d('Gastro-entérite aiguë', 'A09'),
    d('Constipation', 'K59.0'), d('Syndrome de l\'intestin irritable', 'K58.9'), d('Lithiase biliaire', 'K80.2'), d('Stéatose hépatique', 'K76.0'),
    d('Hémorroïdes', 'K64.9'), d('Douleur abdominale à préciser', 'R10.4'), d('Colopathie fonctionnelle', 'K58.9'), d('Parasitose intestinale', 'B82.9'),
  ]},
  { group: 'Neuro / Psy', items: [
    d('Migraine', 'G43.9'), d('Céphalée de tension', 'G44.2'), d('Céphalée à préciser', 'R51'), d('Vertige à préciser', 'R42'),
    d('Insomnie', 'G47.0'), d('Trouble anxieux généralisé', 'F41.1'), d('Épisode dépressif', 'F32.9'), d('Syndrome du canal carpien', 'G56.0'),
    d('Névralgie cervico-brachiale', 'M54.1'), d('Trouble de l\'adaptation / stress', 'F43.2'), d('Lipothymie / malaise', 'R55'),
  ]},
  { group: 'Ostéo-articulaire', items: [
    d('Lombalgie', 'M54.5'), d('Sciatique', 'M54.3'), d('Cervicalgie', 'M54.2'), d('Gonarthrose', 'M17.9'), d('Arthrose', 'M19.9'),
    d('Tendinopathie de la coiffe des rotateurs', 'M75.1'), d('Épicondylite latérale', 'M77.1'), d('Myalgies', 'M79.1'), d('Goutte', 'M10.9'),
    d('Entorse de cheville', 'S93.4'), d('Arthralgies', 'M25.5'), d('Ostéoporose', 'M81.9'), d('Fibromyalgie', 'M79.7'), d('Fasciite plantaire', 'M72.2'),
    d('Contusion', 'T14.0'), d('Torticolis', 'M43.6'),
  ]},
  { group: 'Uro-génital', items: [
    d('Cystite aiguë', 'N30.0'), d('Infection urinaire', 'N39.0'), d('Pyélonéphrite aiguë', 'N10'), d('Lithiase urinaire / colique néphrétique', 'N20.0'),
    d('Hypertrophie bénigne de la prostate', 'N40'), d('Vaginite / vulvovaginite', 'N76.0'), d('Candidose vulvovaginale', 'B37.3'),
    d('Ménorragies', 'N92.0'), d('Dysménorrhée', 'N94.6'), d('Aménorrhée à préciser', 'N91.2'),
  ]},
  { group: 'Peau', items: [
    d('Dermatite atopique / eczéma', 'L20.9'), d('Eczéma de contact', 'L23.9'), d('Urticaire', 'L50.9'), d('Acné', 'L70.0'), d('Mycose cutanée (dermatophytie)', 'B35.9'),
    d('Zona', 'B02.9'), d('Verrues virales', 'B07'), d('Abcès cutané / furoncle', 'L02.9'), d('Gale', 'B86'), d('Psoriasis', 'L40.9'),
    d('Dermite séborrhéique', 'L21.9'), d('Impétigo', 'L01.0'), d('Prurit à préciser', 'L29.9'),
  ]},
  { group: 'Infectieux / Pédiatrie', items: [
    d('Syndrome grippal', 'J11.1'), d('Fièvre à préciser', 'R50.9'), d('Varicelle', 'B01.9'), d('Rougeole', 'B05.9'), d('Oreillons', 'B26.9'),
    d('Scarlatine', 'A38'), d('Infection virale non précisée', 'B34.9'), d('Mononucléose infectieuse', 'B27.9'), d('Conjonctivite', 'H10.9'),
    d('Bronchiolite', 'J21.9'),
  ]},
  { group: 'Prévention / Administratif', items: [
    d('Examen de santé / bilan', 'Z00.0'), d('Vaccination', 'Z23'), d('Renouvellement d\'ordonnance', 'Z76.0'), d('Certificat médical', 'Z02.7'),
    d('Surveillance de grossesse normale', 'Z34.9'), d('Contraception', 'Z30.9'), d('Conseil / éducation thérapeutique', 'Z71.9'),
    d('Sevrage tabagique', 'Z71.6'),
  ]},
]

export const PLANS = [
  { group: 'Examens complémentaires', items: [
    'Bilan biologique : NFS, CRP.', 'Bilan biologique : glycémie à jeun, HbA1c.', 'Bilan lipidique.', 'Bilan rénal : créatinine, DFG.',
    'Bilan hépatique.', 'Bilan thyroïdien : TSH.', 'Ionogramme sanguin.', 'Bilan martial : ferritine.', 'ECG de repos.', 'Radiographie thoracique.',
    'Radiographie du rachis lombaire.', 'Radiographie de la cheville.', 'Radiographie du genou.', 'Échographie abdominale.', 'Échographie pelvienne.',
    'Échographie des parties molles.', 'ECBU.', 'Prélèvement de gorge (TDR angine).', 'Scanner à discuter.', 'IRM à discuter.', 'Holter tensionnel (MAPA).',
    'Échocardiographie.',
  ]},
  { group: 'Traitement', items: [
    'Traitement symptomatique.', 'Antalgique si douleur.', 'Antipyrétique si fièvre.', 'Poursuite du traitement habituel.', 'Renouvellement du traitement en cours.',
    'Adaptation du traitement.', 'Ordonnance remise.', 'Arrêt du traitement en cause.', 'Traitement local.', 'Soins locaux de la plaie.',
    'Éviction des allergènes.', 'Pas de traitement médicamenteux nécessaire.',
  ]},
  { group: 'Conseils', items: [
    'Repos.', 'Hydratation abondante.', 'Lavages de nez au sérum physiologique.', 'Alimentation équilibrée, pauvre en sel.', 'Régime pauvre en sucres rapides.',
    'Activité physique régulière conseillée.', 'Perte de poids conseillée.', 'Arrêt du tabac conseillé.', 'Limiter la consommation d\'alcool.',
    'Mesure de la tension à domicile.', 'Auto-surveillance glycémique.', 'Éviter le port de charges lourdes.', 'Application de chaud / froid local.',
    'Kinésithérapie / rééducation.', 'Glaçage, repos, compression, surélévation (entorse).', 'Bonne hygiène du sommeil.', 'Gestion du stress.',
    'Éducation thérapeutique dispensée.', 'Conseils de prévention donnés.',
  ]},
  { group: 'Orientation / Suivi', items: [
    'Avis spécialisé : cardiologue.', 'Avis spécialisé : endocrinologue.', 'Avis spécialisé : pneumologue.', 'Avis spécialisé : gastro-entérologue.',
    'Avis spécialisé : neurologue.', 'Avis spécialisé : rhumatologue.', 'Avis spécialisé : dermatologue.', 'Avis spécialisé : ORL.',
    'Avis spécialisé : ophtalmologue.', 'Avis spécialisé : urologue.', 'Avis spécialisé : gynécologue.', 'Orientation aux urgences si aggravation.',
    'Contrôle dans 48-72 heures si pas d\'amélioration.', 'Contrôle dans 1 semaine.', 'Contrôle dans 1 mois avec résultats.', 'Revoir en cas de fièvre persistante.',
    'Consulter en urgence si douleur thoracique, essoufflement ou malaise.',
  ]},
  { group: 'Administratif', items: [
    'Arrêt de travail délivré.', 'Certificat médical délivré.', 'Prolongation d\'arrêt de travail.', 'Certificat d\'aptitude sportive.',
    'Vaccination réalisée.', 'Carnet de santé mis à jour.',
  ]},
]

export const SUGGESTIONS_BY_KIND = {
  motif: { data: MOTIFS, joiner: ', ' },
  histoire: { data: HISTOIRE, joiner: ' ' },
  examen: { data: EXAMEN, joiner: ' ' },
  diagnostic: { data: DIAGNOSTICS, joiner: '\n' },
  plan: { data: PLANS, joiner: '\n' },
}

export const suggestionCount = () =>
  Object.values(SUGGESTIONS_BY_KIND).reduce((n, k) => n + k.data.reduce((m, g) => m + g.items.length, 0), 0)
