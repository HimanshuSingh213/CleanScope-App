import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  RotateCcw, 
  Info 
} from 'lucide-react';
import { CleanupReport, FileCandidate } from '../types/candidate';
import { formatBytes } from '../utils/formatters';
import { api } from '../services/api';
import { toast } from 'sonner';

interface CleanupReviewModalProps {
  selectedCandidates: FileCandidate[];
  onClose: () => void;
  onCleanupComplete: (report: CleanupReport) => void;
}

export const CleanupReviewModal: React.FC<CleanupReviewModalProps> = ({
  selectedCandidates,
  onClose,
  onCleanupComplete,
}) => {
  const [useRecycleBin, setUseRecycleBin] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [report, setReport] = useState<CleanupReport | null>(null);

  const totalBytes = selectedCandidates.reduce((acc, c) => acc + c.sizeBytes, 0);
  const safeBytes = selectedCandidates
    .filter((c) => c.riskLevel === 'safe')
    .reduce((acc, c) => acc + c.sizeBytes, 0);
  const reviewBytes = selectedCandidates
    .filter((c) => c.riskLevel === 'review')
    .reduce((acc, c) => acc + c.sizeBytes, 0);

  const lockedItems = selectedCandidates.filter((c) => c.inUse);

  const handleStartCleanup = async () => {
    if (selectedCandidates.length === 0) {
      toast.warning('No Items Selected', { description: 'Please select at least one item before initiating cleanup.' });
      return;
    }

    setIsExecuting(true);
    const toastId = toast.loading('Executing Safe Cleanup...', {
      description: `Processing ${selectedCandidates.length} candidate(s)...`,
    });

    try {
      const candidateIds = selectedCandidates.map((c) => c.id);
      const cleanupReport = await api.executeCleanup(candidateIds, useRecycleBin);
      setReport(cleanupReport);
      onCleanupComplete(cleanupReport);
      toast.success('Cleanup Finished', {
        id: toastId,
        description: `Reclaimed ${formatBytes(cleanupReport.reclaimedBytes)} (${cleanupReport.recycledCount} items safely recycled).`,
      });
      if (cleanupReport.skippedCount > 0) {
        toast.warning('Some Items Skipped', {
          description: `${cleanupReport.skippedCount} locked or protected item(s) were safely preserved.`,
        });
      }
    } catch (e: any) {
      console.error('Cleanup execution failed:', e);
      toast.error('Cleanup Execution Error', {
        id: toastId,
        description: e.toString(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between bg-[#0e0e0e]/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/30 text-indigo-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#f5f5f5] tracking-tight">
                {report ? 'Cleanup Completed' : 'Cleanup Review & Safety Confirmation'}
              </h2>
              <p className="text-xs text-[#71717a]">
                {report
                  ? `Successfully processed ${report.items.length} items.`
                  : `Review ${selectedCandidates.length} items (${formatBytes(totalBytes)}) before execution.`}
              </p>
            </div>
          </div>
          {!isExecuting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#71717a] hover:text-[#f5f5f5] hover:bg-[#161616] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {report ? (
            /* Post-Cleanup Completion View */
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-emerald-300">
                    {formatBytes(report.reclaimedBytes)} Space Reclaimed
                  </h3>
                  <p className="text-xs text-[#a1a1aa] leading-relaxed">
                    {report.recycledCount} items were safely moved to the Windows Recycle Bin.
                    {report.skippedCount > 0 && ` ${report.skippedCount} items were skipped due to active locks or protection.`}
                  </p>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">
                  Execution Log ({report.items.length} items)
                </h4>
                <div className="border border-[#1a1a1a] rounded-lg divide-y divide-[#141414] max-h-56 overflow-y-auto bg-[#050505]">
                  {report.items.map((item, idx) => (
                    <div key={idx} className="p-3 text-xs flex items-center justify-between gap-3">
                      <div className="truncate max-w-md">
                        <span className="font-mono text-[#e4e4e7] block truncate" title={item.path}>
                          {item.path}
                        </span>
                        {item.errorMessage && (
                          <span className="text-[11px] text-amber-400/90 block">
                            {item.errorMessage}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-[#71717a] text-[11px]">
                          {formatBytes(item.sizeBytes)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                            item.status === 'recycled' || item.status === 'deleted'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                              : 'bg-amber-950/40 text-amber-400 border border-amber-800/30'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restore Note */}
              <div className="p-3.5 rounded-lg bg-[#0e0e0e] border border-[#1a1a1a] flex items-start gap-3">
                <RotateCcw className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  Items have been moved to the <strong className="text-[#f5f5f5]">Windows Recycle Bin</strong>. You can open the Recycle Bin at any time if you ever need to restore any moved file.
                </p>
              </div>
            </div>
          ) : (
            /* Pre-Cleanup Review View */
            <div className="space-y-6">
              {/* Storage Metrics Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-[#0e0e0e] border border-[#1a1a1a]">
                  <span className="text-[11px] text-[#71717a] block">Total Selected</span>
                  <span className="text-lg font-semibold text-[#f5f5f5] font-mono">
                    {formatBytes(totalBytes)}
                  </span>
                  <span className="text-[11px] text-[#71717a] block mt-0.5">
                    {selectedCandidates.length} items
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-[#0e0e0e] border border-emerald-950/40">
                  <span className="text-[11px] text-emerald-400/80 block">Verified Disposable</span>
                  <span className="text-lg font-semibold text-emerald-300 font-mono">
                    {formatBytes(safeBytes)}
                  </span>
                  <span className="text-[11px] text-[#71717a] block mt-0.5">
                    Caches & Temp
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-[#0e0e0e] border border-amber-950/40">
                  <span className="text-[11px] text-amber-400/80 block">Review Items</span>
                  <span className="text-lg font-semibold text-amber-300 font-mono">
                    {formatBytes(reviewBytes)}
                  </span>
                  <span className="text-[11px] text-[#71717a] block mt-0.5">
                    Dev / Large Files
                  </span>
                </div>
              </div>

              {/* Potential Effects List */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wider text-[#71717a] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  Potential Effects & Consequence Analysis
                </h4>
                <div className="p-4 rounded-lg bg-[#0e0e0e] border border-[#1a1a1a] space-y-2 text-xs text-[#a1a1aa]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Application and browser caches will be automatically recreated when needed.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Developer build outputs can be regenerated with normal compiler/build commands.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <span>Zero Windows system files or boot critical directories are included.</span>
                  </div>
                  {lockedItems.length > 0 && (
                    <div className="flex items-start gap-2 text-amber-400">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {lockedItems.length} items currently in use by active processes will be safely skipped.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recycle Bin Option */}
              <div className="p-4 rounded-lg bg-[#0e0e0e] border border-[#1a1a1a] flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-[#f5f5f5] block">
                    Move to Windows Recycle Bin
                  </label>
                  <p className="text-[11px] text-[#71717a]">
                    Recommended. Allows safe undo/restoration of any cleaned file.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={useRecycleBin}
                  onChange={(e) => setUseRecycleBin(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2a2a2a] bg-[#161616] text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-[#1a1a1a] bg-[#0c0c0c] flex items-center justify-end gap-3">
          {report ? (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium bg-[#1a1a1a] text-[#f5f5f5] hover:bg-[#242424] transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="px-4 py-2 rounded-md text-xs font-medium text-[#a1a1aa] hover:text-[#f5f5f5] hover:bg-[#161616] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartCleanup}
                disabled={isExecuting || selectedCandidates.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-xs font-medium bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Clean {formatBytes(totalBytes)} {useRecycleBin ? 'to Recycle Bin' : ''}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
