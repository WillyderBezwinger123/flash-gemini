import { TaskColor, TaskItem } from '../types';

export const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const COLOR_PALETTE: Record<
  TaskColor,
  {
    name: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
    badge: string;
    solid: string;
  }
> = {
  blue: {
    name: 'Ocean Blue',
    bg: 'bg-blue-500/15 dark:bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-200',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    solid: 'bg-blue-600 text-white',
  },
  emerald: {
    name: 'Emerald Green',
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    border: 'border-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    solid: 'bg-emerald-600 text-white',
  },
  violet: {
    name: 'Royal Violet',
    bg: 'bg-violet-500/15 dark:bg-violet-500/20',
    border: 'border-violet-500',
    text: 'text-violet-700 dark:text-violet-200',
    dot: 'bg-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    solid: 'bg-violet-600 text-white',
  },
  amber: {
    name: 'Warm Amber',
    bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    border: 'border-amber-500',
    text: 'text-amber-800 dark:text-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    solid: 'bg-amber-500 text-white',
  },
  rose: {
    name: 'Coral Rose',
    bg: 'bg-rose-500/15 dark:bg-rose-500/20',
    border: 'border-rose-500',
    text: 'text-rose-700 dark:text-rose-200',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    solid: 'bg-rose-600 text-white',
  },
  cyan: {
    name: 'Sky Cyan',
    bg: 'bg-cyan-500/15 dark:bg-cyan-500/20',
    border: 'border-cyan-500',
    text: 'text-cyan-800 dark:text-cyan-200',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
    solid: 'bg-cyan-600 text-white',
  },
  indigo: {
    name: 'Deep Indigo',
    bg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
    border: 'border-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-200',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    solid: 'bg-indigo-600 text-white',
  },
  slate: {
    name: 'Graphite Slate',
    bg: 'bg-slate-500/15 dark:bg-slate-500/20',
    border: 'border-slate-500',
    text: 'text-slate-700 dark:text-slate-200',
    dot: 'bg-slate-500',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    solid: 'bg-slate-600 text-white',
  },
};

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(dateStr: string, days: number): string {
  const dt = parseDateStr(dateStr);
  dt.setDate(dt.getDate() + days);
  return toDateStr(dt);
}

