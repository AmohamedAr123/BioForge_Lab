/**
 * Epistemic classification distinguishing established scientific fact
 * from mathematical simplifications and gameplay abstractions.
 */
export type EpistemicTag = 'established_fact' | 'simplified_model' | 'gameplay_abstraction';

export type GramStatus = 'positive' | 'negative' | 'not_applicable';

export type CellShape = 'bacillus' | 'coccus' | 'coccobacillus' | 'spirillum';

export type CellArrangement = 'single' | 'pairs' | 'chains' | 'clusters' | 'short_chains';

export type OxygenRequirement = 'aerobe' | 'facultative_anaerobe' | 'obligate_anaerobe';

export type GrowthPhase = 'inoculated' | 'lag' | 'exponential' | 'stationary' | 'death' | 'dormant';

export type VesselType =
  | 'flask_250ml'
  | 'culture_tube'
  | 'agar_plate'
  | 'glycerol_stock'
  | 'microtube_1_5ml'
  | 'pcr_tube';

export type StationId =
  | 'cold_storage'
  | 'media_bench'
  | 'shaking_incubator'
  | 'static_incubator'
  | 'microscope'
  | 'spectrophotometer'
  | 'centrifuge_miniprep'
  | 'pcr_cycler'
  | 'restriction_bench'
  | 'gel_electrophoresis'
  | 'autoclave';

export type SimulationSpeed = 0 | 1 | 10 | 50 | 100 | 500;

export type LabMode = 'automate' | 'manual';

export type ThermalEnvironment = 'still_air' | 'fridge' | 'incubator' | 'conduction';

export interface ManualActualParams {
  actualVolumeMl?: number;
  actualPh?: number;
  actualNutrients?: number;
  actualBufferCapacity?: number;
  antibioticPotency?: number;
  contaminationRisk?: number;
  crossStrainId?: string | null;
  airBubbles?: number;
  gramStainResult?: 'accurate' | 'over_decolorized' | 'unstained';
  blankedOdOffset?: number;
  vortexResuspended?: boolean;
}

export type NotebookTimelineScope =
  | 'couple_hours'
  | 'six_hours'
  | 'one_day'
  | 'one_week'
  | 'auto';

export interface ScientificCitation {
  source: string;
  note: string;
  epistemicTag: EpistemicTag;
}

export interface SpeciesAntibioticNote {
  verdict: 'susceptible' | 'resistant_plasmid' | 'resistant_intrinsic';
  summary: string;
  mechanism: string;
}

export interface SpeciesRealLifeDossier {
  taxonomy: string;
  naturalHabitat: string;
  cellEnvelope: string;
  metabolismAndCarbon: string;
  temperatureAndPhNotes: string;
  optimalProtocol: string;
  clinicalAndBiotechRole: string;
  antibioticProfiles: Record<string, SpeciesAntibioticNote>;
}

export interface BacterialSpecies {
  id: string;
  scientificName: string;
  strainCode: string;
  commonLabel: string;
  biosafetyLevel: 'BSL-1' | 'BSL-2';
  gramStatus: GramStatus;
  shape: CellShape;
  arrangement: CellArrangement;
  /** Typical cell length in micrometers (µm) */
  lengthUm: number;
  /** Typical cell diameter/width in micrometers (µm) */
  widthUm: number;
  motile: boolean;
  oxygenRequirement: OxygenRequirement;
  /** Dissolved oxygen Monod half-saturation (% air saturation) */
  oxygenKmPercent: number;
  /** Cardinal growth temperatures in °C */
  tempMinC: number;
  tempOptC: number;
  tempMaxC: number;
  /** Cardinal growth pH values */
  phMin: number;
  phOpt: number;
  phMax: number;
  /** Relative metabolic acidification drive during sugar fermentation (pH units at full growth in unbuffered broth) */
  acidificationDrive: number;
  /** Minimum doubling time in optimal rich medium (minutes) */
  minDoublingTimeMin: number;
  /** Relative growth efficiency on minimal defined medium (0..1) */
  minimalMediaFactor: number;
  /** Whether the organism ferments lactose (relevant on MacConkey agar) */
  fermentsLactose: boolean;
  /** Whether it can grow on MacConkey agar (bile salts / crystal violet selectivity) */
  growsOnMacConkey: boolean;
  /** Colony morphology & pigmentation on nutrient/LB agar */
  colonyProfile: {
    colorHex: string;
    edgeHex: string;
    macConkeyColorHex?: string;
    opacity: number;
    maxDiameterMm: number;
    description: string;
  };
  /** Minimum Inhibitory Concentrations (µg/mL) for common antibiotics */
  micUgPerMl: Record<string, number>;
  /** Maximum carrying capacity in rich broth (CFU/mL) */
  carryingCapacityCfuPerMl: number;
  summary: string;
  /** Plain-English beginner dossier fields for the Dictionary Book */
  beginnerSummary: string;
  microscopyGuide: string;
  growthGuide: string;
  geneticsGuide: string;
  howToUseExperiments: string[];
  markerGenes: string[];
  harboredPlasmidId?: string;
  realLifeDossier: SpeciesRealLifeDossier;
  citations: ScientificCitation[];
}

