import { DictionaryEntry } from '../types/lab';

export const DICTIONARY_ENTRIES: DictionaryEntry[] = [
  // FUNDAMENTALS
  {
    id: 'dna',
    term: 'DNA (Deoxyribonucleic Acid)',
    category: 'fundamentals',
    shortDefinition: 'The double-stranded chemical instruction manual inside every living cell.',
    plainExplanation:
      'DNA is a long ribbon built from four chemical letters: A (Adenine), T (Thymine), G (Guanine), and C (Cytosine). A always pairs with T, and G always pairs with C. Different sequences of letters spell out different genes.',
    whyItMatters:
      'Because every species has unique DNA letter patterns, scientists can identify bacteria, detect antibiotic resistance genes, or copy specific genes using PCR.',
    howToUseInLab:
      'Extract DNA from any broth culture at the Microcentrifuge & DNA Extraction station, check its purity on NanoDrop mode, and amplify or cut it at the PCR and Restriction benches.',
    relatedTerms: ['bp', 'plasmid', 'pcr', 'a260_a280'],
  },
  {
    id: 'bp',
    term: 'Base Pair (bp / kb)',
    category: 'fundamentals',
    shortDefinition: 'One rung on the DNA ladder (one A–T or G–C letter pair), used to measure DNA length.',
    plainExplanation:
      'Just like we measure roads in meters, molecular biologists measure DNA length in base pairs (bp). One thousand base pairs is called 1 kilobase (1 kb). For example, our pUC-AmpR plasmid is 2,686 bp long.',
    whyItMatters:
      'Different genes and DNA fragments have distinct bp lengths. When you run Gel Electrophoresis, bands separate strictly by their bp length so you can tell which gene you amplified.',
    howToUseInLab:
      'Watch predicted bp sizes in the PCR Thermal Cycler and Restriction Digest Bench, then verify them against the DNA Ladder on the Agarose Gel.',
    relatedTerms: ['dna', 'gel_electrophoresis', 'dna_ladder'],
  },
  {
    id: 'plasmid',
    term: 'Plasmid (e.g., pUC-AmpR)',
    category: 'fundamentals',
    shortDefinition: 'A small, circular "bonus" piece of DNA that bacteria carry separately from their main chromosome.',
    plainExplanation:
      'Besides their giant main chromosome, bacteria can carry tiny circular rings of DNA called plasmids. Scientists insert useful genes—like antibiotic resistance (bla/AmpR)—into plasmids so bacteria gain new abilities.',
    whyItMatters:
      'Plasmids are the foundation of genetic engineering and cloning because they are easy to purify, cut with restriction enzymes, and copy inside E. coli.',
    howToUseInLab:
      'Retrieve E. coli [pUC-AmpR] from Cold Storage. Grow it in Ampicillin broth to see plasmid protection, extract its 2,686 bp circular plasmid, and cut it with PstI or EcoRI.',
    relatedTerms: ['dna', 'antibiotic_classes', 'restriction_enzyme'],
  },
  {
    id: 'gene_marker',
    term: 'Marker Gene (16S rRNA, lacZ, bla, nuc, oprL, spo0A)',
    category: 'fundamentals',
    shortDefinition: 'A signature DNA sequence used to identify a species or confirm a special trait.',
    plainExplanation:
      'Think of a marker gene like a barcode. All bacteria share 16S rRNA (proving bacteria are present), whereas lacZ belongs to E. coli, nuc belongs to S. aureus, oprL belongs to P. aeruginosa, spo0A belongs to B. subtilis, and bla proves a plasmid carries Ampicillin resistance.',
    whyItMatters:
      'By choosing PCR primers that match a specific marker gene, you can prove exactly which bacterium or resistance trait is in your tube without guessing.',
    howToUseInLab:
      'In the Thermal Cycler, try testing different Primer Presets against DNA extracted from different species and see which primers produce a bright band on the gel.',
    relatedTerms: ['pcr', 'primer', 'plasmid'],
  },

  // MICROBIOLOGY & CULTURE PHYSIOLOGY
  {
    id: 'ph_and_buffers',
    term: 'pH, Metabolic Acidification & Buffer Capacity',
    category: 'microbiology',
    shortDefinition: 'How acidic or alkaline a liquid medium is—and how growing bacteria continuously change it.',
    plainExplanation:
      'The pH scale runs from 0 (strong acid) through 7.0 (neutral water) to 14 (strong base). Every bacterial enzyme has a narrow comfort zone (usually pH 6.8–7.2). As bacteria ferment sugars like glucose or lactose, they release organic acids that push pH downward toward 5.0! Phosphate-buffered media like M9 resist this drift, while lightly buffered Nutrient Broth swings much faster.',
    whyItMatters:
      'Even a 0.5 pH drift changes enzyme speed, shifts colony indicators (pink MacConkey agar relies on acid dye change!), destabilizes Ampicillin, and weakens aminoglycosides like Kanamycin.',
    howToUseInLab:
      'Adjust the Starting Media pH slider on the Media Bench, then track live pH and ΔpH drift inside your Detailed 10-Item Inventory, Incubator, or Spectrophotometer.',
    relatedTerms: ['m9_minimal', 'macconkey_agar', 'antibiotic_classes'],
  },
  {
    id: 'dissolved_oxygen',
    term: 'Dissolved Oxygen (DO2%) & Shaking Speed (RPM)',
    category: 'microbiology',
    shortDefinition: 'The amount of breathable O2 gas dissolved in broth, controlled by flask shape, RPM, and cell consumption.',
    plainExplanation:
      'Water holds far less oxygen than air, and dense growing bacteria consume O2 quickly. Orbital shaking swirls the broth so fresh O2 dissolves across the surface (kLa oxygen transfer). Strict aerobes like P. aeruginosa and B. subtilis starve without shaking, whereas facultative anaerobes like E. coli switch to slower fermentation.',
    whyItMatters:
      'Even temperature changes DO2 (warm broth holds slightly less oxygen than cool broth), and low oxygen directly reduces Kanamycin uptake.',
    howToUseInLab:
      'Watch live DO2% drop in dense flasks inside the Shaking Incubator or Inventory, and compare 0 RPM vs. 250 RPM growth rates.',
    relatedTerms: ['growth_phases', 'temperature_kinetics'],
  },
  {
    id: 'temperature_kinetics',
    term: 'Cardinal Temperatures (Tmin, Topt, Tmax) & Thermal Shock',
    category: 'microbiology',
    shortDefinition: 'Every small change in temperature continuously bends chemical reaction speeds and protein stability.',
    plainExplanation:
      'Between Tmin (~10–12 °C) and Topt (~35–37 °C), warmer temperatures speed up cellular enzymes smoothly. Just a few degrees past Topt, proteins begin misfolding; past Tmax (~44–48 °C), cells suffer rapid heat-shock death. Below Tmin, cells pause division into cold dormancy (-80 °C glycerol stocks last indefinitely).',
    whyItMatters:
      'Temperature also alters antibiotic decay (Ampicillin breaks down faster at 40 °C than at 25 °C) and oxygen solubility.',
    howToUseInLab:
      'Nudge the Incubator thermostat by 0.5 °C increments and monitor real-time growth curves and stress indicators.',
    relatedTerms: ['dissolved_oxygen', 'growth_phases'],
  },
  {
    id: 'antibiotic_classes',
    term: 'Antibiotic Classes, Mechanisms & Resistance (Intrinsic vs. Plasmid)',
    category: 'microbiology',
    shortDefinition: 'How different antibiotics attack bacteria—and why some bacteria naturally shrug them off.',
    plainExplanation:
      'Ampicillin breaks cell walls while cells divide. Kanamycin (30S) and Chloramphenicol (50S) jam ribosomes that build proteins. Ciprofloxacin breaks DNA copying (gyrase). Bacteria survive either by carrying a resistance plasmid (like E. coli [pUC-AmpR] destroying Ampicillin with beta-lactamase) OR through intrinsic armor (like P. aeruginosa pumping out Ampicillin and Chloramphenicol naturally).',
    whyItMatters:
      'Choosing the wrong antibiotic wastes media and leaves resistant bacteria alive—always check the Bacteria & Antibiotic Advisor before supplementing!',
    howToUseInLab:
      'Open Dictionary DB → Antibiotics & Advisor to test any Bacterium × Antibiotic × Dose combination before preparing a vessel.',
    relatedTerms: ['mic', 'plasmid', 'ph_and_buffers'],
  },
  {
    id: 'gram_stain',
    term: 'Gram Stain (Gram-Positive vs. Gram-Negative)',
    category: 'microbiology',
    shortDefinition: 'A classic 2-color dye test that separates bacteria into purple (thick wall) or pink (thin double membrane).',
    plainExplanation:
      'Gram-positive bacteria (like B. subtilis and S. aureus) have a thick sponge-like outer wall that traps purple Crystal Violet dye. Gram-negative bacteria (like E. coli and P. aeruginosa) have a thin wall surrounded by an outer lipid shield, so they lose the purple dye and absorb pink/red Safranin counterstain.',
    whyItMatters:
      'Gram status immediately tells doctors and scientists which antibiotics or selective plates (like MacConkey Agar) will work against an organism.',
    howToUseInLab:
      'Open the Compound Microscope and select "Gram Stain" mode to view cells at 1000x Oil Immersion. Purple = Gram-positive; Pink/Red = Gram-negative.',
    relatedTerms: ['morphology', 'macconkey_agar', 'microscope'],
  },
  {
    id: 'morphology',
    term: 'Cell Morphology & Motility (Bacillus vs. Coccus)',
    category: 'microbiology',
    shortDefinition: 'The physical shape, grouping, and swimming behavior of bacterial cells under a microscope.',
    plainExplanation:
      'Bacilli are rod-shaped (like tiny pills: E. coli, B. subtilis, P. aeruginosa). Cocci are round spheres (like S. aureus, which divides into grape-like clusters). Bacteria with whip-like flagella are "motile" and actively swim in liquid.',
    whyItMatters:
      'Before running expensive DNA tests, checking shape, clustering, and swimming under a microscope narrows down what species you are looking at.',
    howToUseInLab:
      'Use "Phase Contrast" mode on the Microscope to watch live swimming motility (warm cultures above 12 °C swim; S. aureus only jiggles in place).',
    relatedTerms: ['gram_stain', 'microscope'],
  },
  {
    id: 'od600',
    term: 'OD600 (Optical Density at 600 nm)',
    category: 'microbiology',
    shortDefinition: 'A fast light-cloudiness measurement showing how densely bacteria have grown in liquid broth.',
    plainExplanation:
      'Clear sterile broth lets 600 nm light pass straight through (OD600 = 0.000). As billions of bacteria multiply, the broth turns cloudy and scatters the light. Higher OD600 = more cells! Around OD 1.0, there are roughly 800 million (8×10⁸) E. coli cells per mL.',
    whyItMatters:
      'Scientists track OD600 to know when bacteria enter exponential growth (ideal for harvesting or adding drugs) without waiting overnight for plate counts.',
    howToUseInLab:
      'Take any liquid flask or tube to the Spectrophotometer (Culture OD600 mode) to read its live absorbance and view its time-series growth curve.',
    relatedTerms: ['growth_phases', 'cfu_ml', 'spectrophotometer'],
  },
  {
    id: 'cfu_ml',
    term: 'CFU/mL (Colony Forming Units per Milliliter)',
    category: 'microbiology',
    shortDefinition: 'The count of living, dividing bacterial cells per milliliter of liquid.',
    plainExplanation:
      'OD600 measures both living and dead cloudy particles, whereas CFU/mL counts only live bacteria capable of growing into visible colonies on an agar plate.',
    whyItMatters:
      'Antibiotics can kill 99.9% of cells (dropping CFU/mL dramatically) even before dead debris clears from OD600.',
    howToUseInLab:
      'Check Viable CFU/mL in the Detailed Inventory, Microscope, Incubator, or Spectrophotometer, and use Serial Dilution at the Media Bench to plate countable colonies.',
    relatedTerms: ['od600', 'serial_dilution'],
  },
  {
    id: 'growth_phases',
    term: 'Bacterial Growth Phases (Lag, Exponential, Stationary, Death)',
    category: 'microbiology',
    shortDefinition: 'The four predictable life stages of a bacterial culture placed in fresh medium.',
    plainExplanation:
      '1) Lag phase: cells wake up and build enzymes (~35 min, flat OD). 2) Exponential (Log) phase: cells double rapidly at maximum speed. 3) Stationary phase: nutrients run low or acid/waste builds up and growth stops. 4) Death phase: cells run out of resources or suffer antibiotic/pH/heat damage.',
    whyItMatters:
      'Beta-lactam antibiotics like Ampicillin work best during active Exponential division, and DNA extraction yields are highest near late Exponential / early Stationary phase.',
    howToUseInLab:
      'Watch the color-coded growth phase label inside the Detailed Inventory or Incubator and inspect the S-shaped curve in the Spectrophotometer.',
    relatedTerms: ['od600', 'lb_broth', 'm9_minimal'],
  },
  {
    id: 'lb_broth',
    term: 'LB Media (Lysogeny Broth & LB Agar)',
    category: 'microbiology',
    shortDefinition: 'A rich, golden all-purpose nutrient recipe made from digested proteins (tryptone), yeast extract, and salt.',
    plainExplanation:
      'LB is like an all-you-can-eat buffet for bacteria: it provides pre-made amino acids, vitamins, and salts so almost all common lab bacteria grow rapidly.',
    whyItMatters:
      'It is the default standard medium for growing E. coli, cloning plasmids, and checking colony pigmentation on plates.',
    howToUseInLab:
      'Select LB Broth for fast shaking cultures or LB Agar for solid Petri plates at the Media Bench.',
    relatedTerms: ['m9_minimal', 'macconkey_agar', 'ph_and_buffers'],
  },
  {
    id: 'm9_minimal',
    term: 'M9 Minimal Medium',
    category: 'microbiology',
    shortDefinition: 'A sparse, phosphate-buffered broth containing only mineral salts and pure glucose sugar.',
    plainExplanation:
      'Unlike rich LB broth, M9 contains zero pre-made amino acids or vitamins, and uses strong phosphate salts to hold pH steady near 7.2. Only bacteria that can build every amino acid from scratch using sugar and ammonia (prototrophs) grow well in M9.',
    whyItMatters:
      'Tests metabolic self-sufficiency! Fastidious strains like S. aureus barely grow in M9, whereas metabolically versatile P. aeruginosa thrives.',
    howToUseInLab:
      'Compare the same species in LB Broth vs. M9 Minimal at the Media Bench and watch how M9’s strong phosphate buffer resists pH drop.',
    relatedTerms: ['lb_broth', 'growth_phases', 'ph_and_buffers'],
  },
  {
    id: 'macconkey_agar',
    term: 'MacConkey Agar (Selective & Differential)',
    category: 'microbiology',
    shortDefinition: 'A specialized red agar plate that blocks Gram-positive bacteria and turns lactose-fermenting Gram-negatives bright pink.',
    plainExplanation:
      'MacConkey contains bile salts and crystal violet (which kill Gram-positive bacteria) plus lactose sugar and a pH dye. Gram-negative bacteria that eat lactose make acid and turn bright pink/magenta (like E. coli), while non-fermenters stay pale/colorless (like P. aeruginosa).',
    whyItMatters:
      'Lets a microbiologist separate Gram-negative from Gram-positive bacteria AND test lactose fermentation in one single plate.',
    howToUseInLab:
      'Prepare a Petri Plate with MacConkey Agar at the Media Bench, incubate in the Static Incubator, and compare E. coli (pink), P. aeruginosa (pale), and S. aureus (no growth).',
    relatedTerms: ['gram_stain', 'lb_broth', 'ph_and_buffers'],
  },
  {
    id: 'serial_dilution',
    term: 'Serial Dilution (10⁻¹ to 10⁻⁶)',
    category: 'microbiology',
    shortDefinition: 'Stepping down a concentrated culture 10-fold at a time so individual cells land far apart on an agar plate.',
    plainExplanation:
      'A full-grown broth culture has ~1,000,000,000 cells per mL. If you spread it undiluted onto a plate, it grows into a solid messy carpet ("lawn"). By diluting 10,000x (10⁻⁴) or 100,000x (10⁻⁵) before plating, single separated cells grow into neat, countable circular colonies!',
    whyItMatters:
      'Essential for isolating pure single clones and accurately counting viable CFU/mL (textbook countable range is 30–300 colonies per plate).',
    howToUseInLab:
      'When preparing an Agar Petri Plate from an active broth culture at the Media Bench, use the Serial Dilution selector (e.g., 10⁻⁴ or 10⁻⁵) before clicking Dispense.',
    relatedTerms: ['cfu_ml', 'macconkey_agar'],
  },
  {
    id: 'mic',
    term: 'MIC (Minimum Inhibitory Concentration)',
    category: 'microbiology',
    shortDefinition: 'The lowest antibiotic concentration (µg/mL) that stops a bacterial strain from growing.',
    plainExplanation:
      'Every bacterium–antibiotic pair has an MIC threshold. Below the MIC, bacteria still grow; at or above the MIC, growth halts (bacteriostatic) or cells die (bactericidal). For example, E. coli K-12 has an Ampicillin MIC of 4 µg/mL, whereas plasmid-protected E. coli [pUC-AmpR] has an MIC of 512 µg/mL!',
    whyItMatters:
      'Determines clinical drug dosing and allows plasmid selection in genetic engineering.',
    howToUseInLab:
      'Check the Species × Antibiotic Advisor inside Dictionary DB, then add calibrated µg/mL doses at the Media Bench.',
    relatedTerms: ['antibiotic_classes', 'plasmid', 'growth_phases'],
  },

  // MOLECULAR BIOLOGY & GENETICS
  {
    id: 'centrifugation',
    term: 'Centrifugation & RCF (×g)',
    category: 'molecular_biology',
    shortDefinition: 'Spinning tubes at extreme rotational force to pull cells or DNA down into a solid pellet.',
    plainExplanation:
      'Bacteria are slightly denser than water, so spinning a tube at 10,000–14,000 times Earth’s gravity (×g) forces millions of cells to pack into a tiny visible pellet at the bottom of the tube, letting you pour off the clear broth ("supernatant").',
    whyItMatters:
      'Harvesting a concentrated cell pellet is always Step 1 of extracting DNA from a liquid culture.',
    howToUseInLab:
      'Bring a grown broth flask or tube to the Microcentrifuge & DNA Extraction station and spin at ≥ 10,000 ×g.',
    relatedTerms: ['dna_extraction', 'a260_a280'],
  },
  {
    id: 'dna_extraction',
    term: 'Cell Lysis & Spin-Column DNA Miniprep',
    category: 'molecular_biology',
    shortDefinition: 'Breaking open bacteria chemically and trapping pure DNA on a silica filter while washing away proteins.',
    plainExplanation:
      'First, lysis detergent pops open cell membranes to spill out DNA and proteins. Next, binding salts stick the DNA onto a silica spin-column membrane. Then an ethanol wash rinses away leftover proteins and salts, and clean TE buffer releases ("elutes") purified DNA into a 1.5 mL tube.',
    whyItMatters:
      'Skipping the ethanol wash leaves proteins behind that ruin downstream PCR reactions and skew NanoDrop purity readings.',
    howToUseInLab:
      'Follow the 3-step extraction pipeline at the Microcentrifuge & DNA Extraction bench (Pellet → Lyse & Wash → Elute DNA).',
    relatedTerms: ['centrifugation', 'a260_a280', 'dna'],
  },
  {
    id: 'a260_a280',
    term: 'A260 / A280 Purity Ratio & NanoDrop (ng/µL)',
    category: 'molecular_biology',
    shortDefinition: 'UV light test measuring how much DNA you extracted (ng/µL) and whether proteins contaminated it.',
    plainExplanation:
      'DNA absorbs ultraviolet light strongly at 260 nm, whereas proteins absorb strongly at 280 nm. Dividing A260 by A280 gives a purity ratio: ~1.80 means clean pure DNA! If the ratio drops below 1.50, protein or chemical residue is still mixed in.',
    whyItMatters:
      'Checking A260/A280 before PCR guarantees your DNA template is concentrated and clean enough to amplify reliably.',
    howToUseInLab:
      'Open the Spectrophotometer, switch the top mode button to "NanoDrop A260/A280", and select your extracted 1.5 mL DNA microtube.',
    relatedTerms: ['dna_extraction', 'spectrophotometer'],
  },
  {
    id: 'pcr',
    term: 'PCR (Polymerase Chain Reaction)',
    category: 'molecular_biology',
    shortDefinition: 'A molecular photocopier that multiplies one specific DNA region into billions of copies in 30 heating/cooling cycles.',
    plainExplanation:
      'Each PCR cycle has 3 temperatures: 1) Denaturation (95 °C) melts double-stranded DNA apart; 2) Annealing (50–65 °C) lets short primers stick to the start and end of your target gene; 3) Extension (72 °C) lets heat-proof Taq polymerase copy the region. Repeating 30 times multiplies 1 copy into 2³⁰ (~1 billion) copies!',
    whyItMatters:
      'Turns microscopic traces of a gene into enough bright DNA to see on an agarose gel or use for cloning.',
    howToUseInLab:
      'Load extracted DNA into the PCR Thermal Cycler, pick primers, confirm Polymerase + dNTPs are added, set Annealing Temp near the primer Tm, and run 30 cycles.',
    relatedTerms: ['primer', 'tm', 'taq_polymerase', 'gel_electrophoresis'],
  },
  {
    id: 'primer',
    term: 'PCR Primers (Forward & Reverse)',
    category: 'molecular_biology',
    shortDefinition: 'Short ~20-letter single-stranded DNA "bookmarks" that tell polymerase exactly where to start and stop copying.',
    plainExplanation:
      'DNA polymerase cannot start copying from nothing—it needs a short starting dock called a primer. One Forward primer binds the start of your target gene, and one Reverse primer binds the opposite strand at the end of the gene.',
    whyItMatters:
      'Only if BOTH primers match sequences inside your sample DNA will PCR amplify a crisp band of the exact distance between them.',
    howToUseInLab:
      'Choose a Primer Preset (like 16S rRNA, lacZ, or bla) or type your own A/T/G/C primer sequence in the Thermal Cycler.',
    relatedTerms: ['pcr', 'tm', 'gene_marker'],
  },
  {
    id: 'tm',
    term: 'Melting Temperature (Tm) & Annealing Specificity',
    category: 'molecular_biology',
    shortDefinition: 'The temperature (°C) at which half of your primer molecules unstick from the DNA template.',
    plainExplanation:
      'G–C pairs have 3 hydrogen bonds (stronger) while A–T pairs have 2 (weaker), so GC-rich primers have a higher Tm. In PCR, you set the Annealing Temperature ~2–5 °C below the lower primer’s Tm. Too hot (> Tm + 4 °C): primers cannot stick -> NO band! Too cold (< Tm - 7 °C): primers stick randomly -> messy non-specific extra bands!',
    whyItMatters:
      'Choosing the right annealing temperature is the #1 troubleshooting skill in real PCR.',
    howToUseInLab:
      'Check the calculated Forward & Reverse Tm values in the Thermal Cycler and tune the Annealing Temp slider accordingly.',
    relatedTerms: ['pcr', 'primer'],
  },
  {
    id: 'taq_polymerase',
    term: 'Taq Polymerase & dNTPs',
    category: 'molecular_biology',
    shortDefinition: 'The heat-resistant DNA-building enzyme (Taq) and the loose A/T/G/C building blocks (dNTPs) it uses.',
    plainExplanation:
      'Taq polymerase comes from hot-spring bacteria so it survives 95 °C boiling cycles without breaking down. dNTPs are the four loose nucleotide bricks it snaps onto the growing DNA strand at 72 °C.',
    whyItMatters:
      'Forgetting either Taq polymerase or dNTPs in a PCR master mix is a classic lab mistake that yields zero DNA amplification.',
    howToUseInLab:
      'Ensure both Taq Polymerase and dNTPs toggles are switched ON in the PCR Thermal Cycler before starting the run.',
    relatedTerms: ['pcr', 'dna'],
  },
  {
    id: 'restriction_enzyme',
    term: 'Restriction Enzymes (EcoRI, BamHI, HindIII, PstI, SalI)',
    category: 'molecular_biology',
    shortDefinition: 'Molecular scissors that recognize exact 6-letter palindromic DNA words and slice DNA at those spots.',
    plainExplanation:
      'Bacteria naturally make restriction enzymes to chop up invading viral DNA. For example, EcoRI hunts for the exact 6-letter palindrome "GAATTC" and slices between G and A, leaving overhanging "sticky ends". Cutting a 2,686 bp circular plasmid once turns it into a 2,686 bp line; cutting it twice breaks it into two smaller pieces!',
    whyItMatters:
      'Lets scientists verify plasmid identity (restriction mapping) and cut-and-paste genes together in cloning.',
    howToUseInLab:
      'Take extracted pUC-AmpR plasmid (or a PCR product) to the Restriction Digest Bench, choose 1 or 2 enzymes, incubate at 37 °C, and run the cut sample on an Agarose Gel.',
    relatedTerms: ['plasmid', 'bp', 'gel_electrophoresis'],
  },
  {
    id: 'gel_electrophoresis',
    term: 'Agarose Gel Electrophoresis & UV Gel Doc',
    category: 'molecular_biology',
    shortDefinition: 'Using electricity to pull negatively charged DNA fragments through a porous gel sieve so small bands race ahead of large bands.',
    plainExplanation:
      'DNA has a negative electrical charge, so when you place DNA in a porous Jell-O-like agarose slab and turn on voltage (80–140 V), DNA marches toward the positive (+) red electrode. Short fragments (e.g., 400 bp) weave through the pores quickly, while bulky fragments (e.g., 2,686 bp) lag near the top! Under UV or Blue light with fluorescent dye, each size lights up as a glowing band.',
    whyItMatters:
      'It is the universal way to visually confirm whether your PCR worked, check band size, or verify restriction enzyme cuts.',
    howToUseInLab:
      'Load a DNA Ladder into Well 1 and your PCR/digest tubes into Wells 2–8 at the Agarose Gel Rig, apply Voltage, image in UV Gel Doc, and capture a PNG snapshot to your Notebook.',
    relatedTerms: ['dna_ladder', 'bp', 'pcr', 'restriction_enzyme'],
  },
  {
    id: 'dna_ladder',
    term: 'DNA Ladder (Molecular Weight Marker)',
    category: 'molecular_biology',
    shortDefinition: 'A pre-mixed standard ruler of known DNA fragment sizes run alongside your samples on an agarose gel.',
    plainExplanation:
      'Because gel speed changes with agarose % and voltage, you always load a "DNA Ladder" (like 100 bp or 1 kb Plus) in Lane 1. By comparing your unknown sample band against the ladder rungs, you can read its exact length in base pairs.',
    whyItMatters:
      'Without a ladder in Well 1, a glowing gel band has no size scale.',
    howToUseInLab:
      'Keep "1 kb Plus Ladder" or "100 bp Ladder" selected in Lane 1 of the Agarose Gel Rig before running electrophoresis.',
    relatedTerms: ['gel_electrophoresis', 'bp'],
  },

  // INSTRUMENTS
  {
    id: 'microscope',
    term: 'Compound & Phase-Contrast Microscope',
    category: 'instruments',
    shortDefinition: 'Optical instrument magnifying bacteria 100x to 1000x to reveal shape, Gram stain color, and swimming motility.',
    plainExplanation:
      '100x shows broad density, 400x reveals general cell shapes, and 1000x Oil Immersion brings single 1–3 µm bacteria into sharp detail. Phase Contrast creates dark/bright halos around transparent living cells without killing or staining them.',
    whyItMatters:
      'Fastest way to verify cell morphology, Gram status, and purity.',
    howToUseInLab:
      'Select any vessel from Mounted Sample Slide, pick 1000x Oil, tune Fine Focus to 0 µm, and click Capture Micrograph to save a photo to your Notebook.',
    relatedTerms: ['gram_stain', 'morphology'],
  },
  {
    id: 'spectrophotometer',
    term: 'UV/Vis Spectrophotometer & NanoDrop',
    category: 'instruments',
    shortDefinition: 'Optical instrument shining specific light wavelengths (600 nm or 260/280 nm) to quantify bacteria or DNA.',
    plainExplanation:
      'In Culture OD600 mode, visible 600 nm light measures broth cloudiness. In NanoDrop mode, ultraviolet 260 nm and 280 nm wavelengths measure purified DNA concentration (ng/µL) and protein purity.',
    whyItMatters:
      'Gives exact, repeatable numbers for both microbiology and molecular genetics.',
    howToUseInLab:
      'Use the top mode toggle inside the Spectrophotometer console to switch between Culture OD600 and NanoDrop A260/A280.',
    relatedTerms: ['od600', 'a260_a280'],
  },
];

const DICTIONARY_BY_ID = new Map<string, DictionaryEntry>(
  DICTIONARY_ENTRIES.map((d) => [d.id, d])
);

export function getDictionaryEntryById(id: string): DictionaryEntry | undefined {
  return DICTIONARY_BY_ID.get(id);
}
