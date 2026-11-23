import React from 'react';

interface PixelMicroscope128Props {
  size?: number;
  magnification?: 100 | 400 | 1000;
  hasSlide?: boolean;
  slideColor?: string;
  oilApplied?: boolean;
  illuminated?: boolean;
  className?: string;
}

const OL = '#090D16';

/**
 * High-resolution 128x128 pixel-art Compound & Phase-Contrast Microscope.
 * Features binocular ocular head, rotating 3-objective turret, mechanical stage with slide clip,
 * rack-and-pinion coarse/fine focus knobs, sub-stage Abbe condenser, and illuminated light path.
 */
export const PixelMicroscope128: React.FC<PixelMicroscope128Props> = ({
  size = 240,
  magnification = 1000,
  hasSlide = false,
  slideColor = '#7C3AED',
  oilApplied = false,
  illuminated = true,
  className = '',
}) => {
  const lampBeamOpacity = illuminated ? 0.34 : 0.06;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      shapeRendering="crispEdges"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Floor Contact Shadow */}
      <rect x="18" y="114" width="92" height="6" fill="#04070D" fillOpacity="0.65" />

      {/* === LOWER CAST-ALUMINUM CHASSIS & BASE === */}
      <rect x="20" y="100" width="88" height="16" fill={OL} />
      <rect x="22" y="102" width="84" height="12" fill="#334155" />
      <rect x="22" y="102" width="84" height="3" fill="#64748B" />
      <rect x="22" y="111" width="84" height="3" fill="#1E293B" />

      {/* Upper Beveled Base Deck */}
      <rect x="28" y="92" width="74" height="10" fill={OL} />
      <rect x="30" y="94" width="70" height="7" fill="#475569" />
      <rect x="32" y="94" width="66" height="2" fill="#94A3B8" />

      {/* Illumination Dial & Power Toggle on Base */}
      <rect x="36" y="105" width="8" height="5" fill={OL} />
      <rect x="37" y="106" width="6" height="3" fill={illuminated ? '#10B981' : '#EF4444'} />
      <rect x="86" y="104" width="10" height="7" fill={OL} />
      <rect x="88" y="105" width="6" height="5" fill="#CBD5E1" />
      <rect x="90" y="106" width="2" height="3" fill="#0F172A" />

      {/* === HALOCEN / LED COLLECTOR WINDOW === */}
      <rect x="44" y="88" width="20" height="6" fill={OL} />
      <rect x="46" y="89" width="16" height="4" fill={illuminated ? '#E0F2FE' : '#1E293B'} />
      {illuminated && (
        <>
          <rect x="49" y="90" width="10" height="2" fill="#38BDF8" />
          {/* Light Cone Rising Into Condenser */}
          <polygon
            points="48,88 60,88 64,74 44,74"
            fill="#7DD3FC"
            fillOpacity={lampBeamOpacity}
          />
        </>
      )}

      {/* === SUB-STAGE ABBE CONDENSER === */}
      <rect x="42" y="74" width="24" height="9" fill={OL} />
      <rect x="44" y="75" width="20" height="7" fill="#1E293B" />
      <rect x="47" y="77" width="14" height="2" fill="#38BDF8" />

      {/* === REAR CURVED MICROSCOPE ARM === */}
      <rect x="74" y="28" width="24" height="66" fill={OL} />
      <rect x="76" y="30" width="20" height="62" fill="#CBD5E1" />
      <rect x="90" y="30" width="6" height="62" fill="#94A3B8" />
      <rect x="78" y="32" width="4" height="58" fill="#F8FAFC" />
      {/* Arm Carrying Cutout */}
      <rect x="82" y="46" width="8" height="22" fill={OL} />
      <rect x="84" y="48" width="4" height="18" fill="#0B111E" />

      {/* === COAXIAL COARSE & FINE FOCUS KNOBS === */}
      <rect x="86" y="76" width="18" height="18" fill={OL} />
      <rect x="88" y="78" width="14" height="14" fill="#475569" />
      <rect x="90" y="80" width="10" height="10" fill="#94A3B8" />
      <rect x="92" y="82" width="6" height="6" fill="#38BDF8" />
      {/* Fine Inner Knurled Ring */}
      <rect x="94" y="84" width="2" height="2" fill="#E0F2FE" />

      {/* === UPPER OPTICAL HEAD CARRIER & TRINOCULAR COLLAR === */}
      <rect x="42" y="24" width="54" height="16" fill={OL} />
      <rect x="44" y="26" width="50" height="12" fill="#E2E8F0" />
      <rect x="44" y="34" width="50" height="4" fill="#94A3B8" />
      <rect x="46" y="27" width="44" height="3" fill="#FFFFFF" />

      {/* Angled Binocular Head Prism */}
      <rect x="48" y="16" width="28" height="12" fill={OL} />
      <rect x="50" y="18" width="24" height="8" fill="#334155" />
      <rect x="52" y="19" width="20" height="2" fill="#64748B" />

      {/* Left & Right 10x Ocular Eyepiece Tubes */}
      <rect x="34" y="8" width="16" height="12" fill={OL} />
      <rect x="36" y="10" width="12" height="8" fill="#1E293B" />
      <rect x="32" y="5" width="12" height="6" fill={OL} />
      <rect x="34" y="6" width="8" height="4" fill="#475569" />
      <rect x="35" y="6" width="6" height="2" fill="#7DD3FC" />

      <rect x="56" y="6" width="16" height="12" fill={OL} />
      <rect x="58" y="8" width="12" height="8" fill="#1E293B" />
      <rect x="54" y="3" width="12" height="6" fill={OL} />
      <rect x="56" y="4" width="8" height="4" fill="#475569" />
      <rect x="57" y="4" width="6" height="2" fill="#7DD3FC" />

      {/* === ROTATING 3-LENS OBJECTIVE TURRET === */}
      <rect x="40" y="38" width="32" height="9" fill={OL} />
      <rect x="42" y="39" width="28" height="7" fill="#334155" />
      <rect x="44" y="40" width="24" height="2" fill="#94A3B8" />

      {/* Active Center Objective (Highlighted based on active magnification) */}
      <rect x="49" y="46" width="10" height="16" fill={OL} />
      <rect x="51" y="47" width="6" height="13" fill="#CBD5E1" />
      <rect
        x="51"
        y="55"
        width="6"
        height="3"
        fill={
          magnification === 1000
            ? '#F8FAFC'
            : magnification === 400
            ? '#38BDF8'
            : '#FACC15'
        }
      />
      <rect x="52" y="60" width="4" height="2" fill="#38BDF8" />

      {/* Left Angled Objective */}
      <rect x="37" y="45" width="9" height="13" fill={OL} />
      <rect x="39" y="46" width="5" height="10" fill="#94A3B8" />
      <rect
        x="39"
        y="52"
        width="5"
        height="2"
        fill={magnification === 100 ? '#38BDF8' : '#FACC15'}
      />

      {/* Right Angled Objective */}
      <rect x="62" y="45" width="9" height="13" fill={OL} />
      <rect x="64" y="46" width="5" height="10" fill="#94A3B8" />
      <rect
        x="64"
        y="52"
        width="5"
        height="2"
        fill={magnification === 400 ? '#F8FAFC' : '#38BDF8'}
      />

      {/* === MECHANICAL X-Y STAGE & SLIDE CLIPS === */}
      <rect x="24" y="68" width="56" height="8" fill={OL} />
      <rect x="26" y="70" width="52" height="4" fill="#1E293B" />
      <rect x="26" y="70" width="52" height="1" fill="#64748B" />
      {/* Optical Aperture Window */}
      <rect x="50" y="70" width="8" height="4" fill={illuminated ? '#BAE6FD' : '#0F172A'} />

      {/* X-Y Coaxial Stage Control Stem Hanging Down Right */}
      <rect x="70" y="76" width="4" height="14" fill={OL} />
      <rect x="71" y="76" width="2" height="12" fill="#94A3B8" />
      <rect x="69" y="84" width="6" height="4" fill="#CBD5E1" />
      <rect x="69" y="89" width="6" height="4" fill="#475569" />

      {/* === MOUNTED GLASS SLIDE ON STAGE === */}
      {hasSlide && (
        <g>
          <rect x="30" y="65" width="42" height="5" fill={OL} />
          <rect x="32" y="66" width="38" height="3" fill="#E0F2FE" />
          <rect x="32" y="66" width="8" height="3" fill="#94A3B8" />
          {/* Specimen Stain Drop */}
          <rect x="49" y="66" width="10" height="3" fill={slideColor} />
          {/* Immersion Oil Bead */}
          {oilApplied && (
            <rect x="52" y="63" width="4" height="3" fill="#FACC15" />
          )}
          {/* Chrome Slide Clips */}
          <rect x="38" y="64" width="3" height="5" fill="#CBD5E1" />
          <rect x="66" y="64" width="3" height="5" fill="#CBD5E1" />
        </g>
      )}
    </svg>
  );
};
