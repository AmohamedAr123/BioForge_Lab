import { AntibioticCompound, BacterialSpecies, MediaRecipe, NutrientSupplement } from '../types/lab';

export const BACTERIAL_SPECIES: BacterialSpecies[] = [
  {
    id: 'ecoli_k12',
    scientificName: 'Escherichia coli',
    strainCode: 'K-12 MG1655',
    commonLabel: 'E. coli K-12',
    biosafetyLevel: 'BSL-1',
    gramStatus: 'negative',
    shape: 'bacillus',
    arrangement: 'single',
    lengthUm: 2.0,
    widthUm: 0.8,
    motile: true,
    oxygenRequirement: 'facultative_anaerobe',
    oxygenKmPercent: 7,
    tempMinC: 10,
    tempOptC: 37,
    tempMaxC: 46,
    phMin: 4.5,
    phOpt: 7.0,
    phMax: 8.8,
    acidificationDrive: 0.95,
    minDoublingTimeMin: 20,
    minimalMediaFactor: 0.52,
    fermentsLactose: true,
    growsOnMacConkey: true,
    colonyProfile: {
      colorHex: '#E5DEC9',
      edgeHex: '#C7BEA3',
      macConkeyColorHex: '#EC4899',
      opacity: 0.9,
      maxDiameterMm: 3.2,
      description:
        'Circular, smooth, off-white colonies on LB agar; bright pink/magenta on MacConkey agar due to lactose fermentation.',
    },
    micUgPerMl: {
      ampicillin: 4.0,
      kanamycin: 4.0,
      chloramphenicol: 4.0,
      ciprofloxacin: 0.03,
    },
    carryingCapacityCfuPerMl: 3.5e9,
    summary:
      'Model Gram-negative enteric rod (Gammaproteobacteria). Standard wild-type reference strain with peritrichous flagella and ~20 min doubling time in rich LB medium at 37 °C.',
    beginnerSummary:
      'Think of E. coli K-12 as the "standard workhorse" of molecular biology. It is a harmless, domesticated laboratory strain (BSL-1) originally isolated in 1922. Because it grows fast, eats simple sugars, and has no built-in antibiotic resistance, it serves as the baseline control for almost every experiment.',
    microscopyGuide:
      'Under the microscope it looks like small pink/red rods (Gram-negative) floating singly. In Phase Contrast or Brightfield above 12 °C, you will see cells actively swimming and tumbling because they use tiny whip-like flagella.',
    growthGuide:
      'Grows fastest at 37 °C, pH 7.0 with shaking (220 RPM) in LB Broth, doubling every ~20 minutes. Also grows in M9 Minimal glucose medium (~50% slower) because it can synthesize all its own amino acids. Ferments glucose/lactose into organic acids (lowering poorly buffered broth pH), and turns MacConkey Agar bright pink.',
    geneticsGuide:
      'Carries the universal bacterial 16S rRNA gene (920 bp amplicon) and the lactose-digesting lacZ marker gene (680 bp amplicon). It does NOT carry the bla (AmpR) plasmid gene, so Ampicillin kills it.',
    howToUseExperiments: [
      'Baseline Growth Curve: Grow in LB Broth at 37 °C, pH 7.0, 220 RPM and measure OD600 every hour.',
      'pH Stress Experiment: Formulate two LB flasks at pH 5.2 vs. pH 7.0 to observe continuous lag & rate shifts.',
      'MacConkey Differentiation: Streak onto MacConkey Agar to see bright pink lactose-positive colonies.',
      'Antibiotic Negative Control: Compare against E. coli [pUC-AmpR] in 100 µg/mL Ampicillin to prove wild-type susceptibility.',
      'Diagnostic PCR: Extract DNA and amplify the 680 bp lacZ marker gene.',
    ],
    markerGenes: ['16S rRNA (920 bp)', 'lacZ (680 bp)'],
    realLifeDossier: {
      taxonomy: 'Pseudomonadota · Gammaproteobacteria · Enterobacteriaceae · Escherichia coli K-12 MG1655',
      naturalHabitat:
        'Warm-blooded vertebrate lower intestine (commensal gut flora). Strain K-12 was isolated from a human patient in Palo Alto (1922) and lost its intestinal colonization virulence factors after decades in lab culture.',
      cellEnvelope:
        'Gram-negative double-membrane architecture: thin 2–7 nm peptidoglycan layer inside the periplasmic space, surrounded by an asymmetric outer membrane rich in lipopolysaccharide (LPS) and OmpF/OmpC porin channels, plus peritrichous flagella.',
      metabolismAndCarbon:
        'Facultative anaerobe and metabolic prototroph: respires O2 maximally at 37 °C or switches seamlessly to mixed-acid fermentation (producing lactate, acetate, and succinate) when oxygen drops. Ferments both D-glucose and lactose via the lac operon.',
      temperatureAndPhNotes:
        'Mesophile thriving across 10–46 °C (sharp optimum at 37.0 °C; rapid protein denaturation above 46 °C). Tolerates pH 4.5–8.8 with peak growth at pH 6.8–7.2; fermentation of sugars steadily acidifies weakly buffered media unless phosphate buffer (like M9) is present.',
      optimalProtocol:
        'LB Miller Broth at 37.0 °C, starting pH 7.0, 220–250 RPM shaking. Harvest at OD600 0.6–1.2 for exponential physiology or 1.5–2.5 for maximal genomic DNA yield.',
      clinicalAndBiotechRole:
        'The single most studied organism in biology. Used globally for insulin/biologic manufacturing, plasmid cloning baselines, molecular genetics teaching, and antimicrobial susceptibility QC.',
      antibioticProfiles: {
        ampicillin: {
          verdict: 'susceptible',
          summary: 'Killed cleanly (MIC 4 µg/mL). Standard 100 µg/mL rapidly lyses dividing cells.',
          mechanism: 'Crosses outer membrane porins and blocks peptidoglycan cross-linking PBPs; no beta-lactamase present.',
        },
        kanamycin: {
          verdict: 'susceptible',
          summary: 'Killed cleanly (MIC 4 µg/mL). Requires oxygen/neutral pH for peak PMF uptake.',
          mechanism: 'Binds 30S ribosome causing lethal translational misreading; less effective in acidic (< pH 6.0) or hypoxic broth.',
        },
        chloramphenicol: {
          verdict: 'susceptible',
          summary: 'Growth arrested (MIC 4 µg/mL). Bacteriostatic pause without rapid lysis.',
          mechanism: 'Blocks 50S peptidyl transferase center; stops elongation cleanly.',
        },
        ciprofloxacin: {
          verdict: 'susceptible',
          summary: 'Ultra-potently killed (MIC 0.03 µg/mL). Even 0.2 µg/mL sterilizes wild-type cells.',
          mechanism: 'Traps DNA gyrase–DNA cleavage complexes creating lethal chromosome breaks.',
        },
      },
    },
    citations: [
      {
        source: 'Bergey’s Manual of Determinative Bacteriology / EcoCyc',
        note: 'Morphology, 20 min optimal doubling time in LB at 37 °C, pH 4.5–8.8 range, lactose fermentation, and facultative anaerobe physiology.',
        epistemicTag: 'established_fact',
      },
      {
        source: 'CLSI / EUCAST Wild-Type MIC Distributions',
        note: 'Wild-type susceptibility breakpoints for ampicillin, kanamycin, chloramphenicol, and ciprofloxacin.',
        epistemicTag: 'established_fact',
      },
    ],
  },
  {
    id: 'ecoli_puc_ampr',
    scientificName: 'Escherichia coli',
    strainCode: 'DH5α [pUC-AmpR]',
    commonLabel: 'E. coli [pUC-AmpR]',
    biosafetyLevel: 'BSL-1',
    gramStatus: 'negative',
    shape: 'bacillus',
    arrangement: 'single',
    lengthUm: 2.0,
    widthUm: 0.8,
    motile: true,
    oxygenRequirement: 'facultative_anaerobe',
    oxygenKmPercent: 7,
    tempMinC: 10,
    tempOptC: 37,
    tempMaxC: 45,
    phMin: 4.8,
    phOpt: 7.0,
    phMax: 8.6,
    acidificationDrive: 0.9,
    minDoublingTimeMin: 23,
    minimalMediaFactor: 0.48,
    fermentsLactose: true,
    growsOnMacConkey: true,
    colonyProfile: {
      colorHex: '#EAE3CE',
      edgeHex: '#C7BEA3',
      macConkeyColorHex: '#F43F5E',
      opacity: 0.9,
      maxDiameterMm: 3.0,
      description:
        'Smooth off-white colonies on LB + Ampicillin (100 µg/mL) selective agar; pink colonies on MacConkey agar.',
    },
    micUgPerMl: {
      ampicillin: 512.0,
      kanamycin: 4.0,
      chloramphenicol: 4.0,
      ciprofloxacin: 0.03,
    },
    carryingCapacityCfuPerMl: 3.2e9,
    summary:
      'Engineered cloning strain of E. coli harboring a high-copy circular pUC-AmpR plasmid (2,686 bp) encoding beta-lactamase (bla) for Ampicillin resistance and a Multiple Cloning Site (MCS).',
    beginnerSummary:
      'This is an E. coli strain carrying a tiny circular bonus piece of DNA called a plasmid (pUC-AmpR). That plasmid carries a gene called bla (AmpR) that makes an enzyme (beta-lactamase) which chops up Ampicillin. Scientists use plasmids like this to carry custom genes and select only the engineered bacteria using antibiotics.',
    microscopyGuide:
      'Looks identical to wild-type E. coli K-12 under the microscope (pink Gram-negative motile rods)—you cannot see DNA or plasmids through a light microscope! To tell them apart, you must test Ampicillin survival or run PCR / Restriction Digestion.',
    growthGuide:
      'Grows slightly slower (~23 min doubling time) than K-12 because copying hundreds of plasmids costs extra ATP. Thrives at 37 °C, pH 7.0 even in LB + 100 µg/mL Ampicillin! Still killed by Kanamycin, Chloramphenicol, and Ciprofloxacin.',
    geneticsGuide:
      'Harbors the 2,686 bp circular pUC-AmpR plasmid in addition to chromosomal 16S rRNA and lacZ. Ideal for testing bla (AmpR) PCR (510 bp band) and cutting the plasmid with EcoRI, BamHI, HindIII, or PstI in the Restriction Digest Bench.',
    howToUseExperiments: [
      'Plasmid Selection: Grow in LB + 100 µg/mL Ampicillin alongside wild-type E. coli K-12 to observe selective survival.',
      'Plasmid Miniprep & Restriction Digest: Extract DNA, cut pUC-AmpR with EcoRI + PstI, and verify the two cleaved fragments on an Agarose Gel.',
      'Resistance Gene PCR: Amplify the 510 bp bla (AmpR) gene to confirm plasmid presence molecularly.',
    ],
    markerGenes: ['16S rRNA (920 bp)', 'lacZ (680 bp)', 'bla / AmpR (510 bp)', 'pUC-AmpR Plasmid (2,686 bp)'],
    harboredPlasmidId: 'seq_puc_ampr',
    realLifeDossier: {
      taxonomy: 'Pseudomonadota · Enterobacteriaceae · Engineered E. coli DH5α carrying pUC19-series high-copy vector',
      naturalHabitat:
        'Strictly domesticated molecular cloning strain engineered for high plasmid yield (endA1/recA1 mutations prevent plasmid degradation and recombination).',
      cellEnvelope:
        'Gram-negative rod envelope identical to K-12, except periplasmic space is packed with secreted TEM-1 beta-lactamase enzymes hydrolyzing beta-lactam rings before they reach PBPs.',
      metabolismAndCarbon:
        'Facultative anaerobe fermenting glucose and lactose; high plasmid copy number (~500 copies/cell) imposes a ~15% metabolic ATP burden, slightly extending doubling time to 23 min.',
      temperatureAndPhNotes:
        'Optimal 37.0 °C and pH 7.0 (usable pH 4.8–8.6). Slightly lower heat ceiling (45 °C) than wild-type K-12 due to plasmid metabolic load.',
      optimalProtocol:
        'LB Broth + 100 µg/mL Ampicillin at 37.0 °C, pH 7.0, 220 RPM. Ampicillin maintains selective pressure so plasmid-free segregants cannot take over.',
      clinicalAndBiotechRole:
        'Prototype for virtually all recombinant gene cloning, synthetic biology vector propagation, and plasmid DNA production pipelines.',
      antibioticProfiles: {
        ampicillin: {
          verdict: 'resistant_plasmid',
          summary: 'Resistant up to 512 µg/mL! Safe to add 50–150 µg/mL Ampicillin to select specifically for this strain.',
          mechanism: 'Plasmid bla gene expresses TEM-1 beta-lactamase, cleaving Ampicillin’s beta-lactam ring.',
        },
        kanamycin: {
          verdict: 'susceptible',
          summary: 'Killed cleanly (MIC 4 µg/mL). pUC-AmpR carries AmpR only, NOT KanR.',
          mechanism: 'No aminoglycoside-modifying enzyme on plasmid; 30S ribosomes remain fully vulnerable.',
        },
        chloramphenicol: {
          verdict: 'susceptible',
          summary: 'Growth arrested (MIC 4 µg/mL). pUC-AmpR confers no chloramphenicol resistance.',
          mechanism: 'Binds 50S ribosome and halts protein translation.',
        },
        ciprofloxacin: {
          verdict: 'susceptible',
          summary: 'Killed cleanly (MIC 0.03 µg/mL). Plasmid offers zero protection.',
          mechanism: 'Inhibits chromosomal DNA gyrase causing lethal dsDNA breaks.',
        },
      },
    },
    citations: [
      {
        source: 'Yanisch-Perron et al. (1985) / Sambrook Molecular Cloning',
        note: 'High-copy pUC19 plasmid architecture (2,686 bp), bla beta-lactamase ampicillin selection (>500 µg/mL), and MCS restriction sites.',
        epistemicTag: 'established_fact',
      },
    ],
  },
  {
    id: 'bsubtilis_168',
    scientificName: 'Bacillus subtilis',
    strainCode: '168',
    commonLabel: 'B. subtilis 168',
    biosafetyLevel: 'BSL-1',
    gramStatus: 'positive',
    shape: 'bacillus',
    arrangement: 'chains',
    lengthUm: 3.6,
    widthUm: 0.9,
    motile: true,
    oxygenRequirement: 'aerobe',
    oxygenKmPercent: 18,
    tempMinC: 12,
    tempOptC: 35,
    tempMaxC: 48,
    phMin: 5.2,
    phOpt: 7.0,
    phMax: 8.6,
    acidificationDrive: 0.45,
    minDoublingTimeMin: 28,
    minimalMediaFactor: 0.45,
    fermentsLactose: false,
    growsOnMacConkey: false,
    colonyProfile: {
      colorHex: '#EDE7D5',
      edgeHex: '#D1C7AD',
      opacity: 0.95,
      maxDiameterMm: 4.8,
      description:
        'Large, opaque, cream-colored matte colonies with slightly wrinkled margins; completely inhibited on MacConkey agar.',
    },
    micUgPerMl: {
      ampicillin: 1.0,
      kanamycin: 2.0,
      chloramphenicol: 4.0,
      ciprofloxacin: 0.12,
    },
    carryingCapacityCfuPerMl: 2.4e9,
    summary:
      'Model Gram-positive soil bacterium capable of forming endospores under nutrient exhaustion. Displays larger rod dimensions, frequent chaining, and strong aerobic growth preference.',
    beginnerSummary:
      'Bacillus subtilis is the classic friendly Gram-positive bacterium found in soil and plant roots. Unlike E. coli, it has a thick outer peptidoglycan wall that traps purple Gram stain, forms linked chains of larger rods, and needs plenty of oxygen to grow well.',
    microscopyGuide:
      'Stains deep purple (Gram-positive) and is noticeably larger/longer than E. coli (3.6 µm). Often appears as 3-cell linked chains of rods. Actively motile in Phase Contrast.',
    growthGuide:
      'Prefers 35 °C, pH 7.0, and vigorous shaking (220–300 RPM) because it is strongly aerobic—if left unshaken (low DO2%), growth slows dramatically. Forms large cream matte colonies on LB Agar, but DIES on MacConkey Agar because bile salts and crystal violet disrupt Gram-positive walls.',
    geneticsGuide:
      'Carries universal 16S rRNA (920 bp) and the sporulation master regulator gene spo0A (540 bp), which is absent in E. coli and S. aureus.',
    howToUseExperiments: [
      'Gram-Positive Contrast: Stain alongside E. coli to compare large purple rod chains vs. small pink single rods.',
      'Oxygen Sensitivity Test: Compare high shaking (260 RPM) vs. static (0 RPM) growth in broth.',
      'MacConkey Selectivity: Plate on MacConkey Agar to confirm Gram-positive inhibition.',
    ],
    markerGenes: ['16S rRNA (920 bp)', 'spo0A (540 bp)'],
    realLifeDossier: {
      taxonomy: 'Bacillota (Firmicutes) · Bacilli · Bacillaceae · Bacillus subtilis subsp. subtilis 168',
      naturalHabitat:
        'Upper soil layers, plant rhizosphere, decaying vegetation, and fermented foods (such as traditional natto). Harmless BSL-1 organism.',
      cellEnvelope:
        'Classic Gram-positive single membrane wrapped in a thick (20–40 nm), porous peptidoglycan + teichoic acid cell wall. Lacks an outer LPS barrier, making it highly permeable to Ampicillin and sensitive to bile detergents.',
      metabolismAndCarbon:
        'Strongly aerobic respiratory bacterium (uses O2 as terminal electron acceptor; grows very sluggishly when dissolved oxygen drops below ~25%). Secretes extracellular proteases and amylases; gentler acidifier than enteric bacteria.',
      temperatureAndPhNotes:
        'Thrives across 12–48 °C with optimal division near 35.0 °C and neutral pH 6.8–7.3 (growth range pH 5.2–8.6). Above pH 8.6 or below pH 5.2 growth stalls rapidly.',
      optimalProtocol:
        'LB Broth at 35.0 °C, starting pH 7.0, high aeration (240–280 RPM) in a 250 mL baffled/shaken flask.',
      clinicalAndBiotechRole:
        'Industrial enzyme factory (detergent proteases, amylases), probiotic research, biofilm model, and model organism for bacterial differentiation and endospore development.',
      antibioticProfiles: {
        ampicillin: {
          verdict: 'susceptible',
          summary: 'Ultra-sensitive (MIC 1.0 µg/mL). Thick Gram-positive wall has no outer membrane barrier.',
          mechanism: 'Ampicillin accesses membrane PBPs directly without needing outer-membrane porins.',
        },
        kanamycin: {
          verdict: 'susceptible',
          summary: 'Very sensitive (MIC 2.0 µg/mL) when well-aerated and near neutral pH.',
          mechanism: 'Binds 30S ribosome; active aerobic respiration powers rapid aminoglycoside import.',
        },
        chloramphenicol: {
          verdict: 'susceptible',
          summary: 'Growth arrested (MIC 4.0 µg/mL). Halts 50S ribosomal peptide bond formation.',
          mechanism: 'Diffuses freely across Gram-positive envelope to block translation.',
        },
        ciprofloxacin: {
          verdict: 'susceptible',
          summary: 'Sensitive (MIC 0.12 µg/mL). Standard 1 µg/mL rapidly kills cells.',
          mechanism: 'Inhibits Gram-positive DNA gyrase / topoisomerase IV.',
        },
      },
    },
    citations: [
      {
        source: 'SubtiWiki / Bergey’s Manual (Firmicutes)',
        note: 'Gram-positive rod morphology, chain formation, aerobic respiration preference, pH 5.2–8.6 tolerance, and MacConkey bile-salt sensitivity.',
        epistemicTag: 'established_fact',
      },
    ],
  },
  {
    id: 'saureus_rn4220',
    scientificName: 'Staphylococcus aureus',
    strainCode: 'RN4220 (Lab Strain)',
    commonLabel: 'S. aureus RN4220',
    biosafetyLevel: 'BSL-2',
    gramStatus: 'positive',
    shape: 'coccus',
    arrangement: 'clusters',
    lengthUm: 0.9,
    widthUm: 0.9,
    motile: false,
    oxygenRequirement: 'facultative_anaerobe',
    oxygenKmPercent: 8,
    tempMinC: 12,
    tempOptC: 37,
    tempMaxC: 45,
    phMin: 4.8,
    phOpt: 7.2,
    phMax: 9.0,
    acidificationDrive: 0.72,
    minDoublingTimeMin: 30,
    minimalMediaFactor: 0.25,
    fermentsLactose: true,
    growsOnMacConkey: false,
    colonyProfile: {
      colorHex: '#FACC15',
      edgeHex: '#CA8A04',
      opacity: 0.98,
      maxDiameterMm: 2.4,
      description:
        'Smooth, convex, glistening golden-yellow colonies (staphyloxanthin pigment); inhibited by crystal violet and bile salts on MacConkey agar.',
    },
    micUgPerMl: {
      ampicillin: 2.0,
      kanamycin: 4.0,
      chloramphenicol: 8.0,
      ciprofloxacin: 0.5,
    },
    carryingCapacityCfuPerMl: 2.8e9,
    summary:
      'Non-motile Gram-positive spherical coccus dividing in multiple planes to form characteristic grape-like clusters. Fastidious in minimal media due to amino acid auxotrophies.',
    beginnerSummary:
      'Staphylococcus aureus ("golden staph") is named for its bright golden-yellow colonies and grape-like spheres. Strain RN4220 is a restriction-deficient laboratory strain (BSL-2 handling). Unlike rods, these cells are round spheres (cocci) that have no flagella, so they never swim.',
    microscopyGuide:
      'Look for tiny round purple spheres (0.9 µm cocci) clumped together like bunches of grapes! In Phase Contrast, they only jiggle slightly from Brownian thermal motion instead of swimming across the screen.',
    growthGuide:
      'Grows smoothly in rich LB Broth at 37 °C, pH 7.2 (~30 min doubling), producing golden-yellow colonies on LB Agar. In M9 Minimal glucose medium, it grows VERY poorly because wild Staphylococci require pre-made amino acids (auxotrophy). Inhibited on MacConkey Agar.',
    geneticsGuide:
      'Carries universal 16S rRNA (920 bp) and the thermonuclease diagnostic gene nuc (420 bp), widely used in clinical labs to identify S. aureus by PCR.',
    howToUseExperiments: [
      'Morphology & Motility Lab: Compare non-motile purple grape clusters against motile rods under 1000x Phase Contrast.',
      'Auxotrophy Test: Compare S. aureus growth in rich LB Broth vs. M9 Minimal Medium.',
      'Diagnostic PCR: Amplify the 420 bp nuc marker gene on an agarose gel.',
    ],
    markerGenes: ['16S rRNA (920 bp)', 'nuc (420 bp)'],
    realLifeDossier: {
      taxonomy: 'Bacillota · Staphylococcaceae · Staphylococcus aureus RN4220 (NCTC 8325 lineage)',
      naturalHabitat:
        'Human nasal mucosa and skin microbiota (~30% asymptomatic human carriage). Strain RN4220 is a lab-domesticated restriction-mutant intermediate used for shuttling plasmids from E. coli into Staphylococci.',
      cellEnvelope:
        'Gram-positive sphere (0.9 µm) dividing along perpendicular planes to stay clustered like grapes. Thick cross-linked peptidoglycan wall; zero flagella (completely non-motile); produces golden carotenoid membrane pigment (staphyloxanthin).',
      metabolismAndCarbon:
        'Facultative anaerobe and amino-acid auxotroph: requires rich media containing pre-formed amino acids & B-vitamins (proline, arginine, cysteine, niacin, thiamine), causing severe growth limitation in M9 Minimal Medium.',
      temperatureAndPhNotes:
        'Mesophile thriving 12–45 °C (Topt 37.0 °C) and slightly broader alkaline tolerance (pH 4.8–9.0, pHopt 7.2). Note: RN4220 is methicillin/ampicillin-susceptible (MSSA, NOT MRSA!).',
      optimalProtocol:
        'LB Broth or Nutrient Broth at 37.0 °C, starting pH 7.2, 200–220 RPM. Avoid M9 Minimal unless studying auxotrophic limitation.',
      clinicalAndBiotechRole:
        'Crucial model for Gram-positive pathogenesis, staphylococcal plasmid genetics, antibiotic resistance studies, and clinical diagnostic PCR (nuc gene).',
      antibioticProfiles: {
        ampicillin: {
          verdict: 'susceptible',
          summary: 'Susceptible (MIC 2.0 µg/mL). RN4220 lacks mecA/blaZ beta-lactamases, so Ampicillin kills it.',
          mechanism: 'Blocks peptidoglycan transpeptidases (PBPs) in the exposed Gram-positive wall.',
        },
        kanamycin: {
          verdict: 'susceptible',
          summary: 'Susceptible (MIC 4.0 µg/mL). Standard 50 µg/mL kills efficiently at pH 7.2.',
          mechanism: 'Irreversibly binds 30S ribosomal subunit causing mistranslation.',
        },
        chloramphenicol: {
          verdict: 'susceptible',
          summary: 'Inhibited above 8.0 µg/mL. Standard 25 µg/mL arrests protein synthesis.',
          mechanism: 'Reversibly inhibits 50S ribosomal peptidyl transferase.',
        },
        ciprofloxacin: {
          verdict: 'susceptible',
          summary: 'Susceptible (MIC 0.5 µg/mL). Standard 1.0 µg/mL exceeds MIC and kills.',
          mechanism: 'Targets DNA topoisomerase IV / gyrase.',
        },
      },
    },
    citations: [
      {
        source: 'ATCC / Todar’s Online Textbook of Bacteriology',
        note: 'Grape-like coccus clusters, non-motile physiology, golden staphyloxanthin pigmentation, amino-acid auxotrophy, and MSSA susceptibility.',
        epistemicTag: 'established_fact',
      },
    ],
  },
  {
    id: 'paeruginosa_pao1',
    scientificName: 'Pseudomonas aeruginosa',
    strainCode: 'PAO1',
    commonLabel: 'P. aeruginosa PAO1',
    biosafetyLevel: 'BSL-2',
    gramStatus: 'negative',
    shape: 'bacillus',
    arrangement: 'single',
    lengthUm: 1.9,
    widthUm: 0.65,
    motile: true,
    oxygenRequirement: 'aerobe',
    oxygenKmPercent: 20,
    tempMinC: 10,
    tempOptC: 37,
    tempMaxC: 44,
    phMin: 5.3,
    phOpt: 7.2,
    phMax: 8.6,
    acidificationDrive: 0.18,
    minDoublingTimeMin: 40,
    minimalMediaFactor: 0.72,
    fermentsLactose: false,
    growsOnMacConkey: true,
    colonyProfile: {
      colorHex: '#34D399',
      edgeHex: '#059669',
      macConkeyColorHex: '#D6D3C9',
      opacity: 0.85,
      maxDiameterMm: 3.6,
      description:
        'Flat spreading colonies with blue-green pyocyanin sheen on LB agar; pale colorless colonies on MacConkey agar (lactose non-fermenter).',
    },
    micUgPerMl: {
      ampicillin: 256.0,
      kanamycin: 64.0,
      chloramphenicol: 64.0,
      ciprofloxacin: 0.25,
    },
    carryingCapacityCfuPerMl: 2.2e9,
    summary:
      'Highly versatile, strictly aerobic Gram-negative rod with polar flagellar motility. Exhibits high intrinsic resistance to beta-lactams and many antibiotics via efflux pumps and low outer-membrane permeability.',
    beginnerSummary:
      'Pseudomonas aeruginosa is an environmental "survivor" bacterium famous for two things: its blue-green pyocyanin pigment on agar plates, and its natural armor against many antibiotics! Even without a plasmid, its tight outer membrane and efflux pumps give it natural resistance to Ampicillin, Kanamycin (at working dose), and Chloramphenicol.',
    microscopyGuide:
      'Slender pink Gram-negative rods (1.9 × 0.65 µm) that swim rapidly in Phase Contrast using a single polar flagellum.',
    growthGuide:
      'Slower doubler (~40 min), strongly aerobic (needs vigorous shaking RPM in broth!), and thrives surprisingly well in M9 Minimal Medium (72% efficiency!). Does NOT ferment lactose, so broth pH stays near neutral and MacConkey colonies remain pale/colorless—clearly distinct from pink E. coli!',
    geneticsGuide:
      'Carries 16S rRNA (920 bp) and the species-specific outer-membrane lipoprotein gene oprL (510 bp). Intrinsically resistant to Ampicillin (MIC 256 µg/mL), Chloramphenicol (MIC 64 µg/mL), and standard Kanamycin (MIC 64 µg/mL), yet highly sensitive to Ciprofloxacin (MIC 0.25 µg/mL).',
    howToUseExperiments: [
      'MacConkey Color Contrast: Streak alongside E. coli on MacConkey Agar to see colorless (lactose -) vs. bright pink (lactose +) colonies.',
      'Intrinsic Resistance Assay: Test 100 µg/mL Ampicillin vs. 1.0 µg/mL Ciprofloxacin to prove which drug actually stops PAO1.',
      'Minimal Media Champion: Compare PAO1 vs. S. aureus in M9 Minimal Medium.',
    ],
    markerGenes: ['16S rRNA (920 bp)', 'oprL (510 bp)'],
    realLifeDossier: {
      taxonomy: 'Pseudomonadota · Gammaproteobacteria · Pseudomonadaceae · Pseudomonas aeruginosa PAO1',
      naturalHabitat:
        'Ubiquitous in soil, freshwater, moist surfaces, and plant roots; opportunistic human pathogen (BSL-2) notorious in hospital biofilms and cystic fibrosis lungs.',
      cellEnvelope:
        'Gram-negative rod with a uniquely tight, low-permeability outer membrane (lacks wide E. coli-style OmpF porins; uses narrow substrate-specific OprD/OprF channels) and active MexAB-OprM multidrug efflux pumps that eject antibiotics continuously.',
      metabolismAndCarbon:
        'Non-fermentative obligate aerobe (can use nitrate anaerobically, but never ferments sugars into acid). Prototrophic metabolic champion that utilizes >75 simple carbon sources, explaining why it thrives in M9 Minimal Medium without turning MacConkey pink.',
      temperatureAndPhNotes:
        'Optimal 37.0 °C (range 10–44 °C) and pH 7.2 (range 5.3–8.6). Produces blue-green pyocyanin and yellow-green pyoverdine siderophore pigments.',
      optimalProtocol:
        'LB Broth or M9 Minimal at 37.0 °C, starting pH 7.2, 240–280 RPM high aeration. To inhibit or kill PAO1, choose Ciprofloxacin (1.0 µg/mL)—NOT standard Ampicillin or Chloramphenicol!',
      clinicalAndBiotechRole:
        'Benchmark organism for multidrug intrinsic resistance research, quorum-sensing/biofilm studies, and bioremediation.',
      antibioticProfiles: {
        ampicillin: {
          verdict: 'resistant_intrinsic',
          summary: 'DO NOT ADD Ampicillin to kill PAO1 (MIC 256 µg/mL)! Standard 100 µg/mL does NOT stop it.',
          mechanism: 'Chromosomal AmpC cephalosporinase + tight outer membrane + MexAB-OprM efflux pumps neutralize aminopenicillins.',
        },
        kanamycin: {
          verdict: 'resistant_intrinsic',
          summary: 'Avoid standard 50 µg/mL Kanamycin (MIC 64 µg/mL). Sub-inhibitory unless pushed to high dose (>100 µg/mL).',
          mechanism: 'Low outer membrane permeability + MexXY efflux pump + chromosomal aph(3\')-IIb phosphotransferase.',
        },
        chloramphenicol: {
          verdict: 'resistant_intrinsic',
          summary: 'DO NOT ADD Chloramphenicol (MIC 64 µg/mL). Standard 25 µg/mL is expelled rapidly.',
          mechanism: 'MexAB-OprM & MexCD-OprJ RND efflux pumps continuously pump chloramphenicol out of the cell.',
        },
        ciprofloxacin: {
          verdict: 'susceptible',
          summary: 'RECOMMENDED DRUG TO KILL PAO1 (MIC 0.25 µg/mL). Standard 1.0 µg/mL sterilizes PAO1.',
          mechanism: 'Fluoroquinolone diffuses effectively and potently poisons Pseudomonas DNA gyrase.',
        },
      },
    },
    citations: [
      {
        source: 'Pseudomonas Genome DB / EUCAST Intrinsic Resistance Tables',
        note: 'High intrinsic resistance to ampicillin, chloramphenicol, and low-dose kanamycin via efflux/porins, non-fermentation on MacConkey, and pyocyanin green pigmentation.',
        epistemicTag: 'established_fact',
      },
    ],
  },
];