export function diffInDays(startDateStr: string, endDateStr: string): number {
  const d1 = parseDateStr(startDateStr);
  const d2 = parseDateStr(endDateStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

export function getStartOfWeek(dateStr: string, weekStartsOnMonday = true): string {
  const dt = parseDateStr(dateStr);
  const day = dt.getDay(); // 0=Sun .. 6=Sat
  const diff = weekStartsOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
  dt.setDate(dt.getDate() + diff);
  return toDateStr(dt);
}

export function getWeekDays(anchorDateStr: string, weekStartsOnMonday = true): string[] {
  const start = getStartOfWeek(anchorDateStr, weekStartsOnMonday);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthGridDays(year: number, monthIndex: number, weekStartsOnMonday = true): string[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1, 12, 0, 0);
  const startStr = getStartOfWeek(toDateStr(firstDayOfMonth), weekStartsOnMonday);
  return Array.from({ length: 42 }, (_, i) => addDays(startStr, i));
}

export function formatReadableDate(dateStr: string): string {
  const dt = parseDateStr(dateStr);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const dt = parseDateStr(dateStr);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Determines whether a task or routine occurs on a given target YYYY-MM-DD date.
 */
export function doesTaskOccurOnDate(task: TaskItem, targetDateStr: string): boolean {
  if (task.deleted) return false;
  if (task.skippedDates?.includes(targetDateStr)) return false;

  if (!task.isRoutine || task.recurrence.type === 'none') {
    return task.date === targetDateStr;
  }

  const diff = diffInDays(task.date, targetDateStr);
  if (diff < 0) return false;

  if (task.recurrence.endDate && targetDateStr > task.recurrence.endDate) {
    return false;
  }

  const targetDate = parseDateStr(targetDateStr);
  const startDate = parseDateStr(task.date);
  const targetDow = targetDate.getDay();

  switch (task.recurrence.type) {
    case 'daily':
      return true;

    case 'every_3_days':
      return diff % 3 === 0;

    case 'weekly': {
      const days =
        task.recurrence.daysOfWeek && task.recurrence.daysOfWeek.length > 0
          ? task.recurrence.daysOfWeek
          : [startDate.getDay()];
      return days.includes(targetDow);
    }

    case 'custom': {
      const interval = Math.max(1, task.recurrence.interval || 1);
      const unit = task.recurrence.unit || 'days';

      if (unit === 'days') {
        return diff % interval === 0;
      }

      if (unit === 'weeks') {
        const startWeek = getStartOfWeek(task.date, true);
        const targetWeek = getStartOfWeek(targetDateStr, true);
        const weeksDiff = Math.round(diffInDays(startWeek, targetWeek) / 7);
        if (weeksDiff < 0 || weeksDiff % interval !== 0) return false;
        const days =
          task.recurrence.daysOfWeek && task.recurrence.daysOfWeek.length > 0
            ? task.recurrence.daysOfWeek
            : [startDate.getDay()];
        return days.includes(targetDow);
      }

      if (unit === 'months') {
        if (targetDate.getDate() !== startDate.getDate()) return false;
        const monthsDiff =
          (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
          (targetDate.getMonth() - startDate.getMonth());
        return monthsDiff >= 0 && monthsDiff % interval === 0;
      }

      return false;
    }

    default:
      return task.date === targetDateStr;
  }
}

/**
 * Checks if a task (one-off or routine) is marked completed on a specific YYYY-MM-DD date.
 */
export function isTaskCompletedOnDate(task: TaskItem, targetDateStr: string): boolean {
  if (!task.isRoutine || task.recurrence.type === 'none') {
    return task.completed;
  }
  return task.completedDates.includes(targetDateStr);
}

/**
 * Returns human-friendly description of a routine schedule.
 */
export function getRoutineDescription(task: TaskItem): string {
  if (!task.isRoutine || task.recurrence.type === 'none') {
    return 'One-time task';
  }
  const timePart = task.allDay ? 'All day' : `${task.startTime} – ${task.endTime}`;

  switch (task.recurrence.type) {
    case 'daily':
      return `Daily • ${timePart}`;
    case 'every_3_days':
      return `Every 3 days • ${timePart}`;
    case 'weekly': {
      const days =
        task.recurrence.daysOfWeek?.length > 0
          ? task.recurrence.daysOfWeek.map((d) => WEEKDAY_NAMES_SHORT[d]).join(', ')
          : WEEKDAY_NAMES_SHORT[parseDateStr(task.date).getDay()];
      return `Weekly (${days}) • ${timePart}`;
    }
    case 'custom': {
      const interval = Math.max(1, task.recurrence.interval || 1);
      const unit = task.recurrence.unit || 'days';
      if (unit === 'weeks' && task.recurrence.daysOfWeek?.length > 0) {
        const days = task.recurrence.daysOfWeek.map((d) => WEEKDAY_NAMES_SHORT[d]).join(', ');
        return `Every ${interval} ${interval === 1 ? 'week' : 'weeks'} on ${days} • ${timePart}`;
      }
      const unitLabel = interval === 1 ? unit.slice(0, -1) : unit;
      return `Every ${interval} ${unitLabel} • ${timePart}`;
    }
    default:
      return timePart;
  }
}

/**
 * Calculates the current consecutive completion streak for a routine up to `todayStr`.
 */
export function calculateRoutineStreak(task: TaskItem, todayStr: string): number {
  if (!task.isRoutine || task.recurrence.type === 'none') {
    return task.completed ? 1 : 0;
  }
  let streak = 0;
  let cursor = todayStr;

  // Check up to 365 days back
  for (let i = 0; i < 365; i++) {
    if (cursor < task.date) break;
    if (doesTaskOccurOnDate(task, cursor)) {
      const done = task.completedDates.includes(cursor);
      if (done) {
        streak++;
      } else if (cursor !== todayStr) {
        // Missed a past scheduled occurrence
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Finds the next scheduled occurrence date for a routine on or after `fromDateStr`.
 */
export function getNextOccurrenceDate(task: TaskItem, fromDateStr: string): string | null {
  for (let i = 0; i < 180; i++) {
    const candidate = addDays(fromDateStr, i);
    if (doesTaskOccurOnDate(task, candidate)) {
      return candidate;
    }
  }
  return null;
}
