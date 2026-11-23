import React from 'react';

export type PixelSprite64Id =
  | 'beaker_250'
  | 'flask_250'
  | 'tube_15'
  | 'agar_plate'
  | 'pipette_p1000'
  | 'wash_bottle'
  | 'scoop_spatula'
  | 'lb_powder_jar'
  | 'm9_powder_jar'
  | 'macconkey_jar'
  | 'glucose_vial'
  | 'tryptone_bottle'
  | 'pbs_bottle'
  | 'ph_meter'
  | 'naoh_dropper'
  | 'hcl_dropper'
  | 'water_jar'
  | 'heating_torch'
  | 'sink_basin'
  | 'ice_bucket'
  | 'tryptone_jar'
  | 'salts_jar'
  | 'agar_jar'
  | 'naoh_conc'
  | 'hcl_conc'
  | 'pbs_conc'
  | 'ab_ampicillin'
  | 'ab_kanamycin'
  | 'ab_chloramphenicol'
  | 'ab_ciprofloxacin'
  | 'bunsen_burner'
  | 'loop_nichrome'
  | 'tip_box'
  | 'vortex_mixer'
  | 'biohazard_bin'
  | 'autoclave_unit'
  | 'bacterial_stock'
  | 'heating_stand'
  | 'glass_slide'
  | 'stain_cv'
  | 'stain_iodine'
  | 'stain_ethanol'
  | 'stain_safranin'
  | 'immersion_oil';

interface PixelToolSprite64Props {
  id: PixelSprite64Id;
  size?: number;
  active?: boolean;
  /** Optional variant / state parameters for dynamic tools like loop or vessels */
  loopState?: 'unsterile' | 'hot' | 'cool_sterile' | 'loaded';
  fillFraction?: number;
  pipetteFillFraction?: number;
  liquidColor?: string;
  hasTip?: boolean;
  hasInoculum?: boolean;
  isStirring?: boolean;
  className?: string;
}

const OL = '#090D16'; // Crisp dark pixel outline
const GLASS_RIM = '#E2E8F0';
const GLASS_EDGE = '#94A3B8';
const GLASS_BG = '#131E31';
const GLASS_SPEC = '#F8FAFC';

function renderBottle64(opts: {
  glass: string;
  glassDark: string;
  liquid: string;
  liquidHi: string;
  cap: string;
  capDark: string;
  labelBg: string;
  labelStripe: string;
  hasDropperBulb?: boolean;
  dropColor?: string;
  active?: boolean;
}) {
  const {
    glass,
    glassDark,
    liquid,
    liquidHi,
    cap,
    capDark,
    labelBg,
    labelStripe,
    hasDropperBulb = false,
    dropColor,
    active = false,
  } = opts;

  return (
    <g>
      {hasDropperBulb ? (
        <>
          {/* Rubber Squeeze Bulb */}
          <rect x="27" y="3" width="10" height="2" fill={OL} />
          <rect x="25" y="5" width="14" height="10" fill={OL} />
          <rect x="27" y="5" width="10" height="9" fill={cap} />
          <rect x="33" y="6" width="4" height="8" fill={capDark} />
          <rect x="28" y="6" width="2" height="5" fill="#FFFFFF" fillOpacity="0.45" />
          {/* Screw Collar */}
          <rect x="23" y="15" width="18" height="6" fill={OL} />
          <rect x="25" y="16" width="14" height="4" fill="#CBD5E1" />
          <rect x="26" y="17" width="12" height="1" fill="#F8FAFC" />
          <rect x="35" y="16" width="4" height="4" fill="#64748B" />
        </>
      ) : (
        <>
          {/* Ribbed Screw Cap */}
          <rect x="24" y="5" width="16" height="2" fill={OL} />
          <rect x="22" y="7" width="20" height="11" fill={OL} />
          <rect x="24" y="8" width="16" height="9" fill={cap} />
          <rect x="35" y="8" width="5" height="9" fill={capDark} />
          {/* Knurled Cap Ribs */}
          <rect x="26" y="9" width="2" height="7" fill="#FFFFFF" fillOpacity="0.3" />
          <rect x="30" y="9" width="2" height="7" fill="#FFFFFF" fillOpacity="0.2" />
          <rect x="34" y="9" width="2" height="7" fill={OL} fillOpacity="0.2" />
        </>
      )}

      {/* Bottle Neck */}
      <rect x="23" y="21" width="18" height="5" fill={OL} />
      <rect x="25" y="21" width="14" height="5" fill={glass} />
      <rect x="35" y="21" width="4" height="5" fill={glassDark} />

      {/* Bottle Shoulders */}
      <rect x="17" y="25" width="30" height="5" fill={OL} />
      <rect x="19" y="26" width="26" height="4" fill={glass} />
      <rect x="40" y="26" width="5" height="4" fill={glassDark} />

      {/* Main Cylinder Body */}
      <rect x="15" y="29" width="34" height="30" fill={OL} />
      <rect x="17" y="30" width="30" height="27" fill={glass} />
      <rect x="41" y="30" width="6" height="27" fill={glassDark} />

      {/* Liquid inside */}
      <rect x="17" y="39" width="30" height="18" fill={liquid} />
      <rect x="17" y="39" width="30" height="3" fill={liquidHi} />
      <rect x="41" y="39" width="6" height="18" fill={OL} fillOpacity="0.22" />

      {/* Front Specular Glass Reflection */}
      <rect x="19" y="31" width="3" height="24" fill="#FFFFFF" fillOpacity="0.4" />
      <rect x="23" y="32" width="1" height="18" fill="#FFFFFF" fillOpacity="0.25" />

      {/* Printed Lab Label Band */}
      <rect x="21" y="36" width="22" height="14" fill={OL} fillOpacity="0.2" />
      <rect x="22" y="37" width="20" height="12" fill={labelBg} />
      <rect x="22" y="37" width="20" height="3" fill={labelStripe} />
      <rect x="25" y="42" width="10" height="2" fill={OL} fillOpacity="0.6" />
      <rect x="25" y="45" width="14" height="2" fill={OL} fillOpacity="0.35" />

      {/* Base Shadow & Highlight */}
      <rect x="17" y="57" width="30" height="2" fill={OL} />
      <rect x="17" y="55" width="30" height="2" fill={OL} fillOpacity="0.18" />

      {/* Active Droplet */}
      {active && dropColor && (
        <g>
          <rect x="30" y="60" width="4" height="3" fill={dropColor} />
        </g>
      )}
    </g>
  );
}

function renderPowderJar64(jarBody: string, jarDark: string, cap: string, labelStripe: string, powder: string) {
  return (
    <g>
      {/* Wide Screw Lid */}
      <rect x="18" y="6" width="28" height="3" fill={OL} />
      <rect x="16" y="9" width="32" height="11" fill={OL} />
      <rect x="18" y="10" width="28" height="9" fill={cap} />
      <rect x="40" y="10" width="6" height="9" fill={OL} fillOpacity="0.25" />
      <rect x="20" y="11" width="2" height="7" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="25" y="11" width="2" height="7" fill="#FFFFFF" fillOpacity="0.2" />
      <rect x="30" y="11" width="2" height="7" fill="#FFFFFF" fillOpacity="0.2" />

      {/* Neck Ring */}
      <rect x="18" y="20" width="28" height="4" fill={OL} />
      <rect x="20" y="21" width="24" height="2" fill={jarDark} />

      {/* Wide Mouth Body */}
      <rect x="13" y="24" width="38" height="35" fill={OL} />
      <rect x="15" y="25" width="34" height="32" fill={jarBody} />
      <rect x="43" y="25" width="6" height="32" fill={jarDark} />

      {/* Granular Powder Mound Visible Lower Half */}
      <rect x="15" y="42" width="34" height="15" fill={powder} />
      <rect x="17" y="40" width="14" height="2" fill={powder} />
      <rect x="33" y="41" width="12" height="1" fill={powder} />
      <rect x="19" y="44" width="2" height="2" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="28" y="47" width="2" height="2" fill={OL} fillOpacity="0.15" />

      {/* Front Specular Highlight */}
      <rect x="17" y="27" width="3" height="27" fill="#FFFFFF" fillOpacity="0.35" />

      {/* Label */}
      <rect x="20" y="30" width="24" height="17" fill={OL} fillOpacity="0.2" />
      <rect x="21" y="31" width="22" height="15" fill="#F8FAFC" />
      <rect x="21" y="31" width="22" height="4" fill={labelStripe} />
      <rect x="24" y="38" width="12" height="2" fill="#1E293B" />
      <rect x="24" y="41" width="16" height="2" fill="#64748B" />
    </g>
  );
}

