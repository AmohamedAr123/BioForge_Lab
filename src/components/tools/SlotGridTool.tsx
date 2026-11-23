import React from 'react';
import { PixelSpriteId, PixelToolSprite } from './PixelToolSprites';

export interface SlotGridItem {
  id: string;
  label: string;
  occupied: boolean;
  sublabel?: string;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  disabled?: boolean;
  sprite?: PixelSpriteId;
}

interface SlotGridToolProps {
  title: string;
  slots: SlotGridItem[];
  layout?: 'grid' | 'rotor';
  columns?: 2 | 3 | 4 | 6;
  requireOppositeSymmetry?: boolean;
  onToggleSlot: (slotId: string) => void;
  statusNote?: string;
}

export function isRotorBalanced(slots: SlotGridItem[]): boolean {
  const n = slots.length;
  if (n === 0 || n % 2 !== 0) return false;
  const occupiedCount = slots.filter((s) => s.occupied).length;
  if (occupiedCount === 0) return false;
  const half = n / 2;
  for (let i = 0; i < half; i++) {
    if (slots[i].occupied !== slots[i + half].occupied) {
      return false;
    }
  }
  return true;
}

export const SlotGridTool: React.FC<SlotGridToolProps> = ({
  title,
  slots,
  layout = 'grid',
  columns = 4,
  requireOppositeSymmetry = false,
  onToggleSlot,
  statusNote,
}) => {
  const balanced = requireOppositeSymmetry ? isRotorBalanced(slots) : true;
  const occupiedCount = slots.filter((s) => s.occupied).length;

  const gridColsClass =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
      ? 'grid-cols-3'
      : columns === 6
      ? 'grid-cols-3 sm:grid-cols-6'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="p-3 bg-[#0B0E17] border-2 border-slate-800 rounded space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-200">{title}</span>
        <span
          className={`text-[11px] font-mono-tabular ${
            requireOppositeSymmetry
              ? balanced
                ? 'text-emerald-300'
                : 'text-rose-300'
              : 'text-slate-400'
          }`}
        >
          {requireOppositeSymmetry
            ? occupiedCount === 0
              ? 'Empty (Load 2+ opposite slots)'
              : balanced
              ? `Balanced (${occupiedCount}/${slots.length})`
              : `Unbalanced (${occupiedCount} tubes — add opposite counterweight)`
            : statusNote ?? `${occupiedCount}/${slots.length} active`}
        </span>
      </div>

      {layout === 'rotor' ? (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <svg
            width="136"
            height="136"
            viewBox="0 0 140 140"
            shapeRendering="crispEdges"
            className="shrink-0"
          >
            <circle cx="70" cy="70" r="62" fill="#0F172A" stroke="#334155" strokeWidth="3" />
            <circle cx="70" cy="70" r="16" fill="#1E293B" stroke="#475569" strokeWidth="2" />
            {slots.map((slot, idx) => {
              const angle = (idx / slots.length) * Math.PI * 2 - Math.PI / 2;
              const cx = 70 + Math.cos(angle) * 42;
              const cy = 70 + Math.sin(angle) * 42;
              const oppIdx = (idx + slots.length / 2) % slots.length;
              const isMismatch =
                requireOppositeSymmetry && slot.occupied !== slots[oppIdx]?.occupied;
              return (
                <g
                  key={slot.id}
                  onClick={() => !slot.disabled && onToggleSlot(slot.id)}
                  className={slot.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                >
                  <rect
                    x={cx - 10}
                    y={cy - 10}
                    width="20"
                    height="20"
                    rx="3"
                    fill={
                      slot.occupied
                        ? isMismatch
                          ? '#9F1239'
                          : '#0284C7'
                        : '#111827'
                    }
                    stroke={
                      slot.occupied
                        ? isMismatch
                          ? '#FB7185'
                          : '#38BDF8'
                        : '#475569'
                    }
                    strokeWidth="2"
                  />
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    fill="#F8FAFC"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {slot.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="flex-1 w-full grid grid-cols-2 gap-1.5">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                disabled={slot.disabled}
                onClick={() => onToggleSlot(slot.id)}
                className={`px-2 py-1.5 rounded border-2 text-left text-[11px] font-mono-tabular cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-45 ${
                  slot.occupied
                    ? 'bg-sky-950/45 border-sky-500/60 text-sky-200'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <PixelToolSprite
                  id={slot.sprite ?? 'rotor_tube'}
                  size={22}
                  active={slot.occupied}
                />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Slot {slot.label}</div>
                  <div className="text-[10px] truncate">
                    {slot.sublabel ?? (slot.occupied ? 'Loaded' : 'Empty')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-1.5`}>
          {slots.map((slot) => {
            const activeBg =
              slot.tone === 'amber'
                ? 'bg-amber-950/45 border-amber-500/60 text-amber-200'
                : slot.tone === 'emerald'
                ? 'bg-emerald-950/45 border-emerald-500/60 text-emerald-200'
                : slot.tone === 'rose'
                ? 'bg-rose-950/45 border-rose-500/60 text-rose-200'
                : 'bg-cyan-950/45 border-cyan-500/60 text-cyan-200';
            return (
              <button
                key={slot.id}
                type="button"
                disabled={slot.disabled}
                onClick={() => onToggleSlot(slot.id)}
                className={`p-2 rounded border-2 text-left transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed ${
                  slot.occupied
                    ? activeBg
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                {slot.sprite && (
                  <PixelToolSprite
                    id={slot.sprite}
                    size={26}
                    active={slot.occupied}
                  />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] font-mono-tabular font-semibold truncate">
                    {slot.label}
                  </div>
                  {slot.sublabel && (
                    <div className="text-[10px] truncate opacity-85">{slot.sublabel}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
