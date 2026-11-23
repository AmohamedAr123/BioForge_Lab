import React from 'react';

export type PixelSpriteId =
  | 'scoop'
  | 'balance'
  | 'wash_bottle'
  | 'cylinder'
  | 'stirrer'
  | 'autoclave'
  | 'ph_probe'
  | 'naoh_dropper'
  | 'hcl_dropper'
  | 'antibiotic_vial'
  | 'flask'
  | 'bunsen'
  | 'loop_unsterile'
  | 'loop_hot'
  | 'loop_cool'
  | 'loop_loaded'
  | 'pipette_p2'
  | 'pipette_p20'
  | 'pipette_p200'
  | 'pipette_p1000'
  | 'tip_sterile'
  | 'tip_used'
  | 'vortex'
  | 'biohazard'
  | 'culture_tube'
  | 'ice_bucket'
  | 'heat_block'
  | 'spin_column'
  | 'etoh_bottle'
  | 'rotor_tube'
  | 'pcr_tube'
  | 'taq_tube'
  | 'enzyme_vial'
  | 'coverslip'
  | 'stain_cv'
  | 'stain_iodine'
  | 'stain_ethanol'
  | 'stain_safranin'
  | 'immersion_oil'
  | 'glass_slide'
  | 'cuvette_blank'
  | 'cuvette_sample'
  | 'kimwipe'
  | 'nanodrop'
  | 'centrifuge';

interface PixelToolSpriteProps {
  id: PixelSpriteId;
  size?: number;
  active?: boolean;
  className?: string;
}

const OUTLINE = '#0B0F1A';

function renderBottle(bodyColor: string, darkColor: string, capColor: string, labelColor: string) {
  return (
    <g>
      {/* Cap & Dropper Nozzle */}
      <rect x="7" y="1" width="2" height="1" fill={OUTLINE} />
      <rect x="6" y="2" width="4" height="1" fill={OUTLINE} />
      <rect x="7" y="2" width="2" height="1" fill="#E2E8F0" />
      <rect x="5" y="3" width="6" height="3" fill={OUTLINE} />
      <rect x="6" y="3" width="4" height="2" fill={capColor} />
      {/* Bottle Shoulders & Body */}
      <rect x="4" y="6" width="8" height="9" fill={OUTLINE} />
      <rect x="5" y="6" width="6" height="8" fill={bodyColor} />
      <rect x="9" y="7" width="2" height="7" fill={darkColor} />
      {/* Highlight */}
      <rect x="5" y="7" width="1" height="6" fill="#FFFFFF" fillOpacity="0.4" />
      {/* Label Band */}
      <rect x="6" y="8" width="4" height="4" fill={labelColor} />
      <rect x="7" y="9" width="2" height="2" fill={OUTLINE} fillOpacity="0.45" />
    </g>
  );
}

function renderPipette(plungerColor: string, hasTip: boolean) {
  return (
    <g>
      {/* Diagonal Plunger Top (Right-Upper) */}
      <rect x="12" y="1" width="3" height="2" fill={OUTLINE} />
      <rect x="13" y="1" width="2" height="1" fill={plungerColor} />
      {/* Grip Handle */}
      <rect x="9" y="3" width="4" height="4" fill={OUTLINE} />
      <rect x="10" y="3" width="2" height="3" fill={plungerColor} />
      {/* Barrel Shaft */}
      <rect x="7" y="5" width="4" height="4" fill={OUTLINE} />
      <rect x="8" y="6" width="2" height="2" fill="#E2E8F0" />
      <rect x="5" y="7" width="4" height="4" fill={OUTLINE} />
      <rect x="6" y="8" width="2" height="2" fill="#CBD5E1" />
      {/* Lower Cone */}
      <rect x="4" y="9" width="3" height="3" fill={OUTLINE} />
      <rect x="4" y="10" width="2" height="1" fill="#94A3B8" />
      {/* Sterile Plastic Tip */}
      {hasTip && (
        <g>
          <rect x="2" y="11" width="3" height="3" fill={OUTLINE} />
          <rect x="3" y="11" width="1" height="2" fill="#FDE047" />
          <rect x="1" y="13" width="2" height="2" fill={OUTLINE} />
          <rect x="2" y="13" width="1" height="1" fill="#FEF08A" />
        </g>
      )}
    </g>
  );
}

