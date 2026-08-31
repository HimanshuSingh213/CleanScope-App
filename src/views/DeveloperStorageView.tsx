import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Trash2, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  FolderOpen 
} from 'lucide-react';
import { DeveloperCategorySummary, FileCandidate } from '../types/candidate';
import { formatBytes } from '../utils/formatters';
import { RiskBadge } from '../components/Badges';
import { CandidateDetailDrawer } from '../components/CandidateDetailDrawer';
import { CleanupReviewModal } from '../components/CleanupReviewModal';
import { api } from '../services/api';

export const DeveloperStorageView: React.FC = () => {
  const [summaries, setSummaries] = useState<DeveloperCategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedEcosystem, setExpandedEcosystem] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<FileCandidate | null>(null);
  const [cleanCandidates, setCleanCandidates] = useState<FileCandidate[]>([]);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  const fetchDevStorage = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDeveloperStorage();
      setSummaries(data);
    } catch (e) {
      console.error('Failed to fetch developer storage:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevStorage();
  }, []);

  const totalDevBytes = summaries.reduce((acc, s) => acc + s.totalSizeBytes, 0);

  const handleCleanEcosystem = (summary: DeveloperCategorySummary) => {
    setCleanCandidates(summary.candidates);
    setShowReviewModal(true);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="p-5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">
              Developer Ecosystem & Build Caches
            </h2>
          </div>
          <p className="text-xs text-[#71717a]">
            Manage package caches and build artifacts across Node.js, Rust, Python, Docker, Go, and IDEs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#121212] border border-[#222222] text-right">
            <span className="text-[10px] uppercase text-[#71717a] block">Developer Storage</span>
            <span className="text-sm font-semibold font-mono text-indigo-300">
              {formatBytes(totalDevBytes)}
            </span>
          </div>

          <button
            onClick={fetchDevStorage}
            disabled={isLoading}
            className="p-2.5 rounded-lg bg-[#141414] border border-[#222222] text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
            title="Refresh developer storage"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ecosystem Cards */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-[#71717a] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Analyzing developer caches and build folders...
        </div>
      ) : summaries.length === 0 ? (
        <div className="p-16 text-center text-xs text-[#71717a] rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
          Run a Smart Scan to discover developer package caches and intermediate build outputs.
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary) => {
            const isExpanded = expandedEcosystem === summary.id;
            return (
              <div
                key={summary.id}
                className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden transition-all"
              >
                <div className="p-5 flex items-center justify-between gap-4">
                  <div
                    onClick={() => setExpandedEcosystem(isExpanded ? null : summary.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <button className="text-[#71717a]">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-[#f5f5f5]">
                          {summary.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-950/40 text-indigo-300 border border-indigo-800/30">
                          {summary.canRegenerate ? 'Rebuildable' : 'Manual'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#71717a] font-mono mt-0.5">
                        {summary.itemCount} items • {summary.deleteEffect}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs font-mono font-semibold text-[#f5f5f5]">
                      {formatBytes(summary.totalSizeBytes)}
                    </span>
                    <button
                      onClick={() => handleCleanEcosystem(summary)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#161616] text-[#e4e4e7] border border-[#262626] hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clean Cache
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#141414] bg-[#070707] p-4 divide-y divide-[#101010]">
                    {summary.candidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div
                          onClick={() => setSelectedCandidate(cand)}
                          className="cursor-pointer min-w-0 flex-1 space-y-0.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#e4e4e7] font-medium truncate">
                              {cand.name}
                            </span>
                            <RiskBadge risk={cand.riskLevel} />
                          </div>
                          <p className="text-[11px] font-mono text-[#71717a] truncate">
                            {cand.path}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-mono text-[11px] text-[#a1a1aa]">
                            {formatBytes(cand.sizeBytes)}
                          </span>
                          <button
                            onClick={() => api.openInExplorer(cand.path)}
                            className="p-1 text-[#71717a] hover:text-[#f5f5f5] transition-colors"
                            title="Open in Windows Explorer"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Detail Drawer */}
      <CandidateDetailDrawer
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        isSelected={false}
        onToggleSelect={() => {}}
      />

      {/* Review Modal */}
      {showReviewModal && (
        <CleanupReviewModal
          selectedCandidates={cleanCandidates}
          onClose={() => setShowReviewModal(false)}
          onCleanupComplete={() => {
            fetchDevStorage();
          }}
        />
      )}
    </div>
  );
};
