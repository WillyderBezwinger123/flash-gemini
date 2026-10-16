import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Flame,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Sun,
} from 'lucide-react';
import {
  CalendarViewMode,
  MainSection,
  SyncConfig,
  TaskItem,
} from './types';
import {
  MONTH_NAMES,
  addDays,
  doesTaskOccurOnDate,
  getMonthGridDays,
  isTaskCompletedOnDate,
  parseDateStr,
  timeToMinutes,
  toDateStr,
} from './utils/dateUtils';
import {
  loadLocalState,
  saveLocalState,
  syncWithGitHubGist,
  syncWithSupabase,
} from './services/syncService';
import { CalendarViews } from './components/CalendarViews';
import { TasksAndRoutinesPanel } from './components/TasksAndRoutinesPanel';
import { TaskModal } from './components/TaskModal';
import { CloudSyncModal } from './components/CloudSyncModal';

export const App: React.FC = () => {
  const todayStr = toDateStr(new Date());

  // Core State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    provider: 'none',
    autoSync: true,
    lastSyncedAt: null,
  });
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Navigation & UI State
  const [mainSection, setMainSection] = useState<MainSection>('calendar');
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sidebar Filters
  const [showOneTimeTasks, setShowOneTimeTasks] = useState<boolean>(true);
  const [showRoutines, setShowRoutines] = useState<boolean>(true);
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // Modals State
  const [taskModalOpen, setTaskModalOpen] = useState<boolean>(false);
  const [modalInitialDate, setModalInitialDate] = useState<string>(todayStr);
  const [modalInitialStart, setModalInitialStart] = useState<string>('09:00');
  const [modalInitialEnd, setModalInitialEnd] = useState<string>('10:00');
  const [modalInitialIsRoutine, setModalInitialIsRoutine] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Cloud Sync Modal & Status
  const [syncModalOpen, setSyncModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Load initial persisted state
  useEffect(() => {
    loadLocalState().then((loaded) => {
      setTasks(loaded.tasks);
      setSyncConfig(loaded.syncConfig);
      setDarkMode(loaded.darkMode);
      setIsLoaded(true);
    });
  }, []);

  // Apply Dark Mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Persist locally whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    saveLocalState({ tasks, syncConfig, darkMode });
  }, [tasks, syncConfig, darkMode, isLoaded]);

  // Cloud Sync Execution
  const triggerCloudSync = useCallback(
    async (overrideConfig?: SyncConfig, overrideTasks?: TaskItem[]) => {
      const cfg = overrideConfig || syncConfig;
      const currentTasks = overrideTasks || tasks;
      if (cfg.provider === 'none') return;

      setIsSyncing(true);
      setSyncError(null);

      try {
        if (cfg.provider === 'github_gist') {
          const { mergedTasks, gistId } = await syncWithGitHubGist(currentTasks, cfg);
          const updatedCfg: SyncConfig = {
            ...cfg,
            githubGistId: gistId,
            lastSyncedAt: Date.now(),
          };
          setTasks(mergedTasks);
          setSyncConfig(updatedCfg);
          setSyncStatusMessage(`Synced with GitHub Cloud Gist (${gistId.slice(0, 8)}...)`);
        } else if (cfg.provider === 'supabase') {
          const { mergedTasks } = await syncWithSupabase(currentTasks, cfg);
          const updatedCfg: SyncConfig = {
            ...cfg,
            lastSyncedAt: Date.now(),
          };
          setTasks(mergedTasks);
          setSyncConfig(updatedCfg);
          setSyncStatusMessage(`Synced with Supabase Cloud (${cfg.supabaseSyncKey})`);
        }
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSyncing(false);
      }
    },
    [syncConfig, tasks]
  );

  // One-click GitHub CLI auto-connect in Electron
  const handleAutoConnectGitHub = async () => {
    if (!window.electronAPI?.detectGhToken) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await window.electronAPI.detectGhToken();
      if (!res.ok || !res.token) {
        throw new Error(res.error || 'Could not detect GitHub CLI login');
      }
      const nextConfig: SyncConfig = {
        ...syncConfig,
        provider: 'github_gist',
        autoSync: true,
        githubToken: res.token,
        githubUsername: res.username,
      };
      setSyncConfig(nextConfig);
      await triggerCloudSync(nextConfig, tasks);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
      setIsSyncing(false);
    }
  };

  // Periodic background cloud sync every 45 seconds when enabled
  useEffect(() => {
    if (!isLoaded || syncConfig.provider === 'none' || !syncConfig.autoSync) return;
    const timer = setInterval(() => {
      triggerCloudSync();
    }, 45000);
    return () => clearInterval(timer);
  }, [isLoaded, syncConfig, triggerCloudSync]);

  // Reminder Notifications Check every 30s
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentDayStr = toDateStr(now);
      const currentMin = now.getHours() * 60 + now.getMinutes();

      tasks.forEach((task) => {
        if (task.deleted || task.allDay || task.reminderMinutes === null) return;
        if (!doesTaskOccurOnDate(task, currentDayStr)) return;
        if (isTaskCompletedOnDate(task, currentDayStr)) return;

        const taskStartMin = timeToMinutes(task.startTime);
        const triggerMin = taskStartMin - task.reminderMinutes;
        const notifyKey = `${task.id}-${currentDayStr}-${triggerMin}`;

        if (currentMin === triggerMin && !notifiedIdsRef.current.has(notifyKey)) {
          notifiedIdsRef.current.add(notifyKey);
          const title = task.isRoutine ? `Routine Reminder: ${task.title}` : `Task Reminder: ${task.title}`;
          const body = `Scheduled at ${task.startTime}`;

          if (window.electronAPI?.notify) {
            window.electronAPI.notify({ title, body });
          } else if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Task CRUD Handlers
  const handleSaveTask = (
    taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    const now = Date.now();
    let updatedList: TaskItem[];

    if (existingId) {
      updatedList = tasks.map((t) =>
        t.id === existingId
          ? {
              ...t,
              ...taskData,
              updatedAt: now,
            }
          : t
      );
    } else {
      const newTask: TaskItem = {
        ...taskData,
        id: `task-${now}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        updatedAt: now,
      };
      updatedList = [...tasks, newTask];
    }

    setTasks(updatedList);
    if (syncConfig.provider !== 'none' && syncConfig.autoSync) {
      triggerCloudSync(syncConfig, updatedList);
    }
  };

  const handleQuickAddTask = (
    title: string,
    isRoutine: boolean,
    presetType: 'daily' | 'every_3_days' | 'weekly' = 'daily'
  ) => {
    const now = Date.now();
    const newTask: TaskItem = {
      id: `task-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description: '',
      date: selectedDate,
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      color: isRoutine ? 'violet' : 'blue',
      priority: 'medium',
      category: isRoutine ? 'Routine' : 'General',
      isRoutine,
      recurrence: {
        type: isRoutine ? presetType : 'none',
        interval: presetType === 'every_3_days' ? 3 : 1,
        unit: presetType === 'weekly' ? 'weeks' : 'days',
        daysOfWeek: presetType === 'weekly' ? [parseDateStr(selectedDate).getDay()] : [],
        endDate: null,
      },
      completed: false,
      completedDates: [],
      skippedDates: [],
      reminderMinutes: 15,
      createdAt: now,
      updatedAt: now,
    };

    const updatedList = [...tasks, newTask];
    setTasks(updatedList);
    if (syncConfig.provider !== 'none' && syncConfig.autoSync) {
      triggerCloudSync(syncConfig, updatedList);
    }
  };

  const handleToggleComplete = (taskId: string, dateStr: string) => {
    const now = Date.now();
    const updatedList = tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (!t.isRoutine || t.recurrence.type === 'none') {
        return { ...t, completed: !t.completed, updatedAt: now };
      }
      const alreadyDone = t.completedDates.includes(dateStr);
      const nextCompletedDates = alreadyDone
        ? t.completedDates.filter((d) => d !== dateStr)
        : [...t.completedDates, dateStr];
      return {
        ...t,
        completedDates: nextCompletedDates,
        updatedAt: now,
      };
    });

    setTasks(updatedList);
    if (syncConfig.provider !== 'none' && syncConfig.autoSync) {
      triggerCloudSync(syncConfig, updatedList);
    }
  };

  const handleQuickRename = (taskId: string, newTitle: string) => {
    const now = Date.now();
    const updatedList = tasks.map((t) =>
      t.id === taskId ? { ...t, title: newTitle, updatedAt: now } : t
    );
    setTasks(updatedList);
    if (syncConfig.provider !== 'none' && syncConfig.autoSync) {
      triggerCloudSync(syncConfig, updatedList);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const now = Date.now();
    // Soft-delete with tombstone so deletion syncs across laptop and smartphone
    const updatedList = tasks.map((t) =>
      t.id === taskId ? { ...t, deleted: true, updatedAt: now } : t
    );
    setTasks(updatedList);
    if (syncConfig.provider !== 'none' && syncConfig.autoSync) {
      triggerCloudSync(syncConfig, updatedList);
    }
  };

  // Filtered tasks for Calendar & Views
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.deleted) return false;
      if (!showOneTimeTasks && !t.isRoutine) return false;
      if (!showRoutines && t.isRoutine) return false;
      if (!showCompleted && !t.isRoutine && t.completed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tasks, showOneTimeTasks, showRoutines, showCompleted, searchQuery]);

  // Date Navigation Helpers
  const handleNavigateDate = (direction: -1 | 1) => {
    if (calendarView === 'day') {
      setSelectedDate((prev) => addDays(prev, direction));
    } else if (calendarView === 'week' || calendarView === 'agenda') {
      setSelectedDate((prev) => addDays(prev, direction * 7));
    } else {
      const dt = parseDateStr(selectedDate);
      dt.setMonth(dt.getMonth() + direction);
      setSelectedDate(toDateStr(dt));
    }
  };

  // Mini Calendar Month Grid
  const selectedDateObj = parseDateStr(selectedDate);
  const miniCalDays = getMonthGridDays(
    selectedDateObj.getFullYear(),
    selectedDateObj.getMonth(),
    true
  );

  // Today's Progress Stats
  const todayScheduled = tasks.filter((t) => !t.deleted && doesTaskOccurOnDate(t, todayStr));
  const todayCompletedCount = todayScheduled.filter((t) =>
    isTaskCompletedOnDate(t, todayStr)
  ).length;
  const todayProgressPct =
    todayScheduled.length > 0
      ? Math.round((todayCompletedCount / todayScheduled.length) * 100)
      : 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* ==================================================================== */}
      {/* TOP BAR (Google Calendar Style)                                      */}
      {/* ==================================================================== */}
      <header className="h-16 flex-shrink-0 px-3 sm:px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 z-30">
        {/* Left: Menu + Brand + Date Nav */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="hidden md:flex p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight hidden sm:inline">
              Flash
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Today
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleNavigateDate(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleNavigateDate(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {MONTH_NAMES[selectedDateObj.getMonth()]} {selectedDateObj.getFullYear()}
          </h1>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input (Desktop) */}
          <div className="relative hidden lg:block w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks & routines..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-transparent focus:border-indigo-500 text-xs focus:outline-none"
            />
          </div>

          {/* Calendar View Switcher (when in Calendar section) */}
          {mainSection === 'calendar' && (
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(['day', 'week', 'month', 'agenda'] as CalendarViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalendarView(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    calendarView === v
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {v === 'agenda' ? 'Schedule' : v}
                </button>
              ))}
            </div>
          )}

          {/* Cloud Sync Button */}
          <button
            type="button"
            onClick={() => setSyncModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              syncConfig.provider !== 'none'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Configure Free Cloud Sync between Laptop & Smartphone"
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            ) : (
              <Cloud className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {syncConfig.provider === 'none' ? 'Cloud Sync' : 'Synced'}
            </span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Toggle Dark / Light Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN WORKSPACE (Sidebar + Active Canvas)                             */}
      {/* ==================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Collapsible Left Sidebar */}
        {sidebarOpen && (
          <aside className="hidden md:flex w-68 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col justify-between p-4 overflow-y-auto select-none">
            <div className="space-y-6">
              {/* Primary Create Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setModalInitialDate(selectedDate);
                    setModalInitialStart('09:00');
                    setModalInitialEnd('10:00');
                    setModalInitialIsRoutine(false);
                    setTaskModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setModalInitialDate(selectedDate);
                    setModalInitialStart('08:00');
                    setModalInitialEnd('08:45');
                    setModalInitialIsRoutine(true);
                    setTaskModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-500/20 transition-all"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  New Routine
                </button>
              </div>

              {/* Section Switcher */}
              <nav className="space-y-1">
                {[
                  { id: 'calendar', label: 'Google-Style Calendar', icon: CalendarIcon },
                  { id: 'tasks', label: 'Tasks Manager', icon: CheckCircle2 },
                  { id: 'routines', label: 'Routines & Streaks', icon: Flame },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = mainSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMainSection(item.id as MainSection)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mini Month Calendar */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {MONTH_NAMES[selectedDateObj.getMonth()].slice(0, 3)}{' '}
                    {selectedDateObj.getFullYear()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const dt = parseDateStr(selectedDate);
                        dt.setMonth(dt.getMonth() - 1);
                        setSelectedDate(toDateStr(dt));
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dt = parseDateStr(selectedDate);
                        dt.setMonth(dt.getMonth() + 1);
                        setSelectedDate(toDateStr(dt));
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {miniCalDays.map((dStr) => {
                    const dObj = parseDateStr(dStr);
                    const inMonth = dObj.getMonth() === selectedDateObj.getMonth();
                    const isToday = dStr === todayStr;
                    const isSelected = dStr === selectedDate;
                    return (
                      <button
                        key={dStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dStr);
                          setMainSection('calendar');
                        }}
                        className={`h-6 w-6 mx-auto rounded-full text-[11px] font-semibold flex items-center justify-center transition-colors ${
                          isToday
                            ? 'bg-indigo-600 text-white font-bold'
                            : isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold'
                            : inMonth
                            ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        {dObj.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Today's Progress Meter */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">Today’s Progress</span>
                  <span className="font-extrabold text-emerald-400">
                    {todayCompletedCount}/{todayScheduled.length} Done
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    style={{ width: `${todayProgressPct}%` }}
                    className="h-full bg-emerald-400 transition-all duration-300"
                  />
                </div>
                <p className="text-[11px] text-slate-300">
                  {todayProgressPct === 100 && todayScheduled.length > 0
                    ? '🎉 All tasks & routines done for today!'
                    : 'Keep your routine streaks alive!'}
                </p>
              </div>

              {/* Calendar Layer Filters */}
              <div className="space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Calendar Filters
                </span>
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOneTimeTasks}
                    onChange={(e) => setShowOneTimeTasks(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>One-Time Tasks & Events</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRoutines}
                    onChange={(e) => setShowRoutines(e.target.checked)}
                    className="rounded text-violet-600"
                  />
                  <span>Routine Tasks (Daily/3-Day/Weekly)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Show Completed Items</span>
                </label>
              </div>
            </div>

            {/* Bottom Sync Status Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Desktop & Android Ready</span>
              {syncConfig.provider !== 'none' && (
                <button
                  type="button"
                  onClick={() => triggerCloudSync()}
                  className="text-indigo-500 hover:underline font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync
                </button>
              )}
            </div>
          </aside>
        )}

        {/* Main Active View */}
        <main className="flex-1 overflow-hidden relative">
          {mainSection === 'calendar' && (
            <CalendarViews
              viewMode={calendarView}
              selectedDate={selectedDate}
              tasks={visibleTasks}
              onSelectDate={(d) => setSelectedDate(d)}
              onToggleComplete={handleToggleComplete}
              onEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onQuickRename={handleQuickRename}
              onCreateAtSlot={(dateStr, startTime, endTime) => {
                setEditingTask(null);
                setModalInitialDate(dateStr);
                setModalInitialStart(startTime);
                setModalInitialEnd(endTime);
                setModalInitialIsRoutine(false);
                setTaskModalOpen(true);
              }}
            />
          )}

          {mainSection === 'tasks' && (
            <TasksAndRoutinesPanel
              mode="tasks"
              tasks={tasks}
              onQuickAddTask={handleQuickAddTask}
              onToggleComplete={handleToggleComplete}
              onQuickRename={handleQuickRename}
              onEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onOpenNewModal={(isRoutine) => {
                setEditingTask(null);
                setModalInitialDate(selectedDate);
                setModalInitialIsRoutine(isRoutine);
                setTaskModalOpen(true);
              }}
            />
          )}

          {mainSection === 'routines' && (
            <TasksAndRoutinesPanel
              mode="routines"
              tasks={tasks}
              onQuickAddTask={handleQuickAddTask}
              onToggleComplete={handleToggleComplete}
              onQuickRename={handleQuickRename}
              onEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onOpenNewModal={(isRoutine) => {
                setEditingTask(null);
                setModalInitialDate(selectedDate);
                setModalInitialIsRoutine(isRoutine);
                setTaskModalOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* ==================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Android Smartphone View)               */}
      {/* ==================================================================== */}
      <nav className="md:hidden h-16 flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-5 items-center px-2 z-30">
        <button
          type="button"
          onClick={() => setMainSection('calendar')}
          className={`flex flex-col items-center justify-center py-1 text-[10px] font-bold ${
            mainSection === 'calendar'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400'
          }`}
        >
          <CalendarIcon className="w-5 h-5 mb-0.5" />
          Calendar
        </button>

        <button
          type="button"
          onClick={() => setMainSection('tasks')}
          className={`flex flex-col items-center justify-center py-1 text-[10px] font-bold ${
            mainSection === 'tasks'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 mb-0.5" />
          Tasks
        </button>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setModalInitialDate(selectedDate);
              setModalInitialIsRoutine(mainSection === 'routines');
              setTaskModalOpen(true);
            }}
            className="w-11 h-11 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMainSection('routines')}
          className={`flex flex-col items-center justify-center py-1 text-[10px] font-bold ${
            mainSection === 'routines'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-slate-400'
          }`}
        >
          <Flame className="w-5 h-5 mb-0.5" />
          Routines
        </button>

        <button
          type="button"
          onClick={() => setSyncModalOpen(true)}
          className={`flex flex-col items-center justify-center py-1 text-[10px] font-bold ${
            syncConfig.provider !== 'none'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400'
          }`}
        >
          <Cloud className="w-5 h-5 mb-0.5" />
          Sync
        </button>
      </nav>

      {/* ==================================================================== */}
      {/* MODALS                                                               */}
      {/* ==================================================================== */}
      <TaskModal
        isOpen={taskModalOpen}
        initialDate={modalInitialDate}
        initialStartTime={modalInitialStart}
        initialEndTime={modalInitialEnd}
        initialIsRoutine={modalInitialIsRoutine}
        editingTask={editingTask}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <CloudSyncModal
        isOpen={syncModalOpen}
        syncConfig={syncConfig}
        isSyncing={isSyncing}
        syncStatusMessage={syncStatusMessage}
        syncError={syncError}
        onClose={() => setSyncModalOpen(false)}
        onUpdateConfig={(newCfg) => setSyncConfig(newCfg)}
        onTriggerSync={(overrideCfg) => triggerCloudSync(overrideCfg)}
        onAutoConnectGitHub={handleAutoConnectGitHub}
      />
    </div>
  );
};
export default App;
