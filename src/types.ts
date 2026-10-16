export type TaskColor =
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'indigo'
  | 'slate';

export type TaskPriority = 'low' | 'medium' | 'high';

export type RecurrenceType =
  | 'none'
  | 'daily'
  | 'every_3_days'
  | 'weekly'
  | 'custom';

export type CustomRecurrenceUnit = 'days' | 'weeks' | 'months';

export interface RecurrenceRule {
  type: RecurrenceType;
  /** Used when type === 'custom' (e.g., every N days/weeks/months) */
  interval: number;
  unit: CustomRecurrenceUnit;
  /** 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Used for 'weekly' or 'custom' with weeks */
  daysOfWeek: number[];
  /** Optional YYYY-MM-DD end date for routine */
  endDate?: string | null;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  /** Start/anchor date in YYYY-MM-DD format */
  date: string;
  /** Optional HH:mm (24h) start time, e.g., "09:00" */
  startTime: string;
  /** Optional HH:mm (24h) end time, e.g., "10:00" */
  endTime: string;
  allDay: boolean;
  color: TaskColor;
  priority: TaskPriority;
  category: string;
  /** Whether this is a recurring routine task */
  isRoutine: boolean;
  recurrence: RecurrenceRule;
  /** For one-time tasks: completion status */
  completed: boolean;
  /** For routine tasks: list of YYYY-MM-DD dates marked as done */
  completedDates: string[];
  /** For routine tasks: list of YYYY-MM-DD dates skipped/deleted as single occurrence */
  skippedDates: string[];
  /** Reminder minutes before startTime (null = no reminder) */
  reminderMinutes: number | null;
  /** Creation timestamp (ms) */
  createdAt: number;
  /** Last modification timestamp (ms) for cloud sync conflict resolution */
  updatedAt: number;
  /** Soft-delete tombstone so deletions sync across laptop and smartphone */
  deleted?: boolean;
}

export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda';

export type MainSection = 'calendar' | 'tasks' | 'routines';

export type SyncProviderType = 'none' | 'github_gist' | 'supabase';

export interface SyncConfig {
  provider: SyncProviderType;
  autoSync: boolean;
  /** GitHub Personal Access Token or `gh auth token` */
  githubToken?: string;
  /** GitHub Gist ID storing flash-calendar-sync.json */
  githubGistId?: string;
  githubUsername?: string;
  /** Supabase Project URL (e.g., https://xyz.supabase.co) */
  supabaseUrl?: string;
  /** Supabase Anon Public Key */
  supabaseAnonKey?: string;
  /** Shared sync room/key ID for Supabase table row */
  supabaseSyncKey?: string;
  lastSyncedAt?: number | null;
}

export interface ElectronAPI {
  isElectron: boolean;
  loadStorage: () => Promise<{ tasks?: TaskItem[]; syncConfig?: SyncConfig; darkMode?: boolean } | null>;
  saveStorage: (data: { tasks: TaskItem[]; syncConfig: SyncConfig; darkMode: boolean }) => Promise<{ ok: boolean; error?: string }>;
  notify: (payload: { title: string; body: string }) => Promise<{ ok: boolean }>;
  detectGhToken: () => Promise<{ ok: boolean; token?: string; username?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
