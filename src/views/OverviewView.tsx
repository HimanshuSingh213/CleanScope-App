import React from 'react';
import { 
  HardDrive, 
  Scan, 
  ShieldCheck, 
  Trash2, 
  ArrowRight, 
  Code2, 
  Layers, 
  FolderArchive, 
  History 
} from 'lucide-react';
import { DriveInfo, FileCandidate, ScanReport, CleanupReport } from '../types/candidate';
import { formatBytes, formatDate } from '../utils/formatters';
import { useAppStore, TabType } from '../store/useAppStore';

interface OverviewViewProps {
  drives?: DriveInfo[];
  candidates?: FileCandidate[];
  lastScanReport?: ScanReport | null;
  lastCleanupReport?: CleanupReport | null;
  onStartScan?: () => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  drives = [],
  lastScanReport: propLastScan,
  lastCleanupReport: propLastCleanup,
}) => {
  const { 
    candidates, 
    lastScanReport: storeLastScan, 
    startScan, 
    setActiveTab 
  } = useAppStore();

  const lastScanReport = propLastScan || storeLastScan;
  const lastCleanupReport = propLastCleanup || null;
  const onStartScan = () => startScan();
  const onNavigateTab = (tab: TabType) => setActiveTab(tab);

  const potentialTotal = candidates.reduce((acc, c) => acc + c.sizeBytes, 0);
  const safeTotal = candidates
    .filter((c) => c.riskLevel === 'safe')
    .reduce((acc, c) => acc + c.sizeBytes, 0);
  const reviewTotal = candidates
    .filter((c) => c.riskLevel === 'review')
    .reduce((acc, c) => acc + c.sizeBytes, 0);

  const categoryStats = [
    {
      id: 'temporary',
      name: 'System Temp & Crash Dumps',
      size: candidates
        .filter((c) => c.category === 'temporary' || c.category === 'crash-data')
        .reduce((acc, c) => acc + c.sizeBytes, 0),
      count: candidates.filter((c) => c.category === 'temporary' || c.category === 'crash-data').length,
      icon: Trash2,
      tab: 'scan' as const,
    },
    {
      id: 'cache',
      name: 'Application Caches',
      size: candidates
        .filter((c) => c.category === 'cache')
        .reduce((acc, c) => acc + c.sizeBytes, 0),
      count: candidates.filter((c) => c.category === 'cache').length,
      icon: Layers,
      tab: 'apps' as const,
    },
    {
      id: 'developer',
      name: 'Developer & Build Artifacts',
      size: candidates
        .filter((c) => c.category === 'developer-cache' || c.category === 'build-output')
        .reduce((acc, c) => acc + c.sizeBytes, 0),
      count: candidates.filter((c) => c.category === 'developer-cache' || c.category === 'build-output').length,
      icon: Code2,
      tab: 'dev' as const,
    },
    {
      id: 'installers',
      name: 'Installers & Packages',
      size: candidates
        .filter((c) => c.category === 'installer')
        .reduce((acc, c) => acc + c.sizeBytes, 0),
      count: candidates.filter((c) => c.category === 'installer').length,
      icon: FolderArchive,
      tab: 'scan' as const,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* System Status HUD Banner */}
      <div className="rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Windows Deterministic Safety Guard Active</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-[#f5f5f5]">
              Storage Health & Diagnostics
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Analyzes storage without guesswork. Deletions route to the Windows Recycle Bin with verified safety bounds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onStartScan}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-sm select-none"
            >
              <Scan className="w-3.5 h-3.5" />
              Start Storage Scan
            </button>
          </div>
        </div>
      </div>

      {/* Discovered Drives Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Drives ({drives.length})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drives.map((drive) => {
            const usedPercent = Math.round((drive.usedBytes / drive.totalBytes) * 100) || 0;
            return (
              <div
                key={drive.mountPoint}
                className="p-4 rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#141414] border border-[#222222] text-zinc-400">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-[#f5f5f5] tracking-tight">
                        {drive.name} ({drive.mountPoint})
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {drive.fileSystem} {drive.isSystem ? '• System Partition' : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium text-zinc-400">
                    {usedPercent}% used
                  </span>
                </div>

                {/* Storage Bar */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-[#161616] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        usedPercent > 85 ? 'bg-rose-500' : 'bg-zinc-300'
                      }`}
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>{formatBytes(drive.usedBytes)} Used</span>
                    <span>{formatBytes(drive.availableBytes)} Free of {formatBytes(drive.totalBytes)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Potential Reclaimable
          </span>
          <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
            {formatBytes(potentialTotal)}
          </span>
          <p className="text-[11px] text-zinc-500">
            {candidates.length} candidate items discovered
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/90 block">
            Safe To Clean
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            {formatBytes(safeTotal)}
          </span>
          <p className="text-[11px] text-zinc-500">
            Disposable caches & diagnostics
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 block">
            Review Recommended
          </span>
          <span className="text-2xl font-bold font-mono text-amber-300 tracking-tight">
            {formatBytes(reviewTotal)}
          </span>
          <p className="text-[11px] text-zinc-500">
            Developer caches, builds & packages
          </p>
        </div>
      </div>

      {/* Category Breakdown Table/Grid */}
      <div className="space-y-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
          Categorized Storage Units
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categoryStats.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() => onNavigateTab(cat.tab)}
                className="p-3.5 rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] hover:border-[#282828] hover:bg-[#0e0e0e] transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#121212] border border-[#202020] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-zinc-200">
                      {cat.name}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {cat.count} items detected
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-zinc-200">
                    {formatBytes(cat.size)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Recap Footer */}
      {(lastScanReport || lastCleanupReport) && (
        <div className="p-3.5 rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-zinc-400">
            <History className="w-4 h-4 text-zinc-500" />
            {lastCleanupReport ? (
              <span>
                Last cleanup reclaimed <strong className="text-zinc-200 font-mono">{formatBytes(lastCleanupReport.reclaimedBytes)}</strong> on {formatDate(lastCleanupReport.timestamp)}.
              </span>
            ) : lastScanReport ? (
              <span>
                Last scan analyzed <strong className="text-zinc-200 font-mono">{lastScanReport.totalFilesScanned.toLocaleString()} files</strong> ({formatBytes(lastScanReport.totalBytesScanned)}) on {formatDate(lastScanReport.timestamp)}.
              </span>
            ) : null}
          </div>
          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            Audit Log
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
