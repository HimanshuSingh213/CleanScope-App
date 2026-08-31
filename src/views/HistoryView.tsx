import React, { useState, useEffect } from 'react';
import { 
  History, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import { CleanupReport, ScanReport } from '../types/candidate';
import { formatBytes, formatDate } from '../utils/formatters';
import { api } from '../services/api';

export const HistoryView: React.FC = () => {
  const [scanHistory, setScanHistory] = useState<ScanReport[]>([]);
  const [cleanupHistory, setCleanupHistory] = useState<CleanupReport[]>([]);
  const [activeTab, setActiveTab] = useState<'cleanup' | 'scans'>('cleanup');
  const [expandedCleanupId, setExpandedCleanupId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const scans = await api.getScanHistory();
      const cleanups = await api.getCleanupHistory();
      setScanHistory(scans);
      setCleanupHistory(cleanups);
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearHistory = async () => {
    try {
      await api.clearHistory();
      setScanHistory([]);
      setCleanupHistory([]);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  const totalReclaimedEver = cleanupHistory.reduce((acc, c) => acc + c.reclaimedBytes, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="p-5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">
              Storage Analysis & Cleanup Logs
            </h2>
          </div>
          <p className="text-xs text-[#71717a]">
            Auditable records of previous disk scans and safe Recycle Bin actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#121212] border border-[#222222] text-right">
            <span className="text-[10px] uppercase text-[#71717a] block">Lifetime Space Reclaimed</span>
            <span className="text-sm font-semibold font-mono text-emerald-400">
              {formatBytes(totalReclaimedEver)}
            </span>
          </div>

          {(scanHistory.length > 0 || cleanupHistory.length > 0) && (
            <button
              onClick={handleClearHistory}
              className="px-3 py-2 rounded-lg bg-[#141414] border border-[#222222] text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:border-rose-800/40 transition-colors"
            >
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
        <button
          onClick={() => setActiveTab('cleanup')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'cleanup'
              ? 'bg-[#161616] text-[#f5f5f5] border border-[#2a2a2a]'
              : 'text-[#71717a] hover:text-[#f5f5f5]'
          }`}
        >
          Cleanup Operations ({cleanupHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('scans')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'scans'
              ? 'bg-[#161616] text-[#f5f5f5] border border-[#2a2a2a]'
              : 'text-[#71717a] hover:text-[#f5f5f5]'
          }`}
        >
          Scan Reports ({scanHistory.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'cleanup' ? (
        cleanupHistory.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#71717a] rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
            No previous cleanup operations logged yet.
          </div>
        ) : (
          <div className="space-y-4">
            {cleanupHistory.map((report) => {
              const isExpanded = expandedCleanupId === report.id;
              return (
                <div
                  key={report.id}
                  className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedCleanupId(isExpanded ? null : report.id)}
                    className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#0e0e0e] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-[#71717a]">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#f5f5f5]">
                            Reclaimed {formatBytes(report.reclaimedBytes)}
                          </span>
                          <span className="text-[11px] text-[#71717a] font-mono">
                            • {report.recycledCount} moved to Recycle Bin
                          </span>
                        </div>
                        <p className="text-[11px] text-[#71717a] mt-0.5">
                          {formatDate(report.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {report.skippedCount > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/40 text-amber-300 border border-amber-800/30">
                          {report.skippedCount} skipped
                        </span>
                      )}
                      {report.failedCount > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950/40 text-rose-300 border border-rose-800/30">
                          {report.failedCount} failed
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[#141414] bg-[#070707] p-4 divide-y divide-[#101010] max-h-64 overflow-y-auto">
                      {report.items.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs font-mono">
                          <span className="text-[#a1a1aa] truncate max-w-lg" title={item.path}>
                            {item.path}
                          </span>
                          <span className="text-[#71717a] flex-shrink-0">
                            {formatBytes(item.sizeBytes)} ({item.status})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        scanHistory.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#71717a] rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
            No previous scan runs logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {scanHistory.map((scan) => (
              <div
                key={scan.id}
                className="p-5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#f5f5f5]">
                      {scan.totalFilesScanned.toLocaleString()} files analyzed ({formatBytes(scan.totalBytesScanned)})
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      • {formatBytes(scan.potentialCleanupBytes)} cleanable
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    {formatDate(scan.timestamp)} • Duration: {(scan.durationMs / 1000).toFixed(1)}s
                  </p>
                </div>

                <span className="text-xs font-mono text-[#a1a1aa]">
                  {scan.candidatesCount} candidates
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
