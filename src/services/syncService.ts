import { SyncConfig, TaskItem } from '../types';
import { addDays, toDateStr } from '../utils/dateUtils';

const LOCAL_STORAGE_KEY = 'flash_calendar_state_v1';
const GIST_FILENAME = 'flash-calendar-sync.json';

export interface PersistedState {
  tasks: TaskItem[];
  syncConfig: SyncConfig;
  darkMode: boolean;
}

/**
 * Default starter tasks & routines so the user immediately sees examples of:
 * - One-time tasks
 * - Daily routines
 * - Every 3 days ("all three days") routines
 * - Weekly routines
 * - Custom interval routines
 */
export function getInitialStarterTasks(): TaskItem[] {
  const today = toDateStr(new Date());
  const tomorrow = addDays(today, 1);
  const now = Date.now();

  return [
    {
      id: 'starter-routine-daily',
      title: 'Morning Planning & Hydration',
      description: 'Review today’s schedule, top 3 priorities, and drink a glass of water.',
      date: today,
      startTime: '08:00',
      endTime: '08:30',
      allDay: false,
      color: 'emerald',
      priority: 'high',
      category: 'Routine',
      isRoutine: true,
      recurrence: {
        type: 'daily',
        interval: 1,
        unit: 'days',
        daysOfWeek: [],
        endDate: null,
      },
      completed: false,
      completedDates: [],
      skippedDates: [],
      reminderMinutes: 10,
      createdAt: now - 300000,
      updatedAt: now - 300000,
    },
    {
      id: 'starter-routine-3days',
      title: 'Gym & Strength Workout (Every 3 Days)',
      description: 'Full body workout routine scheduled every 3 days.',
      date: today,
      startTime: '17:30',
      endTime: '18:45',
      allDay: false,
      color: 'violet',
      priority: 'high',
      category: 'Fitness',
      isRoutine: true,
      recurrence: {
        type: 'every_3_days',
        interval: 3,
        unit: 'days',
        daysOfWeek: [],
        endDate: null,
      },
      completed: false,
      completedDates: [],
      skippedDates: [],
      reminderMinutes: 15,
      createdAt: now - 200000,
      updatedAt: now - 200000,
    },
    {
      id: 'starter-routine-weekly',
      title: 'Weekly Review & Reset',
      description: 'Clean up workspace, review completed routines, and plan upcoming week.',
      date: today,
      startTime: '19:00',
      endTime: '20:00',
      allDay: false,
      color: 'amber',
      priority: 'medium',
      category: 'Personal',
      isRoutine: true,
      recurrence: {
        type: 'weekly',
        interval: 1,
        unit: 'weeks',
        daysOfWeek: [0, 5], // Fri & Sun
        endDate: null,
      },
      completed: false,
      completedDates: [],
      skippedDates: [],
      reminderMinutes: 30,
      createdAt: now - 150000,
      updatedAt: now - 150000,
    },
    {
      id: 'starter-task-today',
      title: 'Connect Laptop & Smartphone Cloud Sync',
      description: 'Open the Cloud Sync panel to pair your laptop and Android smartphone for automatic synchronization.',
      date: today,
      startTime: '11:00',
      endTime: '11:45',
      allDay: false,
      color: 'blue',
      priority: 'high',
      category: 'Setup',
      isRoutine: false,
      recurrence: {
        type: 'none',
        interval: 1,
        unit: 'days',
        daysOfWeek: [],
        endDate: null,
      },
      completed: false,
      completedDates: [],
      skippedDates: [],
      reminderMinutes: 15,
      createdAt: now - 100000,
      updatedAt: now - 100000,
    },
    {
      id: 'starter-task-tomorrow',
      title: 'Project Deep Work Session',
      description: 'Focused sprint block on the calendar.',
      date: tomorrow,
      startTime: '14:00',
      endTime: '16:00',
      allDay: false,
      color: 'indigo',
      priority: 'medium',
      category: 'Work',
      isRoutine: false,
      recurrence: {
        type: 'none',
        interval: 1,
        unit: 'days',
        daysOfWeek: [],
        endDate: null,
      },
      completed: false,
      completedDates: [],
      skippedDates: [],
      reminderMinutes: 10,
      createdAt: now - 50000,
      updatedAt: now - 50000,
    },
  ];
}

