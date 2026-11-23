import React, { useState } from 'react';
import {
  Activity,
  Beaker,
  BookOpen,
  Compass,
  Dna,
  Flame,
  HelpCircle,
  Microscope,
  Snowflake,
  X,
} from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

type GuideSectionId =
  | 'controls'
  | 'cultures'
  | 'plates'
  | 'antibiotics'
  | 'instruments'
  | 'molecular'
  | 'notebook';

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  const [section, setSection] = useState<GuideSectionId>('controls');

  const sections: Array<{
    id: GuideSectionId;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'controls', label: '1. Walking & Controls', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'cultures', label: '2. Liquid Broth Cultures', icon: <Beaker className="w-3.5 h-3.5" /> },
    { id: 'plates', label: '3. Agar Plates & Dilution', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'antibiotics', label: '4. Antibiotic & Media Tests', icon: <Snowflake className="w-3.5 h-3.5" /> },
    { id: 'instruments', label: '5. Microscope & NanoDrop', icon: <Microscope className="w-3.5 h-3.5" /> },
    { id: 'molecular', label: '6. DNA, PCR, Enzymes & Gel', icon: <Dna className="w-3.5 h-3.5" /> },
    { id: 'notebook', label: '7. Goals, Dictionary & Save', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col h-[88vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                BioForge Lab v2.1 — Complete Operating Manual &amp; Guide
              </h2>
              <p className="text-xs text-slate-400">
                Step-by-step instructions covering navigation, cultures, serial dilution, PCR, restriction enzymes, gels, and goals.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Lab Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Navigation */}
          <aside className="md:col-span-4 lg:col-span-3 bg-[#0B0E17] border-r border-slate-800 p-3 space-y-1.5 overflow-y-auto">
            {sections.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full px-3 py-2.5 rounded border text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <span className={active ? 'text-cyan-400' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-800 px-2 space-y-1.5 text-[11px] text-slate-400">
              <div className="font-semibold text-slate-300">Keyboard Shortcuts</div>
              <div className="flex justify-between">
                <span>Walk</span>
                <span className="font-mono-tabular text-slate-200">WASD / Arrows</span>
              </div>
              <div className="flex justify-between">
                <span>Open Nearby Station</span>
                <span className="font-mono-tabular text-slate-200">E</span>
              </div>
              <div className="flex justify-between">
                <span>Close Console</span>
                <span className="font-mono-tabular text-slate-200">Esc</span>
              </div>
              <div className="flex justify-between">
                <span>Open Lab Guide</span>
                <span className="font-mono-tabular text-slate-200">?</span>
              </div>
            </div>
          </aside>

          {/* Right Detailed Instructions */}
          <div className="md:col-span-8 lg:col-span-9 p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
            {section === 'controls' && (
              <>
                <h3 className="text-base font-semibold text-slate-100">
                  1. Walking, Station Interaction & Sample Tray
                </h3>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-cyan-300">How to Walk Around the Lab</div>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      <strong>Keyboard Walking:</strong> Hold{' '}
                      <span className="font-mono-tabular text-slate-100">W A S D</span> or the{' '}
                      <span className="font-mono-tabular text-slate-100">Arrow Keys</span> to move your researcher smoothly across the lab floor.
                    </li>
                    <li>
                      <strong>Click-to-Walk Pathfinding:</strong> Click any open floor tile and your researcher automatically navigates around workbenches to that spot.
                    </li>
                    <li>
                      <strong>Click Any Machine Directly:</strong> Clicking any equipment station (such as the Incubator or Microscope) walks you to its front interaction tile and opens its control console automatically upon arrival.
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-cyan-300">How to Open & Close Stations</div>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      When standing next to an interactive machine, its outline lights up and a prompt appears at the bottom center — press{' '}
                      <span className="font-mono-tabular text-slate-100">E</span> or click{' '}
                      <span className="font-semibold text-slate-100">Open (E)</span>.
                    </li>
                    <li>
                      You can also jump directly to any station console using the{' '}
                      <span className="font-semibold text-slate-100">Bench Stations</span> bar in the top-left corner of the room.
                    </li>
                    <li>
                      Press <span className="font-mono-tabular text-slate-100">Esc</span> or click the{' '}
                      <span className="font-mono-tabular text-slate-100">×</span> button to return to the lab floor.
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-cyan-300">How the Carried Sample Tray Works</div>
                  <p>
                    The 10-slot bar at the bottom of the screen is your{' '}
                    <span className="font-semibold text-slate-100">Carried Sample Tray</span>. Every physical vessel (glycerol stock, flask, culture tube, agar plate, 1.5 mL DNA tube, or 0.2 mL PCR tube) stays inside an instrument rack or in your tray.
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      Clicking a vessel in your tray highlights it in cyan; when you open the{' '}
                      <span className="font-semibold text-slate-100">Microscope</span> or{' '}
                      <span className="font-semibold text-slate-100">Spectrophotometer</span>, that vessel is pre-selected automatically.
                    </li>
                    <li>
                      Keeping a culture in your tray keeps it at ambient room temperature (~22 °C). Place vessels inside an incubator to grow at 37 °C, or inside Cold Storage (4 °C) to halt division.
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-cyan-300">How Time & Speed Controls Work</div>
                  <p>
                    Use the top speed bar (<span className="font-mono-tabular text-slate-100">Pause · 1x · 10x · 50x · 100x</span>) to control biological time:
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      At <span className="font-mono-tabular text-slate-100">1x</span>, 1 real second = 1 simulated minute.
                    </li>
                    <li>
                      At <span className="font-mono-tabular text-slate-100">10x</span>, 1 real second = 10 simulated minutes (ideal for watching exponential growth).
                    </li>
                    <li>
                      At <span className="font-mono-tabular text-slate-100">100x</span>, 1 real second = 100 simulated minutes (1.67 hours/sec — ideal for overnight agar colony development).
                    </li>
                  </ul>
                </div>
              </>
            )}

            {section === 'cultures' && (
              <>
                <h3 className="text-base font-semibold text-slate-100">
                  2. How to Make & Grow a Liquid Bacterial Culture
                </h3>
                <p>
                  Liquid broth flasks and culture tubes let you measure growth kinetics via OD600 turbidity, test aeration/RPM effects, and inspect motile live cells.
                </p>

                <ol className="space-y-3">
                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-emerald-300">
                      Step 1: Retrieve a Master Bacterial Stock
                    </div>
                    <p>
                      Open <span className="font-semibold text-slate-100">Cold Storage (-80 °C / 4 °C)</span> and click{' '}
                      <span className="font-semibold text-slate-100">Take Stock</span> next to any of the four species:
                      <span className="italic"> E. coli K-12</span>, <span className="italic">B. subtilis 168</span>,{' '}
                      <span className="italic">S. aureus RN4220</span>, or <span className="italic">P. aeruginosa PAO1</span>. It moves into your Carried Sample Tray.
                    </p>
                  </li>

                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-emerald-300">
                      Step 2: Dispense Broth & Inoculate at the Media Bench
                    </div>
                    <p>
                      Open the <span className="font-semibold text-slate-100">Media & Inoculation Bench</span>:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Select <span className="font-semibold text-slate-100">250 mL Flask</span> (higher aeration) or <span className="font-semibold text-slate-100">15 mL Tube</span>.</li>
                      <li>Choose a liquid medium: <span className="font-semibold text-slate-100">LB Broth</span> (richest), <span className="font-semibold text-slate-100">Nutrient Broth</span>, or <span className="font-semibold text-slate-100">M9 Minimal</span> (chemically defined).</li>
                      <li>Under <span className="font-semibold text-slate-100">Aseptic Inoculation Source</span>, pick your glycerol stock (or an active culture you already grew) and set your micropipette volume (e.g., <span className="font-mono-tabular">50 µL</span>).</li>
                      <li>Click <span className="font-semibold text-slate-100">Dispense Media & Inoculate</span>.</li>
                    </ul>
                  </li>

                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-emerald-300">
                      Step 3: Return the Stock & Load the Shaking Incubator
                    </div>
                    <p>
                      Optional best practice: return your glycerol stock to Cold Storage so it stays at -80 °C. Then open the{' '}
                      <span className="font-semibold text-slate-100">Orbital Shaking Incubator</span>, click{' '}
                      <span className="font-semibold text-slate-100">Load</span> on your new flask, make sure{' '}
                      <span className="font-semibold text-slate-100">Heater On</span> is active, and set Temperature (e.g., <span className="font-mono-tabular">37.0 °C</span>) and Orbital Agitation (e.g., <span className="font-mono-tabular">220 RPM</span>).
                    </p>
                  </li>

                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-emerald-300">
                      Step 4: Subculturing, Sterile Blanks & Mixed Cultures
                    </div>
                    <p>
                      Want to create a <span className="font-semibold text-slate-100">sterile uninoculated control</span>? Choose &ldquo;None (Prepare Sterile Uninoculated Control)&rdquo; as the source. Want to make a{' '}
                      <span className="font-semibold text-slate-100">mixed multi-species culture</span>? Create a sterile vessel first, then use{' '}
                      <span className="font-semibold text-slate-100">Inoculate Existing Sterile Vessel</span> at the bottom right of the Media Bench to pipette multiple strains into the same flask!
                    </p>
                  </li>
                </ol>
              </>
            )}

            {section === 'plates' && (
              <>
                <h3 className="text-base font-semibold text-slate-100">
                  3. How to Make Agar Plates & Grow Visible Colonies
                </h3>

                <ol className="space-y-3">
                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-amber-300">
                      Step 1: Prepare & Streak a Petri Plate
                    </div>
                    <p>
                      Bring a glycerol stock or an active broth culture in your tray to the{' '}
                      <span className="font-semibold text-slate-100">Media Bench</span>. Select{' '}
                      <span className="font-semibold text-slate-100">Petri Plate</span> as the container format and pick either:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <span className="font-semibold text-slate-100">LB Agar Plate:</span> Supports all 4 species and reveals natural colony pigmentation (golden yellow for <span className="italic">S. aureus</span>, blue-green pyocyanin sheen for <span className="italic">P. aeruginosa</span>, wrinkled cream for <span className="italic">B. subtilis</span>, off-white for <span className="italic">E. coli</span>).
                      </li>
                      <li>
                        <span className="font-semibold text-slate-100">MacConkey Agar Plate:</span> Selective & differential medium. Bile salts and crystal violet inhibit Gram-positive species (<span className="italic">S. aureus</span> and <span className="italic">B. subtilis</span> will not grow). Lactose-fermenting <span className="italic">E. coli</span> forms bright pink/magenta colonies, while non-fermenting <span className="italic">P. aeruginosa</span> stays pale/colorless.
                      </li>
                    </ul>
                  </li>

                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-amber-300">
                      Step 2: Incubate in the Static Plate Incubator
                    </div>
                    <p>
                      Open the <span className="font-semibold text-slate-100">Static Plate Incubator</span>, click{' '}
                      <span className="font-semibold text-slate-100">Load</span> on your Petri plate, and set the temperature to{' '}
                      <span className="font-mono-tabular">37.0 °C</span>. Switch simulation speed to{' '}
                      <span className="font-mono-tabular">50x</span> or <span className="font-mono-tabular">100x</span> for ~6–14 simulated hours.
                    </p>
                  </li>

                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-amber-300">
                      Step 3: Inspect Colonies & Store at 4 °C
                    </div>
                    <p>
                      Click any plate inside the Static Incubator rack to render the live Petri dish preview showing colony count, mean diameter (mm), and morphology notes. When colonies reach your desired size, move the plate to{' '}
                      <span className="font-semibold text-slate-100">Cold Storage (4 °C)</span> to stop further overgrowth.
                    </p>
                  </li>
                </ol>
              </>
            )}

            {section === 'antibiotics' && (
              <>
                <h3 className="text-base font-semibold text-slate-100">
                  4. How to Run Antibiotic Susceptibility & Media Experiments
                </h3>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-amber-300">
                    Testing Antibiotics & MIC Thresholds
                  </div>
                  <p>
                    At the <span className="font-semibold text-slate-100">Media Bench</span>, Step 3 lets you toggle one or more antibiotics (<span className="font-semibold text-slate-100">Ampicillin</span>, <span className="font-semibold text-slate-100">Kanamycin</span>, <span className="font-semibold text-slate-100">Chloramphenicol</span>, <span className="font-semibold text-slate-100">Ciprofloxacin</span>) and dial in an exact concentration in{' '}
                    <span className="font-mono-tabular">µg/mL</span>.
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      <strong>Bactericidal vs. Bacteriostatic:</strong> Ampicillin, Kanamycin, and Ciprofloxacin actively kill cells above MIC (Ampicillin specifically targets actively dividing cells), whereas Chloramphenicol halts protein synthesis and growth without immediate lysis.
                    </li>
                    <li>
                      <strong>Intrinsic Resistance Experiment:</strong> Inoculate <span className="italic">E. coli K-12</span> and <span className="italic">P. aeruginosa PAO1</span> into separate LB flasks containing <span className="font-mono-tabular">100 µg/mL</span> Ampicillin. <span className="italic">E. coli</span> (MIC 4 µg/mL) is killed, while <span className="italic">P. aeruginosa</span> (intrinsic MIC 256 µg/mL) continues growing!
                    </li>
                    <li>
                      <strong>Auxotrophy / Minimal Media Experiment:</strong> Compare <span className="italic">S. aureus</span> vs. <span className="italic">P. aeruginosa</span> in <span className="font-semibold text-slate-100">M9 Minimal</span> vs. <span className="font-semibold text-slate-100">LB Broth</span> to observe fastidious vs. metabolically versatile growth.
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-rose-300">
                    Sterilization & Waste Disposal (Autoclave)
                  </div>
                  <p>
                    When your Sample Tray fills up or an experiment finishes, carry spent vessels to the{' '}
                    <span className="font-semibold text-slate-100">Steam Autoclave & Disposal</span> station in the bottom-right corner and click{' '}
                    <span className="font-semibold text-slate-100">Autoclave & Discard</span>. Master -80 °C glycerol stocks cannot be discarded accidentally.
                  </p>
                </div>
              </>
            )}

            {section === 'instruments' && (
              <>
                <h3 className="text-base font-semibold text-slate-100">
                  5. Using the Microscope & UV/Vis Spectrophotometer
                </h3>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-cyan-300">
                    <Microscope className="w-4 h-4" />
                    <span>Compound & Phase-Contrast Microscope</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      Choose any active vessel from <span className="font-semibold text-slate-100">Mounted Sample Slide</span> (even vessels currently inside an incubator).
                    </li>
                    <li>
                      Switch objectives between <span className="font-mono-tabular">100x</span>, <span className="font-mono-tabular">400x</span>, and <span className="font-mono-tabular">1000x Oil</span> with a live calibrated µm scale bar.
                    </li>
                    <li>
                      <strong>Gram Stain Mode:</strong> Heat-fixes cells and renders Gram-positive species (<span className="italic">B. subtilis</span> chains, <span className="italic">S. aureus</span> grape-like clusters) in deep crystal-violet purple and Gram-negative rods (<span className="italic">E. coli</span>, <span className="italic">P. aeruginosa</span>) in safranin pink/red.
                    </li>
                    <li>
                      <strong>Phase Contrast & Brightfield:</strong> Observe live unstained cells! Flagellated bacteria (<span className="italic">E. coli</span>, <span className="italic">B. subtilis</span>, <span className="italic">P. aeruginosa</span>) exhibit active run-and-tumble swimming above 12 °C, while non-motile <span className="italic">S. aureus</span> shows only subtle Brownian jitter.
                    </li>
                    <li>
                      Tune the <span className="font-semibold text-slate-100">Fine Focus Knob</span> to 0 µm (<span className="font-semibold text-slate-100">In Focus</span>) and click{' '}
                      <span className="font-semibold text-slate-100">Capture Micrograph to Lab Notebook</span> to save a PNG image directly into your active experiment.
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-cyan-300">
                    <Activity className="w-4 h-4" />
                    <span>UV/Vis Spectrophotometer (OD600)</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      Select any broth flask or culture tube to read its live 600 nm optical density (<span className="font-mono-tabular">AU</span>), viable CFU/mL density, and remaining nutrient fraction.
                    </li>
                    <li>
                      Inspect the real-time <span className="font-semibold text-slate-100">OD600 vs. Elapsed Time</span> growth curve and click{' '}
                      <span className="font-semibold text-slate-100">Record OD600 Reading to Notebook</span> to append a timestamped entry to your observations log.
                    </li>
                  </ul>
                </div>
              </>
            )}

            {section === 'molecular' && (
              <>
                <h3 className="text-base font-semibold text-slate-100">
                  6. Molecular Bay: DNA Extraction, PCR, Restriction Digest &amp; Gel Doc
                </h3>

                <ol className="space-y-3">
                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-sky-300">
                      Step 1: Microcentrifuge &amp; Spin-Column DNA Extraction
                    </div>
                    <p>
                      Select a grown broth culture (OD600 ≥ 0.20), spin at ≥ 10,000 ×g, keep Ethanol Wash Buffer enabled, and click{' '}
                      <span className="font-semibold text-slate-100">Spin, Lyse &amp; Elute Purified DNA</span> to receive a 1.5 mL DNA microtube. Check its concentration (ng/µL) and A260/A280 ratio (~1.83) using the{' '}
                      <span className="font-semibold text-slate-100">NanoDrop A260/A280</span> tab inside the Spectrophotometer.
                    </p>
                  </li>

                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-purple-300">
                      Step 2: PCR Thermal Cycler
                    </div>
                    <p>
                      Load your extracted 1.5 mL DNA tube as Template, pick a Primer Pair Preset (e.g., 16S rRNA, lacZ, or bla AmpR), verify Taq Polymerase and dNTPs are ON, set Annealing Temp close to Tm (~2–4 °C below Tm), and run 30 cycles to create a 0.2 mL PCR tube.
                    </p>
                  </li>

                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-teal-300">
                      Step 3: Restriction Enzyme Digestion Bench
                    </div>
                    <p>
                      Cut purified circular plasmid (<span className="italic">E. coli [pUC-AmpR]</span>) or PCR products with EcoRI, BamHI, HindIII, PstI, or SalI at 37 °C. Cutting pUC-AmpR with EcoRI + PstI cleaves the 2,686 bp circle into two diagnostic fragments (~1,602 bp + ~1,068 bp).
                    </p>
                  </li>

                  <li className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5">
                    <div className="font-semibold text-blue-300">
                      Step 4: Agarose Gel Electrophoresis &amp; UV Gel Doc
                    </div>
                    <p>
                      Keep a DNA Ladder in Well 1, load your PCR or restriction digest tubes into Wells 2–8, tune Agarose % (0.8–2.0%) and Voltage, click <span className="font-semibold text-slate-100">Run Electrophoresis</span>, then click <span className="font-semibold text-slate-100">Capture Gel Image to Notebook</span>.
                    </p>
                  </li>
                </ol>
              </>
            )}

            {section === 'notebook' && (
              <>
                <h3 className="text-base font-semibold text-slate-100">
                  7. Research Goals, Dictionary Book, Notebook &amp; Saving
                </h3>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-emerald-300">
                    Goal-Based Tutorial &amp; Dictionary DB
                  </div>
                  <p>
                    Follow the floating <span className="font-semibold text-slate-100">Goal Tracker</span> in the top-right corner or click <span className="font-semibold text-slate-100">Goals</span> in the top bar to walk through all 5 Goals (14 Quests). Need any term explained in plain English? Click <span className="font-semibold text-slate-100">Dictionary DB</span> or click any green term button inside a Quest to jump directly to its beginner explanation and Bacteria Encyclopedia dossier.
                  </p>
                </div>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-cyan-300">
                    Research Notebook &amp; Multi-Run Comparison
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      Click <span className="font-semibold text-slate-100">Notebook</span> in the top bar to create new experiment entries, edit your hypothesis/protocol/observations, and view both Microscopy and UV Gel Doc snapshots.
                    </li>
                    <li>
                      Click any broth vessels under <span className="font-semibold text-slate-100">Linked Cultures for Quantitative Comparison</span> to overlay multiple growth curves on the same chart.
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
                  <div className="font-semibold text-slate-200">
                    Auto-Save &amp; JSON Export / Import
                  </div>
                  <p>
                    Your laboratory state auto-saves continuously in browser storage. Open{' '}
                    <span className="font-semibold text-slate-100">Save / Export</span> to download a portable <span className="font-mono-tabular">.json</span> backup file, restore an earlier session, or reset the laboratory to its initial baseline.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
