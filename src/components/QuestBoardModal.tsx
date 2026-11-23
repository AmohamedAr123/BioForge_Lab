import React from 'react';
import { BookMarked, CheckCircle2, Circle, Eye, EyeOff, Target, X } from 'lucide-react';
import { getDictionaryEntryById } from '../data/dictionaryDatabase';
import { ALL_QUESTS_FLAT, RESEARCH_GOALS } from '../data/tutorialGoals';

interface QuestBoardModalProps {
  completedQuestIds: string[];
  goalHudHidden: boolean;
  onToggleGoalHud: () => void;
  onToggleQuestManual: (questId: string) => void;
  onOpenDictionaryTerm: (termId: string) => void;
  onClose: () => void;
}

export const QuestBoardModal: React.FC<QuestBoardModalProps> = ({
  completedQuestIds,
  goalHudHidden,
  onToggleGoalHud,
  onToggleQuestManual,
  onOpenDictionaryTerm,
  onClose,
}) => {
  const completedSet = new Set(completedQuestIds);
  const totalDone = ALL_QUESTS_FLAT.filter((q) => completedSet.has(q.id)).length;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Research Goals &amp; Guided Lab Tutorial ({totalDone}/{ALL_QUESTS_FLAT.length})
              </h2>
              <p className="text-xs text-slate-400">
                Complete these 5 Goals quest-by-quest to learn every instrument, bacterial assay, and molecular biology workflow in BioForge Lab.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleGoalHud}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {goalHudHidden ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Show Lab HUD</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hide Lab HUD</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              aria-label="Close Research Goals"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Goals List */}
        <div className="p-5 overflow-y-auto space-y-5">
          {RESEARCH_GOALS.map((goal) => {
            const doneInGoal = goal.quests.filter((q) => completedSet.has(q.id)).length;
            const goalComplete = doneInGoal === goal.quests.length;

            return (
              <section
                key={goal.id}
                className={`p-4 rounded-lg border space-y-3 ${
                  goalComplete
                    ? 'bg-emerald-950/15 border-emerald-500/40'
                    : 'bg-[#0B0E17] border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Goal {goal.number}: {goal.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{goal.description}</p>
                  </div>
                  <span
                    className={`text-xs font-mono-tabular font-semibold ${
                      goalComplete ? 'text-emerald-400' : 'text-cyan-300'
                    }`}
                  >
                    {doneInGoal}/{goal.quests.length} Quests Completed
                  </span>
                </div>

                <div className="space-y-3">
                  {goal.quests.map((quest) => {
                    const isDone = completedSet.has(quest.id);
                    return (
                      <div
                        key={quest.id}
                        className={`p-3.5 rounded border space-y-2 ${
                          isDone
                            ? 'bg-slate-900/40 border-emerald-500/30'
                            : 'bg-slate-900/80 border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="text-xs font-semibold text-slate-100">
                                {quest.title}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{quest.summary}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onToggleQuestManual(quest.id)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer shrink-0 ${
                              isDone
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {isDone ? 'Completed' : 'Mark Done'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 text-xs">
                          <div className="md:col-span-7 bg-[#0B0E17] border border-slate-800/80 rounded p-2.5">
                            <div className="text-[11px] font-semibold text-cyan-300 mb-1">
                              How to Do It
                            </div>
                            <ol className="list-decimal pl-4 space-y-1 text-slate-300 leading-relaxed">
                              {quest.howToSteps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>

                          <div className="md:col-span-5 bg-[#0B0E17] border border-slate-800/80 rounded p-2.5 flex flex-col justify-between gap-2">
                            <div>
                              <div className="text-[11px] font-semibold text-amber-300 mb-1">
                                Why This Matters
                              </div>
                              <p className="text-slate-300 leading-relaxed">{quest.scientificWhy}</p>
                            </div>

                            {quest.dictionaryTermIds.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                                <BookMarked className="w-3 h-3 text-emerald-400 shrink-0" />
                                {quest.dictionaryTermIds.map((termId) => {
                                  const entry = getDictionaryEntryById(termId);
                                  if (!entry) return null;
                                  return (
                                    <button
                                      key={termId}
                                      type="button"
                                      onClick={() => onOpenDictionaryTerm(termId)}
                                      className="px-2 py-0.5 text-[10px] font-medium bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded cursor-pointer"
                                    >
                                      {entry.term.split(' (')[0]}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
