import React from 'react';
import { Cpu, Disc, Dna, FlaskConical, Package, Snowflake, TestTube2 } from 'lucide-react';
import { getMediaById, getSpeciesById } from '../data/scientificDatabase';
import { CultureVessel } from '../types/lab';
import { getDnaPurityStatus, getGrowthPhaseStatus, getPhStatus, getTemperatureStatus } from '../utils/colorCoding';

interface SampleBeltProps {
  beltVessels: CultureVessel[];
  selectedVesselId: string | null;
  onSelectVessel: (vesselId: string) => void;
  onOpenInventory: (slotIndex?: number) => void;
}

export const BELT_CAPACITY = 10;

const SampleBeltComponent: React.FC<SampleBeltProps> = ({
  beltVessels,
  selectedVesselId,
  onSelectVessel,
  onOpenInventory,
}) => {
  const slots = Array.from({ length: BELT_CAPACITY }, (_, idx) =>
    beltVessels.find((v) => v.location.zone === 'belt' && v.location.slotIndex === idx) ?? null
  );

  return (
    <div className="bg-[#0B0E17] border-t border-slate-800/90 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
          Sample Tray
        </span>
        <span className="text-xs font-mono-tabular text-slate-400 whitespace-nowrap">
          {beltVessels.length}/{BELT_CAPACITY}
        </span>
        <button
          type="button"
          onClick={() => onOpenInventory()}
          className="px-2 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Package className="w-3 h-3" />
          <span>Inspect All</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto flex-1">
        {slots.map((vessel, idx) => {
          if (!vessel) {
            return (
              <div
                key={`empty_${idx}`}
                className="h-12 min-w-[116px] max-w-[150px] flex-1 rounded border border-dashed border-slate-800 bg-slate-900/30 px-2 flex items-center justify-center text-[11px] text-slate-600 select-none"
              >
                Empty Slot {idx + 1}
              </div>
            );
          }

          const isSelected = selectedVesselId === vessel.id;
          const primaryPop = vessel.populations[0];
          const primarySpecies = primaryPop ? getSpeciesById(primaryPop.speciesId) : undefined;
          const media = getMediaById(vessel.mediaId);
          const dnaYield = (vessel.dnaFragments ?? []).reduce(
            (sum, f) => sum + f.concentrationNgPerUl,
            0
          );
          const bandCount = vessel.dnaFragments?.length ?? 0;
          const avgPurity =
            bandCount > 0
              ? vessel.dnaFragments!.reduce((acc, f) => acc + f.purityA260_280, 0) / bandCount
              : 0;

          const tempStatus = getTemperatureStatus(vessel.temperatureC, vessel.vesselType, primarySpecies);
          const phStatus = getPhStatus(vessel.pH, primarySpecies);
          const phaseStatus = primaryPop ? getGrowthPhaseStatus(primaryPop.phase) : null;
          const dnaStatus = bandCount > 0 ? getDnaPurityStatus(avgPurity) : null;

          return (
            <button
              key={vessel.id}
              type="button"
              onClick={() => onSelectVessel(vessel.id)}
              onDoubleClick={() => onOpenInventory(idx)}
              title="Click to select sample · Double-click for full slot details"
              className={`h-12 min-w-[146px] max-w-[186px] flex-1 rounded border px-2.5 flex items-center gap-2 text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/50 border-cyan-500/70 text-slate-100'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 text-slate-200'
              }`}
            >
              <div className="shrink-0 text-cyan-400">
                {vessel.vesselType === 'flask_250ml' && <FlaskConical className="w-4 h-4" />}
                {vessel.vesselType === 'culture_tube' && <TestTube2 className="w-4 h-4" />}
                {vessel.vesselType === 'agar_plate' && <Disc className="w-4 h-4 text-amber-400" />}
                {vessel.vesselType === 'glycerol_stock' && (
                  <Snowflake className="w-4 h-4 text-sky-400" />
                )}
                {vessel.vesselType === 'microtube_1_5ml' && <Dna className="w-4 h-4 text-teal-400" />}
                {vessel.vesselType === 'pcr_tube' && <Cpu className="w-4 h-4 text-purple-400" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{vessel.label}</div>
                <div className="text-[10px] font-mono-tabular truncate flex items-center gap-1">
                  {vessel.vesselType === 'agar_plate' ? (
                    <>
                      <span className="text-amber-300">{vessel.colonyCount} col</span>
                      <span className="text-slate-600">·</span>
                      <span className={phStatus.textClass}>pH {vessel.pH.toFixed(1)}</span>
                      <span className="text-slate-600">·</span>
                      <span className={tempStatus.textClass}>{vessel.temperatureC.toFixed(0)}°C</span>
                    </>
                  ) : vessel.vesselType === 'glycerol_stock' ? (
                    <>
                      <span className="text-sky-300 truncate">{primarySpecies?.commonLabel ?? 'Stock'}</span>
                      <span className="text-slate-600">·</span>
                      <span className={tempStatus.textClass}>{vessel.temperatureC.toFixed(0)}°C</span>
                    </>
                  ) : vessel.vesselType === 'microtube_1_5ml' ? (
                    <>
                      <span className="text-teal-300">{dnaYield.toFixed(0)} ng/µL</span>
                      <span className="text-slate-600">·</span>
                      <span className={dnaStatus?.textClass ?? 'text-slate-400'}>
                        {dnaStatus ? `A260/280 ${avgPurity.toFixed(1)}` : `${bandCount} loci`}
                      </span>
                    </>
                  ) : vessel.vesselType === 'pcr_tube' ? (
                    bandCount > 0 ? (
                      <span className="text-emerald-300">
                        {vessel.dnaFragments![0].lengthBp} bp ({bandCount})
                      </span>
                    ) : (
                      <span className="text-rose-300">0 bands</span>
                    )
                  ) : (
                    <>
                      <span className={phaseStatus?.textClass ?? 'text-slate-300'}>
                        OD {vessel.od600.toFixed(2)}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className={phStatus.textClass}>pH {vessel.pH.toFixed(1)}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400 truncate">{media?.shortName ?? ''}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-500 whitespace-nowrap shrink-0">
        <span>WASD / Click floor</span>
        <span aria-hidden="true">·</span>
        <span>E / Click station</span>
        <span aria-hidden="true">·</span>
        <span>? Lab Guide</span>
      </div>
    </div>
  );
};

function areBeltVesselsVisuallyEqual(a: CultureVessel[], b: CultureVessel[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const va = a[i];
    const vb = b[i];
    if (va === vb) continue;
    const slotA = va.location.zone === 'belt' ? va.location.slotIndex : -1;
    const slotB = vb.location.zone === 'belt' ? vb.location.slotIndex : -1;
    if (
      va.id !== vb.id ||
      va.label !== vb.label ||
      slotA !== slotB ||
      va.vesselType !== vb.vesselType ||
      va.mediaId !== vb.mediaId ||
      va.colonyCount !== vb.colonyCount ||
      va.od600.toFixed(2) !== vb.od600.toFixed(2) ||
      va.pH.toFixed(1) !== vb.pH.toFixed(1) ||
      va.temperatureC.toFixed(0) !== vb.temperatureC.toFixed(0) ||
      va.populations[0]?.phase !== vb.populations[0]?.phase ||
      (va.dnaFragments?.length ?? 0) !== (vb.dnaFragments?.length ?? 0)
    ) {
      return false;
    }
  }
  return true;
}

export const SampleBelt = React.memo(
  SampleBeltComponent,
  (prev, next) =>
    prev.selectedVesselId === next.selectedVesselId &&
    prev.onSelectVessel === next.onSelectVessel &&
    prev.onOpenInventory === next.onOpenInventory &&
    areBeltVesselsVisuallyEqual(prev.beltVessels, next.beltVessels)
);
