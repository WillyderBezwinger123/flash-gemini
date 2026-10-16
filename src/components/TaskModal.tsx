import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Flame,
  Repeat,
  Trash2,
  X,
  Bell,
  Tag,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  CustomRecurrenceUnit,
  RecurrenceType,
  TaskColor,
  TaskItem,
  TaskPriority,
} from '../types';
import {
  COLOR_PALETTE,
  WEEKDAY_NAMES_SHORT,
  parseDateStr,
} from '../utils/dateUtils';

interface TaskModalProps {
  isOpen: boolean;
  initialDate: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialIsRoutine?: boolean;
  editingTask?: TaskItem | null;
  onClose: () => void;
  onSave: (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
  onDelete?: (taskId: string) => void;
}

const CATEGORIES = ['General', 'Work', 'Personal', 'Fitness', 'Health', 'Study', 'Routine'];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  initialDate,
  initialStartTime = '09:00',
  initialEndTime = '10:00',
  initialIsRoutine = false,
  editingTask,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState<TaskColor>('blue');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('General');
  const [isRoutine, setIsRoutine] = useState(initialIsRoutine);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    initialIsRoutine ? 'daily' : 'none'
  );
  const [customInterval, setCustomInterval] = useState<number>(2);
  const [customUnit, setCustomUnit] = useState<CustomRecurrenceUnit>('days');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [endDate, setEndDate] = useState<string>('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(15);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setDate(editingTask.date);
      setStartTime(editingTask.startTime || '09:00');
      setEndTime(editingTask.endTime || '10:00');
      setAllDay(editingTask.allDay);
      setColor(editingTask.color);
      setPriority(editingTask.priority);
      setCategory(editingTask.category || 'General');
      setIsRoutine(editingTask.isRoutine);
      setRecurrenceType(
        editingTask.isRoutine
          ? editingTask.recurrence.type === 'none'
            ? 'daily'
            : editingTask.recurrence.type
          : 'none'
      );
      setCustomInterval(editingTask.recurrence.interval || 2);
      setCustomUnit(editingTask.recurrence.unit || 'days');
      setDaysOfWeek(editingTask.recurrence.daysOfWeek || []);
      setEndDate(editingTask.recurrence.endDate || '');
      setReminderMinutes(editingTask.reminderMinutes);
    } else {
      setTitle('');
      setDescription('');
      setDate(initialDate);
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setAllDay(false);
      setColor(initialIsRoutine ? 'violet' : 'blue');
      setPriority('medium');
      setCategory(initialIsRoutine ? 'Routine' : 'General');
      setIsRoutine(initialIsRoutine);
      setRecurrenceType(initialIsRoutine ? 'daily' : 'none');
      setCustomInterval(2);
      setCustomUnit('days');
      const defaultDow = parseDateStr(initialDate).getDay();
      setDaysOfWeek([defaultDow]);
      setEndDate('');
      setReminderMinutes(15);
    }
  }, [editingTask, initialDate, initialStartTime, initialEndTime, initialIsRoutine, isOpen]);

  if (!isOpen) return null;

  const toggleDayOfWeek = (dow: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(dow)
        ? prev.length > 1
          ? prev.filter((d) => d !== dow)
          : prev
        : [...prev, dow].sort()
    );
  };

  const handleRoutineToggle = (enabled: boolean) => {
    setIsRoutine(enabled);
    if (enabled && recurrenceType === 'none') {
      setRecurrenceType('daily');
    } else if (!enabled) {
      setRecurrenceType('none');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim() || (isRoutine ? 'Untitled Routine' : 'Untitled Task');

    onSave(
      {
        title: trimmedTitle,
        description: description.trim(),
        date,
        startTime: allDay ? '09:00' : startTime,
        endTime: allDay ? '10:00' : endTime,
        allDay,
        color,
        priority,
        category,
        isRoutine,
        recurrence: {
          type: isRoutine ? recurrenceType : 'none',
          interval: recurrenceType === 'every_3_days' ? 3 : Math.max(1, customInterval || 1),
          unit: recurrenceType === 'every_3_days' ? 'days' : customUnit,
          daysOfWeek:
            recurrenceType === 'weekly' || (recurrenceType === 'custom' && customUnit === 'weeks')
              ? daysOfWeek.length > 0
                ? daysOfWeek
                : [parseDateStr(date).getDay()]
              : [],
          endDate: endDate ? endDate : null,
        },
        completed: editingTask ? editingTask.completed : false,
        completedDates: editingTask ? editingTask.completedDates : [],
        skippedDates: editingTask ? editingTask.skippedDates : [],
        reminderMinutes,
      },
      editingTask?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Color Accent Bar */}
        <div className={`h-2 w-full ${COLOR_PALETTE[color].dot}`} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {isRoutine ? (
              <span className="p-2 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Repeat className="w-5 h-5" />
              </span>
            ) : (
              <span className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingTask
                  ? isRoutine
                    ? 'Edit Routine Task'
                    : 'Edit Task / Event'
                  : isRoutine
                  ? 'New Routine Task'
                  : 'New Task / Calendar Event'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Syncs across your Laptop and Android Smartphone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Task vs Routine Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => handleRoutineToggle(false)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                !isRoutine
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              One-Time Task
            </button>
            <button
              type="button"
              onClick={() => handleRoutineToggle(true)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                isRoutine
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              Routine Task
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isRoutine
                  ? 'e.g., Workout, Language Practice, Meditate...'
                  : 'e.g., Dentist Appointment, Submit Report...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            />
          </div>

          {/* Routine Configuration Panel */}
          {isRoutine && (
            <div className="p-3.5 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Routine Frequency
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'daily', label: 'Daily' },
                  { id: 'every_3_days', label: 'Every 3 Days' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'custom', label: 'Custom' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRecurrenceType(opt.id as RecurrenceType)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      recurrenceType === opt.id
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Weekly Day Picker */}
              {(recurrenceType === 'weekly' ||
                (recurrenceType === 'custom' && customUnit === 'weeks')) && (
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
                    Repeat on days:
                  </label>
                  <div className="flex items-center justify-between gap-1">
                    {WEEKDAY_NAMES_SHORT.map((dayName, idx) => {
                      const active = daysOfWeek.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleDayOfWeek(idx)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            active
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {dayName.slice(0, 2)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Interval Picker */}
              {recurrenceType === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Repeat every
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-center"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as CustomRecurrenceUnit)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              )}

              {/* Optional End Date */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Routine End Date (optional):
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
            </div>
          )}

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {isRoutine ? 'Start Date' : 'Date'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  All-day {isRoutine ? 'routine' : 'task'}
                </span>
              </label>
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>
          )}

          {/* Category, Priority & Reminder */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High 🔥</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Reminder
              </label>
              <select
                value={reminderMinutes === null ? 'none' : String(reminderMinutes)}
                onChange={(e) =>
                  setReminderMinutes(e.target.value === 'none' ? null : Number(e.target.value))
                }
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="none">None</option>
                <option value="0">At start time</option>
                <option value="5">5 min before</option>
                <option value="10">10 min before</option>
                <option value="15">15 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
              </select>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Calendar Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(COLOR_PALETTE) as TaskColor[]).map((cKey) => (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => setColor(cKey)}
                  title={COLOR_PALETTE[cKey].name}
                  className={`w-7 h-7 rounded-full ${COLOR_PALETTE[cKey].dot} transition-transform flex items-center justify-center ${
                    color === cKey
                      ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Notes / Details
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add optional notes, checklist items, or links..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {editingTask && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingTask.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all"
              >
                {editingTask ? 'Save Changes' : isRoutine ? 'Create Routine' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