export interface MediaRecipe {
  id: string;
  name: string;
  shortName: string;
  format: 'broth' | 'agar';
  isMinimal: boolean;
  isMacConkey: boolean;
  /** Relative nutrient richness multiplier for exponential growth (0.3..1.1) */
  richnessFactor: number;
  /** Total nutrient units available per mL */
  nutrientCapacityMultiplier: number;
  baseColorHex: string;
  turbidColorHex: string;
  pH: number;
  /** Buffering capacity resisting pH drift (0.2 = weak peptone buffer; 1.0 = strong M9 phosphate buffer) */
  bufferCapacity: number;
  /** Fermentable carbohydrate load driving metabolic acid drift (0..1) */
  fermentableSugarFactor: number;
  compositionSummary: string;
  scientificPurpose: string;
  epistemicTag: EpistemicTag;
}

export interface NutrientSupplement {
  id: string;
  name: string;
  shortName: string;
  category: 'carbon' | 'complex' | 'broth' | 'buffer';
  defaultDoseMl: number;
  minDoseMl: number;
  maxDoseMl: number;
  stepMl: number;
  /** Fraction of full vessel nutrient capacity restored per mL in a 50 mL reference flask */
  nutrientGainPerMlRef50: number;
  /** Fed-batch carrying capacity multiplier bonus added per standard dose */
  capacityBoostPerDose: number;
  targetPh: number;
  bufferStrength: number;
  /** How much bufferCapacity increases toward 1.0 per dose */
  bufferBoost: number;
  description: string;
  realLifeNote: string;
}

export interface AntibioticCompound {
  id: string;
  name: string;
  drugClass: string;
  targetMechanism: string;
  mode: 'bactericidal' | 'bacteriostatic';
  standardWorkingUgPerMl: number;
  maxConcentrationUgPerMl: number;
  halfLife37CHours: number;
  optimalPhRange: [number, number];
  acidicPenaltyFactor: number;
  phStabilityNote: string;
  citation: ScientificCitation;
}

export interface DNASequenceRecord {
  id: string;
  name: string;
  shortName: string;
  speciesId: string | null;
  topology: 'linear' | 'circular';
  lengthBp: number;
  sequence: string;
  description: string;
  features: Array<{
    name: string;
    startBp: number;
    endBp: number;
    kind: 'promoter' | 'cds' | 'ori' | 'mcs';
  }>;
}

export interface DNAFragmentSample {
  id: string;
  sequenceId: string;
  name: string;
  topology: 'linear' | 'circular';
  lengthBp: number;
  /** Actual nucleotide string for downstream PCR/restriction operations */
  sequence: string;
  concentrationNgPerUl: number;
  /** A260/A280 ratio (~1.82 pure DNA; <1.5 protein/phenol carryover) */
  purityA260_280: number;
  sourceSpeciesId?: string;
  isArtifact?: boolean;
}

export interface PrimerPreset {
  id: string;
  name: string;
  targetSequenceId: string;
  targetGeneLabel: string;
  forwardSeq: string;
  reverseSeq: string;
  expectedAmpliconBp: number;
  description: string;
}

export interface RestrictionEnzyme {
  id: string;
  name: string;
  recognitionSeq: string;
  cutOffset: number;
  overhangType: '5_prime_sticky' | '3_prime_sticky' | 'blunt';
  overhangBases: string;
  sourceOrganism: string;
  optimalTempC: number;
  description: string;
}

export interface PopulationState {
  speciesId: string;
  viableCount: number;
  deadCount: number;
  phase: GrowthPhase;
  lagProgress: number;
  stressLevel: number;
}

export interface TimeSeriesPoint {
  simMinutes: number;
  od600: number;
  viableCount: number;
  tempC: number;
  nutrientRemaining: number;
  pH?: number;
  dissolvedO2Percent?: number;
}