function renderLoop(tipState: 'unsterile' | 'hot' | 'cool' | 'loaded') {
  const wireColor =
    tipState === 'hot'
      ? '#FB7185'
      : tipState === 'cool'
      ? '#67E8F9'
      : tipState === 'loaded'
      ? '#34D399'
      : '#94A3B8';
  const glowColor =
    tipState === 'hot' ? '#FACC15' : tipState === 'loaded' ? '#FDE047' : wireColor;

  return (
    <g>
      {/* Insulated Handle (Upper-Right to Center) */}
      <rect x="12" y="1" width="3" height="3" fill={OUTLINE} />
      <rect x="10" y="3" width="3" height="3" fill={OUTLINE} />
      <rect x="8" y="5" width="3" height="3" fill={OUTLINE} />
      <rect x="13" y="2" width="1" height="1" fill="#0284C7" />
      <rect x="11" y="4" width="1" height="1" fill="#38BDF8" />
      <rect x="9" y="6" width="1" height="1" fill="#0284C7" />
      {/* Chuck */}
      <rect x="6" y="7" width="3" height="3" fill={OUTLINE} />
      <rect x="7" y="8" width="1" height="1" fill="#CBD5E1" />
      {/* Nichrome Wire & Loop Ring */}
      <rect x="4" y="9" width="3" height="2" fill={wireColor} />
      <rect x="1" y="10" width="4" height="4" fill={OUTLINE} />
      <rect x="2" y="11" width="2" height="2" fill={wireColor} />
      <rect x="2" y="12" width="1" height="1" fill={glowColor} />
    </g>
  );
}