export const MEDIA_RECIPES: MediaRecipe[] = [
  {
    id: 'lb_broth',
    name: 'Lysogeny Broth (LB Miller)',
    shortName: 'LB Broth',
    format: 'broth',
    isMinimal: false,
    isMacConkey: false,
    richnessFactor: 1.0,
    nutrientCapacityMultiplier: 1.0,
    baseColorHex: '#D4B475',
    turbidColorHex: '#E8D9B5',
    pH: 7.0,
    bufferCapacity: 0.42,
    fermentableSugarFactor: 0.22,
    compositionSummary: '10 g/L Tryptone, 5 g/L Yeast Extract, 10 g/L NaCl',
    scientificPurpose:
      'Complex, nutrient-rich general-purpose liquid medium with moderate amino-acid buffering supporting rapid propagation.',
    epistemicTag: 'established_fact',
  },
  {
    id: 'nutrient_broth',
    name: 'Standard Nutrient Broth',
    shortName: 'Nutrient Broth',
    format: 'broth',
    isMinimal: false,
    isMacConkey: false,
    richnessFactor: 0.82,
    nutrientCapacityMultiplier: 0.78,
    baseColorHex: '#C9A86A',
    turbidColorHex: '#DFCEAC',
    pH: 6.9,
    bufferCapacity: 0.26,
    fermentableSugarFactor: 0.18,
    compositionSummary: '5 g/L Peptone, 3 g/L Beef Extract',
    scientificPurpose:
      'Lightly buffered peptone-beef broth ideal for routine cultivation, pigment display, and observing metabolic pH drift.',
    epistemicTag: 'established_fact',
  },
  {
    id: 'm9_minimal',
    name: 'M9 Minimal Salts + 0.4% Glucose',
    shortName: 'M9 Minimal',
    format: 'broth',
    isMinimal: true,
    isMacConkey: false,
    richnessFactor: 0.55,
    nutrientCapacityMultiplier: 0.5,
    baseColorHex: '#D6E4EE',
    turbidColorHex: '#C7D8E3',
    pH: 7.2,
    bufferCapacity: 1.0,
    fermentableSugarFactor: 0.85,
    compositionSummary: 'Na2HPO4, KH2PO4 (Phosphate Buffer), NaCl, NH4Cl, MgSO4, CaCl2, 0.4% D-Glucose',
    scientificPurpose:
      'Strongly phosphate-buffered defined medium testing metabolic prototrophy vs. amino acid auxotrophy.',
    epistemicTag: 'established_fact',
  },
  {
    id: 'lb_agar',
    name: 'LB Agar Plate (1.5% Agar)',
    shortName: 'LB Agar',
    format: 'agar',
    isMinimal: false,
    isMacConkey: false,
    richnessFactor: 1.0,
    nutrientCapacityMultiplier: 1.0,
    baseColorHex: '#D7C59B',
    turbidColorHex: '#D7C59B',
    pH: 7.0,
    bufferCapacity: 0.55,
    fermentableSugarFactor: 0.2,
    compositionSummary: 'LB Miller formula + 15 g/L Bacteriological Agar',
    scientificPurpose:
      'Non-selective solid medium for isolating single clonal colonies and observing colony morphology.',
    epistemicTag: 'established_fact',
  },
  {
    id: 'macconkey_agar',
    name: 'MacConkey Agar Plate',
    shortName: 'MacConkey Agar',
    format: 'agar',
    isMinimal: false,
    isMacConkey: true,
    richnessFactor: 0.9,
    nutrientCapacityMultiplier: 0.9,
    baseColorHex: '#A64D59',
    turbidColorHex: '#A64D59',
    pH: 7.1,
    bufferCapacity: 0.38,
    fermentableSugarFactor: 0.9,
    compositionSummary: 'Peptone, Lactose (10 g/L), Bile Salts, Neutral Red, Crystal Violet, Agar',
    scientificPurpose:
      'Selective & differential medium: inhibits Gram-positive bacteria and turns acid-producing lactose fermenters bright pink.',
    epistemicTag: 'established_fact',
  },
];

