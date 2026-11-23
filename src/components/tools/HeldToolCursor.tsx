import React, { useEffect, useState } from 'react';
import { PixelSpriteId, PixelToolSprite } from './PixelToolSprites';
import { PixelSprite64Id, PixelToolSprite64 } from './PixelToolSprites64';

interface HeldToolCursorProps {
  spriteId?: PixelSpriteId | null;
  highResSpriteId?: PixelSprite64Id | null;
  loopState?: 'unsterile' | 'hot' | 'cool_sterile' | 'loaded';
  hasTip?: boolean;
  hasInoculum?: boolean;
  fillFraction?: number;
  pipetteFillFraction?: number;
  liquidColor?: string;
  label?: string;
  working?: boolean;
  onRelease?: () => void;
}

let globalLastPointer: { x: number; y: number } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      globalLastPointer = { x: e.clientX, y: e.clientY };
    },
    { passive: true }
  );
  window.addEventListener(
    'pointerdown',
    (e) => {
      globalLastPointer = { x: e.clientX, y: e.clientY };
    },
    { passive: true }
  );
}

/**
 * Floating pixel-art tool attached to the player's cursor so they physically
 * hold the selected lab instrument in their hand while moving across bench targets.
 */
export const HeldToolCursor: React.FC<HeldToolCursorProps> = ({
  spriteId = null,
  highResSpriteId = null,
  loopState,
  hasTip,
  hasInoculum,
  fillFraction,
  pipetteFillFraction,
  liquidColor,
  label,
  working = false,
  onRelease,
}) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => globalLastPointer);
  const activeAny = Boolean(spriteId || highResSpriteId);

  useEffect(() => {
    if (!activeAny) {
      setPos(null);
      return;
    }

    if (globalLastPointer) {
      setPos(globalLastPointer);
    }

    const handleMove = (e: PointerEvent) => {
      const next = { x: e.clientX, y: e.clientY };
      globalLastPointer = next;
      setPos(next);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onRelease) {
        onRelease();
      }
    };
    const handleContext = (e: MouseEvent) => {
      if (onRelease) {
        e.preventDefault();
        onRelease();
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('contextmenu', handleContext);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('contextmenu', handleContext);
    };
  }, [activeAny, onRelease]);

  if (!activeAny || !pos) return null;

  return (
    <div
      className="fixed pointer-events-none z-[75]"
      style={{
        left: pos.x + (highResSpriteId ? 10 : 8),
        top: pos.y - (highResSpriteId ? 54 : 36),
        transform: working ? 'rotate(-22deg) scale(1.1)' : 'rotate(-6deg)',
        transition: 'transform 100ms ease-out',
      }}
    >
      <div className="drop-shadow-[0_6px_10px_rgba(0,0,0,0.82)] flex items-end gap-1.5">
        {highResSpriteId ? (
          <PixelToolSprite64
            id={highResSpriteId}
            size={64}
            active={working}
            loopState={loopState}
            hasTip={hasTip}
            hasInoculum={hasInoculum}
            fillFraction={fillFraction}
            pipetteFillFraction={pipetteFillFraction}
            liquidColor={liquidColor}
          />
        ) : spriteId ? (
          <PixelToolSprite id={spriteId} size={46} active={working} />
        ) : null}
        {label && (
          <span className="px-2 py-0.5 bg-[#0B0E17]/95 border border-cyan-500/60 text-[10px] font-mono tabular-nums text-cyan-200 rounded whitespace-nowrap">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
