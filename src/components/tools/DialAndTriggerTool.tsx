import React from 'react';
import { PixelSpriteId, PixelToolSprite } from './PixelToolSprites';

interface DialAndTriggerToolProps {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  presets?: number[];
  onChangeValue: (next: number) => void;
  triggerLabel: string;
  onTrigger: () => void;
  disabled?: boolean;
  statusText?: string;
  tone?: 'cyan' | 'amber' | 'emerald' | 'purple';
  hideDial?: boolean;
  sprite?: PixelSpriteId;
  spriteActive?: boolean;
}

const BUTTON_TONE: Record<NonNullable<DialAndTriggerToolProps['tone']>, string> = {
  cyan: 'bg-cyan-600 hover:bg-cyan-500 text-white',
  amber: 'bg-amber-600 hover:bg-amber-500 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  purple: 'bg-purple-600 hover:bg-purple-500 text-white',
};

export const DialAndTriggerTool: React.FC<DialAndTriggerToolProps> = ({
  label,
  unit = '',
  value,
  min,
  max,
  step,
  presets,
  onChangeValue,
  triggerLabel,
  onTrigger,
  disabled = false,
  statusText,
  tone = 'cyan',
  hideDial = false,
  sprite,
  spriteActive = false,
}) => {
  return (
    <div className="p-3 bg-[#0B0E17] border-2 border-slate-800 rounded space-y-2">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {sprite && (
            <div className="w-10 h-10 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
              <PixelToolSprite id={sprite} size={32} active={spriteActive} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate">{label}</div>
            {statusText && (
              <div className="text-[11px] font-mono-tabular text-slate-400 truncate">
                {statusText}
              </div>
            )}
          </div>
        </div>
      </div>

      {!hideDial && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeValue(Math.max(min, Number((value - step).toFixed(2))))}
              className="px-2 py-1 text-xs font-mono-tabular bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
            >
              -
            </button>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChangeValue(Number(e.target.value))}
              className="flex-1 accent-cyan-400"
            />
            <button
              type="button"
              onClick={() => onChangeValue(Math.min(max, Number((value + step).toFixed(2))))}
              className="px-2 py-1 text-xs font-mono-tabular bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
            >
              +
            </button>
            <span className="text-xs font-mono-tabular font-semibold text-cyan-300 min-w-[68px] text-right">
              {value}
              {unit ? ` ${unit}` : ''}
            </span>
          </div>

          {presets && presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChangeValue(p)}
                  className={`px-2 py-0.5 text-[10px] font-mono-tabular rounded border cursor-pointer ${
                    Math.abs(value - p) < 0.001
                      ? 'bg-cyan-950/45 border-cyan-500/60 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p}
                  {unit ? ` ${unit}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={onTrigger}
        className={`w-full py-1.5 px-3 rounded text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed ${BUTTON_TONE[tone]}`}
      >
        {triggerLabel}
      </button>
    </div>
  );
};
