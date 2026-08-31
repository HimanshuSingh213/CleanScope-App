import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Trash2, 
  FolderOpen, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  CheckCircle2 
} from 'lucide-react';
import { DuplicateGroup, FileCandidate } from '../types/candidate';
import { formatBytes } from '../utils/formatters';
import { CleanupReviewModal } from '../components/CleanupReviewModal';
import { api } from '../services/api';

export const DuplicatesView: React.FC = () => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      const groups = await api.getDuplicates();
      setDuplicateGroups(groups);
    } catch (e) {
      console.error('Failed to fetch duplicates:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const totalRecoverable = duplicateGroups.reduce((acc, g) => acc + g.recoverableBytes, 0);

  // Collect all duplicate items
  const allDuplicateItems: FileCandidate[] = duplicateGroups.flatMap((g) => g.items);
  const selectedCandidates = allDuplicateItems.filter((c) => selectedIds.has(c.id));
  const totalSelectedBytes = selectedCandidates.reduce((acc, c) => acc + c.sizeBytes, 0);

  const handleToggleSelect = (group: DuplicateGroup, item: FileCandidate) => {
    const next = new Set(selectedIds);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      // Guard: Ensure user doesn't select ALL copies in a group (at least 1 copy must be kept)
      const groupSelectedCount = group.items.filter((i) => next.has(i.id)).length;
      if (groupSelectedCount >= group.items.length - 1) {
        // Already selected all other copies in this group
        return;
      }
      next.add(item.id);
    }
    setSelectedIds(next);
  };

  const handleAutoSelectKeepFirst = () => {
    const next = new Set<string>();
    for (const group of duplicateGroups) {
      // Keep the first item, select the remaining items
      for (let i = 1; i < group.items.length; i++) {
        next.add(group.items[i].id);
      }
    }
    setSelectedIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="p-5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">
              Exact Duplicate File Detection
            </h2>
          </div>
          <p className="text-xs text-[#71717a]">
            Staged 2-pass SHA-256 binary verification. At least one original copy is always preserved.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#121212] border border-[#222222] text-right">
            <span className="text-[10px] uppercase text-[#71717a] block">Recoverable Space</span>
            <span className="text-sm font-semibold font-mono text-emerald-400">
              {formatBytes(totalRecoverable)}
            </span>
          </div>

          <button
            onClick={fetchDuplicates}
            disabled={isLoading}
            className="p-2.5 rounded-lg bg-[#141414] border border-[#222222] text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
            title="Re-scan duplicates"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Auto Selection Actions */}
      <div className="p-3 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoSelectKeepFirst}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-md hover:bg-indigo-950/30 transition-colors"
          >
            Auto-Select Duplicates (Keep 1st)
          </button>
          <button
            onClick={handleDeselectAll}
            className="text-xs font-medium text-[#71717a] hover:text-[#f5f5f5] px-3 py-1.5 rounded-md hover:bg-[#141414] transition-colors"
          >
            Clear Selection
          </button>
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowReviewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Review Clean ({selectedIds.size} files • {formatBytes(totalSelectedBytes)})
          </button>
        )}
      </div>

      {/* Duplicate Groups List */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-[#71717a] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Computing staged SHA-256 hashes across files...
        </div>
      ) : duplicateGroups.length === 0 ? (
        <div className="p-16 text-center space-y-2 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
          <h3 className="text-sm font-medium text-[#f5f5f5]">No Duplicate Files Discovered</h3>
          <p className="text-xs text-[#71717a]">
            Your storage has no identical multi-copy files above 10 KB.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map((group, gIdx) => (
            <div
              key={gIdx}
              className="p-5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#141414] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#f5f5f5]">
                    Duplicate Group #{gIdx + 1}
                  </span>
                  <span className="text-[11px] font-mono text-[#71717a]">
                    ({group.items.length} copies • {formatBytes(group.sizeBytes)} each)
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-medium">
                  +{formatBytes(group.recoverableBytes)} recoverable
                </span>
              </div>

              {/* Duplicate item rows */}
              <div className="divide-y divide-[#121212]">
                {group.items.map((item, iIdx) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors ${
                        isSelected ? 'bg-indigo-950/20' : 'hover:bg-[#0e0e0e]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleSelect(group, item)}
                          className="p-0.5 text-[#71717a] hover:text-[#f5f5f5] transition-colors flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <span className="font-mono text-[#a1a1aa] truncate select-all max-w-xl" title={item.path}>
                          {item.path}
                        </span>
                        {iIdx === 0 && (
                          <span className="text-[10px] uppercase font-semibold text-[#71717a] bg-[#141414] px-1.5 py-0.5 rounded border border-[#222222]">
                            Original
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => api.openInExplorer(item.path)}
                        className="p-1 text-[#71717a] hover:text-[#f5f5f5] transition-colors flex-shrink-0"
                        title="Open file location"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Cleanup Modal */}
      {showReviewModal && (
        <CleanupReviewModal
          selectedCandidates={selectedCandidates}
          onClose={() => setShowReviewModal(false)}
          onCleanupComplete={() => {
            fetchDuplicates();
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
};