export async function loadLocalState(): Promise<PersistedState> {
  const defaultState: PersistedState = {
    tasks: getInitialStarterTasks(),
    syncConfig: {
      provider: 'none',
      autoSync: true,
      lastSyncedAt: null,
    },
    darkMode: true,
  };

  try {
    if (window.electronAPI?.loadStorage) {
      const electronData = await window.electronAPI.loadStorage();
      if (electronData && Array.isArray(electronData.tasks)) {
        return {
          tasks: electronData.tasks,
          syncConfig: electronData.syncConfig || defaultState.syncConfig,
          darkMode: typeof electronData.darkMode === 'boolean' ? electronData.darkMode : true,
        };
      }
    }

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tasks)) {
        return {
          tasks: parsed.tasks,
          syncConfig: parsed.syncConfig || defaultState.syncConfig,
          darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : true,
        };
      }
    }
  } catch (err) {
    console.error('Error loading local state:', err);
  }

  return defaultState;
}

export async function saveLocalState(state: PersistedState): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    if (window.electronAPI?.saveStorage) {
      await window.electronAPI.saveStorage(state);
    }
  } catch (err) {
    console.error('Error saving local state:', err);
  }
}

/**
 * Conflict-free two-way merge of local and remote task lists using `updatedAt` timestamps
 * and unioning `completedDates` when timestamps are equal.
 */
