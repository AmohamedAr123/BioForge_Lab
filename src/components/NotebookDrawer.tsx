import React, { useState } from 'react';
import { BookOpen, Clock, Plus, Trash2, X } from 'lucide-react';
import { formatScientificCount, formatSimTime } from '../engine/simulation';
import { CultureVessel, NotebookEntry, NotebookTimelineScope, TimeSeriesPoint } from '../types/lab';

interface NotebookDrawerProps {
  entries: NotebookEntry[];
  activeEntryId: string | null;
  vessels: CultureVessel[];
  simMinutes: number;
  onSelectEntry: (id: string) => void;
  onCreateEntry: () => void;
  onUpdateEntry: (entry: NotebookEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClose: () => void;
}

type PlotMetric = 'od600' | 'pH' | 'dissolvedO2Percent' | 'tempC';
type TimeAlignment = 'elapsed' | 'clock';

const CURVE_COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#A855F7'];

const TIMELINE_OPTIONS: Array<{
  id: NotebookTimelineScope;
  label: string;
  shortLabel: string;
  durationMin: number | null;
}> = [
  { id: 'couple_hours', label: 'Couple of Hours (2h)', shortLabel: '2 Hours', durationMin: 120 },
  { id: 'six_hours', label: 'Batch Window (6h)', shortLabel: '6 Hours', durationMin: 360 },
  { id: 'one_day', label: '1 Day (24h)', shortLabel: '1 Day', durationMin: 1440 },
  { id: 'one_week', label: '1 Week (7d)', shortLabel: '1 Week', durationMin: 10080 },
  { id: 'auto', label: 'Auto Fit All', shortLabel: 'Auto', durationMin: null },
];

function formatAxisTimeTick(minutes: number, maxSpanMin: number): string {
  if (maxSpanMin <= 180) {
    return `${Math.round(minutes)}m`;
  }
  if (maxSpanMin <= 1800) {
    return `${(minutes / 60).toFixed(maxSpanMin <= 400 ? 1 : 0)}h`;
  }
  return `${(minutes / 1440).toFixed(1)}d`;
}

function getMetricValue(pt: TimeSeriesPoint, metric: PlotMetric, fallbackVessel: CultureVessel): number {
  if (metric === 'od600') return pt.od600;
  if (metric === 'tempC') return pt.tempC;
  if (metric === 'pH') return typeof pt.pH === 'number' ? pt.pH : fallbackVessel.pH;
  return typeof pt.dissolvedO2Percent === 'number'
    ? pt.dissolvedO2Percent
    : fallbackVessel.dissolvedO2Percent;
}

function findNearestPointAtTime(
  vessel: CultureVessel,
  targetXMin: number,
  alignment: TimeAlignment
): TimeSeriesPoint | null {
  if (vessel.history.length === 0) return null;
  let best = vessel.history[0];
  let bestDist = Infinity;
  for (const pt of vessel.history) {
    const xVal = alignment === 'elapsed' ? pt.simMinutes - vessel.createdAtSimMin : pt.simMinutes;
    const dist = Math.abs(xVal - targetXMin);
    if (dist < bestDist) {
      bestDist = dist;
      best = pt;
    }
  }
  return best;
}

export const NotebookDrawer: React.FC<NotebookDrawerProps> = ({
  entries,
  activeEntryId,
  vessels,
  simMinutes,
  onSelectEntry,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onClose,
}) => {
  const activeEntry = entries.find((e) => e.id === activeEntryId) ?? entries[0] ?? null;
  const [hoverTimeMin, setHoverTimeMin] = useState<number | null>(null);
  const [plotMetric, setPlotMetric] = useState<PlotMetric>('od600');
  const [timeAlignment, setTimeAlignment] = useState<TimeAlignment>('elapsed');

  const activeTimeline: NotebookTimelineScope = activeEntry?.timelinePhase ?? 'six_hours';

  const liquidVessels = vessels.filter(
    (v) => v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube'
  );

  const linkedVessels = activeEntry
    ? vessels.filter((v) => activeEntry.linkedVesselIds.includes(v.id))
    : [];

  const linkedLiquid = linkedVessels.filter(
    (v) => v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube'
  );

  const toggleVesselLink = (vesselId: string) => {
    if (!activeEntry) return;
    const exists = activeEntry.linkedVesselIds.includes(vesselId);
    const nextLinks = exists
      ? activeEntry.linkedVesselIds.filter((id) => id !== vesselId)
      : [...activeEntry.linkedVesselIds, vesselId];
    onUpdateEntry({
      ...activeEntry,
      linkedVesselIds: nextLinks,
    });
  };

  const setTimelineScope = (scope: NotebookTimelineScope) => {
    if (!activeEntry) return;
    onUpdateEntry({
      ...activeEntry,
      timelinePhase: scope,
    });
  };

  // Multi-run SVG chart calculation across elapsed vs lab clock and timeline horizon
  const xCoords = linkedLiquid.flatMap((v) =>
    v.history.map((p) => (timeAlignment === 'elapsed' ? p.simMinutes - v.createdAtSimMin : p.simMinutes))
  );
  const selectedScopeMeta =
    TIMELINE_OPTIONS.find((t) => t.id === activeTimeline) ?? TIMELINE_OPTIONS[1];
  const dataMaxMin = Math.max(60, ...xCoords, 0);
  const maxMin = selectedScopeMeta.durationMin ?? dataMaxMin;

  let yMin = 0;
  let yMax = 0.5;
  if (plotMetric === 'od600') {
    yMin = 0;
    yMax = Math.max(
      0.5,
      ...linkedLiquid.flatMap((v) => v.history.map((p) => p.od600))
    );
  } else if (plotMetric === 'pH') {
    yMin = 4.0;
    yMax = 9.0;
  } else if (plotMetric === 'dissolvedO2Percent') {
    yMin = 0;
    yMax = 100;
  } else {
    yMin = 0;
    yMax = 50;
  }
  const ySpan = Math.max(0.001, yMax - yMin);

  const chartW = 580;
  const chartH = 220;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Laboratory Research Notebook
              </h2>
              <p className="text-xs text-slate-400">
                Compare cultures across a couple of hours, 1 day, or 1 week timelines and archive micrographs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-mono-tabular text-slate-400">
              Current Clock: {formatSimTime(simMinutes)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              aria-label="Close Notebook"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Sidebar: Experiment List */}
          <aside className="md:col-span-3 bg-[#0B0E17] border-r border-slate-800 p-3 flex flex-col overflow-y-auto">
            <button
              type="button"
              onClick={onCreateEntry}
              className="w-full py-2 px-3 mb-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Experiment Entry
            </button>

            <div className="space-y-1.5">
              {entries.map((entry) => {
                const isActive = activeEntry?.id === entry.id;
                const phaseMeta =
                  TIMELINE_OPTIONS.find((t) => t.id === (entry.timelinePhase ?? 'six_hours')) ??
                  TIMELINE_OPTIONS[1];
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelectEntry(entry.id)}
                    className={`w-full p-2.5 rounded border text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-800/90 border-cyan-500/50 text-slate-100'
                        : 'bg-transparent border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{entry.title}</div>
                    <div className="text-[11px] font-mono-tabular text-slate-500 mt-0.5">
                      {phaseMeta.shortLabel} · {entry.snapshots.length} img ·{' '}
                      {entry.gelSnapshots?.length ?? 0} gel
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Notebook Workspace */}
          <div className="md:col-span-9 p-5 overflow-y-auto space-y-6">
            {!activeEntry ? (
              <div className="text-sm text-slate-500">Create a new experiment entry to begin.</div>
            ) : (
              <>
                {/* Title + Delete */}
                <div className="flex items-center justify-between gap-4">
                  <input
                    type="text"
                    value={activeEntry.title}
                    onChange={(e) =>
                      onUpdateEntry({ ...activeEntry, title: e.target.value })
                    }
                    className="flex-1 bg-[#0B0E17] border border-slate-800 focus:border-cyan-500 rounded px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none"
                  />
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(activeEntry.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 border border-slate-800 rounded hover:bg-slate-900 cursor-pointer"
                      aria-label="Delete experiment entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Linked Cultures for Multi-Run Comparison */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-300">
                      Linked Cultures for Quantitative Comparison
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Click cultures to overlay kinetics curves
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {liquidVessels.map((v) => {
                      const linked = activeEntry.linkedVesselIds.includes(v.id);
                      const colorIdx = activeEntry.linkedVesselIds.indexOf(v.id);
                      const color =
                        colorIdx >= 0
                          ? CURVE_COLORS[colorIdx % CURVE_COLORS.length]
                          : '#475569';

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVesselLink(v.id)}
                          className={`px-2.5 py-1 text-xs rounded border flex items-center gap-2 cursor-pointer transition-colors ${
                            linked
                              ? 'bg-slate-800 border-slate-600 text-slate-100'
                              : 'bg-[#0B0E17] border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: linked ? color : '#334155' }}
                          />
                          <span>{v.label}</span>
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            OD {v.od600.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Multi-Run Comparison Chart with Timeline Phase Controls */}
                <section className="bg-[#0B0E17] border border-slate-800 rounded p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                      <h3 className="text-xs font-semibold text-slate-200">
                        Timeline Horizon &amp; Kinetics Plot
                      </h3>
                    </div>

                    {/* Timeline Phase Selector (2 Hours / 6 Hours / 1 Day / 1 Week / Auto) */}
                    <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded">
                      {TIMELINE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTimelineScope(opt.id)}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            activeTimeline === opt.id
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/45'
                              : 'text-slate-400 hover:text-slate-100 border border-transparent'
                          }`}
                        >
                          {opt.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Secondary Toolbar: Channel Metric & Time Reference */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: 'od600', label: 'OD600' },
                          { id: 'pH', label: 'Live pH' },
                          { id: 'dissolvedO2Percent', label: 'DO₂ %' },
                          { id: 'tempC', label: 'Temp °C' },
                        ] as const
                      ).map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setPlotMetric(ch.id)}
                          className={`px-2 py-0.5 rounded font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                            plotMetric === ch.id
                              ? 'bg-slate-800 text-slate-100 border border-slate-600'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {hoverTimeMin !== null && (
                        <span className="font-mono-tabular text-cyan-300">
                          t = {formatAxisTimeTick(hoverTimeMin, maxMin)} ({Math.round(hoverTimeMin)} min)
                        </span>
                      )}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded">
                        <button
                          type="button"
                          onClick={() => setTimeAlignment('elapsed')}
                          className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 cursor-pointer ${
                            timeAlignment === 'elapsed'
                              ? 'bg-slate-800 text-slate-100'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Elapsed Age
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimeAlignment('clock')}
                          className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 cursor-pointer ${
                            timeAlignment === 'clock'
                              ? 'bg-slate-800 text-slate-100'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Lab Clock
                        </button>
                      </div>
                    </div>
                  </div>

                  {linkedLiquid.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-500">
                      Link one or more broth cultures above to visualize and compare their growth curves.
                    </div>
                  ) : (
                    <svg
                      viewBox={`0 0 ${chartW} ${chartH}`}
                      className="w-full h-auto cursor-crosshair"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relX = ((e.clientX - rect.left) / rect.width) * chartW;
                        const norm = Math.max(0, Math.min(1, (relX - padL) / plotW));
                        setHoverTimeMin(norm * maxMin);
                      }}
                      onMouseLeave={() => setHoverTimeMin(null)}
                    >
                      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                        const y = padT + plotH * (1 - frac);
                        const tickVal = yMin + ySpan * frac;
                        return (
                          <g key={frac}>
                            <line
                              x1={padL}
                              y1={y}
                              x2={chartW - padR}
                              y2={y}
                              stroke="#1E293B"
                              strokeWidth="1"
                            />
                            <text
                              x={padL - 6}
                              y={y + 3}
                              textAnchor="end"
                              fill="#64748B"
                              fontSize="10"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {plotMetric === 'dissolvedO2Percent' || plotMetric === 'tempC'
                                ? tickVal.toFixed(0)
                                : tickVal.toFixed(plotMetric === 'pH' ? 1 : 2)}
                            </text>
                          </g>
                        );
                      })}

                      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                        const x = padL + plotW * frac;
                        return (
                          <text
                            key={frac}
                            x={x}
                            y={chartH - 8}
                            textAnchor="middle"
                            fill="#64748B"
                            fontSize="10"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {formatAxisTimeTick(maxMin * frac, maxMin)}
                          </text>
                        );
                      })}

                      {linkedLiquid.map((v, idx) => {
                        const color = CURVE_COLORS[idx % CURVE_COLORS.length];
                        const visiblePts = v.history.filter((pt) => {
                          const xMin =
                            timeAlignment === 'elapsed'
                              ? pt.simMinutes - v.createdAtSimMin
                              : pt.simMinutes;
                          return xMin >= 0 && xMin <= maxMin * 1.02;
                        });
                        if (visiblePts.length < 2) return null;

                        const pts = visiblePts
                          .map((pt) => {
                            const xMin =
                              timeAlignment === 'elapsed'
                                ? pt.simMinutes - v.createdAtSimMin
                                : pt.simMinutes;
                            const val = getMetricValue(pt, plotMetric, v);
                            const px = padL + (Math.min(maxMin, xMin) / maxMin) * plotW;
                            const py =
                              padT +
                              plotH -
                              (Math.max(0, Math.min(1, (val - yMin) / ySpan))) * plotH;
                            return `${px.toFixed(1)},${py.toFixed(1)}`;
                          })
                          .join(' ');

                        return (
                          <polyline
                            key={v.id}
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            points={pts}
                          />
                        );
                      })}

                      {hoverTimeMin !== null && (
                        <line
                          x1={padL + (hoverTimeMin / maxMin) * plotW}
                          y1={padT}
                          x2={padL + (hoverTimeMin / maxMin) * plotW}
                          y2={padT + plotH}
                          stroke="rgba(226, 232, 240, 0.35)"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                      )}
                    </svg>
                  )}

                  {/* Crosshair Hover Readout Strip */}
                  {hoverTimeMin !== null && linkedLiquid.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-2.5 py-1.5 bg-slate-900/70 border border-slate-800 rounded text-[11px] font-mono-tabular">
                      {linkedLiquid.map((v, idx) => {
                        const pt = findNearestPointAtTime(v, hoverTimeMin, timeAlignment);
                        if (!pt) return null;
                        return (
                          <div key={v.id} className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-sm shrink-0"
                              style={{ backgroundColor: CURVE_COLORS[idx % CURVE_COLORS.length] }}
                            />
                            <span className="text-slate-300 font-sans font-medium">{v.label}:</span>
                            <span className="text-cyan-300">OD {pt.od600.toFixed(3)}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-emerald-300">
                              pH {(pt.pH ?? v.pH).toFixed(2)}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-amber-300">{pt.tempC.toFixed(1)} °C</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quantitative Comparison Table */}
                  {linkedLiquid.length > 0 && (
                    <div className="mt-2 overflow-x-auto border-t border-slate-800 pt-3">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-800">
                            <th className="pb-1.5 font-medium">Culture</th>
                            <th className="pb-1.5 font-medium">Vol</th>
                            <th className="pb-1.5 font-medium">Temp</th>
                            <th className="pb-1.5 font-medium">pH</th>
                            <th className="pb-1.5 font-medium">DO₂</th>
                            <th className="pb-1.5 font-medium">OD600</th>
                            <th className="pb-1.5 font-medium">Viable CFU/mL</th>
                            <th className="pb-1.5 font-medium">Nutrients</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {linkedLiquid.map((v, idx) => {
                            const viable = v.populations.reduce((acc, p) => acc + p.viableCount, 0);
                            return (
                              <tr key={v.id}>
                                <td className="py-1.5 font-medium text-slate-200 flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-sm shrink-0"
                                    style={{
                                      backgroundColor: CURVE_COLORS[idx % CURVE_COLORS.length],
                                    }}
                                  />
                                  <span className="truncate max-w-[160px]">{v.label}</span>
                                </td>
                                <td className="py-1.5 font-mono-tabular text-slate-400">
                                  {v.volumeMl} mL
                                </td>
                                <td className="py-1.5 font-mono-tabular text-slate-300">
                                  {v.temperatureC.toFixed(1)} °C
                                </td>
                                <td className="py-1.5 font-mono-tabular text-emerald-300">
                                  {v.pH.toFixed(2)}
                                </td>
                                <td className="py-1.5 font-mono-tabular text-amber-300">
                                  {v.dissolvedO2Percent.toFixed(0)}%
                                </td>
                                <td className="py-1.5 font-mono-tabular text-cyan-300">
                                  {v.od600.toFixed(3)}
                                </td>
                                <td className="py-1.5 font-mono-tabular text-slate-300">
                                  {formatScientificCount(viable)}
                                </td>
                                <td className="py-1.5 font-mono-tabular text-slate-400">
                                  {(v.nutrientRemaining * 100).toFixed(0)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Hypothesis, Protocol, Observations */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Hypothesis
                    </label>
                    <textarea
                      rows={4}
                      value={activeEntry.hypothesis}
                      onChange={(e) =>
                        onUpdateEntry({ ...activeEntry, hypothesis: e.target.value })
                      }
                      className="w-full bg-[#0B0E17] border border-slate-800 focus:border-cyan-500 rounded p-2.5 text-xs text-slate-200 leading-relaxed focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Protocol & Experimental Conditions
                    </label>
                    <textarea
                      rows={4}
                      value={activeEntry.protocolNotes}
                      onChange={(e) =>
                        onUpdateEntry({ ...activeEntry, protocolNotes: e.target.value })
                      }
                      className="w-full bg-[#0B0E17] border border-slate-800 focus:border-cyan-500 rounded p-2.5 text-xs text-slate-200 leading-relaxed focus:outline-none"
                    />
                  </div>
                </section>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Observations & Quantitative Log
                  </label>
                  <textarea
                    rows={5}
                    value={activeEntry.observations}
                    onChange={(e) =>
                      onUpdateEntry({ ...activeEntry, observations: e.target.value })
                    }
                    className="w-full bg-[#0B0E17] border border-slate-800 focus:border-cyan-500 rounded p-2.5 text-xs font-mono-tabular text-slate-200 leading-relaxed focus:outline-none"
                  />
                </div>

                {/* Captured Micrographs */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Captured Microscopy Snapshots ({activeEntry.snapshots.length})
                  </h3>
                  {activeEntry.snapshots.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-800 rounded text-xs text-slate-500">
                      No micrographs captured for this entry yet. Visit the Compound Microscope to capture stained or phase-contrast snapshots.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeEntry.snapshots.map((snap) => (
                        <div
                          key={snap.id}
                          className="p-2.5 bg-[#0B0E17] border border-slate-800 rounded space-y-2"
                        >
                          {snap.imageDataUrl && (
                            <img
                              src={snap.imageDataUrl}
                              alt={snap.summaryObservation}
                              referrerPolicy="no-referrer"
                              className="w-36 h-36 mx-auto rounded-full border border-slate-700"
                            />
                          )}
                          <div className="text-xs font-medium text-slate-200 truncate">
                            {snap.vesselLabel}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {snap.summaryObservation}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-slate-500">
                            {formatSimTime(snap.capturedAtSimMin)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Captured UV Gel Doc Snapshots */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Captured UV Gel Doc Images ({activeEntry.gelSnapshots?.length ?? 0})
                  </h3>
                  {(activeEntry.gelSnapshots?.length ?? 0) === 0 ? (
                    <div className="p-4 border border-dashed border-slate-800 rounded text-xs text-slate-500">
                      No agarose gel images captured for this entry yet. Visit the Agarose Gel Rig & UV Gel Doc to separate DNA bands and archive gel photos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeEntry.gelSnapshots!.map((gel) => (
                        <div
                          key={gel.id}
                          className="p-3 bg-[#0B0E17] border border-slate-800 rounded space-y-2"
                        >
                          {gel.imageDataUrl && (
                            <img
                              src={gel.imageDataUrl}
                              alt="Agarose gel electrophoresis UV capture"
                              referrerPolicy="no-referrer"
                              className="w-full h-auto rounded border border-slate-700"
                            />
                          )}
                          <div className="text-xs font-medium text-blue-300 font-mono-tabular">
                            {gel.agarosePercent.toFixed(1)}% Agarose · {gel.voltageV} V ·{' '}
                            {formatSimTime(gel.capturedAtSimMin)}
                          </div>
                          <div className="text-[11px] text-slate-400 space-y-0.5">
                            {gel.laneSummaries
                              .filter((l) => l.sampleLabel !== 'Empty')
                              .map((l) => (
                                <div key={l.laneNumber} className="truncate">
                                  <span className="font-mono-tabular text-slate-300">
                                    L{l.laneNumber}:
                                  </span>{' '}
                                  {l.sampleLabel}{' '}
                                  <span className="font-mono-tabular text-cyan-400">
                                    ({l.bandSizesBp.length > 0 ? l.bandSizesBp.map((b) => `${b}bp`).join(', ') : 'No bands'})
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
