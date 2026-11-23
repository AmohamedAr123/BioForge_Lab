import { ResearchGoal } from '../types/lab';

export const RESEARCH_GOALS: ResearchGoal[] = [
  {
    id: 'goal_1_basics',
    number: 1,
    title: 'Lab Navigation & First Bacterial Culture',
    description:
      'Master moving around the laboratory, retrieving frozen bacterial stocks, formulating media, and growing your first culture.',
    quests: [
      {
        id: 'q1_walk',
        title: 'Move Across the Laboratory',
        summary: 'Walk around the lab floor using WASD/Arrows or by clicking any tile.',
        howToSteps: [
          'Press W, A, S, D (or Arrow keys) to walk, OR click any open floor tile to auto-walk there.',
          'Notice how nearby interactive stations light up with a colored border and "[E]" prompt.',
        ],
        scientificWhy:
          'Every instrument in the lab occupies physical bench space; you carry samples in your 10-slot Sample Tray between stations.',
        dictionaryTermIds: [],
      },
      {
        id: 'q1_take_stock',
        title: 'Retrieve a Frozen Glycerol Stock from Cold Storage',
        summary: 'Open Cold Storage (-80 °C / 4 °C) and take any bacterial stock into your Sample Tray.',
        howToSteps: [
          'Walk to Cold Storage (top-left blue unit) and press E, or click it directly.',
          'Click "Take Stock" on E. coli K-12 (or any strain you want to study) to move it into your Sample Tray.',
        ],
        scientificWhy:
          'Master bacterial stocks are stored at -80 °C in glycerol so cells stay dormant without accumulating mutations.',
        dictionaryTermIds: ['cfu_ml'],
      },
      {
        id: 'q1_prepare_broth',
        title: 'Inoculate a Fresh Liquid Broth Culture',
        summary: 'Use the Media Bench to dispense LB Broth and inoculate it with 50 µL of bacteria.',
        howToSteps: [
          'Open the Media & Inoculation Bench (top-center green-accented bench).',
          'Keep "250 mL Flask" and "LB Broth" selected.',
          'Under "4. Aseptic Inoculation Source", select your Glycerol Stock (or an active culture) and click "Dispense Media & Inoculate".',
        ],
        scientificWhy:
          'LB Miller broth supplies amino acids, vitamins, and salts for rapid exponential bacterial division.',
        dictionaryTermIds: ['lb_broth', 'growth_phases'],
      },
      {
        id: 'q1_incubate_broth',
        title: 'Incubate & Speed Up Growth',
        summary: 'Place your broth flask into the Shaking Incubator at 37 °C and advance time until OD600 exceeds 0.30.',
        howToSteps: [
          'Open the Orbital Shaking Incubator (top-right amber machine).',
          'Under "Load from Carried Sample Tray", click "Load" on your new flask.',
          'Set Temperature to 37.0 °C, RPM to 220, and switch the top speed bar to 10x or 50x until OD600 rises past 0.30.',
        ],
        scientificWhy:
          'Shaking dissolves oxygen into the broth while 37 °C matches optimal enzyme kinetics for enteric bacteria.',
        dictionaryTermIds: ['od600', 'growth_phases'],
      },
    ],
  },
  {
    id: 'goal_2_microscopy_od',
    number: 2,
    title: 'Microscopy, Gram Staining & OD600 Kinetics',
    description:
      'Observe bacterial morphology under 1000x magnification, capture micrographs, and log quantitative optical density readings.',
    quests: [
      {
        id: 'q2_microscope_capture',
        title: 'Inspect at 1000x Gram Stain & Capture Micrograph',
        summary: 'View an active culture under the Microscope and save a micrograph to your Notebook.',
        howToSteps: [
          'Open the Compound & Phase-Contrast Microscope (middle-left bench).',
          'Select your grown culture in "Mounted Sample Slide".',
          'Click "1000x Oil" and "Gram Stain" (or switch to "Phase Contrast" to watch live swimming!), tune Fine Focus to 0 µm, then click "Capture Micrograph to Lab Notebook".',
        ],
        scientificWhy:
          'Gram staining distinguishes thick-walled Gram-positive (purple) from outer-membrane Gram-negative (pink/red) bacteria.',
        dictionaryTermIds: ['gram_stain', 'morphology', 'microscope'],
      },
      {
        id: 'q2_od600_log',
        title: 'Measure & Log OD600 on the Spectrophotometer',
        summary: 'Read a broth culture’s 600 nm absorbance and record it to your Lab Notebook.',
        howToSteps: [
          'Open the UV/Vis Spectrophotometer (middle-center bench).',
          'Make sure it is on "Culture OD600" mode and select your grown flask.',
          'Click "Record OD600 Reading to Notebook" to log the exact timestamped measurement.',
        ],
        scientificWhy:
          'Spectrophotometry quantifies turbidity (OD600) cleanly so you can track lag, exponential, and stationary growth phases.',
        dictionaryTermIds: ['od600', 'spectrophotometer'],
      },
    ],
  },
  {
    id: 'goal_3_plates_antibiotics',
    number: 3,
    title: 'Serial Dilution, Selective Plates & Antibiotics',
    description:
      'Isolate countable colonies using serial dilution on MacConkey Agar and test plasmid-based vs. wild-type antibiotic susceptibility.',
    quests: [
      {
        id: 'q3_serial_plate',
        title: 'Make a Diluted MacConkey Agar Plate',
        summary: 'Plate an active culture using Serial Dilution (10⁻⁴ or 10⁻⁵) onto MacConkey Agar and grow visible colonies.',
        howToSteps: [
          'At the Media Bench, select "Petri Plate" and choose "MacConkey Agar Plate".',
          'Select an active E. coli culture (or stock) as source, set Serial Dilution to 10⁻⁴ or 10⁻⁵ so single colonies are separated, and click "Dispense Media & Inoculate".',
          'Load the plate into the Static Plate Incubator at 37.0 °C and run at 50x–100x until colonies grow (click the plate row to see pink lactose-fermenting colonies!).',
        ],
        scientificWhy:
          'MacConkey inhibits Gram-positive bacteria and turns lactose-fermenting Gram-negatives bright pink; serial dilution avoids an overgrown lawn.',
        dictionaryTermIds: ['macconkey_agar', 'serial_dilution', 'cfu_ml'],
      },
      {
        id: 'q3_antibiotic_flask',
        title: 'Prepare an Ampicillin Selection Culture',
        summary: 'Create a broth flask supplemented with Ampicillin (100 µg/mL) and test E. coli [pUC-AmpR] or wild-type E. coli.',
        howToSteps: [
          'Take "E. coli [pUC-AmpR]" (or P. aeruginosa) from Cold Storage if you want to see resistance survival.',
          'At the Media Bench, choose "250 mL Flask" + "LB Broth", check "Ampicillin" under Step 3 (100 µg/mL), inoculate, and incubate in the Shaking Incubator.',
        ],
        scientificWhy:
          'Antibiotics inhibit or kill cells below their MIC; plasmids carrying the bla gene break down Ampicillin so only engineered cells survive.',
        dictionaryTermIds: ['plasmid', 'mic'],
      },
      {
        id: 'q3_notebook_compare',
        title: 'Compare Two Cultures in the Lab Notebook',
        summary: 'Open the Lab Notebook and link at least 2 liquid cultures on the Multi-Run OD600 Comparison Plot.',
        howToSteps: [
          'Click "Notebook" in the top bar.',
          'Under "Linked Cultures for Quantitative Comparison", click 2 or more broth flasks so both curves plot together.',
        ],
        scientificWhy:
          'Side-by-side control vs. treatment curves provide quantitative proof of how drugs or media affect growth rate.',
        dictionaryTermIds: ['od600', 'mic'],
      },
    ],
  },
  {
    id: 'goal_4_dna_extraction',
    number: 4,
    title: 'DNA Extraction & NanoDrop Purity Check',
    description:
      'Harvest bacterial cells by centrifugation, isolate purified genomic or plasmid DNA, and verify purity at 260/280 nm.',
    quests: [
      {
        id: 'q4_extract_dna',
        title: 'Pellet Cells & Extract Purified DNA',
        summary: 'Spin down a grown culture (OD >= 0.2) in the Microcentrifuge, lyse, wash, and elute a 1.5 mL DNA tube.',
        howToSteps: [
          'Open the Microcentrifuge & DNA Extraction bench (bottom-left Molecular Bay).',
          'Select any grown broth culture (OD600 >= 0.20; try E. coli [pUC-AmpR] for plasmid + genomic DNA!).',
          'Set rotor force >= 10,000 ×g, keep "Ethanol Wash Buffer" enabled for clean DNA, and click "Spin, Lyse & Elute DNA".',
        ],
        scientificWhy:
          'Centrifugation pellets cells out of broth; alkaline/spin-column lysis frees DNA while ethanol wash removes proteins that poison PCR.',
        dictionaryTermIds: ['centrifugation', 'dna_extraction', 'dna'],
      },
      {
        id: 'q4_nanodrop',
        title: 'Quantify DNA Yield & A260/A280 on NanoDrop',
        summary: 'Measure your extracted 1.5 mL DNA microtube using the Spectrophotometer’s NanoDrop mode.',
        howToSteps: [
          'Open the UV/Vis Spectrophotometer.',
          'Click "NanoDrop A260/A280" at the top of the instrument console.',
          'Select your newly extracted 1.5 mL DNA tube to inspect its ng/µL yield, A260/A280 purity (~1.8), and UV spectrum.',
        ],
        scientificWhy:
          'Pure double-stranded DNA peaks at 260 nm with an A260/A280 ratio near 1.80; ratios below 1.5 indicate protein carryover.',
        dictionaryTermIds: ['a260_a280', 'spectrophotometer'],
      },
    ],
  },
  {
    id: 'goal_5_pcr_gel_digest',
    number: 5,
    title: 'PCR Amplification, Restriction Digest & Gel Doc',
    description:
      'Amplify specific genes by PCR, cut plasmid DNA with restriction enzymes, separate bands by size, and image your gel.',
    quests: [
      {
        id: 'q5_run_pcr',
        title: 'Amplify a Target Gene in the Thermal Cycler',
        summary: 'Configure primers, Taq polymerase, dNTPs, and annealing temperature to run a successful PCR reaction.',
        howToSteps: [
          'Open the PCR Thermal Cycler (bottom-center-left Molecular Bay).',
          'Select your extracted 1.5 mL DNA microtube as the Template DNA.',
          'Pick a matching Primer Preset (e.g., Universal 16S rRNA 920 bp, or bla AmpR 510 bp if extracted from E. coli [pUC-AmpR]).',
          'Verify Taq Polymerase & dNTPs are ON, set Annealing Temp close to the primer Tm (~54–58 °C), set 30 cycles, and click "Run PCR Program".',
        ],
        scientificWhy:
          'PCR exponentially amplifies only the DNA segment flanked by matching forward and reverse primers when annealing temperature is near Tm.',
        dictionaryTermIds: ['pcr', 'primer', 'tm', 'taq_polymerase'],
      },
      {
        id: 'q5_restriction_digest',
        title: 'Digest DNA with Restriction Enzymes (Optional / Mastery)',
        summary: 'Cut extracted pUC-AmpR plasmid or DNA with EcoRI / PstI at 37 °C on the Restriction Digest Bench.',
        howToSteps: [
          'Open the Restriction Digest Bench (next to the PCR machine).',
          'Select an extracted DNA tube (best with E. coli [pUC-AmpR] plasmid DNA!) or PCR product.',
          'Select one or two enzymes (try EcoRI + PstI on pUC-AmpR to split it into ~1,602 bp + ~1,068 bp bands!) and click "Incubate 37 °C Digest".',
        ],
        scientificWhy:
          'Restriction endonucleases recognize exact 6-bp palindromes and cleave DNA into diagnostic fragment sizes.',
        dictionaryTermIds: ['restriction_enzyme', 'plasmid', 'bp'],
      },
      {
        id: 'q5_run_gel_capture',
        title: 'Run Agarose Gel Electrophoresis & Capture UV Gel Doc',
        summary: 'Separate your PCR or digested DNA alongside a DNA Ladder and capture the UV image to your Notebook.',
        howToSteps: [
          'Open the Agarose Gel Rig & UV Gel Doc (bottom-right Molecular Bay).',
          'Keep a DNA Ladder in Well 1 and load your PCR tube (and/or Restriction Digest tube) into Wells 2–3.',
          'Set Agarose % (1.2%) and Voltage (100 V), click "Run Electrophoresis", then click "Capture Gel Image to Notebook".',
        ],
        scientificWhy:
          'Smaller DNA fragments migrate faster through agarose pores toward the anode, letting you verify exact bp sizes against the ladder.',
        dictionaryTermIds: ['gel_electrophoresis', 'dna_ladder', 'bp'],
      },
    ],
  },
];

export const ALL_QUESTS_FLAT = RESEARCH_GOALS.flatMap((g) =>
  g.quests.map((q) => ({ ...q, goalId: g.id, goalNumber: g.number, goalTitle: g.title }))
);
