import React, { useState } from 'react';
import { BookMarked, CheckCircle2, ChevronDown, ChevronUp, Circle, EyeOff, Target } from 'lucide-react';
import { getDictionaryEntryById } from '../data/dictionaryDatabase';
import { ALL_QUESTS_FLAT, RESEARCH_GOALS } from '../data/tutorialGoals';

interface GoalTrackerHudProps {
  completedQuestIds: string[];
  activeGoalId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onHideHud: () => void;
  onOpenQuestBoard: () => void;
  onOpenDictionaryTerm: (termId: string) => void;
}

const GoalTrackerHudComponent: React.FC<GoalTrackerHudProps> = ({
  completedQuestIds,
  activeGoalId,
  collapsed,
  onToggleCollapse,
  onHideHud,
  onOpenQuestBoard,
  onOpenDictionaryTerm,
}) => {
  const [showSteps, setShowSteps] = useState<boolean>(true);
  const completedSet = new Set(completedQuestIds);

  // Pick the first incomplete goal, or fallback to selected activeGoalId
  const currentGoal =
    RESEARCH_GOALS.find((g) => g.quests.some((q) => !completedSet.has(q.id))) ??
    RESEARCH_GOALS.find((g) => g.id === activeGoalId) ??
    RESEARCH_GOALS[RESEARCH_GOALS.length - 1];

  const nextQuest =
    currentGoal.quests.find((q) => !completedSet.has(q.id)) ??
    currentGoal.quests[currentGoal.quests.length - 1];

  const goalCompletedCount = currentGoal.quests.filter((q) => completedSet.has(q.id)).length;
  const totalDone = ALL_QUESTS_FLAT.filter((q) => completedSet.has(q.id)).length;
  const allComplete = totalDone === ALL_QUESTS_FLAT.length;

  return (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-[#0B0E17]/95 border border-slate-700/90 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-100 truncate">
              {allComplete
                ? 'All Lab Goals Mastered'
                : `Goal ${currentGoal.number}: ${currentGoal.title}`}
            </div>
            <div className="text-[10px] font-mono-tabular text-slate-400">
              Goal {goalCompletedCount}/{currentGoal.quests.length} · Overall {totalDone}/
              {ALL_QUESTS_FLAT.length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenQuestBoard}
            className="px-2 py-0.5 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded cursor-pointer whitespace-nowrap"
          >
            All Goals
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label={collapsed ? 'Expand Goal Tracker' : 'Collapse Goal Tracker'}
            title={collapsed ? 'Expand Goal Tracker' : 'Collapse Goal Tracker'}
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onHideHud}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Hide Goals HUD"
            title="Hide Goals HUD (re-enable anytime from top bar)"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2.5 text-xs">
          {allComplete ? (
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Every instrument and workflow completed!</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Continue experimenting freely with multi-species cultures, custom PCR primers, restriction maps, or open All Goals to review any protocol.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                {completedSet.has(nextQuest.id) ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-100">{nextQuest.title}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {nextQuest.summary}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowSteps((s) => !s)}
                  className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  {showSteps ? 'Hide How to Do It ▾' : 'Show How to Do It ▸'}
                </button>

                {showSteps && (
                  <ol className="mt-1.5 space-y-1 pl-4 list-decimal text-[11px] text-slate-300 leading-relaxed">
                    {nextQuest.howToSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
              </div>

              {nextQuest.dictionaryTermIds.length > 0 && (
                <div className="pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <BookMarked className="w-3 h-3 text-emerald-400" />
                    Dictionary:
                  </span>
                  {nextQuest.dictionaryTermIds.map((termId) => {
                    const entry = getDictionaryEntryById(termId);
                    if (!entry) return null;
                    return (
                      <button
                        key={termId}
                        type="button"
                        onClick={() => onOpenDictionaryTerm(termId)}
                        className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 rounded cursor-pointer"
                      >
                        {entry.term.split(' (')[0]}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const GoalTrackerHud = React.memo(GoalTrackerHudComponent);
