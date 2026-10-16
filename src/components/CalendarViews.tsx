import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Edit3,
  Flame,
  Plus,
  Repeat,
  Trash2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { CalendarViewMode, TaskItem } from '../types';
import {
  COLOR_PALETTE,
  WEEKDAY_NAMES_SHORT,
  addDays,
  calculateRoutineStreak,
  doesTaskOccurOnDate,
  formatReadableDate,
  getMonthGridDays,
  getRoutineDescription,
  getWeekDays,
  isTaskCompletedOnDate,
  minutesToTime,
  parseDateStr,
  timeToMinutes,
  toDateStr,
} from '../utils/dateUtils';

interface CalendarViewsProps {
  viewMode: CalendarViewMode;
  selectedDate: string;
  tasks: TaskItem[];
  onSelectDate: (dateStr: string) => void;
  onToggleComplete: (taskId: string, dateStr: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onQuickRename: (taskId: string, newTitle: string) => void;
  onCreateAtSlot: (dateStr: string, startTime: string, endTime: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // 60px per hour -> 1px per minute

export const CalendarViews: React.FC<CalendarViewsProps> = ({
  viewMode,
  selectedDate,
  tasks,
  onSelectDate,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onQuickRename,
  onCreateAtSlot,
}) => {
  const todayStr = toDateStr(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // Drag-to-create state on Week/Day time grid
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [dragStartMin, setDragStartMin] = useState<number | null>(null);
  const [dragEndMin, setDragEndMin] = useState<number | null>(null);

  // Inline rename state
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to 07:30 on mount or view switch to week/day
  useEffect(() => {
    if ((viewMode === 'week' || viewMode === 'day') && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 7.5 * HOUR_HEIGHT;
    }
  }, [viewMode]);

  const startInlineRename = (key: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingKey(key);
    setRenameValue(currentTitle);
  };

  const commitInlineRename = (taskId: string) => {
    if (renameValue.trim()) {
      onQuickRename(taskId, renameValue.trim());
    }
    setRenamingKey(null);
  };

  // ============================================================================
  // 1. MONTH VIEW
  // ============================================================================
  if (viewMode === 'month') {
    const dt = parseDateStr(selectedDate);
    const year = dt.getFullYear();
    const month = dt.getMonth();
    const gridDays = getMonthGridDays(year, month, true);
    const weekdayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          {weekdayHeaders.map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 6x7 Month Grid */}
        <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {gridDays.map((dayStr) => {
            const dObj = parseDateStr(dayStr);
            const isCurrentMonth = dObj.getMonth() === month;
            const isToday = dayStr === todayStr;
            const isSelected = dayStr === selectedDate;
            const dayTasks = tasks
              .filter((t) => doesTaskOccurOnDate(t, dayStr))
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={dayStr}
                onClick={() => onSelectDate(dayStr)}
                onDoubleClick={() => onCreateAtSlot(dayStr, '09:00', '10:00')}
                className={`group relative flex flex-col p-1.5 sm:p-2 transition-colors cursor-pointer overflow-hidden ${
                  !isCurrentMonth
                    ? 'bg-slate-50/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                    : 'bg-white dark:bg-slate-900'
                } ${
                  isSelected
                    ? 'ring-2 ring-inset ring-indigo-500/70 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Day Number & Quick Add Button */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isSelected
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : ''
                    }`}
                  >
                    {dObj.getDate()}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateAtSlot(dayStr, '09:00', '10:00');
                    }}
                    title="Add task on this date"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Tasks & Routines List */}
                <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 scrollbar-thin">
                  {dayTasks.slice(0, 4).map((task) => {
                    const done = isTaskCompletedOnDate(task, dayStr);
                    const palette = COLOR_PALETTE[task.color] || COLOR_PALETTE.blue;
                    return (
                      <div
                        key={`${task.id}-${dayStr}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(task);
                        }}
                        className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium border-l-2 ${palette.bg} ${palette.border} ${palette.text} ${
                          done ? 'opacity-50 line-through' : ''
                        } hover:brightness-95 transition-all truncate`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleComplete(task.id, dayStr);
                          }}
                          className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border ${
                            done
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-current opacity-70 hover:opacity-100'
                          }`}
                        >
                          {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                        {task.isRoutine && <Repeat className="w-2.5 h-2.5 flex-shrink-0 opacity-80" />}
                        {!task.allDay && (
                          <span className="opacity-75 text-[10px] hidden sm:inline">
                            {task.startTime}
                          </span>
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}
                  {dayTasks.length > 4 && (
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 pl-1">
                      +{dayTasks.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. WEEK VIEW & 3. DAY VIEW (Google Calendar Time-Grid)
  // ============================================================================
  if (viewMode === 'week' || viewMode === 'day') {
    const columns = viewMode === 'week' ? getWeekDays(selectedDate, true) : [selectedDate];

    const handleGridMouseDown = (dateStr: string, e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const snappedMin = Math.floor(offsetY / 15) * 15;
      setDragDate(dateStr);
      setDragStartMin(snappedMin);
      setDragEndMin(snappedMin + 60);
    };

    const handleGridMouseMove = (dateStr: string, e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragDate || dragStartMin === null || dateStr !== dragDate) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = Math.max(0, Math.min(24 * HOUR_HEIGHT, e.clientY - rect.top));
      const snappedMin = Math.max(dragStartMin + 30, Math.ceil(offsetY / 15) * 15);
      setDragEndMin(snappedMin);
    };

    const handleGridMouseUp = () => {
      if (dragDate && dragStartMin !== null && dragEndMin !== null) {
        const startMin = Math.min(dragStartMin, dragEndMin);
        const endMin = Math.max(startMin + 30, Math.max(dragStartMin, dragEndMin));
        onCreateAtSlot(dragDate, minutesToTime(startMin), minutesToTime(endMin));
      }
      setDragDate(null);
      setDragStartMin(null);
      setDragEndMin(null);
    };

    return (
      <div
        className="flex flex-col h-full bg-white dark:bg-slate-900 select-none overflow-hidden"
        onMouseUp={handleGridMouseUp}
      >
        {/* Top Day Column Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
          <div className="w-14 sm:w-16 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 py-2 text-center text-[10px] font-semibold text-slate-400">
            GMT
          </div>
          <div
            className={`flex-1 grid ${
              columns.length === 7 ? 'grid-cols-7' : 'grid-cols-1'
            } divide-x divide-slate-200 dark:divide-slate-800`}
          >
            {columns.map((dayStr) => {
              const dObj = parseDateStr(dayStr);
              const isToday = dayStr === todayStr;
              const isSelected = dayStr === selectedDate;
              const allDayItems = tasks.filter(
                (t) => doesTaskOccurOnDate(t, dayStr) && t.allDay
              );

              return (
                <div
                  key={dayStr}
                  onClick={() => onSelectDate(dayStr)}
                  className="p-2 flex flex-col items-center cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isToday
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {WEEKDAY_NAMES_SHORT[dObj.getDay()]}
                  </span>
                  <span
                    className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {dObj.getDate()}
                  </span>

                  {/* All-Day Banner Pills */}
                  {allDayItems.length > 0 && (
                    <div className="w-full mt-1.5 space-y-1">
                      {allDayItems.map((item) => {
                        const done = isTaskCompletedOnDate(item, dayStr);
                        const palette = COLOR_PALETTE[item.color] || COLOR_PALETTE.blue;
                        return (
                          <div
                            key={`${item.id}-allday-${dayStr}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(item);
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${palette.solid} ${
                              done ? 'opacity-50 line-through' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() => {}}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleComplete(item.id, dayStr);
                              }}
                              className="w-3 h-3 rounded cursor-pointer"
                            />
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable 24-Hour Time Grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative flex">
          {/* Left Hour Labels */}
          <div className="w-14 sm:w-16 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="relative pr-2 text-right text-[11px] font-medium text-slate-400 dark:text-slate-500"
              >
                <span className="-top-2 relative">
                  {hour === 0 ? '' : `${String(hour).padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          <div
            className={`flex-1 grid ${
              columns.length === 7 ? 'grid-cols-7' : 'grid-cols-1'
            } divide-x divide-slate-200 dark:divide-slate-800 relative`}
          >
            {columns.map((dayStr) => {
              const isToday = dayStr === todayStr;
              const timedTasks = tasks
                .filter((t) => doesTaskOccurOnDate(t, dayStr) && !t.allDay)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div
                  key={dayStr}
                  style={{ height: 24 * HOUR_HEIGHT }}
                  onMouseDown={(e) => handleGridMouseDown(dayStr, e)}
                  onMouseMove={(e) => handleGridMouseMove(dayStr, e)}
                  className="relative group"
                >
                  {/* Hourly Horizontal Guide Lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: HOUR_HEIGHT }}
                      className="border-b border-slate-100 dark:border-slate-800/70 pointer-events-none"
                    />
                  ))}

                  {/* Live Red Current Time Line */}
                  {isToday && (
                    <div
                      style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT}px` }}
                      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shadow" />
                      <div className="h-[2px] w-full bg-rose-500" />
                    </div>
                  )}

                  {/* Drag-to-Create Preview Box */}
                  {dragDate === dayStr && dragStartMin !== null && dragEndMin !== null && (
                    <div
                      style={{
                        top: `${Math.min(dragStartMin, dragEndMin)}px`,
                        height: `${Math.max(30, Math.abs(dragEndMin - dragStartMin))}px`,
                      }}
                      className="absolute left-1 right-1 z-30 rounded-lg bg-indigo-500/30 border-2 border-indigo-500 px-2 py-1 text-xs font-bold text-indigo-900 dark:text-indigo-100 pointer-events-none"
                    >
                      New Task ({minutesToTime(Math.min(dragStartMin, dragEndMin))} –{' '}
                      {minutesToTime(Math.max(dragStartMin + 30, dragEndMin))})
                    </div>
                  )}

                  {/* Scheduled Timed Tasks & Routines */}
                  {timedTasks.map((task, idx) => {
                    const startMin = timeToMinutes(task.startTime);
                    const endMin = Math.max(startMin + 30, timeToMinutes(task.endTime));
                    const height = Math.max(30, endMin - startMin);
                    const done = isTaskCompletedOnDate(task, dayStr);
                    const palette = COLOR_PALETTE[task.color] || COLOR_PALETTE.blue;

                    // Slight horizontal offset if two tasks start at the exact same minute
                    const sameSlotIndex = timedTasks
                      .slice(0, idx)
                      .filter((other) => Math.abs(timeToMinutes(other.startTime) - startMin) < 30)
                      .length;
                    const leftOffsetPct = Math.min(sameSlotIndex * 12, 36);

                    return (
                      <div
                        key={`${task.id}-${dayStr}`}
                        style={{
                          top: `${startMin}px`,
                          height: `${height}px`,
                          left: `calc(${leftOffsetPct}% + 2px)`,
                          right: '4px',
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(task);
                        }}
                        className={`absolute z-10 rounded-lg border-l-4 p-1.5 shadow-sm backdrop-blur-xs transition-all cursor-pointer overflow-hidden ${palette.bg} ${palette.border} ${palette.text} ${
                          done ? 'opacity-55' : 'hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleComplete(task.id, dayStr);
                              }}
                              title={done ? 'Mark incomplete' : 'Mark as done'}
                              className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                                done
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-current bg-white/50 dark:bg-slate-900/50'
                              }`}
                            >
                              {done && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>

                            <span
                              className={`text-xs font-bold truncate ${
                                done ? 'line-through' : ''
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          {task.isRoutine && (
                            <span
                              title={getRoutineDescription(task)}
                              className="flex-shrink-0 p-0.5 rounded bg-black/5 dark:bg-white/10"
                            >
                              <Repeat className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        {height >= 44 && (
                          <div className="mt-0.5 text-[10px] opacity-80 font-medium flex items-center gap-1 truncate pl-5">
                            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                            <span>
                              {task.startTime} – {task.endTime}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. AGENDA / SCHEDULE VIEW
  // ============================================================================
  const upcomingDays = Array.from({ length: 21 }, (_, i) => addDays(selectedDate, i));

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50 space-y-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {upcomingDays.map((dayStr) => {
          const dayTasks = tasks
            .filter((t) => doesTaskOccurOnDate(t, dayStr))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          if (dayTasks.length === 0 && dayStr !== selectedDate && dayStr !== todayStr) {
            return null;
          }

          const isToday = dayStr === todayStr;

          return (
            <div
              key={dayStr}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
            >
              {/* Date Group Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon
                    className={`w-4 h-4 ${
                      isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatReadableDate(dayStr)}
                  </span>
                  {isToday && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-600 text-white">
                      Today
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onCreateAtSlot(dayStr, '09:00', '10:00')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Task
                </button>
              </div>

              {/* Tasks in Day */}
              {dayTasks.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  No tasks or routines scheduled for this day.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {dayTasks.map((task) => {
                    const done = isTaskCompletedOnDate(task, dayStr);
                    const palette = COLOR_PALETTE[task.color] || COLOR_PALETTE.blue;
                    const streak = task.isRoutine ? calculateRoutineStreak(task, todayStr) : 0;
                    const itemKey = `${task.id}-${dayStr}`;

                    return (
                      <div
                        key={itemKey}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Done Checkbox */}
                          <button
                            type="button"
                            onClick={() => onToggleComplete(task.id, dayStr)}
                            className={`w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                              done
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                            }`}
                          >
                            {done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          {/* Color Dot */}
                          <div className={`w-2.5 h-8 rounded-full flex-shrink-0 ${palette.dot}`} />

                          {/* Time & Title */}
                          <div className="min-w-0 flex-1">
                            {renamingKey === itemKey ? (
                              <input
                                type="text"
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => commitInlineRename(task.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitInlineRename(task.id);
                                  if (e.key === 'Escape') setRenamingKey(null);
                                }}
                                className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-indigo-500 text-sm font-semibold"
                              />
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  onClick={() => onEditTask(task)}
                                  className={`text-sm font-semibold cursor-pointer ${
                                    done
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {task.isRoutine && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-600 dark:text-violet-300">
                                    <Repeat className="w-2.5 h-2.5" />
                                    {getRoutineDescription(task)}
                                  </span>
                                )}
                                {task.isRoutine && streak > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    <Flame className="w-2.5 h-2.5" />
                                    {streak} streak
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>
                                {task.allDay ? 'All Day' : `${task.startTime} – ${task.endTime}`}
                              </span>
                              <span>•</span>
                              <span>{task.category}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions: Rename, Edit, Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => startInlineRename(itemKey, task.title, e)}
                            title="Quick Rename"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
