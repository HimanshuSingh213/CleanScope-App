import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Cpu, 
  Trash2, 
  Key, 
  HardDrive, 
  Save,
  AlertTriangle,
  RotateCcw,
  Power,
  X
} from 'lucide-react';
import { Settings as SettingsType } from '../types/candidate';
import { ProtectedPathsModal } from '../components/ProtectedPathsModal';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useAppStore } from '../store/useAppStore';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg 
    viewBox="0 0 24 24" 
    width="16" 
    height="16" 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface SettingsViewProps {
  settings?: SettingsType;
  onSaveSettings?: (settings: SettingsType) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = () => {
  const { settings: globalSettings, updateSettings } = useAppStore();
  const [settings, setSettings] = useState<SettingsType | null>(globalSettings);
  const [geminiStatus, setGeminiStatus] = useState<string | null>(null);
  const [isTestingGemini, setIsTestingGemini] = useState<boolean>(false);
  const [isSavedToast, setIsSavedToast] = useState<boolean>(false);
  const [customPathInput, setCustomPathInput] = useState<string>('');
  const [showProtectedModal, setShowProtectedModal] = useState<boolean>(false);
  
  // Danger Zone Modals
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showUninstallModal, setShowUninstallModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isPurging, setIsPurging] = useState<boolean>(false);

  useEffect(() => {
    if (globalSettings) {
      setSettings(globalSettings);
    }
  }, [globalSettings]);

  if (!settings) return null;

  const updateAndSave = (next: SettingsType) => {
    setSettings(next);
    updateSettings(next);
  };

  const handleSave = async () => {
    await updateSettings(settings);
    setIsSavedToast(true);
    toast.success('Settings Saved', { description: 'Safety parameters and AI configurations updated.' });
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleTestGemini = async () => {
    if (!settings.geminiApiKey || !settings.geminiApiKey.trim()) {
      setGeminiStatus('Please enter a valid Gemini API key');
      toast.error('API Key Missing', {
        description: 'Please paste your Google Gemini API key before testing connection.',
      });
      return;
    }

    // Auto-save settings first
    await updateSettings(settings);

    setIsTestingGemini(true);
    setGeminiStatus(null);
    const toastId = toast.loading('Testing Gemini Connection...', {
      description: `Connecting to ${settings.geminiModel || 'gemini-3.5-flash-lite'}...`,
    });
    try {
      const res = await api.testGeminiKey(settings.geminiApiKey, settings.geminiModel);
      setGeminiStatus(res);
      toast.success('Connection Successful', {
        id: toastId,
        description: res,
      });
    } catch (e: any) {
      setGeminiStatus(`Connection failed: ${e.toString()}`);
      toast.error('Connection Failed', {
        id: toastId,
        description: e.toString(),
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleAddProtectedPath = () => {
    const trimmed = customPathInput.trim();
    if (!trimmed) {
      toast.error('Invalid Directory Path', {
        description: 'Please enter a valid Windows directory path (e.g. C:\\MyImportantFolder).',
      });
      return;
    }
    if (settings.protectedPaths.includes(trimmed)) {
      toast.warning('Path Already Protected', {
        description: `"${trimmed}" is already in your protected locations list.`,
      });
      return;
    }
    const next = {
      ...settings,
      protectedPaths: [...settings.protectedPaths, trimmed],
    };
    updateAndSave(next);
    setCustomPathInput('');
    toast.success('Protected Path Added', {
      description: `CleanScope will never allow deletion within "${trimmed}".`,
    });
  };

  const handleRemoveProtectedPath = (path: string) => {
    const next = {
      ...settings,
      protectedPaths: settings.protectedPaths.filter((p) => p !== path),
    };
    updateAndSave(next);
    toast.info('Protected Path Removed', {
      description: `"${path}" was removed from the custom protected list.`,
    });
  };

  const handleResetData = async () => {
    setIsPurging(true);
    try {
      const freshSettings = await api.resetAppData();
      setSettings(freshSettings);
      useAppStore.setState({ 
        settings: freshSettings, 
        candidates: [], 
        selectedIds: new Set(),
        activeDetailCandidate: null,
        aiModalCandidate: null,
        lastScanReport: null
      });
      setShowResetModal(false);
      setConfirmInput('');
      toast.success('CleanScope Data Reset', { description: 'All local caches, scan logs, and custom settings have been wiped.' });
    } catch (e: any) {
      toast.error('Reset Failed', { description: e.toString() });
    } finally {
      setIsPurging(false);
    }
  };

  const handlePurgeAndUninstall = async () => {
    if (confirmInput.trim().toUpperCase() !== 'UNINSTALL') {
      toast.error('Confirmation Mismatch', { description: 'Please type UNINSTALL to confirm complete purge.' });
      return;
    }
    setIsPurging(true);
    toast.loading('Purging all CleanScope files & uninstalling...', { id: 'purge-app' });
    try {
      await api.purgeAndUninstall();
    } catch (e: any) {
      toast.error('Uninstall Failed', { id: 'purge-app', description: e.toString() });
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-[#f5f5f5] tracking-tight">Application Settings</h2>
          </div>
          <p className="text-xs text-[#71717a]">
            Configure deterministic safety boundaries, AI ambiguity analysis, and storage policies.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-sm select-none"
        >
          <Save className="w-3.5 h-3.5" />
          {isSavedToast ? 'Settings Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Safety & Deletion Mechanics */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#141414] pb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f5]">
            Safety & Cleanup Guardrails
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-[#f5f5f5]">
                Move Cleaned Files to Windows Recycle Bin
              </label>
              <p className="text-[11px] text-[#71717a]">
                When enabled, cleaned candidates are sent to the Recycle Bin rather than permanently deleted.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.useRecycleBin}
              onChange={(e) => updateAndSave({ ...settings, useRecycleBin: e.target.checked })}
              className="w-4 h-4 rounded border-[#2a2a2a] bg-[#161616] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-[#f5f5f5]">
                Skip In-Use and Locked Files
              </label>
              <p className="text-[11px] text-[#71717a]">
                Automatically skips files currently in use by active Windows processes.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.skipInUse}
              onChange={(e) => updateAndSave({ ...settings, skipInUse: e.target.checked })}
              className="w-4 h-4 rounded border-[#2a2a2a] bg-[#161616] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-[#141414]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#f5f5f5]">
                Minimum Confidence for Safe Classification
              </label>
              <span className="text-xs font-mono text-indigo-400">
                {Math.round(settings.minSafeConfidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={settings.minSafeConfidence}
              onChange={(e) => updateAndSave({ ...settings, minSafeConfidence: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#161616] rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-[#141414] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#f5f5f5] block">
                Deterministic Windows System Boundaries
              </span>
              <p className="text-[11px] text-[#71717a]">
                View all core operating system and boot paths that are unconditionally excluded by CleanScope.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowProtectedModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#141416] text-zinc-300 border border-[#262626] hover:bg-[#1c1c1f] hover:text-white transition-colors flex-shrink-0 select-none"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              View Protected Boundaries
            </button>
          </div>
        </div>
      </div>

      {/* AI Provider Settings */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#141414] pb-3">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f5]">
            AI Explanation & Ambiguity Analysis
          </h3>
        </div>

        <div className="space-y-5">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#f5f5f5]">
              AI Provider Mode
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'hybrid', label: 'Hybrid (Recommended)' },
                { id: 'local', label: 'Local Qwen 0.8B' },
                { id: 'gemini', label: 'Gemini Cloud' },
                { id: 'none', label: 'Rules Only' },
              ].map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => updateAndSave({ ...settings, aiProvider: prov.id as any })}
                  className={`p-3 rounded-lg text-xs font-medium text-left border transition-colors ${
                    settings.aiProvider === prov.id
                      ? 'bg-indigo-950/40 text-indigo-300 border-indigo-700/50'
                      : 'bg-[#121212] text-[#a1a1aa] border-[#1e1e1e] hover:bg-[#181818]'
                  }`}
                >
                  {prov.label}
                </button>
              ))}
            </div>
          </div>

          {/* Local llama server URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#f5f5f5]">
              Local llama.cpp Server URL
            </label>
            <input
              type="text"
              value={settings.llamaServerUrl || ''}
              onChange={(e) => setSettings({ ...settings, llamaServerUrl: e.target.value })}
              onBlur={() => updateAndSave(settings)}
              placeholder="http://127.0.0.1:8080"
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#f5f5f5] font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Gemini Model ID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#f5f5f5] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Gemini Model ID
              </label>
              <span className="text-[10px] text-[#71717a] font-mono">
                Active: {settings.geminiModel || 'gemini-3.5-flash-lite'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {[
                { id: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite (Recommended / Ultra Fast)' },
                { id: 'gemini-3.7-flash', label: 'gemini-3.7-flash' },
                { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
                { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
                { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateAndSave({ ...settings, geminiModel: m.id })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors outline-none focus:outline-none select-none ${
                    (settings.geminiModel || 'gemini-3.5-flash-lite') === m.id
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60'
                      : 'bg-[#121212] text-[#888] border-[#222] hover:bg-[#181818] hover:text-[#eee]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={settings.geminiModel || ''}
              onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
              onBlur={() => updateAndSave(settings)}
              placeholder="e.g. gemini-3.5-flash-lite, gemini-3.7-flash, etc."
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#f5f5f5] font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#f5f5f5] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#71717a]" />
              Optional Google Gemini API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={settings.geminiApiKey || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = { ...settings, geminiApiKey: val };
                  setSettings(next);
                }}
                onBlur={() => updateAndSave(settings)}
                placeholder="AIzaSy..."
                className="flex-1 bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#f5f5f5] font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={isTestingGemini}
                className="px-3 py-2 rounded-lg bg-[#141414] border border-[#242424] text-xs font-medium text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors outline-none focus:outline-none select-none"
              >
                {isTestingGemini ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            {geminiStatus && (
              <p className={`text-[11px] font-mono ${geminiStatus.includes('Connected') || geminiStatus.includes('successful') ? 'text-emerald-400' : 'text-amber-400'}`}>
                {geminiStatus}
              </p>
            )}
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[#141414]">
            <div className="space-y-0.5">
              <label className="text-xs font-medium text-[#f5f5f5]">
                Metadata-Only AI Analysis
              </label>
              <p className="text-[11px] text-[#71717a]">
                Always enabled by default. CleanScope only transmits path attributes and sizes—never raw file contents.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacyMetadataOnly}
              disabled
              className="w-4 h-4 rounded border-[#2a2a2a] bg-[#161616] text-indigo-600 cursor-not-allowed opacity-75"
            />
          </div>
        </div>
      </div>

      {/* Custom Protected Paths */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#141414] pb-3">
          <HardDrive className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f5]">
            Custom Protected Paths
          </h3>
        </div>

        <p className="text-xs text-[#71717a]">
          Paths listed here will be unconditionally excluded from cleanup regardless of classification.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={customPathInput}
            onChange={(e) => setCustomPathInput(e.target.value)}
            placeholder="e.g. D:\ImportantProjects"
            className="flex-1 bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#f5f5f5] font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAddProtectedPath}
            className="px-4 py-2 rounded-lg bg-[#161616] text-xs font-medium text-[#f5f5f5] border border-[#262626] hover:bg-[#202020] transition-colors"
          >
            Add Path
          </button>
        </div>

        {settings.protectedPaths.length > 0 && (
          <div className="border border-[#1a1a1a] rounded-lg divide-y divide-[#141414] bg-[#050505]">
            {settings.protectedPaths.map((p) => (
              <div key={p} className="p-2.5 flex items-center justify-between text-xs font-mono">
                <span className="text-[#a1a1aa] truncate">{p}</span>
                <button
                  onClick={() => handleRemoveProtectedPath(p)}
                  className="text-rose-400 hover:text-rose-300 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone: App Data Reset & Complete Self-Uninstall */}
      <div className="rounded-xl border border-rose-950/40 bg-[#0d0707] p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-rose-950/50 pb-3">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
            Danger Zone
          </h3>
        </div>

        <div className="space-y-4">
          {/* Reset App Data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-rose-950/60 bg-[#0a0505]">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#f5f5f5] block">Reset CleanScope Data & Caches</span>
              <p className="text-[11px] text-[#71717a]">
                Wipes scan history, AI fingerprint caches, and custom settings under %LOCALAPPDATA%\CleanScope.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmInput('');
                setShowResetModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-950/30 text-amber-300 border border-amber-800/40 hover:bg-amber-900/40 transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Data
            </button>
          </div>

          {/* Uninstall App & Purge Everything */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-rose-900/50 bg-[#120707]">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-rose-300 block">Complete Uninstall & Purge Application</span>
              <p className="text-[11px] text-rose-200/60">
                Permanently deletes all CleanScope data and self-removes the executable file from your system.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmInput('');
                setShowUninstallModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex-shrink-0 shadow-sm"
            >
              <Power className="w-3.5 h-3.5" />
              Uninstall & Purge
            </button>
          </div>
        </div>
      </div>

      {/* Reset Data Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-[#222] rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-sm font-semibold text-[#f5f5f5]">Reset All CleanScope Data?</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-[#71717a] hover:text-[#f5f5f5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              This will wipe all scan logs, AI fingerprint caches, custom protected directories, and saved API settings from <code className="text-indigo-400 font-mono text-[11px]">%LOCALAPPDATA%\CleanScope</code>. The app will return to initial setup state.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a1a1a]">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 rounded-md text-xs text-[#a1a1aa] hover:text-[#f5f5f5] bg-[#141414] border border-[#222]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetData}
                disabled={isPurging}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
              >
                {isPurging ? 'Resetting...' : 'Yes, Reset All Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uninstall Confirmation Modal */}
      {showUninstallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0707] border border-rose-900/60 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-semibold text-rose-200">Uninstall CleanScope</h3>
              </div>
              <button
                onClick={() => setShowUninstallModal(false)}
                className="text-[#71717a] hover:text-[#f5f5f5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-rose-200/80 leading-relaxed">
              This action will completely remove CleanScope from your computer:
            </p>
            <ul className="text-xs text-[#a1a1aa] list-disc list-inside space-y-1 bg-[#070404] p-3 rounded-lg border border-rose-950/60">
              <li>All application settings & caches wiped</li>
              <li>Scan history & logs permanently deleted</li>
              <li>CleanScope executable self-deleted</li>
            </ul>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-rose-300 font-medium block">
                Type <span className="font-mono text-rose-400 font-bold">UNINSTALL</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="UNINSTALL"
                className="w-full bg-[#050303] border border-rose-900/60 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-950/60">
              <button
                type="button"
                onClick={() => setShowUninstallModal(false)}
                className="px-3 py-1.5 rounded-md text-xs text-[#a1a1aa] hover:text-[#f5f5f5] bg-[#141414] border border-[#222]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeAndUninstall}
                disabled={isPurging || confirmInput.trim().toUpperCase() !== 'UNINSTALL'}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isPurging ? 'Purging...' : 'Purge & Uninstall Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About CleanScope & Creator */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#141414] pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f5]">
              About CleanScope
            </h3>
            <span className="text-[11px] font-mono text-[#71717a]">
              Built with Tauri 2 & Rust
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
            Open Source
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-zinc-100">
              Created by Himanshu Singh
            </h4>
            <p className="text-xs text-zinc-400">
              Deterministic Windows storage diagnostic and safe cleanup utility.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => api.openUrl('https://github.com/HimanshuSingh213/CleanScope-App')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-200 hover:bg-white text-zinc-900 transition-colors shadow-sm select-none cursor-pointer"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              GitHub Repository
            </button>
          </div>
        </div>
      </div>

      {/* Protected Windows System Boundaries Modal */}
      <ProtectedPathsModal
        isOpen={showProtectedModal}
        onClose={() => setShowProtectedModal(false)}
      />
    </div>
  );
};
