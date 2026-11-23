import React, { useEffect, useState } from 'react';
import { BookMarked, Search, ShieldCheck, X } from 'lucide-react';
import { DICTIONARY_ENTRIES, getDictionaryEntryById } from '../data/dictionaryDatabase';
import {
  ANTIBIOTIC_COMPOUNDS,
  BACTERIAL_SPECIES,
  getAntibioticById,
  getSpeciesById,
  MEDIA_RECIPES,
  SIMULATION_MODEL_DISCLOSURES,
} from '../data/scientificDatabase';
import { DictionaryEntry, EpistemicTag } from '../types/lab';
import { evaluateAntibioticDecision } from '../utils/colorCoding';

export type ReferenceTabId = 'dictionary' | 'species' | 'media' | 'antibiotics' | 'models';

interface ReferenceModalProps {
  initialTab?: ReferenceTabId;
  initialTermId?: string | null;
  onClose: () => void;
}

function formatEpistemicLabel(tag: EpistemicTag): { text: string; colorClass: string } {
  if (tag === 'established_fact') {
    return { text: 'Established Fact', colorClass: 'text-emerald-400' };
  }
  if (tag === 'simplified_model') {
    return { text: 'Simplified Model', colorClass: 'text-amber-400' };
  }
  return { text: 'Gameplay Abstraction', colorClass: 'text-sky-400' };
}

const CATEGORY_LABELS: Record<'all' | DictionaryEntry['category'], string> = {
  all: 'All Terms',
  fundamentals: 'DNA & Genetics Basics',
  microbiology: 'Cultures, pH, O₂ & Antibiotics',
  molecular_biology: 'PCR, Enzymes & Gels',
  instruments: 'Lab Instruments',
};