export const ANTIBIOTIC_COMPOUNDS: AntibioticCompound[] = [
  {
    id: 'ampicillin',
    name: 'Ampicillin',
    drugClass: 'Aminopenicillin (Beta-Lactam)',
    targetMechanism:
      'Inhibits penicillin-binding proteins (PBPs), blocking peptidoglycan cell wall cross-linking and inducing osmotic lysis.',
    mode: 'bactericidal',
    standardWorkingUgPerMl: 100,
    maxConcentrationUgPerMl: 300,
    halfLife37CHours: 24,
    optimalPhRange: [6.0, 7.5],
    acidicPenaltyFactor: 0.15,
    phStabilityNote:
      'Beta-lactam ring hydrolyzes progressively faster at elevated temperature (>37 °C) and acidic/alkaline extremes (<5.8 or >8.0). Cleaved by plasmid TEM-1 beta-lactamase.',
    citation: {
      source: 'Sambrook & Russell, Molecular Cloning / CLSI',
      note: 'Standard plasmid selection at 100 µg/mL; bactericidal against dividing susceptible cells.',
      epistemicTag: 'established_fact',
    },
  },
  {
    id: 'kanamycin',
    name: 'Kanamycin A',
    drugClass: 'Aminoglycoside',
    targetMechanism:
      'Binds irreversibly to the 30S ribosomal subunit, causing mRNA misreading and lethal protein mistranslation.',
    mode: 'bactericidal',
    standardWorkingUgPerMl: 50,
    maxConcentrationUgPerMl: 200,
    halfLife37CHours: 72,
    optimalPhRange: [7.0, 8.2],
    acidicPenaltyFactor: 0.58,
    phStabilityNote:
      'Highly thermostable, but uptake requires cellular proton-motive force: acidic pH (<6.3) or low dissolved oxygen significantly reduces killing potency.',
    citation: {
      source: 'Molecular Cloning Protocols / EUCAST',
      note: 'Working selection concentration 50 µg/mL; broad activity against E. coli and Staphylococci, reduced under acidity/anaerobiosis.',
      epistemicTag: 'established_fact',
    },
  },
  {
    id: 'chloramphenicol',
    name: 'Chloramphenicol',
    drugClass: 'Amphenicol',
    targetMechanism:
      'Binds 50S ribosomal subunit (peptidyl transferase center), halting peptide bond elongation.',
    mode: 'bacteriostatic',
    standardWorkingUgPerMl: 25,
    maxConcentrationUgPerMl: 100,
    halfLife37CHours: 96,
    optimalPhRange: [5.5, 8.2],
    acidicPenaltyFactor: 0.1,
    phStabilityNote:
      'Broadly pH- and heat-stable bacteriostatic agent; halts cell division reversibly without active wall lysis. Expelled by P. aeruginosa efflux pumps.',
    citation: {
      source: 'Goodman & Gilman / Molecular Cloning',
      note: 'Primarily bacteriostatic protein synthesis inhibitor; standard working dose 25–34 µg/mL.',
      epistemicTag: 'established_fact',
    },
  },
  {
    id: 'ciprofloxacin',
    name: 'Ciprofloxacin',
    drugClass: 'Fluoroquinolone (2nd Gen)',
    targetMechanism:
      'Inhibits bacterial DNA gyrase (topoisomerase II) and topoisomerase IV, creating lethal double-strand DNA breaks.',
    mode: 'bactericidal',
    standardWorkingUgPerMl: 1.0,
    maxConcentrationUgPerMl: 10,
    halfLife37CHours: 120,
    optimalPhRange: [6.4, 7.8],
    acidicPenaltyFactor: 0.35,
    phStabilityNote:
      'Ultra-low MIC potency (0.03–0.5 µg/mL) including P. aeruginosa; mild potency dip in acidic broth (<6.0) due to ionization shifts.',
    citation: {
      source: 'EUCAST / Clinical Microbiology Reviews',
      note: 'Ultra-low MIC potency (0.015–0.5 µg/mL) against Enterobacteriaceae and P. aeruginosa.',
      epistemicTag: 'established_fact',
    },
  },
];

