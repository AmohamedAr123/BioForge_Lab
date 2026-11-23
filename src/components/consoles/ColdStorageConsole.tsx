import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Snowflake, X } from 'lucide-react';
import { getSpeciesById } from '../../data/scientificDatabase';
import { CultureVessel } from '../../types/lab';
import { BELT_CAPACITY } from '../SampleBelt';

interface ColdStorageConsoleProps {
  vessels: CultureVessel[];
  beltVessels: CultureVessel[];
  onMoveToBelt: (vesselId: string) => void;
  onMoveToEquipment: (vesselId: string, stationId: 'cold_storage', slotIndex: number) => void;
  onClose: () => void;
}

export const ColdStorageConsole: React.FC<ColdStorageConsoleProps> = ({
  vessels,
  beltVessels,
  onMoveToBelt,
  onMoveToEquipment,
  onClose,
}) => {
  const coldVessels = vessels.filter(
    (v) => v.location.zone === 'equipment' && v.location.stationId === 'cold_storage'
  );
  const stocks = coldVessels.filter((v) => v.vesselType === 'glycerol_stock');
  const refrigeratedCultures = coldVessels.filter((v) => v.vesselType !== 'glycerol_stock');

  const [transferNotice, setTransferNotice] = useState<{
    label: string;
    direction: 'chill' | 'thaw';
    fromTemp: number;
    toTemp: number;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerTransferPulse = (
    label: string,
    direction: 'chill' | 'thaw',
    fromTemp: number,
    toTemp: number
  ) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    setTransferNotice({ label, direction, fromTemp, toTemp });
    const delta = Math.abs(fromTemp - toTemp);
    const holdMs = Math.min(1350, Math.round(550 + delta * 14));
    timerRef.current = window.setTimeout(() => {
      setTransferNotice(null);
    }, holdMs);
  };

  const handleRetrieve = (vessel: CultureVessel) => {
    triggerTransferPulse(
      vessel.label,
      'thaw',
      vessel.vesselType === 'glycerol_stock' ? -80.0 : vessel.temperatureC,
      22.0
    );
    onMoveToBelt(vessel.id);
  };

  const handleStoreFromBelt = (vessel: CultureVessel) => {
    const usedSlots = new Set(
      coldVessels.map((v) => (v.location.zone === 'equipment' ? v.location.slotIndex : -1))
    );
    let freeSlot = 0;
    while (usedSlots.has(freeSlot) && freeSlot < 12) freeSlot++;
    if (freeSlot < 12) {
      const targetTemp = vessel.vesselType === 'glycerol_stock' ? -80.0 : 4.0;
      triggerTransferPulse(vessel.label, 'chill', vessel.temperatureC, targetTemp);
      onMoveToEquipment(vessel.id, 'cold_storage', freeSlot);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Snowflake
              className={`w-5 h-5 text-sky-400 shrink-0 transition-transform duration-300 ${
                transferNotice ? 'rotate-90 scale-110' : ''
              }`}
            />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Cold Storage (-80 °C Freezer &amp; 4 °C Refrigerator)
              </h2>
              <p className="text-xs text-slate-400">
                Retrieve master bacterial glycerol stocks for inoculation or refrigerate cultures to arrest division.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Cold Storage"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Adaptive Cryo / Chill Thermal Transfer Visualizer */}
        {transferNotice && (
          <div className="px-5 py-2.5 bg-sky-950/50 border-b border-sky-500/40 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 font-mono-tabular">
              <Snowflake
                className="w-4 h-4 text-cyan-300 shrink-0"
                style={{ animation: 'lab-swirl-spin 1.8s linear infinite' }}
              />
              <span className="text-slate-100 font-semibold">{transferNotice.label}</span>
              <span className="text-cyan-300">
                {transferNotice.direction === 'chill' ? 'Chilling' : 'Equilibrating'}{' '}
                {transferNotice.fromTemp.toFixed(1)} °C → {transferNotice.toTemp.toFixed(1)} °C
              </span>
            </div>
            <span className="text-[11px] font-mono-tabular text-sky-300">
              ΔT = {Math.abs(transferNotice.fromTemp - transferNotice.toTemp).toFixed(1)} °C
            </span>
          </div>
        )}

        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* -80 C Master Strain Bank */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-200">
                -80 °C Ultra-Low Master Glycerol Stocks
              </h3>
              <span className="text-xs font-mono-tabular text-sky-400">-80.0 °C</span>
            </div>

            <div className="space-y-2.5">
              {stocks.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-800 rounded text-xs text-slate-500">
                  All master glycerol stocks are currently in your Sample Tray. Return them here after inoculating to preserve cold storage.
                </div>
              ) : (
                stocks.map((stock) => {
                  const sp = stock.populations[0]
                    ? getSpeciesById(stock.populations[0].speciesId)
                    : undefined;
                  return (
                    <div
                      key={stock.id}
                      className="p-3 bg-[#0B0E17] border border-slate-800 rounded flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100 truncate">
                          {stock.label}
                        </div>
                        {sp && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            <span>{sp.scientificName} {sp.strainCode}</span>
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span>Gram {sp.gramStatus}</span>
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span>{sp.biosafetyLevel}</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRetrieve(stock)}
                        disabled={beltVessels.length >= BELT_CAPACITY}
                        className="px-3 py-1.5 text-xs font-medium bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <ArrowUpFromLine className="w-3.5 h-3.5" />
                        Take Stock
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 4 C Refrigerator Shelf + Deposit from Sample Tray */}
          <section className="space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  4 °C Refrigerator Shelf
                </h3>
                <span className="text-xs font-mono-tabular text-cyan-400">+4.0 °C</span>
              </div>

              {refrigeratedCultures.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-800 rounded text-xs text-slate-500">
                  No active cultures or plates stored at 4 °C.
                </div>
              ) : (
                <div className="space-y-2">
                  {refrigeratedCultures.map((vessel) => (
                    <div
                      key={vessel.id}
                      className="p-3 bg-[#0B0E17] border border-slate-800 rounded flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100 truncate">
                          {vessel.label}
                        </div>
                        <div className="text-xs font-mono-tabular text-slate-400 mt-0.5">
                          {vessel.temperatureC.toFixed(1)} °C ·{' '}
                          {vessel.vesselType === 'agar_plate'
                            ? `${vessel.colonyCount} colonies`
                            : vessel.vesselType === 'microtube_1_5ml' ||
                              vessel.vesselType === 'pcr_tube'
                            ? `${vessel.dnaFragments?.length ?? 0} DNA band(s)`
                            : `OD600 ${vessel.od600.toFixed(3)}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRetrieve(vessel)}
                        disabled={beltVessels.length >= BELT_CAPACITY}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 rounded flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <ArrowUpFromLine className="w-3.5 h-3.5" />
                        Retrieve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="border-b border-slate-800 pb-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  Store from Carried Sample Tray
                </h3>
              </div>

              {beltVessels.length === 0 ? (
                <p className="text-xs text-slate-500">Your carried Sample Tray is empty.</p>
              ) : (
                <div className="space-y-2">
                  {beltVessels.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 bg-slate-900/60 border border-slate-800 rounded flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200 truncate">{v.label}</div>
                        <div className="text-[11px] font-mono-tabular text-slate-400">
                          {v.temperatureC.toFixed(1)} °C
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStoreFromBelt(v)}
                        className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        Store Cold
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

