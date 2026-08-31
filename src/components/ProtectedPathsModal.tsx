import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  FolderLock, 
  Plus, 
  Trash2,
  HardDrive,
  Code2,
  Layers,
  FileStack,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'sonner';

interface ProtectedPathsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProtectedPathsModal: React.FC<ProtectedPathsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'protected' | 'scannable' | 'custom'>('protected');
  const [newCustomPath, setNewCustomPath] = useState<string>('');

  if (!isOpen) return null;

  const systemProtectedRules = [
    {
      name: 'Windows System Core',
      paths: ['C:\\Windows\\System32', 'C:\\Windows\\SysWOW64', 'C:\\Windows\\WinSxS', 'C:\\Windows\\servicing'],
      reason: 'Essential operating system binaries, component stores, and servicing packages required for Windows stability.',
    },
    {
      name: 'Boot Infrastructure & Paging',
      paths: ['C:\\boot', 'C:\\Windows\\boot', 'pagefile.sys', 'swapfile.sys', 'hiberfil.sys', 'dumpstack.log'],
      reason: 'Windows boot manager, memory swap, and crash dump recovery partitions.',
    },
    {
      name: 'Volume Shadow & System Restore',
      paths: ['*\\System Volume Information', '*\\Recovery', '*\\$Recycle.Bin'],
      reason: 'System restore points, backup shadows, and Windows Recycle Bin containers across all drives.',
    },
    {
      name: 'Registry & Security Hives',
      paths: ['SAM', 'SYSTEM', 'SECURITY', 'SOFTWARE', 'NTUSER.DAT', 'usrclass.dat'],
      reason: 'User account security databases, credentials, and encrypted vault stores.',
    },
    {
      name: 'Drive Partition Roots',
      paths: ['C:\\', 'D:\\', 'E:\\', 'F:\\ (Root Directories)'],
      reason: 'Drive root mount points cannot be removed.',
    },
  ];

  const scannableScopes = [
    {
      name: 'All Discovered Disk Drives',
      icon: HardDrive,
      targets: ['C:\\', 'D:\\', 'E:\\', 'F:\\', 'All Fixed & Removable Drives'],
      description: 'Traverses directory trees across all partitions up to 12 levels deep.',
    },
    {
      name: 'Developer Ecosystems & Build Artifacts',
      icon: Code2,
      targets: ['node_modules', '.next', 'target', 'bin / obj', '__pycache__', '.gradle', '.nuget', '.cargo', '.docker'],
      description: 'Atomic directory pruning scans package stores and build outputs with 20x speedup.',
    },
    {
      name: 'Application & System Caches',
      icon: Layers,
      targets: ['%LOCALAPPDATA%\\Temp', 'C:\\Windows\\Temp', 'Chrome / Edge / Brave / VS Code Caches', 'Crash Dumps'],
      description: 'Identifies recreateable browser caches, GPU shader caches, and diagnostic crash dumps.',
    },
    {
      name: 'Standalone Large Files & Duplicates',
      icon: FileStack,
      targets: ['Files ≥ 100 MB', 'ISO / VMDK / Disk Images', 'Archives (ZIP / 7z / TAR)', 'Exact Binary SHA-256 Duplicates'],
      description: 'Discovers large individual files and exact cryptographic duplicates across all drives.',
    },
  ];

  const handleAddCustomPath = async () => {
    if (!newCustomPath.trim() || !settings) return;
    const pathToAdd = newCustomPath.trim();
    if (settings.protectedPaths.includes(pathToAdd)) {
      toast.warning('Path Already Protected', { description: 'This folder is already in your protected exclusions list.' });
      return;
    }

    const updated = {
      ...settings,
      protectedPaths: [...settings.protectedPaths, pathToAdd],
    };

    try {
      await updateSettings(updated);
      setNewCustomPath('');
      toast.success('Custom Path Protected', { description: `Protected: ${pathToAdd}` });
    } catch (e) {
      console.error('Failed to add protected path:', e);
    }
  };

  const handleRemoveCustomPath = async (pathToRm: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      protectedPaths: settings.protectedPaths.filter((p: string) => p !== pathToRm),
    };

    try {
      await updateSettings(updated);
      toast.info('Protected Path Removed', { description: `Removed: ${pathToRm}` });
    } catch (e) {
      console.error('Failed to remove protected path:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#09090b] border border-[#222] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#1c1c1c] flex items-center justify-between bg-[#0e0e10]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-zinc-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
                Filesystem Scope & Protection Guard
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono">
                Inspect scannable targets and protected Windows operating system boundaries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-[#18181b] transition-colors outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-[#1c1c1c] bg-[#0c0c0e] flex gap-2">
          <button
            onClick={() => setActiveTab('protected')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors outline-none ${
              activeTab === 'protected'
                ? 'border-emerald-400 text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Protected System Boundaries ({systemProtectedRules.length})
          </button>

          <button
            onClick={() => setActiveTab('scannable')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors outline-none ${
              activeTab === 'scannable'
                ? 'border-indigo-400 text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            What CleanScope Scans ({scannableScopes.length})
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors outline-none ${
              activeTab === 'custom'
                ? 'border-amber-400 text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Custom Exclusions ({settings?.protectedPaths.length || 0})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Tab 1: Protected System Boundaries */}
          {activeTab === 'protected' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0e0e10] border border-[#1c1c1c] space-y-1.5">
                <div className="flex items-center gap-2 text-zinc-200 font-medium">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  Unconditionally Excluded by Native Rust Safety Engine
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  These core Windows operating system directories are unconditionally protected. CleanScope will never touch, scan, or delete any files inside these critical paths under any circumstances.
                </p>
              </div>

              <div className="space-y-2.5">
                {systemProtectedRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#1c1c1c] bg-[#0c0c0e] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <FolderLock className="w-3.5 h-3.5 text-zinc-400" />
                        {rule.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/30 text-emerald-400 border border-emerald-900/30">
                        Protected
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {rule.paths.map((p, pIdx) => (
                        <span
                          key={pIdx}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141416] text-zinc-400 border border-[#222]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {rule.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: What CleanScope Scans */}
          {activeTab === 'scannable' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0e0e10] border border-[#1c1c1c] space-y-1.5">
                <div className="flex items-center gap-2 text-zinc-200 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  Full-Disk Analysis Coverage
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  CleanScope analyzes all discovered logical drives and high-yield cache paths using multi-threaded traversal and atomic directory pruning.
                </p>
              </div>

              <div className="space-y-2.5">
                {scannableScopes.map((scope, idx) => {
                  const Icon = scope.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-[#1c1c1c] bg-[#0c0c0e] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-indigo-400" />
                          {scope.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/30 text-indigo-300 border border-indigo-900/30">
                          Scannable
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {scope.targets.map((t, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141416] text-zinc-300 border border-[#222]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {scope.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Custom User Exclusions */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0e0e10] border border-[#1c1c1c] space-y-1.5">
                <div className="flex items-center gap-2 text-zinc-200 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  User-Defined Protected Folders
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Add custom folder paths here that you want CleanScope to completely ignore and exclude from storage scans.
                </p>
              </div>

              {/* Input to add custom path */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCustomPath}
                  onChange={(e) => setNewCustomPath(e.target.value)}
                  placeholder="e.g. D:\MyProjects or C:\ImportantData"
                  className="flex-1 bg-[#060608] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddCustomPath}
                  disabled={!newCustomPath.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-200 text-zinc-900 hover:bg-white transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 select-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Path
                </button>
              </div>

              {/* Custom paths list */}
              {settings?.protectedPaths && settings.protectedPaths.length > 0 ? (
                <div className="divide-y divide-[#18181b] border border-[#1c1c1c] rounded-lg bg-[#0c0c0e] overflow-hidden">
                  {settings.protectedPaths.map((cp: string, idx: number) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-300 truncate max-w-md">{cp}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomPath(cp)}
                        className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                        title="Remove custom protection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-600 italic">
                  No custom user-protected directories added yet.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1c1c1c] bg-[#0b0b0d] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-200 text-zinc-900 hover:bg-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