export const SIMULATION_MODEL_DISCLOSURES: Array<{
  title: string;
  epistemicTag: 'established_fact' | 'simplified_model' | 'gameplay_abstraction';
  description: string;
}> = [
  {
    title: 'Continuous Cardinal Temperature, pH & Dissolved Oxygen Kinetics',
    epistemicTag: 'simplified_model',
    description:
      'Every fractional change in temperature (°C), live medium pH, dissolved oxygen (% DO2 balancing shaking kLa vs. respiration and Henry’s Law temperature solubility), and Monod nutrient concentration continuously scales growth rate, lag recovery, and metabolic acid/base drift in real time.',
  },
  {
    title: 'pH- & Temp-Coupled Antibiotic Pharmacodynamics',
    epistemicTag: 'simplified_model',
    description:
      'Antibiotics use smooth Hill response curves coupled to active cell division (for beta-lactams), proton-motive-force pH/O2 uptake modulation (for aminoglycosides like Kanamycin), and temperature/pH hydrolysis half-lives.',
  },
  {
    title: 'OD600 Beer-Lambert & NanoDrop A260/A280 Calibration',
    epistemicTag: 'simplified_model',
    description:
      'OD600 scales linearly with biomass up to ~1.0 AU before detector saturation. Nucleic acid NanoDrop readouts compute 1.0 A260 unit = 50 ng/µL dsDNA and model protein carryover at 280 nm.',
  },
  {
    title: 'PCR Amplification & Log10(bp) Gel Migration',
    epistemicTag: 'simplified_model',
    description:
      'PCR validates exact primer binding against A/T/G/C loci, calculates Wallace/salt-adjusted Tm, simulates annealing failure above Tm or non-specific artifacts well below Tm, and separates fragments by log10(bp) mobility.',
  },
];

