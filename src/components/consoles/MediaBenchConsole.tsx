import React, { useEffect, useRef, useState } from 'react';
import {
  Beaker,
  Droplets,
  Flame,
  Pipette,
  Plus,
  X,
} from 'lucide-react';
import {
  ANTIBIOTIC_COMPOUNDS,
  BACTERIAL_SPECIES,
  getMediaById,
  getNutrientSupplementById,
  getSpeciesById,
  MEDIA_RECIPES,
  NUTRIENT_SUPPLEMENTS,
} from '../../data/scientificDatabase';
import {
  applyNutrientFeedToVessel,
  computePhResponse,
  formatScientificCount,
  getMaxSafeVolumeMl,
} from '../../engine/simulation';
import { CultureVessel, LabMode, ManualActualParams, VesselType } from '../../types/lab';
import {
  evaluateAntibioticDecision,
  getGrowthPhaseStatus,
  getNutrientStatus,
  getPhStatus,
} from '../../utils/colorCoding';
import { IsometricMediaWorkbench } from './IsometricMediaWorkbench';

interface MediaBenchConsoleProps {
  labMode?: LabMode;
  beltVessels: CultureVessel[];
  allVessels: CultureVessel[];
  beltCapacity: number;
  onCreateVessel: (params: {
    label: string;
    vesselType: VesselType;
    mediaId: string;
    volumeMl: number;
    initialPh: number;
    antibioticsUgPerMl: Record<string, number>;
    sourceVesselId: string | null;
    inoculumUl: number;
    dilutionExponent?: number;
    actualParams?: ManualActualParams;
  }) => void;
  onInoculateExisting: (
    targetVesselId: string,
    sourceVesselId: string,
    inoculumUl: number,
    dilutionExponent?: number,
    actualParams?: ManualActualParams
  ) => void;
  onFeedCulture: (vesselId: string, supplementId: string, feedMl: number) => void;
  onUpdateExistingVessel?: (vesselId: string, updater: (v: CultureVessel) => CultureVessel) => void;
  onClose: () => void;
}

interface InternalMediaConsoleProps extends MediaBenchConsoleProps {
  sessionMode: LabMode;
  onSwitchSessionMode: (mode: LabMode) => void;
}