export const ReferenceModal: React.FC<ReferenceModalProps> = ({
  initialTab = 'dictionary',
  initialTermId = null,
  onClose,
}) => {
  const [tab, setTab] = useState<ReferenceTabId>(initialTab);
  const [query, setQuery] = useState<string>('');
  const [dictCategory, setDictCategory] = useState<'all' | DictionaryEntry['category']>('all');
  const [focusedTermId, setFocusedTermId] = useState<string | null>(initialTermId);

  // Interactive Antibiotic Advisor state
  const [advisorSpeciesId, setAdvisorSpeciesId] = useState<string>(BACTERIAL_SPECIES[0].id);
  const [advisorAntibioticId, setAdvisorAntibioticId] = useState<string>(ANTIBIOTIC_COMPOUNDS[0].id);
  const [advisorDoseUgMl, setAdvisorDoseUgMl] = useState<number>(
    ANTIBIOTIC_COMPOUNDS[0].standardWorkingUgPerMl
  );

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialTermId) {
      setTab('dictionary');
      setDictCategory('all');
      setQuery('');
      setFocusedTermId(initialTermId);
    }
  }, [initialTermId]);

  const q = query.trim().toLowerCase();

  const filteredDictionary = DICTIONARY_ENTRIES.filter((entry) => {
    if (dictCategory !== 'all' && entry.category !== dictCategory) return false;
    if (!q) return true;
    return (
      entry.term.toLowerCase().includes(q) ||
      entry.shortDefinition.toLowerCase().includes(q) ||
      entry.plainExplanation.toLowerCase().includes(q) ||
      entry.howToUseInLab.toLowerCase().includes(q)
    );
  });

  const orderedDictionary = focusedTermId
    ? [
        ...filteredDictionary.filter((e) => e.id === focusedTermId),
        ...filteredDictionary.filter((e) => e.id !== focusedTermId),
      ]
    : filteredDictionary;

  const advisorSpecies = getSpeciesById(advisorSpeciesId) ?? BACTERIAL_SPECIES[0];
  const advisorCompound = getAntibioticById(advisorAntibioticId) ?? ANTIBIOTIC_COMPOUNDS[0];
  const advisorDecision = evaluateAntibioticDecision(
    advisorSpecies,
    advisorCompound.id,
    advisorDoseUgMl
  );

  const handleSelectMatrixCell = (spId: string, abId: string) => {
    const ab = getAntibioticById(abId);
    setAdvisorSpeciesId(spId);
    setAdvisorAntibioticId(abId);
    if (ab) setAdvisorDoseUgMl(ab.standardWorkingUgPerMl);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <BookMarked className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Real-Life Bacteria Encyclopedia, Dictionary Book &amp; Antibiotic Advisor
              </h2>
              <p className="text-xs text-slate-400">
                Complete biological profiles for every organism (habitat, cell envelope, temp/pH/O₂ limits, metabolism, genetics, protocols &amp; antibiotics) plus beginner subject guides.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Dictionary Book"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation & Search */}
        <div className="px-5 py-3 bg-[#0B0E17]/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-md">
            {[
              { id: 'species' as const, label: 'Bacteria Encyclopedia' },
              { id: 'antibiotics' as const, label: 'Antibiotics & Advisor' },
              { id: 'dictionary' as const, label: 'Dictionary & Subject Guides' },
              { id: 'media' as const, label: 'Culture Media' },
              { id: 'models' as const, label: 'Simulation Models' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === item.id
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-100 border border-transparent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bacteria, pH, antibiotics..."
              className="w-full bg-[#0B0E17] border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {tab === 'dictionary' && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'fundamentals', 'microbiology', 'molecular_biology', 'instruments'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setDictCategory(cat);
                        setFocusedTermId(null);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer whitespace-nowrap shrink-0 ${
                        dictCategory === cat
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                          : 'bg-[#0B0E17] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                )}
              </div>

              {orderedDictionary.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-800 rounded text-xs text-slate-500 text-center">
                  No dictionary entries matched &ldquo;{query}&rdquo;.
                </div>
              ) : (
                <div className="space-y-3">
                  {orderedDictionary.map((entry) => {
                    const isHighlighted = focusedTermId === entry.id;
                    return (
                      <article
                        key={entry.id}
                        className={`p-4 rounded border space-y-2.5 transition-colors ${
                          isHighlighted
                            ? 'bg-emerald-950/25 border-emerald-500/60'
                            : 'bg-[#0B0E17] border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-100">{entry.term}</h3>
                          <span className="text-[11px] text-emerald-400 font-medium">
                            {CATEGORY_LABELS[entry.category]}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-cyan-300">{entry.shortDefinition}</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs leading-relaxed">
                          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80">
                            <div className="text-[11px] font-semibold text-slate-200 mb-1">
                              In Plain English
                            </div>
                            <p className="text-slate-300">{entry.plainExplanation}</p>
                          </div>

                          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80">
                            <div className="text-[11px] font-semibold text-slate-200 mb-1">
                              Why It Matters
                            </div>
                            <p className="text-slate-300">{entry.whyItMatters}</p>
                          </div>

                          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80">
                            <div className="text-[11px] font-semibold text-emerald-300 mb-1">
                              How to Use in BioForge Lab
                            </div>
                            <p className="text-slate-300">{entry.howToUseInLab}</p>
                          </div>
                        </div>

                        {entry.relatedTerms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                            <span className="text-slate-500">Related terms:</span>
                            {entry.relatedTerms.map((relId) => {
                              const rel = getDictionaryEntryById(relId);
                              if (!rel) return null;
                              return (
                                <button
                                  key={relId}
                                  type="button"
                                  onClick={() => {
                                    setDictCategory('all');
                                    setQuery('');
                                    setFocusedTermId(relId);
                                  }}
                                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded cursor-pointer"
                                >
                                  {rel.term.split(' (')[0]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'species' &&
            BACTERIAL_SPECIES.filter(
              (s) =>
                !q ||
                s.scientificName.toLowerCase().includes(q) ||
                s.commonLabel.toLowerCase().includes(q) ||
                s.beginnerSummary.toLowerCase().includes(q) ||
                s.realLifeDossier.naturalHabitat.toLowerCase().includes(q) ||
                s.realLifeDossier.metabolismAndCarbon.toLowerCase().includes(q) ||
                s.markerGenes.some((m) => m.toLowerCase().includes(q)) ||
                s.gramStatus.includes(q)
            ).map((sp) => (
              <article
                key={sp.id}
                className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-4"
              >
                {/* Organism Identity Header */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">
                      {sp.commonLabel}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        (<span className="italic">{sp.scientificName}</span> {sp.strainCode})
                      </span>
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      <span className={sp.biosafetyLevel === 'BSL-2' ? 'text-amber-300 font-medium' : 'text-emerald-300 font-medium'}>
                        {sp.biosafetyLevel}
                      </span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span className={sp.gramStatus === 'positive' ? 'text-purple-300' : 'text-rose-300'}>
                        Gram-{sp.gramStatus} {sp.shape} ({sp.arrangement})
                      </span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{sp.lengthUm} × {sp.widthUm} µm</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{sp.motile ? 'Motile (Flagella)' : 'Non-motile'}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span className="capitalize">{sp.oxygenRequirement.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono-tabular text-cyan-300">
                    {sp.realLifeDossier.taxonomy}
                  </div>
                </div>

                {/* Color-Coded Operating Envelope Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono-tabular">
                  <div className="p-2.5 rounded border bg-emerald-950/25 border-emerald-500/35">
                    <div className="text-[10px] text-slate-400">Optimal Temp</div>
                    <div className="text-emerald-300 font-semibold">{sp.tempOptC.toFixed(1)} °C</div>
                    <div className="text-[10px] text-slate-400">Range {sp.tempMinC}–{sp.tempMaxC} °C</div>
                  </div>
                  <div className="p-2.5 rounded border bg-emerald-950/25 border-emerald-500/35">
                    <div className="text-[10px] text-slate-400">Optimal pH</div>
                    <div className="text-emerald-300 font-semibold">pH {sp.phOpt.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-400">Range {sp.phMin.toFixed(1)}–{sp.phMax.toFixed(1)}</div>
                  </div>
                  <div className="p-2.5 rounded border bg-cyan-950/25 border-cyan-500/35">
                    <div className="text-[10px] text-slate-400">Min Doubling</div>
                    <div className="text-cyan-300 font-semibold">{sp.minDoublingTimeMin} min</div>
                    <div className="text-[10px] text-slate-400">M9 Factor {(sp.minimalMediaFactor * 100).toFixed(0)}%</div>
                  </div>
                  <div className="p-2.5 rounded border bg-slate-900/70 border-slate-700">
                    <div className="text-[10px] text-slate-400">Oxygen Km</div>
                    <div className="text-slate-200 font-semibold">{sp.oxygenKmPercent}% DO₂</div>
                    <div className="text-[10px] text-slate-400">
                      {sp.oxygenRequirement === 'aerobe' ? 'Needs Shaking' : 'Facultative'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded border bg-slate-900/70 border-slate-700">
                    <div className="text-[10px] text-slate-400">MacConkey Agar</div>
                    <div className={sp.growsOnMacConkey ? (sp.fermentsLactose ? 'text-pink-300 font-semibold' : 'text-slate-200 font-semibold') : 'text-rose-300 font-semibold'}>
                      {!sp.growsOnMacConkey ? 'Inhibited' : sp.fermentsLactose ? 'Pink (Lac+)' : 'Pale (Lac-)'}
                    </div>
                    <div className="text-[10px] text-slate-400">Bile salts test</div>
                  </div>
                  <div className="p-2.5 rounded border bg-slate-900/70 border-slate-700">
                    <div className="text-[10px] text-slate-400">Max Broth Density</div>
                    <div className="text-slate-200 font-semibold">
                      {(sp.carryingCapacityCfuPerMl / 1e9).toFixed(1)}×10⁹
                    </div>
                    <div className="text-[10px] text-slate-400">CFU / mL</div>
                  </div>
                </div>

                {/* Beginner Summary */}
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-800/80">
                  {sp.beginnerSummary}
                </p>

                {/* Real-Life Biology Comprehensive Dossier Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                  <div className="p-3 bg-slate-900/40 border border-slate-800/70 rounded space-y-1.5">
                    <div className="font-semibold text-emerald-300 text-[11px]">
                      Real-Life Habitat, Ecology &amp; Clinical/Biotech Role
                    </div>
                    <p className="text-slate-300">
                      <span className="text-slate-100 font-medium">Habitat:</span> {sp.realLifeDossier.naturalHabitat}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-100 font-medium">Role:</span> {sp.realLifeDossier.clinicalAndBiotechRole}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/40 border border-slate-800/70 rounded space-y-1.5">
                    <div className="font-semibold text-cyan-300 text-[11px]">
                      Cell Envelope Anatomy &amp; Metabolism
                    </div>
                    <p className="text-slate-300">
                      <span className="text-slate-100 font-medium">Envelope:</span> {sp.realLifeDossier.cellEnvelope}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-100 font-medium">Metabolism:</span> {sp.realLifeDossier.metabolismAndCarbon}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/40 border border-slate-800/70 rounded space-y-1.5">
                    <div className="font-semibold text-amber-300 text-[11px]">
                      Temperature, pH Physiology &amp; Optimal Lab Protocol
                    </div>
                    <p className="text-slate-300">{sp.realLifeDossier.temperatureAndPhNotes}</p>
                    <p className="text-emerald-200">
                      <span className="font-semibold">Optimal Recipe:</span> {sp.realLifeDossier.optimalProtocol}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/40 border border-slate-800/70 rounded space-y-1.5">
                    <div className="font-semibold text-purple-300 text-[11px]">
                      Microscopy, Colonies &amp; Genetics Markers
                    </div>
                    <p className="text-slate-300">{sp.microscopyGuide}</p>
                    <p className="text-slate-300">{sp.geneticsGuide}</p>
                    <div className="text-[11px] font-mono-tabular text-teal-300 pt-0.5">
                      Markers: {sp.markerGenes.join(' · ')}
                    </div>
                  </div>
                </div>

                {/* Recommended Experiments */}
                <div className="p-3 bg-slate-900/40 border border-slate-800/70 rounded text-xs space-y-1.5">
                  <div className="font-semibold text-amber-300 text-[11px]">
                    How to Use This Strain in BioForge Lab Experiments
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    {sp.howToUseExperiments.map((exp, i) => (
                      <li key={i}>{exp}</li>
                    ))}
                  </ul>
                </div>

                {/* Complete Antibiotic Verdict & MIC Table */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="text-xs font-semibold text-slate-200">
                    Antibiotic Susceptibility &amp; Should-I-Add Guide (Standard Working Doses)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {ANTIBIOTIC_COMPOUNDS.map((ab) => {
                      const mic = sp.micUgPerMl[ab.id];
                      const profile = sp.realLifeDossier.antibioticProfiles[ab.id];
                      const isSusceptible = profile?.verdict === 'susceptible';
                      const isPlasmid = profile?.verdict === 'resistant_plasmid';
                      const cardTone = isSusceptible
                        ? 'bg-rose-950/25 border-rose-500/40'
                        : isPlasmid
                        ? 'bg-emerald-950/25 border-emerald-500/40'
                        : 'bg-amber-950/25 border-amber-500/40';
                      const verdictLabel = isSusceptible
                        ? 'Susceptible (Kills Strain)'
                        : isPlasmid
                        ? 'Plasmid Resistant (Selective)'
                        : 'Intrinsically Resistant (Spares)';
                      const verdictColor = isSusceptible
                        ? 'text-rose-300'
                        : isPlasmid
                        ? 'text-emerald-300'
                        : 'text-amber-300';

                      return (
                        <div key={ab.id} className={`p-2.5 rounded border space-y-1 ${cardTone}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-100">
                              {ab.name} · <span className="font-mono-tabular">MIC {mic} µg/mL</span>
                            </span>
                            <span className={`font-semibold text-[11px] ${verdictColor}`}>
                              {verdictLabel}
                            </span>
                          </div>
                          {profile && (
                            <>
                              <p className="text-[11px] text-slate-200">{profile.summary}</p>
                              <p className="text-[11px] text-slate-400">Mechanism: {profile.mechanism}</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  {sp.citations.map((cit, idx) => {
                    const tagInfo = formatEpistemicLabel(cit.epistemicTag);
                    return (
                      <div key={idx}>
                        <span className={`font-medium ${tagInfo.colorClass}`}>{tagInfo.text}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="text-slate-300">{cit.source}:</span> {cit.note}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}

          {tab === 'antibiotics' && (
            <div className="space-y-5">
              {/* Interactive Species × Antibiotic Advisor Matrix */}
              <section className="p-4 bg-[#0B0E17] border border-slate-700 rounded space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        Interactive Species × Antibiotic Decision Advisor
                      </h3>
                      <p className="text-xs text-slate-400">
                        Click any cell in the matrix or tune a concentration below to check whether an antibiotic will kill, arrest, or spare a bacterium.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5 x 4 Matrix */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3 text-left font-medium">Bacterial Strain</th>
                        {ANTIBIOTIC_COMPOUNDS.map((ab) => (
                          <th key={ab.id} className="py-2 px-3 text-left font-medium">
                            {ab.name}
                            <div className="text-[10px] font-mono-tabular text-slate-500">
                              Std {ab.standardWorkingUgPerMl} µg/mL
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {BACTERIAL_SPECIES.map((sp) => (
                        <tr key={sp.id}>
                          <td className="py-2 px-3 font-medium text-slate-200 whitespace-nowrap">
                            {sp.commonLabel}
                            <div className="text-[10px] text-slate-500">Gram-{sp.gramStatus}</div>
                          </td>
                          {ANTIBIOTIC_COMPOUNDS.map((ab) => {
                            const dec = evaluateAntibioticDecision(
                              sp,
                              ab.id,
                              ab.standardWorkingUgPerMl
                            );
                            const isSelectedCell =
                              advisorSpeciesId === sp.id && advisorAntibioticId === ab.id;
                            return (
                              <td key={ab.id} className="py-1.5 px-2">
                                <button
                                  type="button"
                                  onClick={() => handleSelectMatrixCell(sp.id, ab.id)}
                                  className={`w-full p-2 rounded border text-left transition-colors cursor-pointer ${
                                    dec.surfaceClass
                                  } ${isSelectedCell ? 'ring-2 ring-cyan-400' : 'hover:brightness-110'}`}
                                >
                                  <div className="font-semibold text-[11px] whitespace-nowrap">
                                    {dec.code === 'kills_strain'
                                      ? 'Kills'
                                      : dec.code === 'arrests_strain'
                                      ? 'Stops Growth'
                                      : dec.code === 'selective_plasmid'
                                      ? 'Resistant (Plasmid)'
                                      : 'Resistant (Intrinsic)'}
                                  </div>
                                  <div className="text-[10px] font-mono-tabular opacity-85">
                                    MIC {sp.micUgPerMl[ab.id]} µg/mL
                                  </div>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Live Dose Simulator Verdict Card */}
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Target Bacterium
                      </label>
                      <select
                        value={advisorSpeciesId}
                        onChange={(e) => setAdvisorSpeciesId(e.target.value)}
                        className="w-full bg-[#0B0E17] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                      >
                        {BACTERIAL_SPECIES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.commonLabel} ({s.strainCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Antibiotic Compound
                      </label>
                      <select
                        value={advisorAntibioticId}
                        onChange={(e) => {
                          const nextAb = getAntibioticById(e.target.value);
                          setAdvisorAntibioticId(e.target.value);
                          if (nextAb) setAdvisorDoseUgMl(nextAb.standardWorkingUgPerMl);
                        }}
                        className="w-full bg-[#0B0E17] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                      >
                        {ANTIBIOTIC_COMPOUNDS.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.drugClass})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Planned Concentration</span>
                        <span className="font-mono-tabular text-amber-300 font-semibold">
                          {advisorDoseUgMl.toFixed(advisorCompound.id === 'ciprofloxacin' ? 2 : 0)} µg/mL
                        </span>
                      </div>
                      <input
                        type="range"
                        min={advisorCompound.id === 'ciprofloxacin' ? 0.02 : 1}
                        max={advisorCompound.maxConcentrationUgPerMl}
                        step={advisorCompound.id === 'ciprofloxacin' ? 0.02 : 1}
                        value={advisorDoseUgMl}
                        onChange={(e) => setAdvisorDoseUgMl(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>
                  </div>

                  <div className={`p-3 rounded border text-xs space-y-1 ${advisorDecision.surfaceClass}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        Verdict: {advisorDecision.label}
                      </span>
                      <span className="font-mono-tabular">
                        Dose / MIC = {advisorDecision.ratioToMic.toFixed(2)}× (Strain MIC:{' '}
                        {advisorSpecies.micUgPerMl[advisorCompound.id]} µg/mL)
                      </span>
                    </div>
                    <p>{advisorDecision.explanation}</p>
                    <p className="text-[11px] opacity-85">
                      pH &amp; Temp Stability: {advisorCompound.phStabilityNote}
                    </p>
                  </div>
                </div>
              </section>

              {/* Individual Pharmacology Profiles */}
              <div className="space-y-3">
                {ANTIBIOTIC_COMPOUNDS.filter(
                  (a) =>
                    !q ||
                    a.name.toLowerCase().includes(q) ||
                    a.targetMechanism.toLowerCase().includes(q) ||
                    a.phStabilityNote.toLowerCase().includes(q)
                ).map((ab) => {
                  const tagInfo = formatEpistemicLabel(ab.citation.epistemicTag);
                  return (
                    <article
                      key={ab.id}
                      className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">
                          {ab.name} ({ab.drugClass})
                        </h3>
                        <span className="text-xs font-mono-tabular text-amber-300">
                          Standard: {ab.standardWorkingUgPerMl} µg/mL · {ab.mode} · Optimal pH{' '}
                          {ab.optimalPhRange[0].toFixed(1)}–{ab.optimalPhRange[1].toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{ab.targetMechanism}</p>
                      <p className="text-xs text-cyan-200/90">{ab.phStabilityNote}</p>
                      <div className="text-[11px] text-slate-400">
                        <span className={`font-medium ${tagInfo.colorClass}`}>{tagInfo.text}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{ab.citation.source}:</span> {ab.citation.note}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'media' &&
            MEDIA_RECIPES.filter(
              (m) =>
                !q ||
                m.name.toLowerCase().includes(q) ||
                m.compositionSummary.toLowerCase().includes(q)
            ).map((m) => {
              const tagInfo = formatEpistemicLabel(m.epistemicTag);
              return (
                <article
                  key={m.id}
                  className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">{m.name}</h3>
                    <span className={`text-xs font-medium ${tagInfo.colorClass}`}>
                      {tagInfo.text}
                    </span>
                  </div>
                  <div className="text-xs font-mono-tabular text-cyan-300">
                    Format: {m.format} · Default pH {m.pH.toFixed(1)} · Buffer {(m.bufferCapacity * 100).toFixed(0)}% · {m.compositionSummary}
                  </div>
                  <p className="text-xs text-slate-300">{m.scientificPurpose}</p>
                </article>
              );
            })}

          {tab === 'models' && (
            <div className="space-y-3">
              {SIMULATION_MODEL_DISCLOSURES.map((disc, idx) => {
                const tagInfo = formatEpistemicLabel(disc.epistemicTag);
                return (
                  <article
                    key={idx}
                    className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-100">{disc.title}</h3>
                      <span className={`text-xs font-medium ${tagInfo.colorClass}`}>
                        {tagInfo.text}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{disc.description}</p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