export const PixelToolSprite: React.FC<PixelToolSpriteProps> = ({
  id,
  size = 40,
  active = false,
  className = '',
}) => {
  const renderSprite = () => {
    switch (id) {
      case 'scoop':
        return (
          <g>
            {/* Wood/Dark Handle */}
            <rect x="10" y="1" width="5" height="4" fill={OUTLINE} />
            <rect x="11" y="2" width="3" height="2" fill="#D97706" />
            <rect x="8" y="4" width="4" height="3" fill={OUTLINE} />
            <rect x="9" y="5" width="2" height="1" fill="#F59E0B" />
            {/* Steel Collar */}
            <rect x="6" y="6" width="3" height="3" fill={OUTLINE} />
            <rect x="7" y="7" width="1" height="1" fill="#FACC15" />
            {/* Broad Putty/Weighing Blade */}
            <rect x="1" y="8" width="7" height="7" fill={OUTLINE} />
            <rect x="2" y="9" width="5" height="5" fill="#CBD5E1" />
            <rect x="2" y="12" width="4" height="2" fill="#94A3B8" />
            {/* Tan Media Powder Mound */}
            <rect x="2" y="9" width="3" height="2" fill="#FDE68A" />
            <rect x="3" y="8" width="2" height="1" fill="#FEF3C7" />
          </g>
        );

      case 'balance':
        return (
          <g>
            {/* Base */}
            <rect x="1" y="9" width="14" height="6" fill={OUTLINE} />
            <rect x="2" y="10" width="12" height="4" fill="#334155" />
            <rect x="3" y="11" width="10" height="2" fill="#0F172A" />
            {/* Digital LED Readout */}
            <rect x="4" y="11" width="6" height="2" fill="#10B981" />
            {/* Stainless Weighing Pan & Boat */}
            <rect x="3" y="6" width="10" height="3" fill={OUTLINE} />
            <rect x="4" y="7" width="8" height="1" fill="#E2E8F0" />
            <rect x="5" y="5" width="6" height="2" fill="#F8FAFC" />
            {active && <rect x="6" y="4" width="4" height="2" fill="#FDE68A" />}
          </g>
        );

      case 'wash_bottle':
        return (
          <g>
            {/* Curved Angled Spout */}
            <rect x="1" y="2" width="5" height="2" fill={OUTLINE} />
            <rect x="2" y="2" width="4" height="1" fill="#E0F2FE" />
            {active && (
              <g>
                <rect x="1" y="5" width="1" height="2" fill="#38BDF8" />
                <rect x="0" y="8" width="1" height="2" fill="#7DD3FC" />
              </g>
            )}
            {/* Cap */}
            <rect x="6" y="2" width="5" height="3" fill={OUTLINE} />
            <rect x="7" y="3" width="3" height="1" fill="#0284C7" />
            {/* Translucent Bottle */}
            <rect x="5" y="5" width="7" height="10" fill={OUTLINE} />
            <rect x="6" y="6" width="5" height="8" fill="#E0F2FE" />
            <rect x="6" y="9" width="5" height="5" fill="#38BDF8" />
            <rect x="9" y="6" width="2" height="8" fill="#0284C7" fillOpacity="0.4" />
          </g>
        );

      case 'cylinder':
        return (
          <g>
            <rect x="5" y="1" width="6" height="13" fill={OUTLINE} />
            <rect x="6" y="2" width="4" height="11" fill="#1E293B" />
            {/* Water Fill */}
            <rect x="6" y={active ? 5 : 8} width="4" height={active ? 8 : 5} fill="#0EA5E9" />
            <rect x="6" y={active ? 5 : 8} width="4" height="1" fill="#7DD3FC" />
            {/* Graduations */}
            <rect x="6" y="4" width="2" height="1" fill="#94A3B8" />
            <rect x="6" y="7" width="2" height="1" fill="#94A3B8" />
            <rect x="6" y="10" width="2" height="1" fill="#94A3B8" />
            {/* Foot Base */}
            <rect x="3" y="13" width="10" height="2" fill={OUTLINE} />
            <rect x="4" y="14" width="8" height="1" fill="#64748B" />
          </g>
        );

      case 'stirrer':
        return (
          <g>
            {/* Beaker on top */}
            <rect x="4" y="2" width="8" height="7" fill={OUTLINE} />
            <rect x="5" y="3" width="6" height="5" fill="#0F172A" />
            <rect x="5" y="4" width="6" height="4" fill="#22D3EE" fillOpacity="0.65" />
            {/* Spinning PTFE Stir Bar */}
            <rect x={active ? 6 : 7} y="7" width={active ? 4 : 2} height="1" fill="#FFFFFF" />
            {/* Stir Plate Body */}
            <rect x="2" y="9" width="12" height="6" fill={OUTLINE} />
            <rect x="3" y="10" width="10" height="4" fill="#475569" />
            <rect x="4" y="11" width="3" height="2" fill={active ? '#10B981' : '#F59E0B'} />
            <rect x="9" y="11" width="2" height="2" fill="#CBD5E1" />
          </g>
        );

      case 'autoclave':
        return (
          <g>
            <rect x="2" y="2" width="12" height="13" fill={OUTLINE} />
            <rect x="3" y="3" width="10" height="11" fill="#64748B" />
            {/* Pressure Chamber Door */}
            <rect x="4" y="5" width="8" height="7" fill="#334155" />
            <rect x="5" y="6" width="6" height="5" fill="#475569" />
            {/* Analog Dial & Latch */}
            <rect x="10" y="3" width="2" height="2" fill="#F8FAFC" />
            <rect x="11" y="3" width="1" height="1" fill="#EF4444" />
            <rect x="4" y="3" width="3" height="1" fill={active ? '#10B981' : '#F59E0B'} />
            <rect x="7" y="8" width="2" height="1" fill="#CBD5E1" />
          </g>
        );

      case 'ph_probe':
        return (
          <g>
            <rect x="7" y="1" width="4" height="3" fill={OUTLINE} />
            <rect x="8" y="2" width="2" height="1" fill="#38BDF8" />
            <rect x="6" y="4" width="4" height="7" fill={OUTLINE} />
            <rect x="7" y="4" width="2" height="6" fill="#475569" />
            <rect x="7" y="11" width="2" height="3" fill={OUTLINE} />
            <rect x="7" y="12" width="2" height="1" fill="#67E8F9" />
          </g>
        );

      case 'naoh_dropper':
        return renderBottle('#38BDF8', '#0284C7', '#0EA5E9', '#E0F2FE');

      case 'hcl_dropper':
        return renderBottle('#FB7185', '#E11D48', '#F43F5E', '#FFE4E6');

      case 'antibiotic_vial':
        return renderBottle('#F59E0B', '#B45309', '#CBD5E1', '#FEF3C7');

      case 'flask':
        return (
          <g>
            {/* Neck */}
            <rect x="6" y="1" width="4" height="4" fill={OUTLINE} />
            <rect x="7" y="2" width="2" height="3" fill="#CBD5E1" />
            {/* Body */}
            <rect x="4" y="5" width="8" height="3" fill={OUTLINE} />
            <rect x="2" y="8" width="12" height="7" fill={OUTLINE} />
            <rect x="5" y="6" width="6" height="2" fill="#1E293B" />
            <rect x="3" y="8" width="10" height="6" fill="#1E293B" />
            {/* Liquid inside */}
            <rect x="3" y="10" width="10" height="4" fill={active ? '#F59E0B' : '#D4B475'} />
            <rect x="3" y="10" width="10" height="1" fill="#FEF08A" />
            <rect x="4" y="9" width="1" height="4" fill="#FFFFFF" fillOpacity="0.4" />
          </g>
        );

      case 'bunsen':
        return (
          <g>
            {active && (
              <g>
                <rect x="7" y="0" width="2" height="2" fill="#FDE047" />
                <rect x="6" y="2" width="4" height="4" fill="#F97316" />
                <rect x="7" y="3" width="2" height="3" fill="#38BDF8" />
              </g>
            )}
            {/* Barrel */}
            <rect x="6" y="6" width="4" height="6" fill={OUTLINE} />
            <rect x="7" y="6" width="2" height="5" fill="#F59E0B" />
            {/* Base */}
            <rect x="3" y="12" width="10" height="3" fill={OUTLINE} />
            <rect x="4" y="13" width="8" height="1" fill="#475569" />
          </g>
        );

      case 'loop_unsterile':
        return renderLoop('unsterile');
      case 'loop_hot':
        return renderLoop('hot');
      case 'loop_cool':
        return renderLoop('cool');
      case 'loop_loaded':
        return renderLoop('loaded');

      case 'pipette_p2':
        return renderPipette('#F43F5E', true);
      case 'pipette_p20':
        return renderPipette('#F59E0B', true);
      case 'pipette_p200':
        return renderPipette('#10B981', true);
      case 'pipette_p1000':
        return renderPipette('#0284C7', active);

      case 'tip_sterile':
        return (
          <g>
            <rect x="5" y="1" width="6" height="3" fill={OUTLINE} />
            <rect x="6" y="2" width="4" height="1" fill="#38BDF8" />
            <rect x="6" y="4" width="4" height="6" fill={OUTLINE} />
            <rect x="7" y="4" width="2" height="6" fill="#E0F2FE" />
            <rect x="7" y="10" width="2" height="4" fill="#7DD3FC" />
          </g>
        );

      case 'tip_used':
        return (
          <g opacity="0.45">
            <rect x="6" y="2" width="4" height="11" fill="#334155" />
          </g>
        );

      case 'vortex':
        return (
          <g>
            {/* Rubber Cup */}
            <rect x="5" y="3" width="6" height="3" fill={OUTLINE} />
            <rect x="6" y="4" width="4" height="1" fill={active ? '#22D3EE' : '#475569'} />
            {/* Body */}
            <rect x="2" y="6" width="12" height="8" fill={OUTLINE} />
            <rect x="3" y="7" width="10" height="6" fill="#1E293B" />
            <rect x="4" y="8" width="8" height="3" fill="#334155" />
            <rect x="10" y="11" width="2" height="1" fill="#10B981" />
          </g>
        );

      case 'biohazard':
        return (
          <g>
            <rect x="3" y="2" width="10" height="3" fill={OUTLINE} />
            <rect x="4" y="3" width="8" height="1" fill="#E11D48" />
            <rect x="3" y="5" width="10" height="10" fill={OUTLINE} />
            <rect x="4" y="6" width="8" height="8" fill="#BE123C" />
            {/* Yellow Biohazard Accent */}
            <rect x="7" y="8" width="2" height="1" fill="#FACC15" />
            <rect x="6" y="10" width="1" height="1" fill="#FACC15" />
            <rect x="9" y="10" width="1" height="1" fill="#FACC15" />
          </g>
        );

      case 'culture_tube':
        return (
          <g>
            <rect x="5" y="1" width="6" height="3" fill={OUTLINE} />
            <rect x="6" y="2" width="4" height="1" fill="#0EA5E9" />
            <rect x="5" y="4" width="6" height="10" fill={OUTLINE} />
            <rect x="6" y="4" width="4" height="9" fill="#0F172A" />
            <rect x="6" y="8" width="4" height="5" fill="#EAB308" />
            <rect x="6" y="13" width="4" height="2" fill={OUTLINE} />
          </g>
        );

      case 'ice_bucket':
        return (
          <g>
            {/* Ice Cubes Peeking Over Rim */}
            <rect x="3" y="2" width="4" height="4" fill={OUTLINE} />
            <rect x="4" y="3" width="2" height="2" fill="#E0F2FE" />
            <rect x="7" y="1" width="4" height="5" fill={OUTLINE} />
            <rect x="8" y="2" width="2" height="3" fill="#BAE6FD" />
            <rect x="10" y="3" width="3" height="3" fill={OUTLINE} />
            <rect x="11" y="4" width="1" height="1" fill="#FFFFFF" />
            {/* Blue Foam Bucket */}
            <rect x="2" y="5" width="12" height="10" fill={OUTLINE} />
            <rect x="3" y="6" width="10" height="8" fill="#0284C7" />
            <rect x="3" y="6" width="10" height="2" fill="#38BDF8" />
          </g>
        );

      case 'heat_block':
        return (
          <g>
            {/* Aluminum Block */}
            <rect x="3" y="3" width="10" height="5" fill={OUTLINE} />
            <rect x="4" y="4" width="8" height="3" fill="#94A3B8" />
            <rect x="5" y="4" width="1" height="1" fill="#0F172A" />
            <rect x="8" y="4" width="1" height="1" fill="#0F172A" />
            <rect x="10" y="4" width="1" height="1" fill="#0F172A" />
            {/* Heater Chassis */}
            <rect x="2" y="8" width="12" height="7" fill={OUTLINE} />
            <rect x="3" y="9" width="10" height="5" fill="#1E293B" />
            <rect x="5" y="11" width="6" height="2" fill={active ? '#FB7185' : '#F59E0B'} />
          </g>
        );

      case 'spin_column':
        return (
          <g>
            <rect x="4" y="1" width="8" height="7" fill={OUTLINE} />
            <rect x="5" y="2" width="6" height="5" fill="#CBD5E1" />
            <rect x="5" y="6" width="6" height="1" fill={active ? '#34D399' : '#F8FAFC'} />
            <rect x="4" y="8" width="8" height="7" fill={OUTLINE} />
            <rect x="5" y="8" width="6" height="5" fill="#0F172A" />
            <rect x="5" y="11" width="6" height="2" fill="#38BDF8" />
          </g>
        );

      case 'etoh_bottle':
        return renderBottle('#34D399', '#059669', '#10B981', '#ECFDF5');

      case 'rotor_tube':
        return (
          <g>
            <rect x="5" y="1" width="6" height="3" fill={OUTLINE} />
            <rect x="6" y="2" width="4" height="1" fill="#E2E8F0" />
            <rect x="5" y="4" width="6" height="8" fill={OUTLINE} />
            <rect x="6" y="4" width="4" height="7" fill="#0EA5E9" fillOpacity="0.6" />
            <rect x="6" y="12" width="4" height="3" fill={OUTLINE} />
            <rect x="7" y="12" width="2" height="2" fill="#38BDF8" />
          </g>
        );

      case 'pcr_tube':
        return (
          <g>
            <rect x="5" y="2" width="6" height="2" fill={OUTLINE} />
            <rect x="6" y="2" width="4" height="1" fill="#C084FC" />
            <rect x="6" y="4" width="4" height="7" fill={OUTLINE} />
            <rect x="7" y="4" width="2" height="6" fill={active ? '#A855F7' : '#334155'} />
            <rect x="7" y="11" width="2" height="2" fill={OUTLINE} />
          </g>
        );

      case 'taq_tube':
        return renderBottle('#A855F7', '#7E22CE', '#38BDF8', '#F3E8FF');

      case 'enzyme_vial':
        return renderBottle('#2DD4BF', '#0F766E', '#FBBF24', '#CCFBF1');

      case 'coverslip':
        return (
          <g>
            <rect x="3" y="3" width="10" height="10" fill={OUTLINE} />
            <rect x="4" y="4" width="8" height="8" fill="#BAE6FD" fillOpacity="0.65" />
            <rect x="5" y="5" width="3" height="1" fill="#FFFFFF" />
            <rect x="5" y="6" width="1" height="2" fill="#FFFFFF" />
          </g>
        );

      case 'stain_cv':
        return renderBottle('#8B5CF6', '#5B21B6', '#4C1D95', '#EDE9FE');

      case 'stain_iodine':
        return renderBottle('#D97706', '#78350F', '#92400E', '#FEF3C7');

      case 'stain_ethanol':
        return renderBottle('#38BDF8', '#0369A1', '#E2E8F0', '#F0F9FF');

      case 'stain_safranin':
        return renderBottle('#F43F5E', '#9F1239', '#BE123C', '#FFE4E6');

      case 'immersion_oil':
        return renderBottle('#FACC15', '#CA8A04', '#0F172A', '#FEF9C3');

      case 'glass_slide':
        return (
          <g>
            <rect x="1" y="5" width="14" height="6" fill={OUTLINE} />
            <rect x="2" y="6" width="12" height="4" fill="#E0F2FE" />
            <rect x="3" y="6" width="2" height="4" fill="#CBD5E1" />
            <rect x="7" y="7" width="4" height="2" fill={active ? '#7C3AED' : '#94A3B8'} />
          </g>
        );

      case 'cuvette_blank':
        return (
          <g>
            <rect x="5" y="1" width="6" height="14" fill={OUTLINE} />
            <rect x="6" y="2" width="4" height="12" fill="#E0F2FE" fillOpacity="0.7" />
            <rect x="6" y="6" width="4" height="8" fill="#FDE68A" fillOpacity="0.55" />
          </g>
        );

      case 'cuvette_sample':
        return (
          <g>
            <rect x="5" y="1" width="6" height="14" fill={OUTLINE} />
            <rect x="6" y="2" width="4" height="12" fill="#1E293B" />
            <rect x="6" y="5" width="4" height="9" fill="#06B6D4" />
            <rect x="7" y="7" width="1" height="1" fill="#FFFFFF" />
            <rect x="8" y="10" width="1" height="1" fill="#FFFFFF" />
          </g>
        );

      case 'kimwipe':
        return (
          <g>
            <rect x="2" y="4" width="12" height="8" fill={OUTLINE} />
            <rect x="3" y="5" width="10" height="6" fill="#F8FAFC" />
            <rect x="5" y="6" width="6" height="1" fill="#CBD5E1" />
            <rect x="4" y="8" width="7" height="1" fill="#E2E8F0" />
            <rect x="3" y="10" width="10" height="1" fill="#10B981" />
          </g>
        );

      case 'nanodrop':
        return (
          <g>
            <rect x="4" y="2" width="8" height="3" fill={OUTLINE} />
            <rect x="5" y="3" width="6" height="1" fill="#94A3B8" />
            <rect x="7" y="5" width="2" height="4" fill={active ? '#FB7185' : '#38BDF8'} />
            <rect x="3" y="9" width="10" height="5" fill={OUTLINE} />
            <rect x="4" y="10" width="8" height="3" fill="#475569" />
          </g>
        );

      case 'centrifuge':
        return (
          <g>
            <rect x="2" y="3" width="12" height="11" fill={OUTLINE} />
            <rect x="3" y="4" width="10" height="9" fill="#334155" />
            <rect x="5" y="5" width="6" height="5" fill="#0F172A" />
            <rect x="7" y="7" width="2" height="1" fill="#38BDF8" />
            <rect x="4" y="11" width="3" height="1" fill="#10B981" />
          </g>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      {renderSprite()}
    </svg>
  );
};
