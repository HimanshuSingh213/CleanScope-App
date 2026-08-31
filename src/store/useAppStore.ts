import { create } from 'zustand';
import { 
  FileCandidate, 
  DuplicateGroup,
  ScanProgressEvent, 
  ScanReport, 
  Settings, 
  CleanupReport, 
  AIAnalysisResult 
} from '../types/candidate';
import { api } from '../services/api';
import { toast } from 'sonner';

export type TabType = 'overview' | 'scan' | 'large' | 'duplicates' | 'apps' | 'dev' | 'history' | 'settings';

interface AppStoreState {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Settings
  settings: Settings | null;
  isLoadingSettings: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Settings) => Promise<void>;

  // Scan State
  isScanning: boolean;
  scanProgress: ScanProgressEvent | null;
  lastScanReport: ScanReport | null;
  candidates: FileCandidate[];
  selectedIds: Set<string>;
  
  // Duplicates State
  duplicates: DuplicateGroup[];
  isLoadingDuplicates: boolean;
  loadDuplicates: (force?: boolean) => Promise<void>;
  
  // Modals & Drawers
  activeDetailCandidate: FileCandidate | null;
  aiModalCandidate: FileCandidate | null;
  showReviewModal: boolean;
  showFirstRun: boolean;
  isAiAnalyzing: boolean;

  // Actions
  startScan: (customTargets?: string[]) => Promise<void>;
  cancelScan: () => Promise<void>;
  refreshCandidates: () => Promise<void>;
  
  toggleSelectCandidate: (candidate: FileCandidate) => void;
  selectAllCandidates: (filteredList?: FileCandidate[]) => void;
  selectSafeOnly: () => void;
  deselectAllCandidates: () => void;

  setActiveDetailCandidate: (candidate: FileCandidate | null) => void;
  setAiModalCandidate: (candidate: FileCandidate | null) => void;
  setShowReviewModal: (show: boolean) => void;
  dismissFirstRun: () => Promise<void>;

  runAiAnalysis: (targetCandidate?: FileCandidate) => Promise<AIAnalysisResult[] | null>;
  executeCleanup: (useRecycleBin: boolean) => Promise<CleanupReport | null>;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  // Navigation
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Settings
  settings: null,
  isLoadingSettings: true,
  loadSettings: async () => {
    try {
      const s = await api.getSettings();
      set({ 
        settings: s, 
        isLoadingSettings: false,
        showFirstRun: !s.firstRunCompleted 
      });
    } catch (e) {
      console.error('Failed to load settings:', e);
      set({ isLoadingSettings: false });
    }
  },
  updateSettings: async (newSettings) => {
    set({ settings: newSettings });
    try {
      await api.saveSettings(newSettings);
    } catch (e: any) {
      console.error('Failed to save settings:', e);
      toast.error('Save Failed', { description: e.toString() });
    }
  },

  // Scan State
  isScanning: false,
  scanProgress: null,
  lastScanReport: null,
  candidates: [],
  selectedIds: new Set<string>(),

  // Duplicates State
  duplicates: [],
  isLoadingDuplicates: false,
  loadDuplicates: async (force?: boolean) => {
    const current = get().duplicates;
    if (!force && current.length > 0) return;
    set({ isLoadingDuplicates: true });
    try {
      const groups = await api.getDuplicates();
      set({ duplicates: groups, isLoadingDuplicates: false });
    } catch (e) {
      console.error('Failed to load duplicates:', e);
      set({ isLoadingDuplicates: false });
    }
  },

  // Modals & Drawers
  activeDetailCandidate: null,
  aiModalCandidate: null,
  showReviewModal: false,
  showFirstRun: false,
  isAiAnalyzing: false,

  // Scan Actions
  startScan: async (customTargets?: string[]) => {
    set({ isScanning: true, activeTab: 'scan', scanProgress: null });
    toast.info('Scan Started', { description: 'Analyzing Windows filesystem with atomic directory pruning...' });
    try {
      const report = await api.startScan(customTargets);
      const updated = await api.getCandidates();
      set({ 
        lastScanReport: report, 
        candidates: updated,
        isScanning: false 
      });
      toast.success('Scan Completed', { 
        description: `Discovered ${report.candidatesCount} disposable candidate(s) (${report.totalFilesScanned.toLocaleString()} items examined).` 
      });
    } catch (e: any) {
      console.error('Scan failed:', e);
      toast.error('Scan Failed', { description: e.toString() });
      set({ isScanning: false });
    }
  },

  cancelScan: async () => {
    try {
      await api.cancelScan();
      set({ isScanning: false });
      toast.warning('Scan Cancelled', { description: 'Filesystem scan was halted by user.' });
    } catch (e: any) {
      console.error('Failed to cancel scan:', e);
      toast.error('Failed to Cancel', { description: e.toString() });
    }
  },

  refreshCandidates: async () => {
    try {
      const updated = await api.getCandidates();
      set({ candidates: updated });
    } catch (e) {
      console.error('Failed to refresh candidates:', e);
    }
  },

  // Selection Actions
  toggleSelectCandidate: (candidate) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(candidate.id)) {
        next.delete(candidate.id);
      } else {
        next.add(candidate.id);
      }
      return { selectedIds: next };
    });
  },

  selectAllCandidates: (filteredList) => {
    set((state) => {
      const itemsToSelect = filteredList || state.candidates;
      const next = new Set(state.selectedIds);
      itemsToSelect.forEach((c) => next.add(c.id));
      toast.info('Selected All Items', { description: `Marked ${itemsToSelect.length} item(s) for cleanup review.` });
      return { selectedIds: next };
    });
  },

  selectSafeOnly: () => {
    set((state) => {
      const next = new Set<string>();
      const safeItems = state.candidates.filter((c) => c.riskLevel === 'safe' && !c.inUse);
      safeItems.forEach((c) => next.add(c.id));
      toast.info('Selected Safe Items Only', { description: `Marked ${safeItems.length} verified disposable item(s).` });
      return { selectedIds: next };
    });
  },

  deselectAllCandidates: () => {
    set({ selectedIds: new Set() });
  },

  // Modal / Drawer Setters
  setActiveDetailCandidate: (candidate) => set({ activeDetailCandidate: candidate }),
  setAiModalCandidate: (candidate) => set({ aiModalCandidate: candidate }),
  setShowReviewModal: (show) => set({ showReviewModal: show }),

  dismissFirstRun: async () => {
    const { settings, updateSettings } = get();
    if (settings) {
      await updateSettings({ ...settings, firstRunCompleted: true });
    }
    set({ showFirstRun: false });
  },

  // Deep AI Analysis
  runAiAnalysis: async (targetCandidate) => {
    const { selectedIds, settings, candidates, activeDetailCandidate, aiModalCandidate } = get();
    const idsToAnalyze = targetCandidate ? [targetCandidate.id] : Array.from(selectedIds);

    if (idsToAnalyze.length === 0) {
      toast.warning('No Items Selected', {
        description: 'Please select one or more items from the list to analyze with AI.',
      });
      return null;
    }

    const provider = settings?.aiProvider || 'hybrid';
    if ((provider === 'gemini' || provider === 'hybrid') && !settings?.geminiApiKey) {
      toast.error('Gemini API Key Required', {
        description: 'Please paste your Google Gemini API key in Settings -> AI Ambiguity Analysis to enable Deep AI reasoning.',
      });
      return null;
    }

    set({ isAiAnalyzing: true });
    const toastId = toast.loading('Running Deep AI Analysis...', {
      description: `Analyzing ${idsToAnalyze.length} candidate(s) with ${settings?.geminiModel || 'Gemini'}...`,
    });

    try {
      const results = await api.analyzeCandidatesAI(idsToAnalyze);
      
      // Update store candidates in place
      const updatedCandidates = candidates.map((cand) => {
        const res = results.find((r) => r.candidateId === cand.id);
        if (res) {
          return {
            ...cand,
            explanation: res.explanation,
            deleteEffect: res.deleteEffect,
            category: res.category,
            confidence: res.confidence,
            riskLevel: res.risk,
            aiProvider: res.provider,
          };
        }
        return cand;
      });

      // Update active modal & drawer candidate references
      let nextActiveDetail = activeDetailCandidate;
      if (activeDetailCandidate) {
        const res = results.find((r) => r.candidateId === activeDetailCandidate.id);
        if (res) {
          nextActiveDetail = {
            ...activeDetailCandidate,
            explanation: res.explanation,
            deleteEffect: res.deleteEffect,
            category: res.category,
            confidence: res.confidence,
            riskLevel: res.risk,
            aiProvider: res.provider,
          };
        }
      }

      let nextAiModal = aiModalCandidate;
      if (aiModalCandidate) {
        const res = results.find((r) => r.candidateId === aiModalCandidate.id);
        if (res) {
          nextAiModal = {
            ...aiModalCandidate,
            explanation: res.explanation,
            deleteEffect: res.deleteEffect,
            category: res.category,
            confidence: res.confidence,
            riskLevel: res.risk,
            aiProvider: res.provider,
          };
        }
      }

      set({ 
        candidates: updatedCandidates,
        activeDetailCandidate: nextActiveDetail,
        aiModalCandidate: nextAiModal,
        isAiAnalyzing: false 
      });

      toast.success('AI Analysis Completed', {
        id: toastId,
        description: `Successfully analyzed ${results.length} item(s) using ${results[0]?.provider || 'AI'}.`,
      });

      return results;
    } catch (e: any) {
      console.error('AI analysis error:', e);
      toast.error('AI Analysis Error', {
        id: toastId,
        description: e.toString(),
      });
      set({ isAiAnalyzing: false });
      return null;
    }
  },

  // Cleanup Execution
  executeCleanup: async (useRecycleBin) => {
    const { selectedIds, refreshCandidates } = get();
    const candidateIds = Array.from(selectedIds);

    if (candidateIds.length === 0) {
      toast.warning('No Items Selected', { description: 'Please select at least one item before initiating cleanup.' });
      return null;
    }

    const toastId = toast.loading('Executing Safe Cleanup...', {
      description: `Processing ${candidateIds.length} candidate(s)...`,
    });

    try {
      const report = await api.executeCleanup(candidateIds, useRecycleBin);
      await refreshCandidates();
      set({ selectedIds: new Set() });

      toast.success('Cleanup Finished', {
        id: toastId,
        description: `Reclaimed ${(report.reclaimedBytes / 1e9).toFixed(2)} GB (${report.recycledCount} items safely recycled).`,
      });

      if (report.skippedCount > 0) {
        toast.warning('Some Items Skipped', {
          description: `${report.skippedCount} locked or protected item(s) were safely preserved.`,
        });
      }

      return report;
    } catch (e: any) {
      console.error('Cleanup execution failed:', e);
      toast.error('Cleanup Execution Error', {
        id: toastId,
        description: e.toString(),
      });
      return null;
    }
  },
}));
