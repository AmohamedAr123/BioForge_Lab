import React, { useRef, useState } from 'react';
import { Download, HardDrive, RotateCcw, Upload, X } from 'lucide-react';
import { exportStateAsJson, parseImportedJson } from '../engine/storage';
import { SimulationSaveState } from '../types/lab';

interface DataManagerModalProps {
  saveState: SimulationSaveState;
  onImportState: (next: SimulationSaveState) => void;
  onResetLab: () => void;
  onClose: () => void;
}

export const DataManagerModal: React.FC<DataManagerModalProps> = ({
  saveState,
  onImportState,
  onResetLab,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  const handleDownloadJson = () => {
    const json = exportStateAsJson(saveState);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bioforge_lab_backup_day${Math.floor(saveState.simMinutes / 1440) + 1}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'ok', text: 'Laboratory state exported as JSON file.' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const result = parseImportedJson(content);
      if (result.ok === false) {
        setStatusMessage({ type: 'error', text: result.error });
        return;
      }
      onImportState(result.state);
      setStatusMessage({
        type: 'ok',
        text: `Imported ${result.state.vessels.length} vessels and ${result.state.notebookEntries.length} notebook entries.`,
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Laboratory Data & Persistence
              </h2>
              <p className="text-xs text-slate-400">
                Auto-saved locally in browser storage. Export or import JSON backups anytime.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Data Manager"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Schema Version</span>
              <span className="font-mono-tabular text-slate-200">v{saveState.schemaVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tracked Vessels</span>
              <span className="font-mono-tabular text-slate-200">{saveState.vessels.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Notebook Entries</span>
              <span className="font-mono-tabular text-slate-200">
                {saveState.notebookEntries.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Lab JSON
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import Lab JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded border text-xs ${
                statusMessage.type === 'ok'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="pt-3 border-t border-slate-800">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Laboratory to Initial Baseline
              </button>
            ) : (
              <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded flex items-center justify-between gap-3">
                <span className="text-xs text-rose-200">
                  Erase all active cultures and notebook entries?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1 text-xs bg-slate-800 text-slate-200 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetLab();
                      setConfirmReset(false);
                      setStatusMessage({
                        type: 'ok',
                        text: 'Laboratory reset to initial baseline.',
                      });
                    }}
                    className="px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
