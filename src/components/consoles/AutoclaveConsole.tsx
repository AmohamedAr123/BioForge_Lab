import React, { useEffect, useRef, useState } from 'react';
import { Flame, Trash2, X } from 'lucide-react';
import { CultureVessel } from '../../types/lab';

interface AutoclaveConsoleProps {
  beltVessels: CultureVessel[];
  onDisposeVessel: (vesselId: string) => void;
  onClose: () => void;
}

export const AutoclaveConsole: React.FC<AutoclaveConsoleProps> = ({
  beltVessels,
  onDisposeVessel,
  onClose,
}) => {
  const disposable = beltVessels.filter((v) => v.vesselType !== 'glycerol_stock');
  const protectedStocks = beltVessels.filter((v) => v.vesselType === 'glycerol_stock');

  const [sterilizingId, setSterilizingId] = useState<string | null>(null);
  const [chamberTemp, setChamberTemp] = useState<number>(22.0);
  const [chamberPsi, setChamberPsi] = useState<number>(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const handleSterilize = (v: CultureVessel) => {
    if (sterilizingId) return;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    const vol = Math.max(5, Math.min(120, v.volumeMl || 20));
    const totalMs = Math.round(580 + (vol / 120) * 560);

    setSterilizingId(v.id);
    setChamberTemp(78.0);
    setChamberPsi(8);

    const t1 = window.setTimeout(() => {
      setChamberTemp(121.0);
      setChamberPsi(15);
    }, Math.round(totalMs * 0.4));

    const t2 = window.setTimeout(() => {
      onDisposeVessel(v.id);
      setSterilizingId(null);
      setChamberTemp(22.0);
      setChamberPsi(0);
    }, totalMs);

    timersRef.current = [t1, t2];
  };

  const activeVessel = disposable.find((d) => d.id === sterilizingId) ?? null;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Flame
              className={`w-5 h-5 text-rose-400 shrink-0 transition-transform duration-200 ${
                sterilizingId ? 'scale-125 text-amber-400' : ''
              }`}
            />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Steam Autoclave &amp; Biohazard Sterilization
              </h2>
              <p className="text-xs text-slate-400">
                Sterilize spent cultures and contaminated plates at 121 °C (15 psi) before disposal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Autoclave"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Adaptive Pressurized Steam Chamber Strip */}
          <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">
                {activeVessel
                  ? `Sterilizing ${activeVessel.label} (${activeVessel.volumeMl || 20} mL load)...`
                  : 'Autoclave Chamber Ready'}
              </div>
              <div className="text-[11px] font-mono-tabular text-slate-400">
                Temp:{' '}
                <span className={chamberTemp >= 120 ? 'text-rose-300 font-semibold' : 'text-slate-300'}>
                  {chamberTemp.toFixed(1)} °C
                </span>{' '}
                · Pressure:{' '}
                <span className={chamberPsi >= 15 ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
                  {chamberPsi} psi
                </span>
              </div>
            </div>

            <svg viewBox="0 0 96 44" className="w-24 h-11 rounded bg-slate-950 border border-slate-800 shrink-0">
              <rect
                x="8"
                y="8"
                width="80"
                height="28"
                rx="4"
                fill={sterilizingId ? '#7F1D1D' : '#0F172A'}
                fillOpacity={sterilizingId ? 0.55 : 0.8}
                stroke={sterilizingId ? '#F87171' : '#475569'}
                strokeWidth="1.5"
              />
              {sterilizingId &&
                [0, 1, 2, 3].map((idx) => (
                  <circle
                    key={idx}
                    cx={24 + idx * 16}
                    cy="30"
                    r="2.4"
                    fill="#E2E8F0"
                    style={{
                      animation: `lab-bubble-rise ${0.42 + idx * 0.12}s linear infinite`,
                      animationDelay: `${idx * 0.1}s`,
                    }}
                  />
                ))}
              <text
                x="48"
                y="26"
                textAnchor="middle"
                fill="#E2E8F0"
                fontSize="8.5"
                fontFamily="JetBrains Mono, monospace"
              >
                {sterilizingId ? '121°C STEAM' : 'STANDBY'}
              </text>
            </svg>
          </div>

          {disposable.length === 0 ? (
            <div className="p-6 border border-dashed border-slate-800 rounded text-center text-xs text-slate-500">
              No disposable culture vessels in your Carried Sample Tray.
            </div>
          ) : (
            <div className="space-y-2.5">
              {disposable.map((v) => {
                const isRunningThis = sterilizingId === v.id;
                return (
                  <div
                    key={v.id}
                    className={`p-3 bg-[#0B0E17] border rounded flex items-center justify-between gap-3 transition-colors ${
                      isRunningThis ? 'border-rose-500/70 bg-rose-950/20' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-100">{v.label}</div>
                      <div className="text-xs font-mono-tabular text-slate-400">
                        {v.vesselType === 'agar_plate'
                          ? `Agar Plate · ${v.colonyCount} colonies`
                          : v.vesselType === 'microtube_1_5ml' || v.vesselType === 'pcr_tube'
                          ? `Molecular Tube · ${v.dnaFragments?.length ?? 0} DNA locus/band(s)`
                          : `OD600 ${v.od600.toFixed(3)} · ${v.volumeMl} mL`}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(sterilizingId)}
                      onClick={() => handleSterilize(v)}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isRunningThis ? 'Sterilizing 121 °C...' : 'Autoclave & Discard'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {protectedStocks.length > 0 && (
            <p className="text-xs text-sky-400">
              Master -80 °C glycerol stocks are protected from disposal. Return them to Cold Storage instead.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

