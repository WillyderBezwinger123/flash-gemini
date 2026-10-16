import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Flame,
  Plus,
  Repeat,
  Settings2,
  Sparkles,
  Trash2,
  Calendar,
} from 'lucide-react';
import { TaskItem } from '../types';
import {
  COLOR_PALETTE,
  WEEKDAY_NAMES_SHORT,
  addDays,
  calculateRoutineStreak,
  doesTaskOccurOnDate,
  formatShortDate,
  getNextOccurrenceDate,
  getRoutineDescription,
  isTaskCompletedOnDate,
  parseDateStr,
  toDateStr,
} from '../utils/dateUtils';

interface TasksAndRoutinesPanelProps {
  mode: 'tasks' | 'routines';
  tasks: TaskItem[];
  onQuickAddTask: (title: string, isRoutine: boolean, presetType?: 'daily' | 'every_3_days' | 'weekly') => void;
  onToggleComplete: (taskId: string, dateStr: string) => void;
  onQuickRename: (taskId: string, newTitle: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewModal: (isRoutine: boolean) => void;
}

export const TasksAndRoutinesPanel: React.FC<TasksAndRoutinesPanelProps> = ({
  mode,
  tasks,
  onQuickAddTask,
  onToggleComplete,
  onQuickRename,
  onEditTask,
  onDeleteTask,
  onOpenNewModal,
}) => {
  const todayStr = toDateStr(new Date());
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPreset, setQuickPreset] = useState<'daily' | 'every_3_days' | 'weekly'>('daily');
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'pending' | 'done'>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const activeTasks = tasks.filter((t) => !t.deleted);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAddTask(quickTitle.trim(), mode === 'routines', quickPreset);
    setQuickTitle('');
  };

  const startRename = (task: TaskItem) => {
    setRenamingId(task.id);
    setRenameText(task.title);
  };

  const saveRename = (taskId: string) => {
    if (renameText.trim()) {
      onQuickRename(taskId, renameText.trim());
    }
    setRenamingId(null);
  };

  // ============================================================================
  // ROUTINES HUB VIEW
  // ============================================================================
  if (mode === 'routines') {
    const routines = activeTasks.filter((t) => t.isRoutine);
    const last7Days = Array.from({ length: 7 }, (_, i) => addDays(todayStr, i - 6));

    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header & Quick Add Routine Bar */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 sm:p-6 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Routine Engine • Daily, Every 3 Days, Weekly & Custom
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">My Routine Tasks</h2>
                <p className="text-xs sm:text-sm text-violet-100 mt-0.5">
                  Build consistent habits with flexible schedules and automatic calendar blocks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenNewModal(true)}
                className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-violet-700 font-bold text-sm shadow-md hover:bg-violet-50 transition-all"
              >
                <Plus className="w-4 h-4" />
                Custom Routine
              </button>
            </div>

            {/* Instant Routine Creator */}
            <form onSubmit={handleQuickAddSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Quick add a routine (e.g., Morning Run, Read 20 Pages, Gym every 3 days)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-xs border border-white/25 text-white placeholder-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-white"
              />
              <div className="flex gap-2">
                <select
                  value={quickPreset}
                  onChange={(e) =>
                    setQuickPreset(e.target.value as 'daily' | 'every_3_days' | 'weekly')
                  }
                  className="px-3 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="daily" className="text-slate-900">
                    Daily
                  </option>
                  <option value="every_3_days" className="text-slate-900">
                    Every 3 Days
                  </option>
                  <option value="weekly" className="text-slate-900">
                    Weekly
                  </option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Routines Grid */}
          {routines.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
              <Repeat className="w-10 h-10 text-violet-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No routines created yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Create daily, every-3-days, weekly, or custom interval routines and track your streaks across your laptop and phone.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routines.map((routine) => {
                const palette = COLOR_PALETTE[routine.color] || COLOR_PALETTE.violet;
                const dueToday = doesTaskOccurOnDate(routine, todayStr);
                const doneToday = isTaskCompletedOnDate(routine, todayStr);
                const streak = calculateRoutineStreak(routine, todayStr);
                const nextDate = getNextOccurrenceDate(routine, todayStr);

                return (
                  <div
                    key={routine.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Top Badges & Action Icons */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${palette.badge}`}
                          >
                            {getRoutineDescription(routine)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <Flame className="w-3 h-3" />
                            {streak} streak
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startRename(routine)}
                            title="Rename routine"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditTask(routine)}
                            title="Customize routine schedule & time"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(routine.id)}
                            title="Delete routine"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title (with inline rename support) */}
                      <div className="mt-3">
                        {renamingId === routine.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onBlur={() => saveRename(routine.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRename(routine.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-indigo-500 text-sm font-bold"
                            />
                          </div>
                        ) : (
                          <h3
                            onDoubleClick={() => startRename(routine)}
                            className="text-base font-bold text-slate-900 dark:text-white cursor-pointer"
                          >
                            {routine.title}
                          </h3>
                        )}
                        {routine.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {routine.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Last 7 Days Interactive Tracker */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        <span>Last 7 Days Completion</span>
                        <span>
                          {dueToday
                            ? doneToday
                              ? '✅ Completed Today'
                              : '🎯 Scheduled for Today'
                            : nextDate
                            ? `Next: ${formatShortDate(nextDate)}`
                            : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5">
                        {last7Days.map((dStr) => {
                          const dObj = parseDateStr(dStr);
                          const scheduled = doesTaskOccurOnDate(routine, dStr);
                          const completed = isTaskCompletedOnDate(routine, dStr);
                          const isToday = dStr === todayStr;

                          return (
                            <button
                              key={dStr}
                              type="button"
                              onClick={() => onToggleComplete(routine.id, dStr)}
                              title={`${dStr}: Click to toggle done`}
                              className={`flex flex-col items-center py-1.5 rounded-xl border text-[10px] font-semibold transition-all ${
                                completed
                                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                  : scheduled
                                  ? isToday
                                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-300'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                  : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 text-slate-400 opacity-55'
                              }`}
                            >
                              <span>{WEEKDAY_NAMES_SHORT[dObj.getDay()].slice(0, 2)}</span>
                              <span className="mt-0.5 text-xs font-bold">{dObj.getDate()}</span>
                              <div className="mt-1 w-4 h-4 rounded-full flex items-center justify-center">
                                {completed ? (
                                  <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
                                ) : scheduled ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                ) : (
                                  <span className="text-[9px]">–</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // TASKS MANAGER VIEW
  // ============================================================================
  const filteredTasks = activeTasks.filter((t) => {
    const doneToday = isTaskCompletedOnDate(t, todayStr);
    const occursToday = doesTaskOccurOnDate(t, todayStr);

    if (taskFilter === 'today') return occursToday;
    if (taskFilter === 'pending') return t.isRoutine ? occursToday && !doneToday : !t.completed;
    if (taskFilter === 'done') return t.isRoutine ? doneToday : t.completed;
    return true;
  });

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Top Quick-Add Task Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Tasks & Action Items
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create, rename, complete, or delete tasks. Double-click any task title to rename it inline.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenNewModal(false)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Detailed Task
            </button>
          </div>

          <form onSubmit={handleQuickAddSubmit} className="flex gap-2">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Add a new task for today and press Enter..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity"
            >
              Add Task
            </button>
          </form>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'today', label: 'Scheduled Today' },
              { id: 'pending', label: 'Active / To-Do' },
              { id: 'done', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTaskFilter(tab.id as typeof taskFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  taskFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {filteredTasks.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No tasks match this filter. Add a task above!
            </div>
          ) : (
            filteredTasks.map((task) => {
              const targetDate = task.isRoutine ? todayStr : task.date;
              const done = isTaskCompletedOnDate(task, targetDate);
              const palette = COLOR_PALETTE[task.color] || COLOR_PALETTE.blue;

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Done Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleComplete(task.id, targetDate)}
                      title={done ? 'Mark as undone' : 'Mark as done'}
                      className={`w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                        done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                      }`}
                    >
                      {done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className={`w-2 h-8 rounded-full flex-shrink-0 ${palette.dot}`} />

                    <div className="min-w-0 flex-1">
                      {renamingId === task.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onBlur={() => saveRename(task.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(task.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-indigo-500 text-sm font-bold"
                        />
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onDoubleClick={() => startRename(task)}
                            className={`text-sm font-semibold cursor-pointer ${
                              done
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.isRoutine && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-600 dark:text-violet-300">
                              <Repeat className="w-2.5 h-2.5" />
                              {getRoutineDescription(task)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {task.isRoutine ? 'Routine' : formatShortDate(task.date)}
                        </span>
                        {!task.allDay && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.startTime} – {task.endTime}
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                          {task.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startRename(task)}
                      title="Rename task"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      title="Edit schedule & routine settings"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      title="Delete task"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
