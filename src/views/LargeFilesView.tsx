import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FolderOpen, 
  Trash2, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Info 
} from 'lucide-react';
import { FileCandidate } from '../types/candidate';
import { formatBytes } from '../utils/formatters';
import { CategoryBadge, RiskBadge } from '../components/Badges';
import { CandidateDetailDrawer } from '../components/CandidateDetailDrawer';
import { CleanupReviewModal } from '../components/CleanupReviewModal';
import { api } from '../services/api';

export const LargeFilesView: React.FC = () => {
  const [largeFiles, setLargeFiles] = useState<FileCandidate[]>([]);
  const [minSizeMB, setMinSizeMB] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeCandidate, setActiveCandidate] = useState<FileCandidate | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  const fetchLargeFiles = async (minMB: number) => {
    setIsLoading(true);
    try {
      const minBytes = minMB * 1024 * 1024;
      const files = await api.getLargeFiles(minBytes);
      setLargeFiles(files);
    } catch (e) {
      console.error('Failed to fetch large files:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLargeFiles(minSizeMB);
  }, [minSizeMB]);

  const filteredFiles = largeFiles.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
  });

  const selectedCandidates = largeFiles.filter((f) => selectedIds.has(f.id));
  const totalSelectedBytes = selectedCandidates.reduce((acc, c) => acc + c.sizeBytes, 0);

  const handleToggleSelect = (candidate: FileCandidate) => {
    const next = new Set(selectedIds);
    if (next.has(candidate.id)) {
      next.delete(candidate.id);
    } else {
      next.add(candidate.id);
    }
    setSelectedIds(next);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Informative Banner */}
      <div className="p-4 rounded-xl border border-amber-900/30 bg-amber-950/15 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-amber-300">
            Large does not mean unnecessary
          </h3>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            CleanScope does not pre-select large files by default. Review videos, VM disk images, and personal archives carefully before moving them to the Recycle Bin.
          </p>
        </div>
      </div>

      {/* Threshold Selector and Controls */}
      <div className="p-4 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717a] font-medium">Minimum Size:</span>
          {[100, 500, 1000, 5000].map((size) => (
            <button
              key={size}
              onClick={() => setMinSizeMB(size)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                minSizeMB === size
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#141414] text-[#a1a1aa] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] border border-[#222222]'
              }`}
            >
              {size >= 1000 ? `${size / 1000} GB+` : `${size} MB+`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search large files..."
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#f5f5f5] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => fetchLargeFiles(minSizeMB)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#141414] border border-[#222222] text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
            title="Refresh Large Files"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selected Action Bar */}
      {selectedIds.size > 0 && (
        <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 flex items-center justify-between">
          <span className="text-xs text-indigo-300 font-medium">
            {selectedIds.size} files selected ({formatBytes(totalSelectedBytes)})
          </span>
          <button
            onClick={() => setShowReviewModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-600 text-white hover:bg-rose-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clean Selected
          </button>
        </div>
      )}

      {/* Table of Large Files */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#71717a] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            Scanning storage for files above {minSizeMB} MB...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#71717a]">
            No large files found matching the {minSizeMB} MB threshold.
          </div>
        ) : (
          <div className="divide-y divide-[#141414]">
            {filteredFiles.map((file) => {
              const isSelected = selectedIds.has(file.id);
              return (
                <div
                  key={file.id}
                  className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                    isSelected ? 'bg-indigo-950/15' : 'hover:bg-[#0e0e0e]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleSelect(file)}
                      className="p-1 text-[#71717a] hover:text-[#f5f5f5] transition-colors flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div
                      onClick={() => setActiveCandidate(file)}
                      className="cursor-pointer min-w-0 flex-1 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#f5f5f5] truncate max-w-md" title={file.name}>
                          {file.name}
                        </span>
                        <CategoryBadge category={file.category} />
                        <RiskBadge risk={file.riskLevel} />
                      </div>
                      <p className="text-[11px] font-mono text-[#71717a] truncate max-w-2xl" title={file.path}>
                        {file.path}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono font-semibold text-[#f5f5f5]">
                      {formatBytes(file.sizeBytes)}
                    </span>
                    <button
                      onClick={() => api.openInExplorer(file.path)}
                      className="p-1.5 rounded text-[#71717a] hover:text-[#f5f5f5] hover:bg-[#141414] transition-colors"
                      title="Open in Windows Explorer"
                    >
                      <FolderOpen className="w-4 h-4" />
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
        candidate={activeCandidate}
        onClose={() => setActiveCandidate(null)}
        isSelected={activeCandidate ? selectedIds.has(activeCandidate.id) : false}
        onToggleSelect={handleToggleSelect}
      />

      {/* Review Modal */}
      {showReviewModal && (
        <CleanupReviewModal
          selectedCandidates={selectedCandidates}
          onClose={() => setShowReviewModal(false)}
          onCleanupComplete={() => {
            fetchLargeFiles(minSizeMB);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
};
