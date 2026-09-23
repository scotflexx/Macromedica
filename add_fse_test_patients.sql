-- =============================================================================
-- ADD FSE TEST PATIENTS (with full CIN, CNSS, date_naissance, sexe, adresse)
-- Run this in your Supabase SQL Editor.
-- Replace YOUR_CABINET_ID below with your actual cabinet/clinic ID.
-- =============================================================================

-- 1. First find your cabinet_id (uncomment to run separately):
-- SELECT id, nom FROM cabinets LIMIT 5;

DO $$
DECLARE
  v_cabinet_id UUID;
BEGIN
  -- Auto-detect the first cabinet (change this if you have multiple)
  SELECT id INTO v_cabinet_id FROM cabinets LIMIT 1;

  IF v_cabinet_id IS NULL THEN
    RAISE EXCEPTION 'No cabinet found. Please create a cabinet first.';
  END IF;

  RAISE NOTICE 'Inserting patients for cabinet: %', v_cabinet_id;

  INSERT INTO patients (
    cabinet_id,
    nom, prenom,
    sexe,
    date_naissance,
    cin,
    numero_cnss,
    telephone,
    adresse,
    ville,
    mutuelle,
    email
  ) VALUES
    (v_cabinet_id, 'ALAOUI', 'Youssef', 'M', '1990-05-15', 'AB123456', '112233445', '+212661112233', '24 Boulevard d''Anfa, Quartier Gauthier', 'Casablanca', 'CNSS', 'youssef.alaoui@email.ma'),
    (v_cabinet_id, 'BENNANI', 'Fatima Zahra', 'F', '1985-11-22', 'CD987654', '998877665', '+212662223344', '12 Rue de Fès, Quartier Agdal', 'Rabat', 'CNSS', 'fatima.bennani@email.ma'),
    (v_cabinet_id, 'TAZI', 'Karim', 'M', '2000-02-08', 'EE556677', '102938475', '+212663334455', '56 Avenue Hassan II', 'Temara', 'CNSS', 'karim.tazi@email.ma'),
    (v_cabinet_id, 'CHRAIBI', 'Meryem', 'F', '1992-07-30', 'BH112233', '564738291', '+212664445566', '88 Boulevard Zerktouni', 'Salé', 'CNSS', 'meryem.chraibi@email.ma'),
    (v_cabinet_id, 'IDRISSI', 'Omar', 'M', '1978-12-12', 'ZG889900', '192837465', '+212665556677', '34 Avenue Pasteur', 'Kénitra', 'CNSS', 'omar.idrissi@email.ma'),
    (v_cabinet_id, 'BENNIS', 'Sara', 'F', '1995-04-05', 'AE445566', '918273645', '+212666667788', '72 Rue Jean Jaurès', 'Mohammedia', 'CNSS', 'sara.bennis@email.ma'),
    (v_cabinet_id, 'EL FASSI', 'Mehdi', 'M', '1988-09-19', 'BK334455', '112211223', '+212667778899', '19 Boulevard Mohammed V, Quartier Hassan', 'Rabat', 'CNSS', 'mehdi.elfassi@email.ma'),
    (v_cabinet_id, 'LAHLOU', 'Najat', 'F', '1965-01-25', 'CB223344', '445566778', '+212668889900', '41 Avenue du 2 Mars', 'Casablanca', 'CNSS', 'najat.lahlou@email.ma'),
    (v_cabinet_id, 'KETTANI', 'Amine', 'M', '2002-06-14', 'WA778899', '334455667', '+212669990011', '103 Boulevard Abdelmoumen', 'Tanger', 'CNSS', 'amine.kettani@email.ma'),
    (v_cabinet_id, 'BERRADA', 'Houda', 'F', '1999-11-03', 'PA112211', '990011223', '+212670123456', '27 Avenue Hassan II, Ville Nouvelle', 'Fès', 'CNSS', 'houda.berrada@email.ma')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Done! 10 test patients inserted.';
END $$;

-- Verify:
SELECT nom, prenom, cin, numero_cnss, sexe, date_naissance, ville
FROM patients
WHERE cin IN ('AB123456','CD987654','EE556677','BH112233','ZG889900',
              'AE445566','BK334455','CB223344','WA778899','PA112211')
ORDER BY nom;
