import React, { useEffect, useRef, useState } from 'react';
import { PixelSpriteId, PixelToolSprite } from './PixelToolSprites';

interface HoldDispenseToolProps {
  label: string;
  unit: string;
  value: number;
  minValue: number;
  maxValue: number;
  sweetSpotMin: number;
  sweetSpotMax: number;
  ratePerSec: number;
  precision?: number;
  actionLabel: string;
  secondaryActionLabel?: string;
  resetLabel?: string;
  disabled?: boolean;
  onChange: (nextValue: number) => void;
  onSecondaryHold?: (dtSec: number) => void;
  onReset?: () => void;
  variant?: 'balance' | 'meniscus' | 'ph_dropper' | 'timer';
  statusHint?: string;
  toolSprite?: PixelSpriteId;
  secondaryToolSprite?: PixelSpriteId;
  targetSprite?: PixelSpriteId;
}

export const HoldDispenseTool: React.FC<HoldDispenseToolProps> = ({
  label,
  unit,
  value,
  minValue,
  maxValue,
  sweetSpotMin,
  sweetSpotMax,
  ratePerSec,
  precision = 2,
  actionLabel,
  secondaryActionLabel,
  resetLabel = 'Reset',
  disabled = false,
  onChange,
  onSecondaryHold,
  onReset,
  variant = 'meniscus',
  statusHint,
  toolSprite,
  secondaryToolSprite,
  targetSprite,
}) => {
  const [holdingDir, setHoldingDir] = useState<'primary' | 'secondary' | null>(null);
  const valueRef = useRef<number>(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSecondaryRef = useRef(onSecondaryHold);
  onSecondaryRef.current = onSecondaryHold;

  useEffect(() => {
    if (!holdingDir || disabled) return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.08, (now - lastTs) / 1000);
      lastTs = now;
      if (holdingDir === 'primary') {
        const next = Math.min(maxValue, valueRef.current + ratePerSec * dt);
        valueRef.current = next;
        onChangeRef.current(Number(next.toFixed(precision)));
      } else if (holdingDir === 'secondary') {
        if (onSecondaryRef.current) {
          onSecondaryRef.current(dt);
        } else {
          const next = Math.max(minValue, valueRef.current - ratePerSec * dt);
          valueRef.current = next;
          onChangeRef.current(Number(next.toFixed(precision)));
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [holdingDir, disabled, minValue, maxValue, ratePerSec, precision]);

  useEffect(() => {
    const stop = () => setHoldingDir(null);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const span = Math.max(0.0001, maxValue - minValue);
  const pct = Math.max(0, Math.min(100, ((value - minValue) / span) * 100));
  const sweetLeft = Math.max(0, Math.min(100, ((sweetSpotMin - minValue) / span) * 100));
  const sweetWidth = Math.max(
    2,
    Math.min(100 - sweetLeft, ((sweetSpotMax - sweetSpotMin) / span) * 100)
  );

  const inSweetSpot = value >= sweetSpotMin && value <= sweetSpotMax;
  const isOver = value > sweetSpotMax;

  const statusText = inSweetSpot
    ? 'Target Reached'
    : isOver
    ? 'Overshot'
    : variant === 'timer' && value === 0
    ? 'Ready'
    : 'Below Target';

  const statusColor = inSweetSpot
    ? 'text-emerald-300'
    : isOver
    ? 'text-rose-300'
    : 'text-amber-300';

  const activeToolSprite =
    holdingDir === 'secondary' && secondaryToolSprite ? secondaryToolSprite : toolSprite;

  return (
    <div className="p-3 bg-[#0B0E17] border-2 border-slate-800 rounded space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-200">{label}</span>
        <span className={`text-xs font-mono-tabular font-semibold ${statusColor}`}>
          {value.toFixed(precision)} {unit} ({statusText})
        </span>
      </div>

      {/* Interactive Pixel-Art Bench Work Stage */}
      {(toolSprite || targetSprite) && (
        <div
          onPointerDown={() => {
            if (!disabled) setHoldingDir('primary');
          }}
          className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-950 border-2 border-slate-800/90 rounded cursor-pointer select-none"
          title="Press and hold directly on the pixel tool or button below to work"
        >
          <div className="flex items-center gap-3">
            {activeToolSprite && (
              <div
                style={{
                  transform:
                    holdingDir !== null
                      ? 'translateX(10px) translateY(2px) rotate(-22deg) scale(1.08)'
                      : 'rotate(0deg)',
                  transition: 'transform 120ms ease-out',
                }}
              >
                <PixelToolSprite
                  id={activeToolSprite}
                  size={40}
                  active={holdingDir !== null}
                />
              </div>
            )}

            {/* Pixel droplet / powder transfer stream when holding */}
            <div className="w-6 flex flex-col items-center justify-center">
              {holdingDir !== null ? (
                <div className="flex gap-1">
                  <span
                    className={`w-1.5 h-1.5 ${
                      holdingDir === 'secondary'
                        ? 'bg-rose-400'
                        : variant === 'balance'
                        ? 'bg-amber-200'
                        : 'bg-cyan-400'
                    }`}
                    style={{ animation: 'lab-drop-fall 420ms linear infinite' }}
                  />
                  <span
                    className={`w-1.5 h-1.5 ${
                      holdingDir === 'secondary'
                        ? 'bg-rose-400'
                        : variant === 'balance'
                        ? 'bg-amber-200'
                        : 'bg-cyan-400'
                    }`}
                    style={{
                      animation: 'lab-drop-fall 420ms linear infinite',
                      animationDelay: '180ms',
                    }}
                  />
                </div>
              ) : (
                <span className="text-[10px] font-mono-tabular text-slate-600">→</span>
              )}
            </div>

            {targetSprite && (
              <PixelToolSprite
                id={targetSprite}
                size={42}
                active={value > minValue || holdingDir !== null}
              />
            )}
          </div>

          <div className="text-right font-mono-tabular">
            <div className="text-sm font-bold text-slate-100">
              {value.toFixed(precision)} {unit}
            </div>
            <div className="text-[10px] text-slate-400">
              {holdingDir ? 'HOLDING ON BENCH...' : 'Hold sprite or button'}
            </div>
          </div>
        </div>
      )}

      {/* Live Progress / Meniscus Gauge with Sweet-Spot Window */}
      <div className="relative h-3 bg-slate-950 border border-slate-800 rounded overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-emerald-500/25 border-x border-emerald-400/70"
          style={{ left: `${sweetLeft}%`, width: `${sweetWidth}%` }}
        />
        <div
          className={`h-full transition-colors duration-100 ${
            inSweetSpot
              ? 'bg-emerald-400'
              : isOver
              ? 'bg-rose-400'
              : variant === 'ph_dropper'
              ? 'bg-amber-400'
              : 'bg-cyan-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-tabular text-slate-400">
        <span>
          Target Window: {sweetSpotMin.toFixed(precision)}–{sweetSpotMax.toFixed(precision)} {unit}
        </span>
        {statusHint && <span className="text-slate-400">{statusHint}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          disabled={disabled}
          onPointerDown={() => setHoldingDir('primary')}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setHoldingDir('primary');
            }
          }}
          onKeyUp={() => setHoldingDir(null)}
          onBlur={() => setHoldingDir(null)}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold whitespace-nowrap select-none cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
            holdingDir === 'primary'
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-cyan-600/80 hover:bg-cyan-500 text-white'
          }`}
        >
          {toolSprite && <PixelToolSprite id={toolSprite} size={18} active={holdingDir === 'primary'} />}
          <span>{holdingDir === 'primary' ? 'Working...' : actionLabel}</span>
        </button>

        {secondaryActionLabel && (
          <button
            type="button"
            disabled={disabled}
            onPointerDown={() => setHoldingDir('secondary')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setHoldingDir('secondary');
              }
            }}
            onKeyUp={() => setHoldingDir(null)}
            onBlur={() => setHoldingDir(null)}
            className={`py-1.5 px-3 rounded text-xs font-semibold whitespace-nowrap select-none cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5 ${
              holdingDir === 'secondary'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-amber-600/75 hover:bg-amber-500 text-white'
            }`}
          >
            {secondaryToolSprite && (
              <PixelToolSprite
                id={secondaryToolSprite}
                size={18}
                active={holdingDir === 'secondary'}
              />
            )}
            <span>{secondaryActionLabel}</span>
          </button>
        )}

        {onReset && (
          <button
            type="button"
            disabled={disabled}
            onClick={onReset}
            className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer"
          >
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
};