const StandardMediaBenchConsole: React.FC<InternalMediaConsoleProps> = ({
  sessionMode,
  onSwitchSessionMode,
  beltVessels,
  allVessels,
  beltCapacity,
  onCreateVessel,
  onInoculateExisting,
  onFeedCulture,
  onClose,
}) => {
  const [benchMode, setBenchMode] = useState<'prepare' | 'inoculate' | 'feed'>('prepare');
  const [vesselType, setVesselType] = useState<'flask_250ml' | 'culture_tube' | 'agar_plate'>(
    'flask_250ml'
  );

  const compatibleMedia = MEDIA_RECIPES.filter((m) =>
    vesselType === 'agar_plate' ? m.format === 'agar' : m.format === 'broth'
  );
  const [mediaId, setMediaId] = useState<string>('lb_broth');
  const [volumeMl, setVolumeMl] = useState<number>(50);
  const [startingPh, setStartingPh] = useState<number>(7.0);
  const [customLabel, setCustomLabel] = useState<string>('');
  const [antibiotics, setAntibiotics] = useState<Record<string, number>>({});
  const [sourceVesselId, setSourceVesselId] = useState<string>(() => {
    const firstSource = beltVessels.find((v) => v.populations.length > 0);
    return firstSource?.id ?? '';
  });
  const [inoculumUl, setInoculumUl] = useState<number>(50);
  const [dilutionExponent, setDilutionExponent] = useState<number>(4);

  const [existingTargetId, setExistingTargetId] = useState<string>('');
  const [activeAnim, setActiveAnim] = useState<{
    kind: 'dispense' | 'pipette' | 'dilute' | 'feed';
    volumeMl: number;
    inoculumUl: number;
    dilutionExponent: number;
    durationMs: number;
    nonce: number;
  } | null>(null);
  const animTimerRef = useRef<number | null>(null);

  // Fed-Batch Nutrient Feeding State
  const liquidCultures = allVessels.filter(
    (v) =>
      !v.id.startsWith('stock_') &&
      (v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube')
  );
  const [feedTargetId, setFeedTargetId] = useState<string>(
    () => liquidCultures[0]?.id ?? ''
  );
  const [supplementId, setSupplementId] = useState<string>('glucose_20');
  const [feedMl, setFeedMl] = useState<number>(1.5);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) window.clearTimeout(animTimerRef.current);
    };
  }, []);

  const triggerAdaptiveAnim = (
    kind: 'dispense' | 'pipette' | 'dilute' | 'feed',
    vol: number,
    inocUl: number,
    dilExp: number
  ) => {
    if (animTimerRef.current) window.clearTimeout(animTimerRef.current);
    const durationMs =
      kind === 'feed'
        ? Math.round(600 + Math.min(900, vol * 18))
        : Math.round(
            550 +
              (vesselType === 'agar_plate' ? 350 : (vol / 120) * 650) +
              (inocUl / 500) * 280
          );
    setActiveAnim({
      kind,
      volumeMl: vol,
      inoculumUl: inocUl,
      dilutionExponent: dilExp,
      durationMs,
      nonce: Date.now(),
    });
    animTimerRef.current = window.setTimeout(() => {
      setActiveAnim(null);
    }, durationMs);
  };

  const availableInoculumSources = beltVessels.filter((v) =>
    v.populations.some((p) => p.viableCount > 0)
  );
  const sterileBeltVessels = beltVessels.filter(
    (v) => v.populations.length === 0 && v.vesselType !== 'glycerol_stock'
  );

  const selectedFeedVessel =
    liquidCultures.find((v) => v.id === feedTargetId) ?? liquidCultures[0] ?? null;
  const selectedSupplement =
    getNutrientSupplementById(supplementId) ?? NUTRIENT_SUPPLEMENTS[0];
  const feedHeadroomMl = selectedFeedVessel
    ? Math.max(0, Number((getMaxSafeVolumeMl(selectedFeedVessel.vesselType) - selectedFeedVessel.volumeMl).toFixed(1)))
    : 0;
  const effectiveFeedMinMl =
    feedHeadroomMl > 0
      ? Math.min(selectedSupplement.minDoseMl, feedHeadroomMl)
      : 0;
  const effectiveFeedMaxMl =
    feedHeadroomMl > 0
      ? Math.min(selectedSupplement.maxDoseMl, feedHeadroomMl)
      : 0;
  const effectiveFeedMl =
    feedHeadroomMl > 0
      ? Number(Math.max(effectiveFeedMinMl, Math.min(effectiveFeedMaxMl, feedMl)).toFixed(1))
      : 0;

  const feedPreview =
    selectedFeedVessel && effectiveFeedMl > 0
      ? applyNutrientFeedToVessel(selectedFeedVessel, selectedSupplement.id, effectiveFeedMl, 0)
      : null;

  const handleSelectMedia = (nextMediaId: string) => {
    setMediaId(nextMediaId);
    const m = getMediaById(nextMediaId);
    if (m) {
      setStartingPh(m.pH);
    }
  };

  const handleVesselTypeChange = (nextType: 'flask_250ml' | 'culture_tube' | 'agar_plate') => {
    setVesselType(nextType);
    if (nextType === 'agar_plate') {
      handleSelectMedia('lb_agar');
      setVolumeMl(25);
    } else if (nextType === 'culture_tube') {
      if (mediaId === 'lb_agar' || mediaId === 'macconkey_agar') {
        handleSelectMedia('lb_broth');
      }
      setVolumeMl(5);
    } else {
      if (mediaId === 'lb_agar' || mediaId === 'macconkey_agar') {
        handleSelectMedia('lb_broth');
      }
      setVolumeMl(50);
    }
  };

  const selectedMedia = getMediaById(mediaId) ?? compatibleMedia[0];
  const selectedSource = allVessels.find((v) => v.id === sourceVesselId) ?? null;
  const selectedSpecies = selectedSource?.populations[0]
    ? getSpeciesById(selectedSource.populations[0].speciesId)
    : undefined;

  const phCompatibility = getPhStatus(startingPh, selectedSpecies);

  // Live batch kinetic preview so every tiny tweak of volume, inoculum uL, pH, or medium is transparent
  const sourceViable = selectedSource?.populations.reduce((acc, p) => acc + p.viableCount, 0) ?? 0;
  const inoculumMl = inoculumUl / 1000;
  const predictedStartCfuPerMl =
    selectedSource && vesselType !== 'agar_plate'
      ? (sourceViable * inoculumMl) / (Math.max(1, volumeMl) + inoculumMl)
      : 0;
  const aerationRatioPreview =
    vesselType === 'agar_plate'
      ? 1.0
      : vesselType === 'flask_250ml'
      ? Math.max(0.55, Math.min(1.75, Math.pow(50 / Math.max(10, volumeMl), 0.48)))
      : Math.max(0.4, Math.min(1.45, Math.pow(5 / Math.max(1.5, volumeMl), 0.52) * 0.72));
  const predictedMediaSpeed = selectedMedia
    ? selectedMedia.isMinimal
      ? selectedSpecies?.minimalMediaFactor ?? selectedMedia.richnessFactor
      : selectedMedia.richnessFactor
    : 1.0;
  const predictedPhSpeed = selectedSpecies
    ? computePhResponse(startingPh, selectedSpecies).phGrowthFactor
    : 1.0;

  const toggleAntibiotic = (abId: string, standardConc: number) => {
    setAntibiotics((prev) => {
      if ((prev[abId] ?? 0) > 0) {
        const next = { ...prev };
        delete next[abId];
        return next;
      }
      return { ...prev, [abId]: standardConc };
    });
  };

  const handlePrepare = (e: React.FormEvent) => {
    e.preventDefault();
    if (beltVessels.length >= beltCapacity) return;

    const abSummary = Object.entries(antibiotics)
      .filter(([, c]) => c > 0)
      .map(([id, c]) => `${id.slice(0, 3).toUpperCase()}${c}`)
      .join('+');

    const spCode =
      selectedSource?.populations[0]
        ? getSpeciesById(selectedSource.populations[0].speciesId)?.commonLabel.split(' ')[0] ?? 'Mix'
        : 'Blank';

    const dilTag =
      vesselType === 'agar_plate' && sourceVesselId && dilutionExponent > 0
        ? `-1e-${dilutionExponent}`
        : '';

    const phTag =
      selectedMedia && Math.abs(startingPh - selectedMedia.pH) >= 0.25
        ? `-pH${startingPh.toFixed(1)}`
        : '';

    const autoLabel =
      customLabel.trim() ||
      `${spCode}-${selectedMedia?.shortName.replace(/\s+/g, '')}${phTag}${abSummary ? `-${abSummary}` : ''}${dilTag}`;

    triggerAdaptiveAnim(
      vesselType === 'agar_plate' && sourceVesselId ? 'dilute' : 'dispense',
      volumeMl,
      sourceVesselId ? inoculumUl : 0,
      dilutionExponent
    );

    onCreateVessel({
      label: autoLabel,
      vesselType,
      mediaId: selectedMedia?.id ?? mediaId,
      volumeMl,
      initialPh: startingPh,
      antibioticsUgPerMl: antibiotics,
      sourceVesselId: sourceVesselId || null,
      inoculumUl,
      dilutionExponent: vesselType === 'agar_plate' ? dilutionExponent : 0,
    });
    setCustomLabel('');
  };

  const handleExecuteInoculationTransfer = () => {
    if (!sourceVesselId) return;

    if (existingTargetId) {
      const targetV = sterileBeltVessels.find((sv) => sv.id === existingTargetId);
      triggerAdaptiveAnim(
        'pipette',
        targetV?.volumeMl ?? 50,
        inoculumUl,
        dilutionExponent
      );
      onInoculateExisting(
        existingTargetId,
        sourceVesselId,
        inoculumUl,
        dilutionExponent
      );
      setExistingTargetId('');
    } else {
      if (beltVessels.length >= beltCapacity) return;
      const spCode = selectedSource?.populations[0]
        ? getSpeciesById(selectedSource.populations[0].speciesId)?.commonLabel.split(' ')[0] ?? 'Mix'
        : 'Culture';
      const dilTag =
        vesselType === 'agar_plate' && dilutionExponent > 0 ? `-1e-${dilutionExponent}` : '';
      const autoLabel =
        customLabel.trim() ||
        `${spCode}-${selectedMedia?.shortName.replace(/\s+/g, '')}${dilTag}`;
      triggerAdaptiveAnim(
        vesselType === 'agar_plate' ? 'dilute' : 'pipette',
        volumeMl,
        inoculumUl,
        dilutionExponent
      );
      onCreateVessel({
        label: autoLabel,
        vesselType,
        mediaId: selectedMedia?.id ?? mediaId,
        volumeMl,
        initialPh: selectedMedia?.pH ?? 7.0,
        antibioticsUgPerMl: antibiotics,
        sourceVesselId,
        inoculumUl,
        dilutionExponent: vesselType === 'agar_plate' ? dilutionExponent : 0,
      });
      setCustomLabel('');
    }
  };

  // Visual parameters adapting dynamically to volumeMl, inoculumUl, pH, and dilutionExponent
  const maxContainerMl = vesselType === 'culture_tube' ? 12 : 120;
  const fillFraction =
    vesselType === 'agar_plate' ? 0.55 : Math.max(0.12, Math.min(0.95, volumeMl / maxContainerMl));
  const phTintOverlay =
    startingPh < 6.4
      ? `rgba(244, 63, 94, ${Math.min(0.45, (6.4 - startingPh) * 0.22)})`
      : startingPh > 7.6
      ? `rgba(139, 92, 246, ${Math.min(0.4, (startingPh - 7.6) * 0.22)})`
      : 'rgba(0,0,0,0)';
  const pipettePlungerPct = Math.max(8, Math.min(95, (inoculumUl / 500) * 95));
  const dropScale = 0.65 + (inoculumUl / 500) * 0.85;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Beaker className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Media Preparation &amp; Sterile Inoculation Bench
              </h2>
              <p className="text-xs text-slate-400">
                Formulate broth or agar vessels, titrate starting pH, supplement calibrated antibiotics, and perform aseptic pipette inoculation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-700"
              title="Temporary bench mode (returns to your main HUD selection on exit)"
            >
              <button
                type="button"
                onClick={() => onSwitchSessionMode('automate')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                  sessionMode === 'automate'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Automate
              </button>
              <button
                type="button"
                onClick={() => onSwitchSessionMode('manual')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                  sessionMode === 'manual'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Manual
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              aria-label="Close Media Bench"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 py-2 bg-[#0B0E17] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBenchMode('prepare')}
              className={`px-3 py-1.5 text-xs font-medium rounded border flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                benchMode === 'prepare'
                  ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Beaker className="w-3.5 h-3.5" />
              Prepare New Vessel / Inoculate
            </button>
            <button
              type="button"
              onClick={() => setBenchMode('inoculate')}
              className={`px-3 py-1.5 text-xs font-medium rounded border flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                benchMode === 'inoculate'
                  ? 'bg-amber-950/50 border-amber-500/60 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Inoculation &amp; Transfer
            </button>
            <button
              type="button"
              onClick={() => setBenchMode('feed')}
              className={`px-3 py-1.5 text-xs font-medium rounded border flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                benchMode === 'feed'
                  ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              Feed Nutrients (Fed-Batch)
              {liquidCultures.length > 0 && (
                <span className="font-mono-tabular text-[11px] text-cyan-300">
                  ({liquidCultures.length})
                </span>
              )}
            </button>
          </div>
          <span className="text-[11px] font-mono-tabular text-slate-400">
            AUTOMATE ·{' '}
            {benchMode === 'feed'
              ? 'Sterile fed-batch supplementation'
              : benchMode === 'inoculate'
              ? 'Aseptic culture transfer & dilution'
              : 'Media formulation'}
          </span>
        </div>

        {benchMode === 'inoculate' ? (
          <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Source Selection + Manual Aseptic Tools or Automate Quick Transfer */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    1. Source Strain &amp; Target Destination
                  </span>
                  {selectedSource && (
                    <span className="text-[11px] font-mono-tabular text-cyan-300">
                      {selectedSource.label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Source Stock / Culture
                    </label>
                    <select
                      value={sourceVesselId}
                      onChange={(e) => setSourceVesselId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      <option value="">Select source...</option>
                      {availableInoculumSources.map((src) => {
                        const sp = src.populations[0]
                          ? BACTERIAL_SPECIES.find((s) => s.id === src.populations[0].speciesId)
                          : undefined;
                        return (
                          <option key={src.id} value={src.id}>
                            {src.label} ({sp?.commonLabel ?? 'Mixed'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Target Vessel
                    </label>
                    <select
                      value={existingTargetId}
                      onChange={(e) => setExistingTargetId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      <option value="">Create New Inoculated Vessel ({selectedMedia?.shortName})</option>
                      {sterileBeltVessels.map((sv) => (
                        <option key={sv.id} value={sv.id}>
                          Existing: {sv.label} (pH {sv.pH.toFixed(1)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Micropipette Inoculum Volume</span>
                  <span className="font-mono-tabular text-cyan-300">{inoculumUl} µL</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={500}
                  step={1}
                  value={inoculumUl}
                  onChange={(e) => setInoculumUl(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                {vesselType === 'agar_plate' && !existingTargetId && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Serial Dilution Factor</span>
                      <span className="font-mono-tabular text-amber-300">
                        {dilutionExponent === 0 ? '10⁰' : `10⁻${dilutionExponent}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {[0, 1, 2, 3, 4, 5, 6].map((exp) => (
                        <button
                          key={exp}
                          type="button"
                          onClick={() => setDilutionExponent(exp)}
                          className={`py-1 text-[11px] font-mono-tabular rounded border cursor-pointer ${
                            dilutionExponent === exp
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {exp === 0 ? '10⁰' : `10⁻${exp}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Transfer Summary & Execute */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-3 text-xs">
                <div className="font-semibold text-slate-200">Aseptic Transfer Summary</div>
                <div className="space-y-1.5 font-mono-tabular text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transfer Technique:</span>
                    <span className="text-cyan-300 uppercase">Automate</span>
                  </div>
                </div>

                {!existingTargetId && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="text-[11px] text-slate-400">New Vessel Format &amp; Label</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'flask_250ml' as const, label: 'Flask' },
                        { id: 'culture_tube' as const, label: 'Tube' },
                        { id: 'agar_plate' as const, label: 'Plate' },
                      ].map((vt) => (
                        <button
                          key={vt.id}
                          type="button"
                          onClick={() => handleVesselTypeChange(vt.id)}
                          className={`py-1 px-2 rounded border text-[11px] cursor-pointer ${
                            vesselType === vt.id
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {vt.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Custom vessel label (optional)"
                      maxLength={32}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                )}

                <button
                  type="button"
                  disabled={!sourceVesselId || (!existingTargetId && beltVessels.length >= beltCapacity)}
                  onClick={handleExecuteInoculationTransfer}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pipette className="w-4 h-4" />
                  {existingTargetId
                    ? `Execute Aseptic Transfer (${inoculumUl} µL)`
                    : 'Inoculate & Dispense Vessel to Tray'}
                </button>
              </div>
            </div>
          </div>
        ) : benchMode === 'feed' ? (
          <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Select Liquid Culture + Supplement */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-cyan-300">
                  How Nutrient Feeding Works in Real Microbiology Labs
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Submerged liquid cultures (flasks and broth tubes) routinely receive <strong className="text-slate-200">fed-batch sterile spikes</strong> (concentrated D-glucose, 5× Tryptone/Yeast Extract, fresh LB broth top-up, or rescue pH buffer) to extend exponential growth or neutralize organic acids. Solid agar plates cannot be liquid-fed once colonies form—subculture a colony onto a fresh agar plate instead.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  1. Select Liquid Broth Culture (Tray or Incubators)
                </label>
                {liquidCultures.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-800 rounded text-xs text-slate-500">
                    No active flasks or broth tubes found. Prepare a liquid broth vessel first in the Prepare tab.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {liquidCultures.map((v) => {
                      const sp = v.populations[0]
                        ? getSpeciesById(v.populations[0].speciesId)
                        : undefined;
                      const nutrSt = getNutrientStatus(v.nutrientRemaining);
                      const phSt = getPhStatus(v.pH, sp);
                      const phaseSt = v.populations[0]
                        ? getGrowthPhaseStatus(v.populations[0].phase)
                        : null;
                      const maxSafe = getMaxSafeVolumeMl(v.vesselType);
                      const locLabel =
                        v.location.zone === 'belt'
                          ? 'Sample Tray'
                          : v.location.stationId === 'shaking_incubator'
                          ? 'Shaking Incubator'
                          : v.location.stationId === 'static_incubator'
                          ? 'Static Incubator'
                          : 'Equipment';

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setFeedTargetId(v.id)}
                          className={`w-full p-2.5 rounded border text-left transition-colors cursor-pointer ${
                            selectedFeedVessel?.id === v.id
                              ? 'bg-cyan-950/35 border-cyan-500/60'
                              : 'bg-[#0B0E17] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-100 truncate">
                              {v.label}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {locLabel}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-mono-tabular mt-1">
                            <span className={nutrSt.textClass}>
                              Nutr {(v.nutrientRemaining * 100).toFixed(0)}% ({nutrSt.label})
                            </span>
                            <span className="text-cyan-300">OD {v.od600.toFixed(3)}</span>
                            <span className={phSt.textClass}>pH {v.pH.toFixed(2)}</span>
                            <span className="text-slate-300">
                              {v.volumeMl}/{maxSafe} mL
                            </span>
                            {phaseSt && (
                              <span className={phaseSt.textClass}>{phaseSt.label}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  2. Choose Sterile Nutrient Supplement
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {NUTRIENT_SUPPLEMENTS.map((sup) => {
                    const isSelected = selectedSupplement.id === sup.id;
                    return (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => {
                          setSupplementId(sup.id);
                          setFeedMl(sup.defaultDoseMl);
                        }}
                        className={`p-3 rounded border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/35 border-emerald-500/60'
                            : 'bg-[#0B0E17] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-100">
                            {sup.name}
                          </span>
                          <span className="text-[10px] font-mono-tabular text-cyan-300 shrink-0">
                            Target pH {sup.targetPh.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {sup.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Adaptive Fed-Batch Visualizer + Dose Slider + Preview */}
            <div className="lg:col-span-5 space-y-4">
              {selectedFeedVessel && (
                <>
                  <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">
                        Adaptive Fed-Batch Bolus Visualizer
                      </span>
                      <span className="font-mono-tabular text-[11px] text-cyan-300">
                        {activeAnim?.kind === 'feed'
                          ? `Feeding ${activeAnim.volumeMl} mL & Mixing (${activeAnim.durationMs}ms)`
                          : `+${effectiveFeedMl.toFixed(1)} mL Feed`}
                      </span>
                    </div>

                    {(() => {
                      const feedVesselMax = getMaxSafeVolumeMl(selectedFeedVessel.vesselType);
                      const oldFill = Math.max(
                        0.1,
                        Math.min(0.95, selectedFeedVessel.volumeMl / feedVesselMax)
                      );
                      const newFill = Math.max(
                        oldFill,
                        Math.min(
                          0.98,
                          (selectedFeedVessel.volumeMl + effectiveFeedMl) / feedVesselMax
                        )
                      );
                      const feedMedia = getMediaById(selectedFeedVessel.mediaId);
                      const feedDropRadius = 1.8 + Math.min(2.6, (effectiveFeedMl / 25) * 2.6);

                      return (
                        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 rounded p-2.5">
                          <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0">
                            <defs>
                              <clipPath id="feed-flask-clip">
                                <path d="M37 14 L55 14 L55 32 L76 74 Q78 80 71 80 L21 80 Q14 80 16 74 L37 32 Z" />
                              </clipPath>
                              <clipPath id="feed-tube-clip">
                                <path d="M35 14 L57 14 L57 67 A11 11 0 0 1 35 67 Z" />
                              </clipPath>
                            </defs>

                            <rect x="43" y="1" width="6" height="10" rx="1" fill="#10B981" />
                            <polygon points="44,11 48,11 46.5,17 45.5,17" fill="#D1FAE5" />
                            {activeAnim?.kind === 'feed' && (
                              <circle
                                key={activeAnim.nonce}
                                cx="46"
                                cy="19"
                                r={feedDropRadius}
                                fill="#34D399"
                                style={{
                                  animation: `lab-drop-fall ${Math.max(360, activeAnim.durationMs * 0.52)}ms ease-in infinite`,
                                }}
                              />
                            )}

                            {selectedFeedVessel.vesselType === 'flask_250ml' ? (
                              <g>
                                <g clipPath="url(#feed-flask-clip)">
                                  <rect
                                    x="12"
                                    y={80 - newFill * 56}
                                    width="68"
                                    height={newFill * 56 + 2}
                                    fill="#34D399"
                                    fillOpacity={0.35}
                                    style={{ transition: 'y 200ms ease, height 200ms ease' }}
                                  />
                                  <rect
                                    x="12"
                                    y={80 - oldFill * 56}
                                    width="68"
                                    height={oldFill * 56 + 2}
                                    fill={feedMedia?.baseColorHex ?? '#D4B475'}
                                    fillOpacity={0.85}
                                  />
                                  {activeAnim?.kind === 'feed' && (
                                    <ellipse
                                      cx="46"
                                      cy={80 - newFill * 56 + 4}
                                      rx="18"
                                      ry="3.5"
                                      fill="none"
                                      stroke="#34D399"
                                      strokeWidth="1.5"
                                      style={{
                                        transformOrigin: '46px 65px',
                                        animation: 'lab-swirl-spin 400ms linear infinite',
                                      }}
                                    />
                                  )}
                                </g>
                                <path
                                  d="M37 14 L55 14 L55 32 L76 74 Q78 80 71 80 L21 80 Q14 80 16 74 L37 32 Z"
                                  fill="none"
                                  stroke="#64748B"
                                  strokeWidth="2"
                                />
                              </g>
                            ) : (
                              <g>
                                <g clipPath="url(#feed-tube-clip)">
                                  <rect
                                    x="34"
                                    y={78 - newFill * 58}
                                    width="24"
                                    height={newFill * 58 + 2}
                                    fill="#34D399"
                                    fillOpacity={0.35}
                                    style={{ transition: 'y 200ms ease, height 200ms ease' }}
                                  />
                                  <rect
                                    x="34"
                                    y={78 - oldFill * 58}
                                    width="24"
                                    height={oldFill * 58 + 2}
                                    fill={feedMedia?.baseColorHex ?? '#D4B475'}
                                    fillOpacity={0.85}
                                  />
                                </g>
                                <path
                                  d="M35 14 L57 14 L57 67 A11 11 0 0 1 35 67 Z"
                                  fill="none"
                                  stroke="#64748B"
                                  strokeWidth="2"
                                />
                              </g>
                            )}
                          </svg>

                          <div className="flex-1 min-w-0 space-y-1 text-[11px] font-mono-tabular text-slate-400">
                            <div className="flex justify-between">
                              <span>Current Volume:</span>
                              <span className="text-slate-200">{selectedFeedVessel.volumeMl} mL</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Headspace Left:</span>
                              <span className={feedHeadroomMl <= 0.1 ? 'text-rose-300' : 'text-emerald-300'}>
                                {feedHeadroomMl.toFixed(1)} mL (Max {feedVesselMax} mL)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden flex">
                              <div
                                className="h-full bg-amber-400/80"
                                style={{ width: `${Math.round(oldFill * 100)}%` }}
                              />
                              <div
                                className="h-full bg-emerald-400 transition-all duration-150"
                                style={{ width: `${Math.max(0, Math.round((newFill - oldFill) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded-md space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">3. Feed Bolus Volume</span>
                        <span className="font-mono-tabular text-emerald-300 font-semibold">
                          {effectiveFeedMl.toFixed(1)} mL
                        </span>
                      </div>
                      {feedHeadroomMl <= 0.05 ? (
                        <p className="text-[11px] text-rose-300">
                          Vessel has reached safe headspace limit ({getMaxSafeVolumeMl(selectedFeedVessel.vesselType)} mL) for mixing. Subculture into a fresh flask instead.
                        </p>
                      ) : (
                        <>
                          <input
                            type="range"
                            min={effectiveFeedMinMl}
                            max={effectiveFeedMaxMl}
                            step={Math.min(selectedSupplement.stepMl, Math.max(0.1, effectiveFeedMaxMl - effectiveFeedMinMl || 0.1))}
                            value={effectiveFeedMl}
                            onChange={(e) => setFeedMl(Number(e.target.value))}
                            className="w-full accent-emerald-400"
                          />
                          <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500 mt-0.5">
                            <span>{effectiveFeedMinMl.toFixed(1)} mL</span>
                            <span>{effectiveFeedMaxMl.toFixed(1)} mL max</span>
                          </div>
                        </>
                      )}
                    </div>

                    {feedPreview && (
                      <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded text-[11px] space-y-1">
                        <div className="font-medium text-slate-300">Live Fed-Batch Outcome Preview</div>
                        <div className="font-mono-tabular text-slate-400 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Volume After Feed:</span>
                            <span className="text-slate-200">
                              {selectedFeedVessel.volumeMl} → {feedPreview.updatedVessel.volumeMl} mL
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Nutrients Remaining:</span>
                            <span className="text-emerald-300">
                              {(selectedFeedVessel.nutrientRemaining * 100).toFixed(0)}% →{' '}
                              {(feedPreview.updatedVessel.nutrientRemaining * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Culture pH:</span>
                            <span className="text-amber-300">
                              {selectedFeedVessel.pH.toFixed(2)} →{' '}
                              {feedPreview.updatedVessel.pH.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Diluted OD600:</span>
                            <span className="text-cyan-300">
                              {selectedFeedVessel.od600.toFixed(3)} →{' '}
                              {feedPreview.updatedVessel.od600.toFixed(3)}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                          {selectedSupplement.realLifeNote}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!selectedFeedVessel || effectiveFeedMl <= 0}
                      onClick={() => {
                        if (!selectedFeedVessel || effectiveFeedMl <= 0) return;
                        triggerAdaptiveAnim('feed', effectiveFeedMl, 0, 0);
                        onFeedCulture(
                          selectedFeedVessel.id,
                          selectedSupplement.id,
                          effectiveFeedMl
                        );
                      }}
                      className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Droplets className="w-4 h-4" />
                      Administer Sterile Nutrient Feed
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
        <form onSubmit={handlePrepare} className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Vessel, Media, pH & Antibiotics */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                1. Select Container Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'flask_250ml' as const, name: '250 mL Flask', desc: 'High aeration' },
                  { id: 'culture_tube' as const, name: '15 mL Tube', desc: 'Small batch' },
                  { id: 'agar_plate' as const, name: 'Petri Plate', desc: 'Solid colonies' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleVesselTypeChange(item.id)}
                    className={`p-2.5 rounded border text-left transition-colors cursor-pointer ${
                      vesselType === item.id
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-slate-100'
                        : 'bg-[#0B0E17] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.name}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                2. Growth Medium Composition
              </label>
              <div className="space-y-2">
                {compatibleMedia.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMedia(m.id)}
                    className={`w-full p-3 rounded border text-left transition-colors cursor-pointer ${
                      selectedMedia?.id === m.id
                        ? 'bg-emerald-950/35 border-emerald-500/60'
                        : 'bg-[#0B0E17] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">{m.name}</span>
                      <span className="text-[11px] font-mono-tabular text-slate-400">
                        Default pH {m.pH.toFixed(1)} · Buffer {(m.bufferCapacity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{m.compositionSummary}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{m.scientificPurpose}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Starting pH Adjustment Slider */}
                <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-300">
                      3. Adjust Starting Media pH (HCl / NaOH Titration)
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-mono-tabular font-semibold ${phCompatibility.textClass}`}>
                        pH {startingPh.toFixed(2)} ({phCompatibility.label})
                      </span>
                      {selectedMedia && Math.abs(startingPh - selectedMedia.pH) >= 0.05 && (
                        <button
                          type="button"
                          onClick={() => setStartingPh(selectedMedia.pH)}
                          className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                        >
                          Reset {selectedMedia.pH.toFixed(1)}
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={4.3}
                    max={9.0}
                    step={0.05}
                    value={startingPh}
                    onChange={(e) => setStartingPh(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500">
                    <span>4.3 (Acidic)</span>
                    <span>7.0 (Neutral)</span>
                    <span>9.0 (Alkaline)</span>
                  </div>
                  {selectedSpecies && (
                    <p className="text-[11px] text-slate-400">
                      {selectedSpecies.commonLabel} grows best at pH {selectedSpecies.phOpt.toFixed(1)} (viable range {selectedSpecies.phMin.toFixed(1)}–{selectedSpecies.phMax.toFixed(1)}). Any pH shift continuously modulates enzyme rate and antibiotic potency.
                    </p>
                  )}
                </div>

                {/* Optional Antibiotic Supplementation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-300">
                      4. Optional Antibiotic Supplementation (µg/mL)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Live compatibility preview updates with source strain
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ANTIBIOTIC_COMPOUNDS.map((ab) => {
                      const activeConc = antibiotics[ab.id] ?? 0;
                      const isAdded = activeConc > 0;
                      const previewDecision = selectedSpecies
                        ? evaluateAntibioticDecision(
                            selectedSpecies,
                            ab.id,
                            isAdded ? activeConc : ab.standardWorkingUgPerMl
                          )
                        : null;

                      return (
                        <div
                          key={ab.id}
                          className={`p-2.5 rounded border transition-colors ${
                            isAdded
                              ? 'bg-amber-950/25 border-amber-500/50'
                              : 'bg-[#0B0E17] border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleAntibiotic(ab.id, ab.standardWorkingUgPerMl)}
                              className="text-left flex items-center gap-2 cursor-pointer"
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                                  isAdded
                                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                                    : 'border-slate-600'
                                }`}
                              >
                                {isAdded ? '✓' : ''}
                              </span>
                              <span className="text-xs font-medium text-slate-100">{ab.name}</span>
                            </button>
                            <span className="text-[11px] text-slate-400">{ab.mode}</span>
                          </div>

                          {previewDecision && (
                            <div className={`mt-1 text-[10px] font-medium ${previewDecision.textClass}`}>
                              vs. {selectedSpecies?.commonLabel}: {previewDecision.label} (MIC{' '}
                              {selectedSpecies?.micUgPerMl[ab.id]} µg/mL)
                            </div>
                          )}

                          {isAdded && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="range"
                                min={ab.id === 'ciprofloxacin' ? 0.05 : 1}
                                max={ab.maxConcentrationUgPerMl}
                                step={ab.id === 'ciprofloxacin' ? 0.05 : 1}
                                value={activeConc}
                                onChange={(e) =>
                                  setAntibiotics((prev) => ({
                                    ...prev,
                                    [ab.id]: Number(e.target.value),
                                  }))
                                }
                                className="flex-1 accent-amber-400"
                              />
                              <span className="text-xs font-mono-tabular text-amber-300 w-20 text-right">
                                {activeConc.toFixed(ab.id === 'ciprofloxacin' ? 2 : 0)} µg/mL
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
          </div>

          {/* Right Column: Adaptive Vessel/Dilution/Mixing Visualizer + Inoculation */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Adaptive Bench Stage */}
            <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded-md space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Live Prep &amp; Dilution Visualizer
                </span>
                <span className="font-mono-tabular text-[11px] text-cyan-300">
                  {activeAnim
                    ? activeAnim.kind === 'dilute'
                      ? `Serial Diluting 10⁻${activeAnim.dilutionExponent} (${activeAnim.durationMs}ms)`
                      : activeAnim.kind === 'pipette'
                      ? `Pipetting ${activeAnim.inoculumUl} µL & Mixing...`
                      : `Dispensing ${activeAnim.volumeMl} mL & Mixing...`
                    : vesselType === 'agar_plate'
                    ? sourceVesselId
                      ? `${dilutionExponent}-Step Dilution`
                      : 'Solid Agar Plate'
                    : `${vesselType === 'culture_tube' ? volumeMl.toFixed(1) : volumeMl} mL / ${maxContainerMl} mL`}
                </span>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 rounded p-2.5">
                {/* Main Vessel SVG with volume-scaled liquid height & animated pouring/swirl */}
                <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0">
                  <defs>
                    <clipPath id="bench-flask-clip">
                      <path d="M37 14 L55 14 L55 32 L76 74 Q78 80 71 80 L21 80 Q14 80 16 74 L37 32 Z" />
                    </clipPath>
                    <clipPath id="bench-tube-clip">
                      <path d="M35 14 L57 14 L57 67 A11 11 0 0 1 35 67 Z" />
                    </clipPath>
                  </defs>

                  {/* Micropipette tip & animated inoculum droplet scaled to inoculumUl */}
                  {sourceVesselId && (
                    <g>
                      <rect x="43" y="1" width="6" height="10" rx="1" fill="#38BDF8" />
                      <polygon points="44,11 48,11 46.5,17 45.5,17" fill="#E0F2FE" />
                      <rect
                        x="44.5"
                        y={2 + (1 - pipettePlungerPct / 100) * 5}
                        width="3"
                        height="4"
                        fill="#0284C7"
                      />
                      {activeAnim && (
                        <circle
                          key={activeAnim.nonce}
                          cx="46"
                          cy="19"
                          r={2.2 * dropScale}
                          fill="#22D3EE"
                          style={{
                            animation: `lab-drop-fall ${Math.max(360, activeAnim.durationMs * 0.55)}ms ease-in infinite`,
                          }}
                        />
                      )}
                    </g>
                  )}

                  {vesselType === 'flask_250ml' && (
                    <g>
                      <g clipPath="url(#bench-flask-clip)">
                        <rect
                          x="12"
                          y={80 - fillFraction * 56}
                          width="68"
                          height={fillFraction * 56 + 2}
                          fill={selectedMedia?.baseColorHex ?? '#D4B475'}
                          fillOpacity={0.85}
                          style={{ transition: 'y 220ms ease, height 220ms ease' }}
                        />
                        <rect
                          x="12"
                          y={80 - fillFraction * 56}
                          width="68"
                          height={fillFraction * 56 + 2}
                          fill={phTintOverlay}
                        />
                        {activeAnim && (
                          <ellipse
                            cx="46"
                            cy={80 - fillFraction * 56 + 4}
                            rx={18}
                            ry="3.5"
                            fill="none"
                            stroke="#67E8F9"
                            strokeWidth="1.5"
                            style={{
                              transformOrigin: '46px 65px',
                              animation: 'lab-swirl-spin 420ms linear infinite',
                            }}
                          />
                        )}
                      </g>
                      <path
                        d="M37 14 L55 14 L55 32 L76 74 Q78 80 71 80 L21 80 Q14 80 16 74 L37 32 Z"
                        fill="none"
                        stroke="#64748B"
                        strokeWidth="2"
                      />
                      <line x1="25" y1="62" x2="32" y2="62" stroke="#94A3B8" strokeWidth="1" />
                      <line x1="29" y1="48" x2="35" y2="48" stroke="#94A3B8" strokeWidth="1" />
                    </g>
                  )}

                  {vesselType === 'culture_tube' && (
                    <g>
                      <g clipPath="url(#bench-tube-clip)">
                        <rect
                          x="34"
                          y={78 - fillFraction * 58}
                          width="24"
                          height={fillFraction * 58 + 2}
                          fill={selectedMedia?.baseColorHex ?? '#D4B475'}
                          fillOpacity={0.85}
                          style={{ transition: 'y 220ms ease, height 220ms ease' }}
                        />
                        <rect
                          x="34"
                          y={78 - fillFraction * 58}
                          width="24"
                          height={fillFraction * 58 + 2}
                          fill={phTintOverlay}
                        />
                        {activeAnim && (
                          <ellipse
                            cx="46"
                            cy={78 - fillFraction * 58 + 3}
                            rx="9"
                            ry="2.5"
                            fill="none"
                            stroke="#67E8F9"
                            strokeWidth="1.4"
                            style={{
                              transformOrigin: '46px 64px',
                              animation: 'lab-swirl-spin 350ms linear infinite',
                            }}
                          />
                        )}
                      </g>
                      <path
                        d="M35 14 L57 14 L57 67 A11 11 0 0 1 35 67 Z"
                        fill="none"
                        stroke="#64748B"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {vesselType === 'agar_plate' && (
                    <g>
                      <circle cx="46" cy="52" r="29" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                      <circle
                        cx="46"
                        cy="52"
                        r="25"
                        fill={selectedMedia?.baseColorHex ?? '#D7C59B'}
                        fillOpacity={0.85}
                      />
                      <circle cx="46" cy="52" r="25" fill={phTintOverlay} />
                      {activeAnim && (
                        <path
                          d="M30 42 Q46 36 60 44 Q34 52 58 58 Q36 62 52 66"
                          fill="none"
                          stroke="#22D3EE"
                          strokeWidth="1.6"
                          strokeDasharray="4 2"
                          style={{
                            transformOrigin: '46px 52px',
                            animation: 'lab-swirl-spin 700ms linear infinite',
                          }}
                        />
                      )}
                    </g>
                  )}
                </svg>

                {/* Adaptive Serial Dilution Cascade or Mixing Detail Readout */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {vesselType === 'agar_plate' && sourceVesselId ? (
                    <>
                      <div className="text-[11px] text-slate-300 font-medium">
                        Serial Dilution Cascade ({dilutionExponent === 0 ? 'Direct' : `${dilutionExponent} tubes`})
                      </div>
                      <div className="flex items-end gap-1.5 h-10 pt-1">
                        {Array.from({ length: Math.max(1, dilutionExponent + 1) }, (_, stepIdx) => {
                          const concOpacity = Math.max(0.15, 1 - stepIdx * 0.14);
                          const isHighlighted = Boolean(activeAnim);
                          return (
                            <div key={stepIdx} className="flex flex-col items-center gap-0.5">
                              <div
                                className={`w-3.5 h-6 rounded-b border overflow-hidden flex items-end transition-transform ${
                                  isHighlighted
                                    ? 'border-cyan-400 scale-105'
                                    : 'border-slate-700'
                                }`}
                                style={{
                                  transitionDelay: `${stepIdx * 65}ms`,
                                }}
                              >
                                <div
                                  className="w-full h-4"
                                  style={{
                                    backgroundColor: selectedMedia?.baseColorHex ?? '#D4B475',
                                    opacity: concOpacity,
                                  }}
                                />
                              </div>
                              <span className="text-[9px] font-mono-tabular text-slate-500">
                                10⁻{stepIdx}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <div className="flex justify-between font-mono-tabular">
                        <span>Liquid Fill:</span>
                        <span className="text-slate-200">{Math.round(fillFraction * 100)}% capacity</span>
                      </div>
                      <div className="flex justify-between font-mono-tabular">
                        <span>Pipette Stroke:</span>
                        <span className="text-cyan-300">
                          {sourceVesselId ? `${inoculumUl} µL` : 'Sterile (0 µL)'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all"
                          style={{
                            width: activeAnim ? '100%' : `${Math.round(fillFraction * 100)}%`,
                            transitionDuration: activeAnim ? `${activeAnim.durationMs}ms` : '180ms',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded-md space-y-4">
                  <div className="flex items-center gap-2">
                    <Pipette className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-100">
                      5. Aseptic Inoculation Source
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Source Stock or Culture in Sample Tray
                    </label>
                    <select
                      value={sourceVesselId}
                      onChange={(e) => setSourceVesselId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">None (Prepare Sterile Uninoculated Control)</option>
                      {availableInoculumSources.map((src) => {
                        const sp = src.populations[0]
                          ? BACTERIAL_SPECIES.find((s) => s.id === src.populations[0].speciesId)
                          : undefined;
                        return (
                          <option key={src.id} value={src.id}>
                            {src.label} ({sp?.commonLabel ?? 'Mixed'})
                          </option>
                        );
                      })}
                    </select>
                    {availableInoculumSources.length === 0 && (
                      <p className="text-[11px] text-amber-400 mt-1.5">
                        Tip: Retrieve a glycerol stock from Cold Storage (-80 °C) or bring an active culture from the Incubator to inoculate.
                      </p>
                    )}
                  </div>

                  {sourceVesselId && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Micropipette Inoculum Volume</span>
                        <span className="font-mono-tabular text-cyan-300">{inoculumUl} µL</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={500}
                        step={1}
                        value={inoculumUl}
                        onChange={(e) => setInoculumUl(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                      <div className="flex justify-between gap-1 text-[10px] font-mono-tabular text-slate-500">
                        {[5, 25, 50, 100, 250, 500].map((presetUl) => (
                          <button
                            key={presetUl}
                            type="button"
                            onClick={() => setInoculumUl(presetUl)}
                            className="hover:text-cyan-300 cursor-pointer"
                          >
                            {presetUl}µL
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {sourceVesselId && vesselType === 'agar_plate' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Serial Dilution Factor</span>
                        <span className="font-mono-tabular text-amber-300">
                          {dilutionExponent === 0 ? 'Undiluted (10⁰)' : `10⁻${dilutionExponent}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((exp) => (
                          <button
                            key={exp}
                            type="button"
                            onClick={() => setDilutionExponent(exp)}
                            className={`py-1 text-[11px] font-mono-tabular rounded border cursor-pointer ${
                              dilutionExponent === exp
                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-semibold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {exp === 0 ? '10⁰' : `10⁻${exp}`}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Use 10⁻⁴ or 10⁻⁵ on dense cultures to isolate clean countable colonies (30–250 CFU).
                      </p>
                    </div>
                  )}

                  {vesselType !== 'agar_plate' && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400">Media Volume</span>
                        <span className="font-mono-tabular text-slate-200">
                          {vesselType === 'culture_tube' ? volumeMl.toFixed(1) : volumeMl} mL
                        </span>
                      </div>
                      <input
                        type="range"
                        min={vesselType === 'culture_tube' ? 1.5 : 15}
                        max={vesselType === 'culture_tube' ? 12 : 120}
                        step={vesselType === 'culture_tube' ? 0.5 : 1}
                        value={volumeMl}
                        onChange={(e) => setVolumeMl(Number(e.target.value))}
                        className="w-full accent-emerald-400"
                      />
                      <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500 mt-0.5">
                        <span>{vesselType === 'culture_tube' ? '1.5 mL (High O₂)' : '15 mL (High O₂)'}</span>
                        <span>{vesselType === 'culture_tube' ? '12.0 mL (Low Headspace)' : '120 mL (Low O₂)'}</span>
                      </div>
                    </div>
                  )}

                  {/* Live Predicted Kinetic Impact Summary */}
                  <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded text-[11px] space-y-1">
                    <div className="font-medium text-slate-300">Live Formulation Preview</div>
                    {vesselType !== 'agar_plate' ? (
                      <div className="font-mono-tabular text-slate-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Starting Density:</span>
                          <span className="text-cyan-300">
                            {selectedSource ? `${formatScientificCount(predictedStartCfuPerMl)} CFU/mL` : '0 (Sterile)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Headspace O₂ Factor:</span>
                          <span className="text-amber-300">{(aerationRatioPreview * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>pH × Medium Speed (37 °C):</span>
                          <span className="text-emerald-300">
                            {(predictedPhSpeed * predictedMediaSpeed * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="font-mono-tabular text-slate-400 flex justify-between">
                        <span>Expected Plate CFU:</span>
                        <span className="text-amber-300">
                          {selectedSource
                            ? Math.round(sourceViable * inoculumMl * Math.pow(10, -dilutionExponent)).toLocaleString()
                            : '0 (Sterile)'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Vessel Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Auto-generated if left blank"
                      maxLength={32}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={beltVessels.length >= beltCapacity}
                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {beltVessels.length >= beltCapacity
                      ? `Sample Tray Full (Max ${beltCapacity})`
                      : sourceVesselId
                      ? 'Dispense Media & Inoculate'
                      : 'Dispense Sterile Media Vessel'}
                  </button>
                </div>

                {sterileBeltVessels.length > 0 && availableInoculumSources.length > 0 && (
                  <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded-md space-y-3">
                    <h4 className="text-xs font-semibold text-slate-200">
                      Inoculate Existing Sterile Vessel
                    </h4>
                    <select
                      value={existingTargetId}
                      onChange={(e) => setExistingTargetId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      <option value="">Choose sterile vessel on tray...</option>
                      {sterileBeltVessels.map((sv) => (
                        <option key={sv.id} value={sv.id}>
                          {sv.label} (pH {sv.pH.toFixed(1)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!existingTargetId || !sourceVesselId}
                      onClick={() => {
                        if (existingTargetId && sourceVesselId) {
                          const targetV = sterileBeltVessels.find((sv) => sv.id === existingTargetId);
                          triggerAdaptiveAnim(
                            'pipette',
                            targetV?.volumeMl ?? 50,
                            inoculumUl,
                            dilutionExponent
                          );
                          onInoculateExisting(
                            existingTargetId,
                            sourceVesselId,
                            inoculumUl,
                            dilutionExponent
                          );
                          setExistingTargetId('');
                        }
                      }}
                      className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-medium rounded cursor-pointer"
                    >
                      Pipette {inoculumUl} µL into Selected Vessel
                    </button>
                  </div>
                )}
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export const MediaBenchConsole: React.FC<MediaBenchConsoleProps> = (props) => {
  const [sessionMode, setSessionMode] = useState<LabMode>(props.labMode ?? 'automate');

  if (sessionMode === 'manual') {
    return (
      <IsometricMediaWorkbench
        sessionMode={sessionMode}
        onSwitchSessionMode={setSessionMode}
        beltVessels={props.beltVessels}
        allVessels={props.allVessels}
        beltCapacity={props.beltCapacity}
        onCreateVessel={props.onCreateVessel}
        onInoculateExisting={props.onInoculateExisting}
        onFeedCulture={props.onFeedCulture}
        onUpdateExistingVessel={props.onUpdateExistingVessel}
        onClose={props.onClose}
      />
    );
  }
  return (
    <StandardMediaBenchConsole
      {...props}
      sessionMode={sessionMode}
      onSwitchSessionMode={setSessionMode}
    />
  );
};