export function mergeTasks(localTasks: TaskItem[], remoteTasks: TaskItem[]): TaskItem[] {
  const map = new Map<string, TaskItem>();

  for (const item of localTasks) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  for (const remote of remoteTasks) {
    if (!remote || !remote.id) continue;
    const existing = map.get(remote.id);
    if (!existing) {
      map.set(remote.id, remote);
    } else {
      const localTime = existing.updatedAt || 0;
      const remoteTime = remote.updatedAt || 0;
      if (remoteTime > localTime) {
        map.set(remote.id, remote);
      } else if (remoteTime === localTime) {
        // Merge completedDates & skippedDates sets defensively
        const mergedCompleted = Array.from(
          new Set([...(existing.completedDates || []), ...(remote.completedDates || [])])
        );
        const mergedSkipped = Array.from(
          new Set([...(existing.skippedDates || []), ...(remote.skippedDates || [])])
        );
        map.set(remote.id, {
          ...existing,
          completedDates: mergedCompleted,
          skippedDates: mergedSkipped,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Finds an existing private Gist containing `flash-calendar-sync.json` or creates a new one.
 */
export async function findOrCreateGitHubSyncGist(token: string): Promise<{ gistId: string; tasks: TaskItem[] }> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Check user's recent gists for an existing flash-calendar-sync.json
  const listRes = await fetch('https://api.github.com/gists?per_page=50', { headers });
  if (!listRes.ok) {
    throw new Error(`GitHub authentication failed (${listRes.status}). Check your token.`);
  }
  const gists = await listRes.json();
  const existingGist = Array.isArray(gists)
    ? gists.find((g: { files?: Record<string, unknown> }) => g.files && g.files[GIST_FILENAME])
    : null;

  if (existingGist) {
    const detailRes = await fetch(`https://api.github.com/gists/${existingGist.id}`, { headers });
    if (detailRes.ok) {
      const detail = await detailRes.json();
      const content = detail.files?.[GIST_FILENAME]?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return {
            gistId: existingGist.id,
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          };
        } catch {
          return { gistId: existingGist.id, tasks: [] };
        }
      }
    }
    return { gistId: existingGist.id, tasks: [] };
  }

  // Create a brand new private Gist for cloud sync
  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      description: 'Flash Calendar & Routine Tasks Cloud Sync Store (Laptop + Smartphone)',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify({ version: 1, updatedAt: Date.now(), tasks: [] }, null, 2),
        },
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create GitHub Sync Gist (${createRes.status}). Ensure token has 'gist' scope.`);
  }

  const created = await createRes.json();
  return { gistId: created.id, tasks: [] };
}

/**
 * Performs two-way cloud synchronization with GitHub Gist.
 */
export async function syncWithGitHubGist(
  localTasks: TaskItem[],
  config: SyncConfig
): Promise<{ mergedTasks: TaskItem[]; gistId: string }> {
  const token = config.githubToken?.trim();
  if (!token) {
    throw new Error('GitHub token is missing in Cloud Sync configuration.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  let gistId = config.githubGistId?.trim();
  let remoteTasks: TaskItem[] = [];

  if (!gistId) {
    const found = await findOrCreateGitHubSyncGist(token);
    gistId = found.gistId;
    remoteTasks = found.tasks;
  } else {
    const getRes = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
    if (!getRes.ok) {
      throw new Error(`Could not fetch Gist ${gistId} (HTTP ${getRes.status}).`);
    }
    const gistData = await getRes.json();
    const rawContent = gistData.files?.[GIST_FILENAME]?.content;
    if (rawContent) {
      try {
        const parsed = JSON.parse(rawContent);
        if (Array.isArray(parsed.tasks)) {
          remoteTasks = parsed.tasks;
        }
      } catch {
        remoteTasks = [];
      }
    }
  }

  const mergedTasks = mergeTasks(localTasks, remoteTasks);

  // Push merged state back to Gist
  const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(
            {
              version: 1,
              updatedAt: Date.now(),
              tasks: mergedTasks,
            },
            null,
            2
          ),
        },
      },
    }),
  });

  if (!patchRes.ok) {
    throw new Error(`Failed to update Gist ${gistId} (HTTP ${patchRes.status}).`);
  }

  return { mergedTasks, gistId };
}

/**
 * Performs two-way cloud synchronization with a free Supabase project.
 * Uses table `flash_sync_state (sync_key text primary key, payload jsonb, updated_at timestamptz)`.
 */
export async function syncWithSupabase(
  localTasks: TaskItem[],
  config: SyncConfig
): Promise<{ mergedTasks: TaskItem[] }> {
  const baseUrl = config.supabaseUrl?.trim().replace(/\/+$/, '');
  const anonKey = config.supabaseAnonKey?.trim();
  const syncKey = config.supabaseSyncKey?.trim() || 'default-workspace';

  if (!baseUrl || !anonKey) {
    throw new Error('Supabase URL and Anon Key are required.');
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  };

  // 1. Fetch existing remote state
  const getUrl = `${baseUrl}/rest/v1/flash_sync_state?sync_key=eq.${encodeURIComponent(syncKey)}&select=payload`;
  const getRes = await fetch(getUrl, { headers });
  if (!getRes.ok) {
    throw new Error(
      `Supabase query failed (${getRes.status}). Make sure you ran the 4-line SQL table setup in your Supabase SQL Editor.`
    );
  }

  const rows = await getRes.json();
  let remoteTasks: TaskItem[] = [];
  if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload?.tasks) {
    remoteTasks = rows[0].payload.tasks;
  }

  // 2. Merge local and remote tasks
  const mergedTasks = mergeTasks(localTasks, remoteTasks);

  // 3. Upsert merged state back to Supabase
  const postUrl = `${baseUrl}/rest/v1/flash_sync_state`;
  const postRes = await fetch(postUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sync_key: syncKey,
      payload: { version: 1, updatedAt: Date.now(), tasks: mergedTasks },
      updated_at: new Date().toISOString(),
    }),
  });

  if (!postRes.ok) {
    throw new Error(`Supabase upsert failed (${postRes.status}).`);
  }

  return { mergedTasks };
}

/**
 * Encodes a SyncConfig into a portable Pairing Code string so the user can copy it on
 * their laptop and paste it on their Android smartphone in one step.
 */
export function encodePairingCode(config: SyncConfig): string {
  const minimal: SyncConfig = {
    provider: config.provider,
    autoSync: true,
    githubToken: config.githubToken,
    githubGistId: config.githubGistId,
    githubUsername: config.githubUsername,
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    supabaseSyncKey: config.supabaseSyncKey,
  };
  const json = JSON.stringify(minimal);
  return `FLASH-SYNC-V1:${btoa(encodeURIComponent(json))}`;
}

export function decodePairingCode(code: string): SyncConfig {
  const trimmed = code.trim();
  const prefix = 'FLASH-SYNC-V1:';
  const rawBase64 = trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
  const json = decodeURIComponent(atob(rawBase64));
  const parsed = JSON.parse(json) as SyncConfig;
  if (!parsed || !parsed.provider || parsed.provider === 'none') {
    throw new Error('Invalid pairing code');
  }
  return {
    ...parsed,
    autoSync: true,
  };
}