function renderAntibioticVial64(cap: string, capDark: string, band: string, active: boolean) {
  return (
    <g>
      {/* Flip-off plastic cap */}
      <rect x="24" y="7" width="16" height="6" fill={OL} />
      <rect x="26" y="8" width="12" height="4" fill={cap} />
      <rect x="34" y="8" width="4" height="4" fill={capDark} />
      <rect x="27" y="9" width="4" height="1" fill="#FFFFFF" fillOpacity="0.5" />

      {/* Aluminum Crimp Collar */}
      <rect x="22" y="13" width="20" height="7" fill={OL} />
      <rect x="24" y="14" width="16" height="5" fill="#CBD5E1" />
      <rect x="35" y="14" width="5" height="5" fill="#64748B" />
      <rect x="25" y="15" width="3" height="3" fill="#F8FAFC" />

      {/* Neck & Shoulders */}
      <rect x="23" y="20" width="18" height="5" fill={OL} />
      <rect x="25" y="21" width="14" height="4" fill="#B45309" />
      <rect x="18" y="25" width="28" height="5" fill={OL} />
      <rect x="20" y="26" width="24" height="4" fill="#D97706" />

      {/* Amber Borosilicate Serum Body */}
      <rect x="17" y="29" width="30" height="29" fill={OL} />
      <rect x="19" y="30" width="26" height="26" fill="#D97706" />
      <rect x="39" y="30" width="6" height="26" fill="#92400E" />
      {/* Liquid Volume inside */}
      <rect x="19" y="42" width="26" height="14" fill="#B45309" />
      <rect x="19" y="42" width="26" height="2" fill="#FBBF24" />
      {/* Glossy Glass Streak */}
      <rect x="21" y="31" width="2" height="23" fill="#FEF3C7" fillOpacity="0.65" />

      {/* White Rx Label */}
      <rect x="23" y="34" width="18" height="15" fill="#F8FAFC" />
      <rect x="23" y="34" width="18" height="4" fill={band} />
      <rect x="25" y="40" width="12" height="2" fill="#0F172A" />
      <rect x="25" y="44" width="9" height="2" fill="#64748B" />

      {active && (
        <rect x="29" y="6" width="6" height="2" fill="#34D399" />
      )}
    </g>
  );
}

