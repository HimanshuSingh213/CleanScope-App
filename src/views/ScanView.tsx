import React, { useState, useMemo, useEffect } from 'react';
import { 
  Scan, 
  Search, 
  Trash2, 
  Cpu, 
  X, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  RotateCcw,
  ChevronRight,
  Clock,
  Zap,
  HardDrive,
  Layers
} from 'lucide-react';
import { FileCandidate, ScanProgressEvent, Settings } from '../types/candidate';
import { formatBytes, formatSpeed } from '../utils/formatters';
import { AIBadge, CategoryBadge, LockBadge, RiskBadge } from '../components/Badges';
import { CandidateDetailDrawer } from '../components/CandidateDetailDrawer';
import { CleanupReviewModal } from '../components/CleanupReviewModal';
import { DeepAiModal } from '../components/DeepAiModal';
import { useAppStore } from '../store/useAppStore';

interface ScanViewProps {
  candidates?: FileCandidate[];
  isScanning?: boolean;
  scanProgress?: ScanProgressEvent | null;
  settings?: Settings | null;
  onStartScan?: (customTargets?: string[]) => void;
  onCancelScan?: () => void;
  onRefreshCandidates?: () => void;
}

export const ScanView: React.FC<ScanViewProps> = () => {
  const {
    candidates,
    isScanning,
    scanProgress,
    settings,
    selectedIds,
    toggleSelectCandidate,
    selectAllCandidates,
    selectSafeOnly,
    deselectAllCandidates,
    startScan,
    cancelScan,
    refreshCandidates,
    activeDetailCandidate,
    setActiveDetailCandidate,
    aiModalCandidate,
    setAiModalCandidate,
    showReviewModal,
    setShowReviewModal,
    runAiAnalysis,
    isAiAnalyzing,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [inUseFilter, setInUseFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'risk' | 'confidence'>('size');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live Timer during active scan
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isScanning) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning]);

  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPath = c.path.toLowerCase().includes(q);
        if (!matchesName && !matchesPath) return false;
      }

      if (categoryFilter !== 'all' && c.category !== categoryFilter) {
        return false;
      }

      if (riskFilter !== 'all' && c.riskLevel !== riskFilter) {
        return false;
      }

      if (inUseFilter === 'locked' && !c.inUse) return false;
      if (inUseFilter === 'idle' && c.inUse) return false;

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'size') {
        comparison = a.sizeBytes - b.sizeBytes;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'risk') {
        comparison = a.riskLevel.localeCompare(b.riskLevel);
      } else if (sortBy === 'confidence') {
        comparison = a.confidence - b.confidence;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [candidates, searchQuery, categoryFilter, riskFilter, inUseFilter, sortBy, sortOrder]);

  const selectedCandidates = useMemo(() => {
    return candidates.filter((c) => selectedIds.has(c.id));
  }, [candidates, selectedIds]);

  const totalSelectedBytes = useMemo(() => {
    return selectedCandidates.reduce((acc, c) => acc + c.sizeBytes, 0);
  }, [selectedCandidates]);

  const handleSelectFiltered = () => {
    selectAllCandidates(filteredCandidates);
  };

  const handleRunAiAnalysis = async (candidate?: FileCandidate) => {
    await runAiAnalysis(candidate);
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Active Scanning HUD Header */}
      {isScanning ? (
        <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#141414] border border-[#222222] text-zinc-300">
                <Scan className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  Scanning Filesystem
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                </h2>
                <p className="text-[11px] text-zinc-500 font-mono">
                  {scanProgress?.phase || 'Traversing disk trees...'}
                </p>
              </div>
            </div>

            <button
              onClick={() => cancelScan()}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#1a1010] text-rose-300 border border-rose-900/40 hover:bg-rose-950/60 transition-colors outline-none"
            >
              Cancel Scan
            </button>
          </div>

          {/* Current Path Bar */}
          <div className="p-2.5 rounded-lg bg-[#050505] border border-[#1a1a1a] flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] uppercase font-mono text-zinc-500 flex-shrink-0">Path:</span>
            <span className="text-xs font-mono text-zinc-400 truncate">
              {scanProgress?.currentPath || 'Initializing disk walker...'}
            </span>
          </div>

          {/* Real-time Metrics 5-card HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-lg bg-[#0e0e0e] border border-[#1c1c1c] flex items-center gap-2.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-mono">Elapsed</span>
                <span className="text-xs font-semibold font-mono text-zinc-200">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0e0e0e] border border-[#1c1c1c] flex items-center gap-2.5">
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-mono">Files</span>
                <span className="text-xs font-semibold font-mono text-zinc-200">
                  {scanProgress?.totalFiles.toLocaleString() || '0'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0e0e0e] border border-[#1c1c1c] flex items-center gap-2.5">
              <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-mono">Scanned</span>
                <span className="text-xs font-semibold font-mono text-zinc-200">
                  {formatBytes(scanProgress?.totalBytes || 0)}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0e0e0e] border border-[#1c1c1c] flex items-center gap-2.5">
              <Zap className="w-3.5 h-3.5 text-zinc-500" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-mono">Speed</span>
                <span className="text-xs font-semibold font-mono text-zinc-200">
                  {formatSpeed(scanProgress?.scanSpeedFilesPerSec || 0)}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0e0e0e] border border-[#1c1c1c] flex items-center gap-2.5 col-span-2 sm:col-span-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <span className="text-[10px] text-emerald-400/90 uppercase block font-mono">Discovered</span>
                <span className="text-xs font-semibold font-mono text-emerald-300">
                  {formatBytes(scanProgress?.potentialCleanupBytes || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#1c1c1c] bg-[#0a0a0a]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Scan Results</h2>
            <p className="text-xs text-zinc-500">
              {candidates.length} candidates identified ({formatBytes(candidates.reduce((acc, c) => acc + c.sizeBytes, 0))})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startScan()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] text-zinc-300 border border-[#222222] hover:bg-[#1a1a1a] hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              Re-Scan Storage
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Review Cleanup ({selectedIds.size} • {formatBytes(totalSelectedBytes)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name or path..."
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-44 bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All Categories</option>
            <option value="temporary">Temporary Data</option>
            <option value="cache">Application Caches</option>
            <option value="developer-cache">Developer Caches</option>
            <option value="build-output">Build Outputs</option>
            <option value="log">Logs & Diagnostics</option>
            <option value="crash-data">Crash Dumps</option>
            <option value="installer">Installers</option>
            <option value="duplicate">Duplicates</option>
            <option value="large-file">Large Files</option>
          </select>

          {/* Risk Dropdown */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full md:w-36 bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All Risks</option>
            <option value="safe">Safe (Green)</option>
            <option value="review">Review (Yellow)</option>
            <option value="protected">Protected (Red)</option>
            <option value="unknown">Unknown (Gray)</option>
          </select>

          {/* In-Use Filter */}
          <select
            value={inUseFilter}
            onChange={(e) => setInUseFilter(e.target.value)}
            className="w-full md:w-32 bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All Locks</option>
            <option value="idle">Idle Only</option>
            <option value="locked">In Use Only</option>
          </select>
        </div>

        {/* Selection & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#161616]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={selectSafeOnly}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded hover:bg-[#141414] transition-colors"
            >
              Select Safe
            </button>
            <button
              onClick={handleSelectFiltered}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded hover:bg-[#141414] transition-colors"
            >
              Select All Filtered
            </button>
            <button
              onClick={deselectAllCandidates}
              className="text-[11px] font-mono text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded hover:bg-[#141414] transition-colors"
            >
              Deselect
            </button>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <button
                onClick={() => handleRunAiAnalysis()}
                disabled={isAiAnalyzing}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                {isAiAnalyzing ? 'Analyzing...' : `Diagnose Selected (${selectedIds.size})`}
              </button>
            )}

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <span>Sort:</span>
              <button
                onClick={() => {
                  if (sortBy === 'size') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortBy('size');
                    setSortOrder('desc');
                  }
                }}
                className={`px-1.5 py-0.5 rounded ${sortBy === 'size' ? 'text-zinc-100 bg-[#161616]' : 'hover:text-zinc-200'}`}
              >
                Size {sortBy === 'size' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'risk') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortBy('risk');
                    setSortOrder('asc');
                  }
                }}
                className={`px-1.5 py-0.5 rounded ${sortBy === 'risk' ? 'text-zinc-100 bg-[#161616]' : 'hover:text-zinc-200'}`}
              >
                Risk {sortBy === 'risk' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Table */}
      <div className="rounded-xl border border-[#1c1c1c] bg-[#0a0a0a] overflow-hidden">
        {filteredCandidates.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
            <h3 className="text-sm font-medium text-zinc-200">No Candidates Found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No items match your active search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#141414]">
            {filteredCandidates.map((candidate) => {
              const isSelected = selectedIds.has(candidate.id);
              return (
                <div
                  key={candidate.id}
                  className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                    isSelected ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'hover:bg-[#0e0e0e]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => toggleSelectCandidate(candidate)}
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div
                      onClick={() => setActiveDetailCandidate(candidate)}
                      className="cursor-pointer min-w-0 flex-1 space-y-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200 truncate max-w-md" title={candidate.name}>
                          {candidate.name}
                        </span>
                        <CategoryBadge category={candidate.category} />
                        <RiskBadge risk={candidate.riskLevel} />
                        {candidate.inUse && (
                          <LockBadge inUse={candidate.inUse} processName={candidate.owningProcess} />
                        )}
                        <AIBadge provider={candidate.aiProvider} />
                      </div>
                      <p className="text-[11px] font-mono text-zinc-500 truncate max-w-2xl" title={candidate.path}>
                        {candidate.path}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs font-mono font-semibold text-zinc-200">
                      {formatBytes(candidate.sizeBytes)}
                    </span>
                    <button
                      onClick={() => setActiveDetailCandidate(candidate)}
                      className="p-1 text-zinc-600 hover:text-zinc-200 transition-colors"
                      title="Inspect Candidate Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <CandidateDetailDrawer
        candidate={activeDetailCandidate}
        onClose={() => setActiveDetailCandidate(null)}
        isSelected={activeDetailCandidate ? selectedIds.has(activeDetailCandidate.id) : false}
        onToggleSelect={toggleSelectCandidate}
        onAnalyzeAI={(cand) => setAiModalCandidate(cand)}
        isAnalyzing={isAiAnalyzing}
      />

      {/* Deep AI Modal */}
      {aiModalCandidate && (
        <DeepAiModal
          candidate={aiModalCandidate}
          settings={settings}
          onClose={() => setAiModalCandidate(null)}
          onCandidateUpdated={(updated) => {
            setAiModalCandidate(updated);
            if (activeDetailCandidate?.id === updated.id) {
              setActiveDetailCandidate(updated);
            }
            refreshCandidates();
          }}
          isSelected={selectedIds.has(aiModalCandidate.id)}
          onToggleSelect={toggleSelectCandidate}
        />
      )}

      {/* Review & Cleanup Modal */}
      {showReviewModal && (
        <CleanupReviewModal
          selectedCandidates={selectedCandidates}
          onClose={() => setShowReviewModal(false)}
          onCleanupComplete={() => {
            refreshCandidates();
            deselectAllCandidates();
          }}
        />
      )}
    </div>
  );
};
