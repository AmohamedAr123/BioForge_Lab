import { SimulationSaveState } from '../types/lab';

/**
 * Evaluates live laboratory state and recorded action events to determine which
 * tutorial quests have been satisfied naturally.
 */
export function evaluateCompletedQuests(state: SimulationSaveState): string[] {
  const completed = new Set<string>(state.completedQuestIds);
  const events = new Set<string>(state.achievedEvents);

  // Goal 1: Lab Navigation & First Bacterial Culture
  if (events.has('player_walked')) {
    completed.add('q1_walk');
  }
  if (
    events.has('took_stock') ||
    state.vessels.some(
      (v) => v.vesselType === 'glycerol_stock' && v.location.zone === 'belt'
    )
  ) {
    completed.add('q1_take_stock');
  }
  if (
    events.has('prepared_broth') ||
    state.vessels.some(
      (v) =>
        v.id !== 'vessel_1' &&
        (v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube') &&
        v.populations.length > 0
    )
  ) {
    completed.add('q1_prepare_broth');
  }
  if (
    state.vessels.some(
      (v) =>
        (v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube') &&
        v.od600 >= 0.3 &&
        v.location.zone === 'equipment' &&
        v.location.stationId === 'shaking_incubator'
    )
  ) {
    completed.add('q1_incubate_broth');
  }

  // Goal 2: Microscopy & OD600
  if (
    events.has('captured_micrograph') ||
    state.notebookEntries.some((e) => e.snapshots.length > 0)
  ) {
    completed.add('q2_microscope_capture');
  }
  if (events.has('logged_od600')) {
    completed.add('q2_od600_log');
  }

  // Goal 3: Selective Plating, Serial Dilution & Antibiotics
  if (
    state.vessels.some(
      (v) =>
        v.vesselType === 'agar_plate' &&
        v.mediaId === 'macconkey_agar' &&
        v.colonyDiameterMm >= 0.25
    )
  ) {
    completed.add('q3_serial_plate');
  }
  if (
    state.vessels.some(
      (v) =>
        (v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube') &&
        (v.antibioticsUgPerMl.ampicillin ?? 0) > 0 &&
        v.populations.length > 0
    )
  ) {
    completed.add('q3_antibiotic_flask');
  }
  if (
    state.notebookEntries.some((e) => {
      const linkedLiquidCount = e.linkedVesselIds.filter((id) => {
        const v = state.vessels.find((vs) => vs.id === id);
        return v && (v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube');
      }).length;
      return linkedLiquidCount >= 2;
    })
  ) {
    completed.add('q3_notebook_compare');
  }

  // Goal 4: DNA Extraction & NanoDrop
  if (
    events.has('extracted_dna') ||
    state.vessels.some((v) => v.molecularOrigin === 'extracted_genomic' || v.molecularOrigin === 'extracted_plasmid')
  ) {
    completed.add('q4_extract_dna');
  }
  if (events.has('measured_nanodrop')) {
    completed.add('q4_nanodrop');
  }

  // Goal 5: PCR, Restriction Digest & Gel Doc
  if (
    events.has('ran_pcr_success') ||
    state.vessels.some((v) => v.molecularOrigin === 'pcr_product' && (v.dnaFragments?.length ?? 0) > 0)
  ) {
    completed.add('q5_run_pcr');
  }
  if (
    events.has('ran_restriction_digest') ||
    state.vessels.some((v) => v.molecularOrigin === 'restriction_digest')
  ) {
    completed.add('q5_restriction_digest');
  }
  if (
    events.has('captured_gel') ||
    state.notebookEntries.some((e) => (e.gelSnapshots?.length ?? 0) > 0)
  ) {
    completed.add('q5_run_gel_capture');
  }

  return Array.from(completed);
}
