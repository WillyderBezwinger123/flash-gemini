import React, { useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Database,
  Github,
  KeyRound,
  RefreshCw,
  Smartphone,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import { SyncConfig, SyncProviderType } from '../types';
import { decodePairingCode, encodePairingCode } from '../services/syncService';

interface CloudSyncModalProps {
  isOpen: boolean;
  syncConfig: SyncConfig;
  isSyncing: boolean;
  syncStatusMessage: string | null;
  syncError: string | null;
  onClose: () => void;
  onUpdateConfig: (newConfig: SyncConfig) => void;
  onTriggerSync: (overrideConfig?: SyncConfig) => Promise<void>;
  onAutoConnectGitHub: () => Promise<void>;
}

const SUPABASE_SQL_SNIPPET = `create table if not exists public.flash_sync_state (
  sync_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.flash_sync_state enable row level security;
create policy "Allow public sync access" on public.flash_sync_state
  for all using (true) with check (true);`;

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  syncConfig,
  isSyncing,
  syncStatusMessage,
  syncError,
  onClose,
  onUpdateConfig,
  onTriggerSync,
  onAutoConnectGitHub,
}) => {
  const [provider, setProvider] = useState<SyncProviderType>(
    syncConfig.provider === 'none' ? 'github_gist' : syncConfig.provider
  );
  const [githubToken, setGithubToken] = useState(syncConfig.githubToken || '');
  const [githubGistId, setGithubGistId] = useState(syncConfig.githubGistId || '');
  const [supabaseUrl, setSupabaseUrl] = useState(syncConfig.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(syncConfig.supabaseAnonKey || '');
  const [supabaseSyncKey, setSupabaseSyncKey] = useState(
    syncConfig.supabaseSyncKey || 'my-personal-calendar'
  );
  const [pairingInput, setPairingInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [localPairError, setLocalPairError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured =
    (syncConfig.provider === 'github_gist' && !!syncConfig.githubToken) ||
    (syncConfig.provider === 'supabase' &&
      !!syncConfig.supabaseUrl &&
      !!syncConfig.supabaseAnonKey);

  const handleSaveAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SyncConfig = {
      ...syncConfig,
      provider,
      autoSync: true,
      githubToken: githubToken.trim(),
      githubGistId: githubGistId.trim(),
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      supabaseSyncKey: supabaseSyncKey.trim() || 'my-personal-calendar',
    };
    onUpdateConfig(updated);
    await onTriggerSync(updated);
  };

  const handleApplyPairingCode = async () => {
    setLocalPairError(null);
    try {
      const decoded = decodePairingCode(pairingInput);
      setProvider(decoded.provider);
      setGithubToken(decoded.githubToken || '');
      setGithubGistId(decoded.githubGistId || '');
      setSupabaseUrl(decoded.supabaseUrl || '');
      setSupabaseAnonKey(decoded.supabaseAnonKey || '');
      setSupabaseSyncKey(decoded.supabaseSyncKey || 'my-personal-calendar');
      onUpdateConfig(decoded);
      setPairingInput('');
      await onTriggerSync(decoded);
    } catch {
      setLocalPairError('Invalid pairing code. Make sure you copied the full FLASH-SYNC-V1:... string.');
    }
  };

  const handleCopyPairingCode = () => {
    const code = encodePairingCode(syncConfig);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-600/10 via-violet-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Free Cloud Sync (Laptop ↔ Android Smartphone)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synchronize tasks, routines, and completion streaks across devices for free
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status Banner */}
          {(syncStatusMessage || syncError || localPairError) && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
                syncError || localPairError
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{localPairError || syncError || syncStatusMessage}</span>
              </div>
              {syncConfig.lastSyncedAt && !syncError && (
                <span className="text-[11px] opacity-80">
                  Last synced: {new Date(syncConfig.lastSyncedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          {/* Smartphone Pairing Code Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Instant Device Pairing (Laptop ↔ Smartphone)
                </span>
              </div>
              {isConfigured && (
                <button
                  type="button"
                  onClick={handleCopyPairingCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Pairing Code Copied!' : 'Copy Pairing Code for Phone'}
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already connected on your laptop? Copy the Pairing Code above and paste it on your Android phone below to link both devices immediately:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={pairingInput}
                onChange={(e) => setPairingInput(e.target.value)}
                placeholder="Paste FLASH-SYNC-V1:... pairing code here"
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleApplyPairingCode}
                disabled={!pairingInput.trim() || isSyncing}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-40"
              >
                Pair Device
              </button>
            </div>
          </div>

          {/* Cloud Backend Selector Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Choose Free Cloud Server Backend
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('github_gist')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  provider === 'github_gist'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-600'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Github className="w-5 h-5 text-slate-900 dark:text-white mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    GitHub Private Cloud Gist
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    100% Free forever • Zero database setup • 1-Click connect on Laptop
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('supabase')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  provider === 'supabase'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Supabase Free Cloud PostgreSQL
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    100% Free Tier (500MB) • Dedicated cloud PostgreSQL database
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Provider Configuration Form */}
          <form onSubmit={handleSaveAndSync} className="space-y-4">
            {provider === 'github_gist' && (
              <div className="space-y-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                {window.electronAPI?.detectGhToken && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <div>
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        One-Click Laptop Setup (GitHub CLI Detected)
                      </div>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                        Automatically provision a private cloud sync Gist using your logged-in GitHub account.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={onAutoConnectGitHub}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm whitespace-nowrap"
                    >
                      {isSyncing ? 'Connecting...' : 'Auto-Connect My GitHub'}
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    GitHub Personal Access Token (with `gist` scope)
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_... or gho_..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Sync Gist ID (Leave blank to auto-create or auto-discover)
                  </label>
                  <input
                    type="text"
                    value={githubGistId}
                    onChange={(e) => setGithubGistId(e.target.value)}
                    placeholder="Auto-created on first sync"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {provider === 'supabase' && (
              <div className="space-y-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Sync Key / Room Name
                    </label>
                    <input
                      type="text"
                      value={supabaseSyncKey}
                      onChange={(e) => setSupabaseSyncKey(e.target.value)}
                      placeholder="my-personal-calendar"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>

                {/* SQL Setup Helper */}
                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-400">
                      Run once in Supabase SQL Editor (Free Tier):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedSql ? 'Copied SQL' : 'Copy SQL'}
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono overflow-x-auto text-slate-300 leading-relaxed">
                    {SUPABASE_SQL_SNIPPET}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isSyncing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Synchronizing...' : 'Save & Sync Now'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
