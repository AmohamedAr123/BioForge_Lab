import React from 'react';
import {
  BookMarked,
  BookOpen,
  Eye,
  EyeOff,
  HardDriveDownload,
  HelpCircle,
  Package,
  Pause,
  Play,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatSimTime } from '../engine/simulation';
import { LabMode, SimulationSpeed } from '../types/lab';

interface TopTelemetryBarProps {
  simMinutes: number;
  speed: SimulationSpeed;
  labMode: LabMode;
  muted: boolean;
  onSetSpeed: (speed: SimulationSpeed) => void;
  onSetLabMode: (mode: LabMode) => void;
  onToggleMute: () => void;
  onOpenGoals: () => void;
  goalHudHidden: boolean;
  onToggleGoalHud: () => void;
  onOpenInventory: () => void;
  onOpenGuide: () => void;
  onOpenNotebook: () => void;
  onOpenReference: () => void;
  onOpenDataManager: () => void;
  beltCount: number;
  beltCapacity: number;
  notebookCount: number;
  completedQuestsCount: number;
  totalQuestsCount: number;
}

const SPEED_OPTIONS: Array<{ value: SimulationSpeed; label: string }> = [
  { value: 0, label: 'Pause' },
  { value: 1, label: '1x' },
  { value: 10, label: '10x' },
  { value: 50, label: '50x' },
  { value: 100, label: '100x' },
  { value: 500, label: '500x' },
];

const TopTelemetryBarComponent: React.FC<TopTelemetryBarProps> = ({
  simMinutes,
  speed,
  labMode,
  muted,
  onSetSpeed,
  onSetLabMode,
  onToggleMute,
  onOpenGoals,
  goalHudHidden,
  onToggleGoalHud,
  onOpenInventory,
  onOpenGuide,
  onOpenNotebook,
  onOpenReference,
  onOpenDataManager,
  beltCount,
  beltCapacity,
  notebookCount,
  completedQuestsCount,
  totalQuestsCount,
}) => {
  return (
    <header className="h-12 w-full bg-[#0B0E17] border-b border-slate-800/90 px-4 flex items-center justify-between gap-3 shrink-0 select-none overflow-x-auto">
      {/* Left: Brand & Simulation Clock */}
      <div className="flex items-center gap-4 min-w-0 shrink-0">
        <span className="text-sm font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          BioForge Lab <span className="text-xs font-mono-tabular font-normal text-cyan-400">v3.0 β</span>
        </span>

        <div className="hidden sm:flex items-center gap-2.5 text-xs text-slate-400 whitespace-nowrap shrink-0">
          <span className="font-mono-tabular text-slate-200 font-medium">
            {formatSimTime(simMinutes)}
          </span>
          <span aria-hidden="true">·</span>
          <span className={speed === 0 ? 'text-amber-400' : 'text-emerald-400'}>
            {speed === 0 ? 'Paused' : `Running ${speed}x`}
          </span>
        </div>
      </div>

      {/* Center: Simulation Speed Transport */}
      <div
        className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-md shrink-0"
        role="group"
        aria-label="Simulation time speed"
      >
        {SPEED_OPTIONS.map((opt) => {
          const active = speed === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSetSpeed(opt.value)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? opt.value === 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-100 border border-transparent'
              }`}
            >
              {opt.value === 0 ? (
                <Pause className="w-3 h-3" />
              ) : opt.value === 1 ? (
                <Play className="w-3 h-3" />
              ) : null}
              <span className="font-mono-tabular">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Global Automate / Manual Workflow Mode */}
      <div
        className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-md shrink-0"
        role="group"
        aria-label="Laboratory workflow mode"
      >
        <button
          type="button"
          onClick={() => onSetLabMode('automate')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            labMode === 'automate'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/45'
              : 'text-slate-400 hover:text-slate-100 border border-transparent'
          }`}
        >
          Automate
        </button>
        <button
          type="button"
          onClick={() => onSetLabMode('manual')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            labMode === 'manual'
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/45'
              : 'text-slate-400 hover:text-slate-100 border border-transparent'
          }`}
        >
          Manual
        </button>
      </div>

      {/* Right: Workspace Utilities */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpenInventory}
          className="px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:text-white bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/45 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Package className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono-tabular">
            Inventory ({beltCount}/{beltCapacity})
          </span>
        </button>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenGoals}
            className="px-2.5 py-1.5 text-xs font-medium text-emerald-200 hover:text-white bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-l-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Goals ({completedQuestsCount}/{totalQuestsCount})
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleGoalHud}
            title={goalHudHidden ? 'Show Goals HUD on Lab Screen' : 'Hide Goals HUD from Lab Screen'}
            aria-label={goalHudHidden ? 'Show Goals HUD' : 'Hide Goals HUD'}
            className={`px-2 py-1.5 text-xs font-medium border border-l-0 rounded-r-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              goalHudHidden
                ? 'bg-slate-900 hover:bg-slate-800 border-emerald-500/40 text-slate-300'
                : 'bg-emerald-950/35 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {goalHudHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {goalHudHidden && <span className="hidden lg:inline text-[11px]">Show</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenReference}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookMarked className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Science DB</span>
        </button>

        <button
          type="button"
          onClick={onOpenGuide}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">Lab Guide</span>
        </button>

        <button
          type="button"
          onClick={onOpenNotebook}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Notebook ({notebookCount})</span>
        </button>

        <button
          type="button"
          onClick={onOpenDataManager}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <HardDriveDownload className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden xl:inline">Save / Export</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio cues' : 'Mute audio cues'}
          title={muted ? 'Unmute audio cues' : 'Mute audio cues'}
          className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors shrink-0 cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

export const TopTelemetryBar = React.memo(
  TopTelemetryBarComponent,
  (prev, next) =>
    Math.floor(prev.simMinutes) === Math.floor(next.simMinutes) &&
    prev.speed === next.speed &&
    prev.labMode === next.labMode &&
    prev.muted === next.muted &&
    prev.goalHudHidden === next.goalHudHidden &&
    prev.beltCount === next.beltCount &&
    prev.beltCapacity === next.beltCapacity &&
    prev.notebookCount === next.notebookCount &&
    prev.completedQuestsCount === next.completedQuestsCount &&
    prev.totalQuestsCount === next.totalQuestsCount &&
    prev.onSetSpeed === next.onSetSpeed &&
    prev.onSetLabMode === next.onSetLabMode &&
    prev.onToggleMute === next.onToggleMute &&
    prev.onOpenGoals === next.onOpenGoals &&
    prev.onToggleGoalHud === next.onToggleGoalHud &&
    prev.onOpenInventory === next.onOpenInventory &&
    prev.onOpenGuide === next.onOpenGuide &&
    prev.onOpenNotebook === next.onOpenNotebook &&
    prev.onOpenReference === next.onOpenReference &&
    prev.onOpenDataManager === next.onOpenDataManager
);