export const NUTRIENT_SUPPLEMENTS: NutrientSupplement[] = [
  {
    id: 'glucose_20',
    name: '20% Sterile D-Glucose Spike',
    shortName: '20% Glucose',
    category: 'carbon',
    defaultDoseMl: 1.5,
    minDoseMl: 0.5,
    maxDoseMl: 5.0,
    stepMl: 0.5,
    nutrientGainPerMlRef50: 0.36,
    capacityBoostPerDose: 0.25,
    targetPh: 6.6,
    bufferStrength: 0.08,
    bufferBoost: 0,
    description:
      'Concentrated sterile carbon & ATP energy bolus (200 g/L D-glucose). Restores starved cultures with almost zero volume dilution.',
    realLifeNote:
      'Real fed-batch fermentation uses concentrated glucose feeds to prolong exponential/high-density growth, though excess glucose in weakly buffered broth increases organic acid pH drop.',
  },
  {
    id: 'tryptone_yeast_5x',
    name: '5× Tryptone + Yeast Extract Feed',
    shortName: '5× Tryptone/YE',
    category: 'complex',
    defaultDoseMl: 2.5,
    minDoseMl: 0.5,
    maxDoseMl: 8.0,
    stepMl: 0.5,
    nutrientGainPerMlRef50: 0.28,
    capacityBoostPerDose: 0.35,
    targetPh: 7.0,
    bufferStrength: 0.45,
    bufferBoost: 0.08,
    description:
      'Rich nitrogen, peptide, amino acid, and B-vitamin concentrate. Revives stationary broth cultures and rescues amino-acid auxotrophs.',
    realLifeNote:
      'Standard fed-batch protein/plasmid production supplement providing amino-acid building blocks and mild peptide pH buffering.',
  },
  {
    id: 'lb_fresh_broth',
    name: 'Fresh Sterile LB Miller Broth',
    shortName: 'Fresh LB Broth',
    category: 'broth',
    defaultDoseMl: 15.0,
    minDoseMl: 2.0,
    maxDoseMl: 50.0,
    stepMl: 1.0,
    nutrientGainPerMlRef50: 0.035,
    capacityBoostPerDose: 0.08,
    targetPh: 7.0,
    bufferStrength: 0.42,
    bufferBoost: 0.05,
    description:
      'Complete fresh rich broth top-up. Replenishes nutrients while physically diluting crowded biomass (OD600) and spent byproducts.',
    realLifeNote:
      'In real labs, topping up or diluting saturated broth into fresh LB relieves spatial/metabolic crowding so cells re-enter log phase.',
  },
  {
    id: 'phosphate_buffer_pbs',
    name: '1M Phosphate Buffer (pH 7.2)',
    shortName: '1M Phosphate pH 7.2',
    category: 'buffer',
    defaultDoseMl: 1.5,
    minDoseMl: 0.5,
    maxDoseMl: 5.0,
    stepMl: 0.5,
    nutrientGainPerMlRef50: 0,
    capacityBoostPerDose: 0,
    targetPh: 7.2,
    bufferStrength: 1.85,
    bufferBoost: 0.32,
    description:
      'Concentrated Na₂HPO₄ / KH₂PO₄ pH rescue buffer. Neutralizes fermentation acidity and strengthens media buffering capacity.',
    realLifeNote:
      'Real bioprocesses pair glucose feeding with pH-control buffers so organic acids do not acid-arrest bacterial enzymes.',
  },
];

const SPECIES_BY_ID = new Map<string, BacterialSpecies>(
  BACTERIAL_SPECIES.map((s) => [s.id, s])
);
const MEDIA_BY_ID = new Map<string, MediaRecipe>(
  MEDIA_RECIPES.map((m) => [m.id, m])
);
const ANTIBIOTICS_BY_ID = new Map<string, AntibioticCompound>(
  ANTIBIOTIC_COMPOUNDS.map((a) => [a.id, a])
);
const NUTRIENTS_BY_ID = new Map<string, NutrientSupplement>(
  NUTRIENT_SUPPLEMENTS.map((n) => [n.id, n])
);

export function getSpeciesById(id: string): BacterialSpecies | undefined {
  return SPECIES_BY_ID.get(id);
}

export function getMediaById(id: string): MediaRecipe | undefined {
  return MEDIA_BY_ID.get(id);
}

export function getAntibioticById(id: string): AntibioticCompound | undefined {
  return ANTIBIOTICS_BY_ID.get(id);
}

export function getNutrientSupplementById(id: string): NutrientSupplement | undefined {
  return NUTRIENTS_BY_ID.get(id);
}
