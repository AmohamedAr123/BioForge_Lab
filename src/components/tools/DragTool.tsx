import React, { useState } from 'react';
import { HeldToolCursor } from './HeldToolCursor';
import { PixelSpriteId, PixelToolSprite } from './PixelToolSprites';

export interface DragToolItem {
  id: string;
  label: string;
  subtitle?: string;
  statusLabel?: string;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  disabled?: boolean;
  sprite?: PixelSpriteId;
  spriteActive?: boolean;
}

export interface DragHotspotItem {
  id: string;
  label: string;
  subtitle?: string;
  statusLabel?: string;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  disabled?: boolean;
  sprite?: PixelSpriteId;
  spriteActive?: boolean;
}

interface DragToolProps {
  title: string;
  hint?: string;
  tools: DragToolItem[];
  hotspots: DragHotspotItem[];
  onApply: (toolId: string, hotspotId: string) => void;
}

const TONE_RING: Record<NonNullable<DragToolItem['tone']>, string> = {
  cyan: 'border-cyan-500/50 bg-[#0F172A] text-cyan-200',
  emerald: 'border-emerald-500/50 bg-[#0F172A] text-emerald-200',
  amber: 'border-amber-500/50 bg-[#0F172A] text-amber-200',
  rose: 'border-rose-500/50 bg-[#0F172A] text-rose-200',
  slate: 'border-slate-700 bg-[#0F172A] text-slate-200',
};

export const DragTool: React.FC<DragToolProps> = ({
  title,
  hint,
  tools,
  hotspots,
  onApply,
}) => {
  const [equippedToolId, setEquippedToolId] = useState<string | null>(null);
  const [dragOverHotspotId, setDragOverHotspotId] = useState<string | null>(null);
  const [workingPulse, setWorkingPulse] = useState<boolean>(false);

  const equippedTool = tools.find((t) => t.id === equippedToolId && !t.disabled) ?? null;

  const handleApplyHotspot = (toolId: string, hotspotId: string) => {
    const hs = hotspots.find((h) => h.id === hotspotId);
    const tl = tools.find((t) => t.id === toolId);
    if (!hs || hs.disabled || !tl || tl.disabled) return;
    setWorkingPulse(true);
    window.setTimeout(() => setWorkingPulse(false), 220);
    onApply(toolId, hotspotId);
  };

  return (
    <div className="p-3 bg-[#0B0E17] border-2 border-slate-800 rounded space-y-2.5">
      <HeldToolCursor
        spriteId={equippedTool?.sprite ?? null}
        label={equippedTool ? `Holding: ${equippedTool.label}` : undefined}
        working={workingPulse}
        onRelease={() => setEquippedToolId(null)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-200">{title}</span>
        <span className="text-[11px] font-mono-tabular text-cyan-300/90">
          {equippedTool
            ? `In Hand: ${equippedTool.label} (Click bench target · Esc/Right-click to drop)`
            : hint ?? 'Pick up a pixel tool to hold it in your hand'}
        </span>
      </div>

      {/* Pixel-Art Tool Tray */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tools.map((tool) => {
          const isEquipped = equippedToolId === tool.id;
          const toneClass = TONE_RING[tool.tone ?? 'slate'];
          return (
            <button
              key={tool.id}
              type="button"
              draggable={!tool.disabled}
              disabled={tool.disabled}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', tool.id);
                setEquippedToolId(tool.id);
              }}
              onClick={() =>
                setEquippedToolId((prev) => (prev === tool.id ? null : tool.id))
              }
              className={`p-2 rounded border-2 text-left transition-transform duration-150 flex items-center gap-2.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                isEquipped
                  ? 'border-cyan-400 bg-cyan-950/45 text-slate-100 -translate-y-0.5 shadow-[0_0_0_1px_rgba(34,211,238,0.4)]'
                  : `${toneClass} hover:border-slate-500`
              }`}
            >
              {tool.sprite && (
                <div className="w-10 h-10 rounded bg-slate-950/90 border border-slate-800 flex items-center justify-center shrink-0">
                  <PixelToolSprite
                    id={tool.sprite}
                    size={32}
                    active={Boolean(tool.spriteActive || isEquipped)}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold truncate">{tool.label}</div>
                {tool.subtitle && (
                  <div className="text-[10px] text-slate-400 truncate">{tool.subtitle}</div>
                )}
                <div className="text-[10px] font-mono-tabular text-cyan-300 mt-0.5 truncate">
                  {isEquipped ? 'IN HAND' : tool.statusLabel ?? 'Click to Hold'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pixel-Art Bench Target Hotspots */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
        {hotspots.map((hs) => {
          const isOver = dragOverHotspotId === hs.id;
          const toneClass = TONE_RING[hs.tone ?? 'slate'];
          const canReceive = Boolean(equippedToolId) && !hs.disabled;
          return (
            <button
              key={hs.id}
              type="button"
              disabled={hs.disabled || !equippedToolId}
              onDragOver={(e) => {
                if (hs.disabled) return;
                e.preventDefault();
                setDragOverHotspotId(hs.id);
              }}
              onDragLeave={() => setDragOverHotspotId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverHotspotId(null);
                const draggedId = e.dataTransfer.getData('text/plain') || equippedToolId;
                if (draggedId) {
                  handleApplyHotspot(draggedId, hs.id);
                }
              }}
              onClick={() => {
                if (equippedToolId) {
                  handleApplyHotspot(equippedToolId, hs.id);
                }
              }}
              className={`p-2 rounded border-2 text-left transition-colors flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed ${
                isOver
                  ? 'border-emerald-400 bg-emerald-950/45 text-emerald-100'
                  : canReceive
                  ? `${toneClass} border-dashed hover:border-cyan-400 cursor-crosshair`
                  : toneClass
              }`}
            >
              {hs.sprite && (
                <div className="w-10 h-10 rounded bg-slate-950/90 border border-slate-800 flex items-center justify-center shrink-0">
                  <PixelToolSprite
                    id={hs.sprite}
                    size={32}
                    active={Boolean(hs.spriteActive || isOver)}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold truncate">{hs.label}</div>
                {hs.statusLabel && (
                  <div className="text-[10px] font-mono-tabular text-slate-300 truncate">
                    {hs.statusLabel}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