export const PixelToolSprite64: React.FC<PixelToolSprite64Props> = ({
  id,
  size = 64,
  active = false,
  loopState = 'unsterile',
  fillFraction = 0.55,
  pipetteFillFraction = 0,
  liquidColor = '#D4B475',
  hasTip = true,
  hasInoculum = false,
  isStirring = false,
  className = '',
}) => {
  const clampedFill = Math.max(0, Math.min(0.95, fillFraction));
  const clampedPipFill = Math.max(0, Math.min(1, pipetteFillFraction));

  const renderSprite = () => {
    switch (id) {
      case 'beaker_250': {
        const liqMaxH = 34;
        const liqH = Math.round(clampedFill * liqMaxH);
        const liqY = 55 - liqH;
        return (
          <g>
            {/* Flared Rim & Left Pouring Spout */}
            <rect x="10" y="9" width="44" height="5" fill={OL} />
            <rect x="8" y="10" width="5" height="4" fill={OL} />
            <rect x="11" y="10" width="41" height="3" fill={GLASS_RIM} />
            <rect x="9" y="11" width="3" height="2" fill={GLASS_SPEC} />

            {/* Glass Walls */}
            <rect x="13" y="14" width="38" height="44" fill={OL} />
            <rect x="15" y="14" width="34" height="42" fill={GLASS_BG} />

            {/* Liquid Inside Beaker */}
            {liqH > 0 && (
              <g>
                <rect x="15" y={liqY} width="34" height={liqH} fill={liquidColor} fillOpacity="0.88" />
                <rect x="15" y={liqY} width="34" height="3" fill="#FFFFFF" fillOpacity="0.35" />
                <rect x="43" y={liqY} width="6" height={liqH} fill={OL} fillOpacity="0.22" />
              </g>
            )}

            {/* White PTFE Stir Bar */}
            {isStirring && (
              <rect x="24" y="52" width="16" height="3" fill="#F8FAFC" />
            )}

            {/* Front Glass Specular Reflection */}
            <rect x="17" y="16" width="3" height="38" fill="#FFFFFF" fillOpacity="0.4" />
            <rect x="21" y="18" width="1" height="34" fill="#FFFFFF" fillOpacity="0.2" />

            {/* Enamel mL Graduations */}
            <rect x="33" y="22" width="10" height="2" fill="#E2E8F0" fillOpacity="0.75" />
            <rect x="36" y="29" width="7" height="2" fill="#E2E8F0" fillOpacity="0.65" />
            <rect x="33" y="36" width="10" height="2" fill="#E2E8F0" fillOpacity="0.75" />
            <rect x="36" y="43" width="7" height="2" fill="#E2E8F0" fillOpacity="0.65" />
            <rect x="33" y="50" width="10" height="2" fill="#E2E8F0" fillOpacity="0.75" />

            {/* Thick Borosilicate Base */}
            <rect x="13" y="55" width="38" height="4" fill={OL} />
            <rect x="15" y="55" width="34" height="2" fill={GLASS_EDGE} fillOpacity="0.55" />
          </g>
        );
      }

      case 'flask_250': {
        const liqMaxH = 26;
        const liqH = Math.round(clampedFill * liqMaxH);
        const liqY = 55 - liqH;
        return (
          <g>
            {/* Rolled Neck Collar */}
            <rect x="23" y="6" width="18" height="5" fill={OL} />
            <rect x="24" y="7" width="16" height="3" fill={GLASS_RIM} />
            {/* Cylindrical Neck */}
            <rect x="24" y="11" width="16" height="14" fill={OL} />
            <rect x="26" y="11" width="12" height="14" fill={GLASS_BG} />
            {/* Sloped Conical Body */}
            <rect x="21" y="24" width="22" height="7" fill={OL} />
            <rect x="23" y="25" width="18" height="6" fill={GLASS_BG} />
            <rect x="17" y="30" width="30" height="8" fill={OL} />
            <rect x="19" y="31" width="26" height="7" fill={GLASS_BG} />
            <rect x="12" y="37" width="40" height="10" fill={OL} />
            <rect x="14" y="38" width="36" height="9" fill={GLASS_BG} />
            <rect x="9" y="46" width="46" height="12" fill={OL} />
            <rect x="11" y="47" width="42" height="9" fill={GLASS_BG} />

            {/* Liquid Inside Flask */}
            {liqH > 0 && (
              <g>
                {liqY < 38 && (
                  <rect x="20" y={Math.max(30, liqY)} width="24" height={38 - Math.max(30, liqY)} fill={liquidColor} fillOpacity="0.88" />
                )}
                {liqY < 47 && (
                  <rect x="14" y={Math.max(38, liqY)} width="36" height={47 - Math.max(38, liqY)} fill={liquidColor} fillOpacity="0.88" />
                )}
                <rect x="11" y={Math.max(47, liqY)} width="42" height={56 - Math.max(47, liqY)} fill={liquidColor} fillOpacity="0.9" />
                {/* Meniscus Surface */}
                <rect
                  x={liqY < 38 ? 20 : liqY < 47 ? 14 : 11}
                  y={liqY}
                  width={liqY < 38 ? 24 : liqY < 47 ? 36 : 42}
                  height="2"
                  fill="#FFFFFF"
                  fillOpacity="0.4"
                />
              </g>
            )}

            {isStirring && <rect x="24" y="53" width="16" height="2" fill="#F8FAFC" />}

            {/* Conical Left Specular Highlights */}
            <rect x="27" y="13" width="2" height="11" fill="#FFFFFF" fillOpacity="0.45" />
            <rect x="21" y="31" width="2" height="6" fill="#FFFFFF" fillOpacity="0.38" />
            <rect x="15" y="39" width="2" height="7" fill="#FFFFFF" fillOpacity="0.38" />
            <rect x="13" y="47" width="3" height="7" fill="#FFFFFF" fillOpacity="0.45" />

            {/* White Graduations */}
            <rect x="37" y="36" width="6" height="2" fill="#E2E8F0" fillOpacity="0.7" />
            <rect x="40" y="42" width="7" height="2" fill="#E2E8F0" fillOpacity="0.75" />
            <rect x="43" y="49" width="7" height="2" fill="#E2E8F0" fillOpacity="0.75" />
          </g>
        );
      }

      case 'tube_15': {
        const liqH = Math.round(clampedFill * 28);
        const liqY = 50 - liqH;
        return (
          <g>
            {/* Blue Ribbed Screw Cap */}
            <rect x="21" y="5" width="22" height="10" fill={OL} />
            <rect x="23" y="6" width="18" height="8" fill="#0284C7" />
            <rect x="36" y="6" width="5" height="8" fill="#0369A1" />
            <rect x="25" y="7" width="2" height="6" fill="#38BDF8" />
            <rect x="29" y="7" width="2" height="6" fill="#38BDF8" fillOpacity="0.5" />

            {/* Tube Body */}
            <rect x="22" y="15" width="20" height="36" fill={OL} />
            <rect x="24" y="16" width="16" height="34" fill={GLASS_BG} />

            {/* Broth Fill */}
            {liqH > 0 && (
              <g>
                <rect x="24" y={liqY} width="16" height={liqH} fill={liquidColor} fillOpacity="0.88" />
                <rect x="24" y={liqY} width="16" height="2" fill="#FFFFFF" fillOpacity="0.35" />
              </g>
            )}

            {/* Conical Bottom */}
            <rect x="24" y="51" width="16" height="5" fill={OL} />
            <rect x="26" y="51" width="12" height="3" fill={liqH > 0 ? liquidColor : GLASS_BG} />
            <rect x="27" y="56" width="10" height="4" fill={OL} />
            <rect x="29" y="56" width="6" height="2" fill={liqH > 0 ? liquidColor : GLASS_BG} />

            {/* Glass Highlight & Volume Ticks */}
            <rect x="25" y="18" width="2" height="30" fill="#FFFFFF" fillOpacity="0.38" />
            <rect x="35" y="23" width="4" height="1" fill="#E2E8F0" />
            <rect x="35" y="30" width="4" height="1" fill="#E2E8F0" />
            <rect x="35" y="37" width="4" height="1" fill="#E2E8F0" />
            <rect x="35" y="44" width="4" height="1" fill="#E2E8F0" />
          </g>
        );
      }

      case 'agar_plate': {
        return (
          <g>
            {/* Isometric Dish Bottom Wall */}
            <rect x="8" y="34" width="48" height="12" fill={OL} />
            <rect x="10" y="36" width="44" height="8" fill="#334155" />
            <rect x="14" y="44" width="36" height="5" fill={OL} />
            <rect x="16" y="44" width="32" height="3" fill="#475569" />

            {/* Top Rim & Agar Slab */}
            <rect x="12" y="18" width="40" height="4" fill={OL} />
            <rect x="8" y="22" width="48" height="14" fill={OL} />
            <rect x="14" y="20" width="36" height="3" fill="#CBD5E1" fillOpacity="0.6" />
            <rect x="10" y="23" width="44" height="12" fill="#475569" />

            {/* Solid Agar Gel Disc */}
            <rect x="12" y="24" width="40" height="10" fill={liquidColor} />
            <rect x="16" y="22" width="32" height="2" fill={liquidColor} />
            <rect x="16" y="34" width="32" height="2" fill={OL} fillOpacity="0.22" />

            {/* Specular Lid Reflection */}
            <rect x="15" y="24" width="12" height="2" fill="#FFFFFF" fillOpacity="0.45" />
            <rect x="13" y="26" width="5" height="2" fill="#FFFFFF" fillOpacity="0.28" />

            {/* Inoculation Streak Lines / Colonies */}
            {hasInoculum && (
              <g>
                <rect x="20" y="26" width="14" height="1" fill="#FEF3C7" />
                <rect x="24" y="28" width="16" height="1" fill="#FEF3C7" />
                <rect x="22" y="31" width="12" height="1" fill="#FEF3C7" />
                <rect x="38" y="26" width="2" height="2" fill="#FDE68A" />
                <rect x="42" y="29" width="2" height="2" fill="#FDE68A" />
                <rect x="36" y="31" width="2" height="2" fill="#FDE68A" />
              </g>
            )}
          </g>
        );
      }

      case 'pipette_p1000': {
        const liqH = Math.round(clampedPipFill * 12);
        const pipLiquid = hasInoculum ? '#FBBF24' : liquidColor || '#38BDF8';
        return (
          <g>
            {/* Ergonomic Thumb Plunger Cap (Clean Upright) */}
            <rect x="26" y="2" width="12" height="5" fill={OL} />
            <rect x="28" y="3" width="8" height="3" fill="#0284C7" />
            <rect x="29" y="3" width="4" height="1" fill="#7DD3FC" />
            {/* Plunger Rod */}
            <rect x="29" y="7" width="6" height="4" fill={OL} />
            <rect x="30" y="7" width="4" height="4" fill="#CBD5E1" />

            {/* Curved Finger Support Hook */}
            <rect x="22" y="10" width="22" height="5" fill={OL} />
            <rect x="24" y="11" width="14" height="3" fill="#0369A1" />
            <rect x="38" y="11" width="5" height="3" fill="#0284C7" />
            <rect x="40" y="14" width="4" height="3" fill={OL} />

            {/* Main Contoured Grip Handle */}
            <rect x="25" y="15" width="14" height="16" fill={OL} />
            <rect x="27" y="16" width="10" height="14" fill="#E2E8F0" />
            <rect x="34" y="16" width="3" height="14" fill="#94A3B8" />
            <rect x="28" y="17" width="2" height="12" fill="#FFFFFF" />

            {/* Blue Grip Accent & Digital Volume Window */}
            <rect x="27" y="16" width="10" height="4" fill="#0284C7" />
            <rect x="28" y="21" width="8" height="6" fill="#0F172A" />
            <rect x="29" y="22" width="6" height="4" fill="#064E3B" />
            <rect x="30" y="23" width="4" height="2" fill="#38BDF8" />

            {/* Stainless Tip Ejector Button + Sleeve */}
            <rect x="23" y="23" width="3" height="6" fill={OL} />
            <rect x="24" y="24" width="2" height="4" fill="#38BDF8" />

            {/* Lower Tapered White Shaft */}
            <rect x="27" y="31" width="10" height="10" fill={OL} />
            <rect x="29" y="31" width="6" height="9" fill="#CBD5E1" />
            <rect x="33" y="31" width="2" height="9" fill="#64748B" />
            <rect x="29" y="32" width="2" height="7" fill="#F8FAFC" />

            {/* Nozzle Tip Cone */}
            <rect x="28" y="41" width="8" height="5" fill={OL} />
            <rect x="30" y="41" width="4" height="4" fill="#94A3B8" />

            {/* Mounted P1000 Translucent Blue Tip + Live Suctioned Liquid Meniscus */}
            {hasTip ? (
              <g>
                <rect x="28" y="45" width="8" height="6" fill={OL} />
                <rect x="29" y="46" width="6" height="4" fill="#0284C7" />
                <rect x="29" y="51" width="6" height="6" fill={OL} />
                <rect x="30" y="51" width="4" height="5" fill="#7DD3FC" fillOpacity="0.45" />
                <rect x="30" y="57" width="4" height="5" fill={OL} />
                <rect x="31" y="57" width="2" height="4" fill="#BAE6FD" fillOpacity="0.6" />
                {liqH > 0 && (
                  <g>
                    <rect
                      x="30"
                      y={60 - liqH}
                      width="4"
                      height={Math.min(liqH, 11)}
                      fill={pipLiquid}
                    />
                    <rect
                      x="30"
                      y={60 - liqH}
                      width="4"
                      height="1"
                      fill="#FFFFFF"
                      fillOpacity="0.7"
                    />
                  </g>
                )}
                {active && <rect x="31" y="62" width="2" height="2" fill={pipLiquid} />}
              </g>
            ) : (
              <rect x="30" y="46" width="4" height="2" fill="#475569" />
            )}
          </g>
        );
      }

      case 'wash_bottle': {
        return (
          <g>
            {/* Angled Curved Swan-Neck Spout */}
            <rect x="4" y="9" width="16" height="5" fill={OL} />
            <rect x="6" y="10" width="14" height="3" fill="#E0F2FE" />
            <rect x="18" y="8" width="9" height="6" fill={OL} />
            <rect x="19" y="9" width="7" height="4" fill="#BAE6FD" />
            <rect x="25" y="10" width="6" height="7" fill={OL} />
            <rect x="26" y="11" width="4" height="5" fill="#E0F2FE" />

            {/* Active Water Stream */}
            {active && (
              <g>
                <rect x="2" y="15" width="3" height="6" fill="#38BDF8" />
                <rect x="1" y="23" width="3" height="6" fill="#7DD3FC" />
                <rect x="1" y="31" width="2" height="5" fill="#22D3EE" />
              </g>
            )}

            {/* Blue Screw Cap */}
            <rect x="22" y="16" width="20" height="8" fill={OL} />
            <rect x="24" y="17" width="16" height="6" fill="#0284C7" />
            <rect x="36" y="17" width="4" height="6" fill="#0369A1" />
            <rect x="26" y="18" width="2" height="4" fill="#38BDF8" />

            {/* LDPE Translucent Bottle Body */}
            <rect x="16" y="24" width="32" height="35" fill={OL} />
            <rect x="18" y="25" width="28" height="32" fill="#E0F2FE" />
            <rect x="40" y="25" width="6" height="32" fill="#BAE6FD" />

            {/* Water Inside */}
            <rect x="18" y="38" width="28" height="19" fill="#0EA5E9" fillOpacity="0.72" />
            <rect x="18" y="38" width="28" height="3" fill="#7DD3FC" />

            {/* Printed ddH2O Label Band */}
            <rect x="21" y="31" width="22" height="12" fill="#FFFFFF" />
            <rect x="21" y="31" width="22" height="3" fill="#0284C7" />
            <rect x="24" y="36" width="14" height="2" fill="#0369A1" />
            <rect x="24" y="39" width="10" height="2" fill="#64748B" />
            {/* Specular Edge */}
            <rect x="20" y="27" width="2" height="28" fill="#FFFFFF" fillOpacity="0.65" />
          </g>
        );
      }

      case 'scoop_spatula': {
        return (
          <g>
            {/* Clean Upright Laboratory Micro-Scoopula */}
            {/* Anodized Gripped Handle at Top */}
            <rect x="26" y="3" width="12" height="4" fill={OL} />
            <rect x="25" y="6" width="14" height="17" fill={OL} />
            <rect x="27" y="6" width="10" height="16" fill="#B45309" />
            <rect x="28" y="7" width="4" height="14" fill="#F59E0B" />
            {/* Knurled Grip Bands */}
            <rect x="27" y="10" width="10" height="2" fill="#78350F" />
            <rect x="27" y="14" width="10" height="2" fill="#78350F" />
            <rect x="27" y="18" width="10" height="2" fill="#78350F" />

            {/* Brushed Steel Ferrule Collar */}
            <rect x="26" y="23" width="12" height="5" fill={OL} />
            <rect x="28" y="24" width="8" height="3" fill="#FACC15" />
            <rect x="29" y="24" width="3" height="2" fill="#FEF08A" />

            {/* Straight Stainless Stem */}
            <rect x="28" y="28" width="8" height="12" fill={OL} />
            <rect x="30" y="28" width="4" height="12" fill="#CBD5E1" />
            <rect x="30" y="29" width="2" height="10" fill="#F8FAFC" />

            {/* Polished Concave U-Shaped Scoop Spoon */}
            <rect x="20" y="40" width="24" height="17" fill={OL} />
            <rect x="22" y="55" width="20" height="4" fill={OL} />
            <rect x="22" y="41" width="20" height="14" fill="#CBD5E1" />
            <rect x="24" y="42" width="16" height="11" fill="#94A3B8" />
            <rect x="23" y="42" width="2" height="11" fill="#F8FAFC" />
            <rect x="24" y="53" width="16" height="3" fill="#64748B" />

            {/* Reagent Powder Mound Inside Scoop Bowl */}
            <rect x="25" y="44" width="14" height="8" fill={liquidColor || '#FDE047'} />
            <rect x="27" y="41" width="10" height="4" fill={liquidColor || '#FEF08A'} />
            <rect x="29" y="39" width="6" height="3" fill="#FFFFFF" fillOpacity="0.65" />
            {active && (
              <g>
                <rect x="29" y="59" width="2" height="3" fill={liquidColor || '#FDE047'} />
                <rect x="33" y="61" width="2" height="2" fill="#FEF08A" />
              </g>
            )}
          </g>
        );
      }

      case 'water_jar': {
        const liqH = Math.round(clampedFill * 28);
        const liqY = 56 - liqH;
        return (
          <g>
            {/* Carry Handle & Wide Screw Lid */}
            <rect x="21" y="3" width="22" height="5" fill={OL} />
            <rect x="23" y="4" width="18" height="3" fill="#0369A1" />
            <rect x="19" y="8" width="26" height="9" fill={OL} />
            <rect x="21" y="9" width="22" height="7" fill="#0284C7" />
            <rect x="37" y="9" width="6" height="7" fill="#0369A1" />
            <rect x="23" y="10" width="3" height="5" fill="#7DD3FC" />

            {/* Carboy Shoulders */}
            <rect x="13" y="17" width="38" height="6" fill={OL} />
            <rect x="15" y="18" width="34" height="4" fill="#E0F2FE" />

            {/* Large 1000 mL Borosilicate Reservoir */}
            <rect x="10" y="23" width="44" height="36" fill={OL} />
            <rect x="12" y="24" width="40" height="33" fill="#0F172A" />

            {/* Distilled Water Reservoir Level */}
            {liqH > 0 && (
              <g>
                <rect x="12" y={liqY} width="40" height={liqH} fill="#0EA5E9" fillOpacity="0.82" />
                <rect x="12" y={liqY} width="40" height="3" fill="#BAE6FD" />
                <rect x="44" y={liqY} width="8" height={liqH} fill="#0369A1" fillOpacity="0.45" />
              </g>
            )}

            {/* Glass Highlight & Spigot Valve */}
            <rect x="14" y="26" width="3" height="29" fill="#FFFFFF" fillOpacity="0.42" />
            <rect x="38" y="30" width="8" height="2" fill="#E2E8F0" fillOpacity="0.7" />
            <rect x="40" y="38" width="6" height="2" fill="#E2E8F0" fillOpacity="0.7" />
            <rect x="38" y="46" width="8" height="2" fill="#E2E8F0" fillOpacity="0.7" />

            {/* Blue ddH2O Badge */}
            <rect x="19" y="31" width="16" height="12" fill="#F8FAFC" />
            <rect x="19" y="31" width="16" height="3" fill="#0284C7" />
            <rect x="21" y="36" width="10" height="2" fill="#0F172A" />
            <rect x="21" y="39" width="12" height="2" fill="#38BDF8" />

            {/* Spigot Tap Right */}
            <rect x="52" y="47" width="8" height="6" fill={OL} />
            <rect x="53" y="48" width="6" height="4" fill="#CBD5E1" />
            <rect x="56" y="45" width="3" height="3" fill="#0284C7" />
          </g>
        );
      }

      case 'heating_torch': {
        return (
          <g>
            {/* Clean Upright/Forward Lab Micro-Torch */}
            {/* Top Piezo Igniter Cap & Ergonomic Tank Handle */}
            <rect x="24" y="4" width="16" height="5" fill={OL} />
            <rect x="26" y="5" width="12" height="3" fill="#F97316" />
            <rect x="22" y="9" width="20" height="20" fill={OL} />
            <rect x="24" y="10" width="16" height="18" fill="#1D4ED8" />
            <rect x="35" y="10" width="5" height="18" fill="#1E3A8A" />
            <rect x="25" y="11" width="3" height="15" fill="#60A5FA" />

            {/* Trigger Guard & Grip Ribs */}
            <rect x="19" y="14" width="5" height="9" fill={OL} />
            <rect x="20" y="15" width="3" height="7" fill="#F59E0B" />
            <rect x="26" y="15" width="8" height="2" fill="#0F172A" fillOpacity="0.45" />
            <rect x="26" y="20" width="8" height="2" fill="#0F172A" fillOpacity="0.45" />

            {/* Brass Collar & Torch Barrel */}
            <rect x="25" y="29" width="14" height="5" fill={OL} />
            <rect x="27" y="30" width="10" height="3" fill="#FBBF24" />
            <rect x="27" y="34" width="10" height="10" fill={OL} />
            <rect x="29" y="34" width="6" height="9" fill="#CBD5E1" />
            <rect x="28" y="43" width="8" height="4" fill={OL} />
            <rect x="29" y="44" width="6" height="2" fill="#F59E0B" />

            {/* Intense Blue/Amber Jet Flame When Heating */}
            {active ? (
              <g>
                <rect x="29" y="47" width="6" height="6" fill="#E0F2FE" />
                <rect x="27" y="49" width="10" height="8" fill="#38BDF8" />
                <rect x="28" y="55" width="8" height="6" fill="#FACC15" />
                <rect x="30" y="59" width="4" height="4" fill="#FB923C" />
              </g>
            ) : (
              <rect x="30" y="47" width="4" height="3" fill="#475569" />
            )}
          </g>
        );
      }

      case 'sink_basin': {
        return (
          <g>
            {/* Chrome Gooseneck Faucet */}
            <rect x="27" y="4" width="12" height="4" fill={OL} />
            <rect x="29" y="5" width="8" height="2" fill="#F8FAFC" />
            <rect x="25" y="7" width="5" height="6" fill={OL} />
            <rect x="26" y="8" width="3" height="5" fill="#CBD5E1" />
            <rect x="36" y="7" width="6" height="17" fill={OL} />
            <rect x="37" y="8" width="4" height="15" fill="#E2E8F0" />
            <rect x="39" y="8" width="2" height="15" fill="#94A3B8" />
            {/* Faucet Handles */}
            <rect x="24" y="21" width="6" height="4" fill={OL} />
            <rect x="25" y="22" width="4" height="2" fill="#38BDF8" />
            <rect x="44" y="21" width="6" height="4" fill={OL} />
            <rect x="45" y="22" width="4" height="2" fill="#F43F5E" />

            {/* Water Stream when Active */}
            {active && (
              <g>
                <rect x="26" y="13" width="3" height="18" fill="#38BDF8" />
                <rect x="24" y="30" width="8" height="3" fill="#BAE6FD" />
              </g>
            )}

            {/* Brushed Stainless Steel Sink Rim & Basin */}
            <rect x="6" y="25" width="52" height="33" fill={OL} />
            <rect x="8" y="27" width="48" height="29" fill="#94A3B8" />
            <rect x="10" y="28" width="44" height="3" fill="#E2E8F0" />
            {/* Recessed Dark Steel Bowl */}
            <rect x="12" y="31" width="40" height="21" fill="#334155" />
            <rect x="14" y="33" width="36" height="17" fill="#1E293B" />
            {/* Drain Strainer Grate */}
            <rect x="28" y="39" width="8" height="6" fill="#0F172A" />
            <rect x="30" y="40" width="4" height="4" fill="#64748B" />
            <rect x="31" y="41" width="2" height="2" fill="#020617" />
          </g>
        );
      }

      case 'ice_bucket': {
        return (
          <g>
            {/* Faceted Crushed Ice Cubes Mound */}
            <rect x="16" y="12" width="32" height="14" fill={OL} />
            <rect x="18" y="13" width="28" height="12" fill="#BAE6FD" />
            {/* Individual Crystalline Ice Cubes */}
            <rect x="19" y="14" width="8" height="7" fill="#E0F2FE" />
            <rect x="20" y="15" width="3" height="3" fill="#FFFFFF" />
            <rect x="29" y="11" width="10" height="8" fill={OL} />
            <rect x="30" y="12" width="8" height="7" fill="#7DD3FC" />
            <rect x="31" y="13" width="3" height="3" fill="#E0F2FE" />
            <rect x="39" y="14" width="7" height="7" fill="#38BDF8" />
            <rect x="40" y="15" width="2" height="2" fill="#E0F2FE" />
            <rect x="24" y="17" width="9" height="6" fill="#38BDF8" />
            <rect x="25" y="18" width="4" height="2" fill="#F0F9FF" />

            {/* Insulated Rim Collar */}
            <rect x="11" y="23" width="42" height="7" fill={OL} />
            <rect x="13" y="24" width="38" height="5" fill="#0284C7" />
            <rect x="15" y="25" width="34" height="2" fill="#7DD3FC" />

            {/* Side Carry Grips */}
            <rect x="8" y="26" width="5" height="8" fill={OL} />
            <rect x="9" y="27" width="3" height="6" fill="#0369A1" />
            <rect x="51" y="26" width="5" height="8" fill={OL} />
            <rect x="52" y="27" width="3" height="6" fill="#0369A1" />

            {/* Insulated Tapered Cyan/Navy Ice Bucket Body */}
            <rect x="13" y="30" width="38" height="26" fill={OL} />
            <rect x="15" y="31" width="34" height="23" fill="#0369A1" />
            <rect x="41" y="31" width="8" height="23" fill="#075985" />
            <rect x="17" y="33" width="3" height="19" fill="#38BDF8" fillOpacity="0.45" />

            {/* Cold Condensation Band & Snowflake Emblem */}
            <rect x="23" y="37" width="18" height="12" fill="#0B111E" fillOpacity="0.35" />
            <rect x="31" y="38" width="2" height="10" fill="#E0F2FE" />
            <rect x="27" y="42" width="10" height="2" fill="#E0F2FE" />
            <rect x="29" y="40" width="6" height="6" fill="#7DD3FC" fillOpacity="0.45" />

            {/* Base Foot & Frost Particles when Active */}
            <rect x="15" y="56" width="34" height="4" fill={OL} />
            <rect x="17" y="56" width="30" height="2" fill="#1E293B" />
            {active && (
              <g>
                <rect x="20" y="6" width="3" height="3" fill="#BAE6FD" />
                <rect x="43" y="5" width="3" height="3" fill="#FFFFFF" />
                <rect x="33" y="4" width="2" height="2" fill="#7DD3FC" />
              </g>
            )}
          </g>
        );
      }

      case 'tryptone_jar':
        return renderPowderJar64('#FEF3C7', '#FDE68A', '#B45309', '#D97706', '#E5B95C');

      case 'salts_jar':
        return renderPowderJar64('#E0F2FE', '#BAE6FD', '#0369A1', '#0284C7', '#F8FAFC');

      case 'agar_jar':
        return renderPowderJar64('#F1F5F9', '#CBD5E1', '#047857', '#10B981', '#FDE68A');

      case 'lb_powder_jar':
        return renderPowderJar64('#CBD5E1', '#94A3B8', '#0F172A', '#D97706', '#E5C57B');

      case 'm9_powder_jar':
        return renderPowderJar64('#E0F2FE', '#BAE6FD', '#0284C7', '#0EA5E9', '#F8FAFC');

      case 'macconkey_jar':
        return renderPowderJar64('#E2E8F0', '#94A3B8', '#881337', '#E11D48', '#BE4B5B');

      case 'naoh_conc':
        return renderBottle64({
          glass: '#E0F2FE',
          glassDark: '#38BDF8',
          liquid: '#0284C7',
          liquidHi: '#7DD3FC',
          cap: '#F59E0B',
          capDark: '#B45309',
          labelBg: '#FEF3C7',
          labelStripe: '#D97706',
          dropColor: '#38BDF8',
          active,
        });

      case 'hcl_conc':
        return renderBottle64({
          glass: '#FFE4E6',
          glassDark: '#FB7185',
          liquid: '#BE123C',
          liquidHi: '#FDA4AF',
          cap: '#FACC15',
          capDark: '#CA8A04',
          labelBg: '#FEF2F2',
          labelStripe: '#DC2626',
          dropColor: '#FB7185',
          active,
        });

      case 'pbs_conc':
        return renderBottle64({
          glass: '#EDE9FE',
          glassDark: '#C4B5FD',
          liquid: '#6D28D9',
          liquidHi: '#C4B5FD',
          cap: '#5B21B6',
          capDark: '#3B0764',
          labelBg: '#F5F3FF',
          labelStripe: '#7C3AED',
          dropColor: '#A78BFA',
          active,
        });

      case 'glucose_vial':
        return renderBottle64({
          glass: '#DCFCE7',
          glassDark: '#86EFAC',
          liquid: '#10B981',
          liquidHi: '#6EE7B7',
          cap: '#059669',
          capDark: '#065F46',
          labelBg: '#F8FAFC',
          labelStripe: '#10B981',
          active,
          dropColor: '#34D399',
        });

      case 'tryptone_bottle':
        return renderBottle64({
          glass: '#FEF3C7',
          glassDark: '#FDE68A',
          liquid: '#D97706',
          liquidHi: '#FBBF24',
          cap: '#B45309',
          capDark: '#78350F',
          labelBg: '#FFFBEB',
          labelStripe: '#F59E0B',
          active,
          dropColor: '#FBBF24',
        });

      case 'pbs_bottle':
        return renderBottle64({
          glass: '#EDE9FE',
          glassDark: '#C4B5FD',
          liquid: '#8B5CF6',
          liquidHi: '#C4B5FD',
          cap: '#6D28D9',
          capDark: '#4C1D95',
          labelBg: '#F8FAFC',
          labelStripe: '#7C3AED',
          active,
          dropColor: '#A78BFA',
        });

      case 'naoh_dropper':
        return renderBottle64({
          glass: '#E0F2FE',
          glassDark: '#7DD3FC',
          liquid: '#0EA5E9',
          liquidHi: '#BAE6FD',
          cap: '#0284C7',
          capDark: '#075985',
          labelBg: '#F0F9FF',
          labelStripe: '#0284C7',
          hasDropperBulb: true,
          dropColor: '#38BDF8',
          active,
        });

      case 'hcl_dropper':
        return renderBottle64({
          glass: '#FFE4E6',
          glassDark: '#FDA4AF',
          liquid: '#E11D48',
          liquidHi: '#FDA4AF',
          cap: '#BE123C',
          capDark: '#881337',
          labelBg: '#FFF1F2',
          labelStripe: '#E11D48',
          hasDropperBulb: true,
          dropColor: '#FB7185',
          active,
        });

      case 'ph_meter': {
        return (
          <g>
            {/* Handheld Meter Body */}
            <rect x="20" y="6" width="24" height="26" fill={OL} />
            <rect x="22" y="8" width="20" height="22" fill="#334155" />
            <rect x="38" y="8" width="4" height="22" fill="#1E293B" />
            {/* Backlit LCD Display */}
            <rect x="25" y="11" width="14" height="10" fill="#0F172A" />
            <rect x="26" y="12" width="12" height="8" fill={active ? '#064E3B' : '#022C22'} />
            <rect x="28" y="14" width="8" height="4" fill="#34D399" />
            {/* Calibration Buttons */}
            <rect x="26" y="24" width="4" height="3" fill="#38BDF8" />
            <rect x="34" y="24" width="4" height="3" fill="#F59E0B" />

            {/* Probe Cable Collar */}
            <rect x="28" y="32" width="8" height="5" fill={OL} />
            <rect x="30" y="32" width="4" height="4" fill="#475569" />

            {/* Stainless & Glass Electrode Stem */}
            <rect x="27" y="37" width="10" height="16" fill={OL} />
            <rect x="29" y="37" width="6" height="15" fill="#CBD5E1" />
            <rect x="33" y="37" width="2" height="15" fill="#64748B" />
            {/* Glass pH Sensing Bulb */}
            <rect x="28" y="53" width="8" height="7" fill={OL} />
            <rect x="30" y="54" width="4" height="5" fill="#67E8F9" />
            <rect x="30" y="55" width="2" height="2" fill="#FFFFFF" />
          </g>
        );
      }

      case 'ab_ampicillin':
        return renderAntibioticVial64('#38BDF8', '#0284C7', '#0EA5E9', active);
      case 'ab_kanamycin':
        return renderAntibioticVial64('#34D399', '#059669', '#10B981', active);
      case 'ab_chloramphenicol':
        return renderAntibioticVial64('#C084FC', '#7E22CE', '#9333EA', active);
      case 'ab_ciprofloxacin':
        return renderAntibioticVial64('#FB7185', '#BE123C', '#E11D48', active);

      case 'bunsen_burner': {
        return (
          <g>
            {/* Animated Outer & Inner Flame when Lit */}
            {active && (
              <g>
                <rect x="29" y="2" width="6" height="6" fill="#FDE047" />
                <rect x="26" y="7" width="12" height="10" fill="#FB923C" />
                <rect x="28" y="10" width="8" height="11" fill="#FACC15" />
                <rect x="29" y="13" width="6" height="9" fill="#38BDF8" />
                <rect x="30" y="16" width="4" height="6" fill="#E0F2FE" />
              </g>
            )}

            {/* Brass Burner Nozzle & Ribbed Barrel */}
            <rect x="25" y="22" width="14" height="5" fill={OL} />
            <rect x="27" y="23" width="10" height="3" fill="#FBBF24" />
            <rect x="26" y="27" width="12" height="20" fill={OL} />
            <rect x="28" y="27" width="8" height="20" fill="#D97706" />
            <rect x="29" y="28" width="2" height="18" fill="#FDE68A" />
            <rect x="34" y="28" width="2" height="18" fill="#92400E" />

            {/* Air Collar Sleeve */}
            <rect x="23" y="42" width="18" height="6" fill={OL} />
            <rect x="25" y="43" width="14" height="4" fill="#F59E0B" />
            <rect x="30" y="44" width="4" height="2" fill={OL} />

            {/* Gas Barb Inlet (Right) */}
            <rect x="41" y="49" width="11" height="5" fill={OL} />
            <rect x="41" y="50" width="9" height="3" fill="#B45309" />

            {/* Stepped Cast-Iron Hexagonal Base */}
            <rect x="14" y="48" width="36" height="6" fill={OL} />
            <rect x="16" y="49" width="32" height="4" fill="#475569" />
            <rect x="10" y="54" width="44" height="6" fill={OL} />
            <rect x="12" y="55" width="40" height="4" fill="#334155" />
            <rect x="14" y="55" width="14" height="2" fill="#64748B" />
          </g>
        );
      }

      case 'loop_nichrome': {
        const wire =
          loopState === 'hot'
            ? '#FB7185'
            : loopState === 'cool_sterile'
            ? '#67E8F9'
            : loopState === 'loaded'
            ? '#34D399'
            : '#CBD5E1';
        const tipGlow =
          loopState === 'hot'
            ? '#FDE047'
            : loopState === 'loaded'
            ? '#FDE047'
            : loopState === 'cool_sterile'
            ? '#E0F2FE'
            : '#F8FAFC';

        return (
          <g>
            {/* Clean Upright Hexagonal Insulated Lab Handle */}
            <rect x="27" y="3" width="10" height="4" fill={OL} />
            <rect x="26" y="6" width="12" height="19" fill={OL} />
            <rect x="28" y="6" width="8" height="18" fill="#0284C7" />
            <rect x="29" y="7" width="3" height="16" fill="#38BDF8" />
            <rect x="33" y="7" width="3" height="16" fill="#0369A1" />
            {/* Ribbed Grip Rings */}
            <rect x="28" y="10" width="8" height="2" fill="#075985" />
            <rect x="28" y="15" width="8" height="2" fill="#075985" />
            <rect x="28" y="20" width="8" height="2" fill="#075985" />

            {/* Knurled Brass Collet Chuck */}
            <rect x="27" y="25" width="10" height="6" fill={OL} />
            <rect x="29" y="26" width="6" height="4" fill="#FACC15" />
            <rect x="29" y="26" width="3" height="3" fill="#FEF08A" />

            {/* Straight Thin Nichrome Wire Shaft */}
            <rect x="30" y="31" width="4" height="15" fill={OL} />
            <rect x="31" y="31" width="2" height="15" fill={wire} />

            {/* Crisp Calibrated Circular Wire Loop Ring at Bottom */}
            <rect x="24" y="45" width="16" height="16" fill={OL} />
            <rect x="26" y="47" width="12" height="12" fill={wire} />
            <rect
              x="29"
              y="50"
              width="6"
              height="6"
              fill={
                loopState === 'loaded'
                  ? '#34D399'
                  : loopState === 'hot'
                  ? '#F59E0B'
                  : '#090D16'
              }
            />
            <rect x="27" y="48" width="4" height="3" fill={tipGlow} />
          </g>
        );
      }

      case 'tip_box': {
        return (
          <g>
            {/* Hinged Clear Polycarbonate Lid (Open Back) */}
            <rect x="12" y="10" width="40" height="14" fill={OL} />
            <rect x="14" y="12" width="36" height="10" fill="#BAE6FD" fillOpacity="0.45" />
            <rect x="16" y="13" width="12" height="2" fill="#FFFFFF" fillOpacity="0.5" />

            {/* Blue Pipette Tip Rack Tray */}
            <rect x="8" y="24" width="48" height="24" fill={OL} />
            <rect x="10" y="26" width="44" height="20" fill="#0284C7" />
            <rect x="12" y="28" width="40" height="14" fill="#0369A1" />

            {/* Grid of Sterile Tips */}
            {[0, 1, 2, 3, 4].map((col) =>
              [0, 1, 2].map((row) => (
                <g key={`${col}-${row}`}>
                  <rect
                    x={15 + col * 8}
                    y={29 + row * 4}
                    width="4"
                    height="3"
                    fill={active ? '#7DD3FC' : '#E0F2FE'}
                  />
                </g>
              ))
            )}

            {/* Lower Clear Skirt */}
            <rect x="10" y="48" width="44" height="10" fill={OL} />
            <rect x="12" y="49" width="40" height="7" fill="#1E293B" />
            <rect x="14" y="51" width="16" height="2" fill="#38BDF8" fillOpacity="0.4" />
          </g>
        );
      }

      case 'vortex_mixer': {
        return (
          <g>
            {/* Black Rubber Cup Head */}
            <rect x="21" y="10" width="22" height="10" fill={OL} />
            <rect x="23" y="11" width="18" height="7" fill="#1E293B" />
            <rect x="25" y="12" width="14" height="3" fill={active ? '#22D3EE' : '#475569'} />
            {/* Steel Eccentric Collar */}
            <rect x="26" y="20" width="12" height="5" fill={OL} />
            <rect x="28" y="20" width="8" height="4" fill="#94A3B8" />

            {/* Cast-Metal Sloped Housing */}
            <rect x="11" y="25" width="42" height="31" fill={OL} />
            <rect x="13" y="27" width="38" height="27" fill="#334155" />
            <rect x="13" y="27" width="38" height="7" fill="#475569" />
            <rect x="44" y="27" width="7" height="27" fill="#1E293B" />

            {/* Speed Dial & Power LED */}
            <rect x="18" y="38" width="10" height="10" fill={OL} />
            <rect x="20" y="40" width="6" height="6" fill="#CBD5E1" />
            <rect x="22" y="41" width="2" height="3" fill="#0F172A" />
            <rect x="33" y="40" width="12" height="6" fill="#0F172A" />
            <rect x="35" y="42" width="4" height="2" fill={active ? '#34D399' : '#F59E0B'} />
          </g>
        );
      }

      case 'biohazard_bin': {
        return (
          <g>
            {/* Hinged Disposal Lid */}
            <rect x="12" y="10" width="40" height="10" fill={OL} />
            <rect x="14" y="12" width="36" height="6" fill="#E11D48" />
            <rect x="21" y="13" width="22" height="3" fill="#881337" />

            {/* Tapered Red Container Body */}
            <rect x="14" y="20" width="36" height="38" fill={OL} />
            <rect x="16" y="22" width="32" height="34" fill="#BE123C" />
            <rect x="40" y="22" width="8" height="34" fill="#881337" />
            <rect x="18" y="23" width="3" height="31" fill="#FB7185" fillOpacity="0.45" />

            {/* Yellow Biohazard Emblem */}
            <rect x="25" y="30" width="14" height="14" fill="#FACC15" fillOpacity="0.18" />
            <rect x="29" y="31" width="6" height="4" fill="#FACC15" />
            <rect x="25" y="37" width="5" height="5" fill="#FACC15" />
            <rect x="34" y="37" width="5" height="5" fill="#FACC15" />
            <rect x="30" y="36" width="4" height="4" fill="#BE123C" />
          </g>
        );
      }

      case 'autoclave_unit': {
        return (
          <g>
            {/* Brushed Steel Housing */}
            <rect x="8" y="10" width="48" height="48" fill={OL} />
            <rect x="10" y="12" width="44" height="44" fill="#64748B" />
            <rect x="46" y="12" width="8" height="44" fill="#475569" />
            <rect x="12" y="13" width="34" height="3" fill="#94A3B8" />

            {/* Top Control Header & Pressure Gauge */}
            <rect x="14" y="17" width="36" height="8" fill="#1E293B" />
            <rect x="17" y="19" width="10" height="4" fill={active ? '#10B981' : '#F59E0B'} />
            <rect x="31" y="19" width="8" height="4" fill="#0F172A" />
            <rect x="42" y="18" width="6" height="6" fill="#F8FAFC" />
            <rect x="45" y="19" width="2" height="2" fill="#EF4444" />

            {/* Circular Chamber Door & Wheel */}
            <rect x="16" y="28" width="32" height="24" fill={OL} />
            <rect x="18" y="30" width="28" height="20" fill="#334155" />
            <rect x="22" y="33" width="20" height="14" fill="#475569" />
            <rect x="29" y="37" width="6" height="6" fill="#CBD5E1" />
            <rect x="25" y="39" width="14" height="2" fill="#E2E8F0" />
            <rect x="31" y="34" width="2" height="12" fill="#E2E8F0" />
          </g>
        );
      }

      case 'bacterial_stock': {
        return (
          <g>
            {/* Amber/Purple Cap */}
            <rect x="21" y="5" width="22" height="10" fill={OL} />
            <rect x="23" y="6" width="18" height="8" fill={active ? '#10B981' : '#F59E0B'} />
            <rect x="36" y="6" width="5" height="8" fill={OL} fillOpacity="0.25" />

            {/* Frosted Tube */}
            <rect x="21" y="15" width="22" height="42" fill={OL} />
            <rect x="23" y="16" width="18" height="39" fill="#0F172A" />

            {/* Turbid Bacterial Broth */}
            <rect x="23" y="27" width="18" height="28" fill="#D4B475" />
            <rect x="23" y="27" width="18" height="3" fill="#FEF08A" />
            <rect x="25" y="35" width="2" height="2" fill="#FFFFFF" fillOpacity="0.5" />
            <rect x="33" y="41" width="2" height="2" fill="#FFFFFF" fillOpacity="0.4" />
            {/* Settled Cell Pellet */}
            <rect x="25" y="51" width="14" height="4" fill="#FEF3C7" />
            <rect x="25" y="18" width="2" height="34" fill="#FFFFFF" fillOpacity="0.3" />
          </g>
        );
      }

      case 'heating_stand': {
        return (
          <g>
            {/* Ceramic-Center Wire Gauze Support Plate */}
            <rect x="8" y="18" width="48" height="6" fill={OL} />
            <rect x="10" y="19" width="44" height="4" fill="#94A3B8" />
            <rect x="18" y="19" width="28" height="3" fill="#E2E8F0" />
            {/* Heat glow under gauze when flame is ON */}
            {active && (
              <rect x="20" y="18" width="24" height="2" fill="#FB923C" fillOpacity="0.8" />
            )}

            {/* Tripod Cast-Iron Legs (Left, Center-Back, Right) */}
            <rect x="12" y="24" width="6" height="34" fill={OL} />
            <rect x="13" y="24" width="4" height="33" fill="#475569" />
            <rect x="11" y="55" width="8" height="4" fill="#334155" />

            <rect x="46" y="24" width="6" height="34" fill={OL} />
            <rect x="47" y="24" width="4" height="33" fill="#475569" />
            <rect x="45" y="55" width="8" height="4" fill="#334155" />

            {/* Nested Bunsen Burner Flame Underneath Gauze */}
            {active && (
              <g>
                <rect x="24" y="24" width="16" height="6" fill="#FB923C" fillOpacity="0.9" />
                <rect x="27" y="25" width="10" height="7" fill="#FACC15" />
                <rect x="29" y="28" width="6" height="7" fill="#38BDF8" />
                <rect x="30" y="31" width="4" height="4" fill="#E0F2FE" />
              </g>
            )}

            {/* Brass Burner Barrel */}
            <rect x="27" y="34" width="10" height="5" fill={OL} />
            <rect x="28" y="35" width="8" height="3" fill="#FBBF24" />
            <rect x="28" y="39" width="8" height="12" fill={OL} />
            <rect x="29" y="39" width="6" height="12" fill="#D97706" />
            <rect x="30" y="40" width="2" height="10" fill="#FDE68A" />

            {/* Gas Barb & Weighted Base */}
            <rect x="36" y="52" width="10" height="4" fill={OL} />
            <rect x="37" y="53" width="8" height="2" fill="#B45309" />
            <rect x="20" y="51" width="24" height="6" fill={OL} />
            <rect x="22" y="52" width="20" height="4" fill="#334155" />
            <rect x="18" y="56" width="28" height="4" fill={OL} />
            <rect x="20" y="57" width="24" height="2" fill="#1E293B" />
          </g>
        );
      }

      case 'glass_slide': {
        const smearHex = liquidColor ?? (active ? '#7C3AED' : '#94A3B8');
        return (
          <g>
            {/* Isometric-angled 75x25mm Glass Microscope Slide */}
            <rect x="4" y="22" width="56" height="22" fill={OL} />
            <rect x="6" y="24" width="52" height="18" fill="#E0F2FE" fillOpacity="0.88" />
            <rect x="6" y="38" width="52" height="4" fill="#7DD3FC" fillOpacity="0.55" />
            {/* Top Bevel Glint */}
            <rect x="8" y="25" width="48" height="2" fill="#FFFFFF" fillOpacity="0.7" />
            {/* Frosted Specimen ID End (Left) */}
            <rect x="6" y="24" width="14" height="18" fill="#CBD5E1" />
            <rect x="8" y="27" width="9" height="2" fill="#64748B" />
            <rect x="8" y="31" width="7" height="2" fill="#94A3B8" />
            <rect x="8" y="35" width="10" height="2" fill="#64748B" />
            {/* Specimen Smear Oval + Oil Sheen */}
            <rect x="28" y="29" width="16" height="8" fill={smearHex} fillOpacity={active ? 0.85 : 0.45} />
            <rect x="31" y="31" width="10" height="4" fill="#FFFFFF" fillOpacity="0.25" />
          </g>
        );
      }

      case 'stain_cv':
        return renderBottle64({
          glass: '#EDE9FE',
          glassDark: '#A78BFA',
          liquid: '#6D28D9',
          liquidHi: '#A78BFA',
          cap: '#4C1D95',
          capDark: '#2E1065',
          labelBg: '#F5F3FF',
          labelStripe: '#7C3AED',
          hasDropperBulb: true,
          dropColor: '#8B5CF6',
          active,
        });

      case 'stain_iodine':
        return renderBottle64({
          glass: '#FEF3C7',
          glassDark: '#D97706',
          liquid: '#92400E',
          liquidHi: '#D97706',
          cap: '#78350F',
          capDark: '#451A03',
          labelBg: '#FFFBEB',
          labelStripe: '#B45309',
          hasDropperBulb: true,
          dropColor: '#D97706',
          active,
        });

      case 'stain_ethanol':
        return renderBottle64({
          glass: '#E0F2FE',
          glassDark: '#7DD3FC',
          liquid: '#0EA5E9',
          liquidHi: '#BAE6FD',
          cap: '#E2E8F0',
          capDark: '#94A3B8',
          labelBg: '#F8FAFC',
          labelStripe: '#0284C7',
          hasDropperBulb: false,
          dropColor: '#BAE6FD',
          active,
        });

      case 'stain_safranin':
        return renderBottle64({
          glass: '#FFE4E6',
          glassDark: '#FDA4AF',
          liquid: '#E11D48',
          liquidHi: '#FB7185',
          cap: '#9F1239',
          capDark: '#881337',
          labelBg: '#FFF1F2',
          labelStripe: '#E11D48',
          hasDropperBulb: true,
          dropColor: '#FB7185',
          active,
        });

      case 'immersion_oil':
        return renderBottle64({
          glass: '#FEF9C3',
          glassDark: '#FDE047',
          liquid: '#CA8A04',
          liquidHi: '#FACC15',
          cap: '#1E293B',
          capDark: '#0F172A',
          labelBg: '#FEFCE8',
          labelStripe: '#EAB308',
          hasDropperBulb: true,
          dropColor: '#FACC15',
          active,
        });
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      shapeRendering="crispEdges"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      {renderSprite()}
    </svg>
  );
};