export type VesselLocation =
  | { zone: 'belt'; slotIndex: number }
  | { zone: 'equipment'; stationId: StationId; slotIndex: number };

export interface CultureVessel {
  id: string;
  label: string;
  vesselType: VesselType;
  mediaId: string;
  volumeMl: number;
  nutrientRemaining: number;
  /** Additional carrying capacity unlocked by concentrated fed-batch nutrient feeding (0..0.75) */
  fedBatchCapacityBoost?: number;
  antibioticsUgPerMl: Record<string, number>;
  temperatureC: number;
  /** Live medium pH (v2.1 continuous physiology) */
  pH: number;
  /** Starting medium pH when formulated */
  initialPh: number;
  /** Buffering strength (0.2..1.0) resisting metabolic pH drift */
  bufferCapacity: number;
  /** Live dissolved oxygen saturation percentage (0..100%) */
  dissolvedO2Percent: number;
  populations: PopulationState[];
  od600: number;
  colonyCount: number;
  colonyDiameterMm: number;
  createdAtSimMin: number;
  lastLoggedSimMin: number;
  history: TimeSeriesPoint[];
  location: VesselLocation;
  /** Phase 2 molecular cargo (purified DNA, PCR amplicons, digested fragments) */
  dnaFragments?: DNAFragmentSample[];
  /** Optional metadata about last molecular process (extraction, PCR, digestion) */
  molecularOrigin?: 'extracted_genomic' | 'extracted_plasmid' | 'pcr_product' | 'restriction_digest';
  notes?: string;
}

export interface ShakingIncubatorConfig {
  targetTempC: number;
  rpm: number;
  powerOn: boolean;
}

export interface StaticIncubatorConfig {
  targetTempC: number;
  powerOn: boolean;
}

export interface MicroscopeSnapshot {
  id: string;
  capturedAtSimMin: number;
  vesselId: string;
  vesselLabel: string;
  speciesIds: string[];
  magnification: 100 | 400 | 1000;
  opticalMode: 'brightfield' | 'phase_contrast' | 'gram_stain';
  od600AtCapture: number;
  viableCountAtCapture: number;
  summaryObservation: string;
  imageDataUrl?: string;
}

export interface GelRunSnapshot {
  id: string;
  capturedAtSimMin: number;
  agarosePercent: number;
  voltageV: number;
  ladderId: string;
  laneSummaries: Array<{
    laneNumber: number;
    sampleLabel: string;
    bandSizesBp: number[];
  }>;
  imageDataUrl?: string;
}

export interface NotebookEntry {
  id: string;
  title: string;
  hypothesis: string;
  protocolNotes: string;
  observations: string;
  linkedVesselIds: string[];
  snapshots: MicroscopeSnapshot[];
  gelSnapshots?: GelRunSnapshot[];
  timelinePhase?: NotebookTimelineScope;
  createdAtSimMin: number;
  updatedAtSimMin: number;
}

export interface DictionaryEntry {
  id: string;
  term: string;
  category: 'fundamentals' | 'microbiology' | 'molecular_biology' | 'instruments';
  shortDefinition: string;
  plainExplanation: string;
  whyItMatters: string;
  howToUseInLab: string;
  relatedTerms: string[];
}

export interface TutorialQuest {
  id: string;
  title: string;
  summary: string;
  howToSteps: string[];
  scientificWhy: string;
  dictionaryTermIds: string[];
}

export interface ResearchGoal {
  id: string;
  number: number;
  title: string;
  description: string;
  quests: TutorialQuest[];
}

export interface LabPlayerState {
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  walkFrame: number;
  pathQueue: Array<{ x: number; y: number }>;
}

export interface SimulationSaveState {
  schemaVersion: number;
  simMinutes: number;
  speed: SimulationSpeed;
  labMode: LabMode;
  muted: boolean;
  vessels: CultureVessel[];
  shakingIncubator: ShakingIncubatorConfig;
  staticIncubator: StaticIncubatorConfig;
  notebookEntries: NotebookEntry[];
  activeNotebookEntryId: string | null;
  player: {
    x: number;
    y: number;
    facing: 'up' | 'down' | 'left' | 'right';
  };
  nextVesselCounter: number;
  /** Phase 2 Goal-Based Tutorial state */
  completedQuestIds: string[];
  activeGoalId: string;
  goalHudCollapsed: boolean;
  goalHudHidden: boolean;
  /** Tracks non-vessel milestone actions (e.g. walked, read OD600, ran NanoDrop, etc.) */
  achievedEvents: string[];
}
