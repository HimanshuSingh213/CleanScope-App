import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  AIAnalysisResult,
  AppStorageSummary,
  CleanupReport,
  DeveloperCategorySummary,
  DriveInfo,
  DuplicateGroup,
  FileCandidate,
  ScanProgressEvent,
  ScanReport,
  Settings,
} from '../types/candidate';

export const api = {
  getDrives: async (): Promise<DriveInfo[]> => {
    try {
      return await invoke<DriveInfo[]>('get_drives');
    } catch (e) {
      console.error('getDrives error:', e);
      return [];
    }
  },

  getSettings: async (): Promise<Settings> => {
    return await invoke<Settings>('get_settings');
  },

  saveSettings: async (settings: Settings): Promise<void> => {
    return await invoke('save_settings', { settings });
  },

  startScan: async (targets?: string[]): Promise<ScanReport> => {
    return await invoke<ScanReport>('start_scan', { targets });
  },

  cancelScan: async (): Promise<void> => {
    return await invoke('cancel_scan');
  },

  getCandidates: async (): Promise<FileCandidate[]> => {
    return await invoke<FileCandidate[]>('get_candidates');
  },

  analyzeCandidatesAI: async (candidateIds: string[]): Promise<AIAnalysisResult[]> => {
    return await invoke<AIAnalysisResult[]>('analyze_candidates_ai', { candidateIds });
  },

  askAiAboutCandidate: async (candidateId: string, userPrompt?: string, modelOverride?: string): Promise<AIAnalysisResult> => {
    return await invoke<AIAnalysisResult>('ask_ai_about_candidate', { candidateId, userPrompt, modelOverride });
  },

  getDuplicates: async (targets?: string[]): Promise<DuplicateGroup[]> => {
    return await invoke<DuplicateGroup[]>('get_duplicates', { targets });
  },

  getLargeFiles: async (minSizeBytes?: number): Promise<FileCandidate[]> => {
    return await invoke<FileCandidate[]>('get_large_files', { minSizeBytes });
  },

  getDeveloperStorage: async (): Promise<DeveloperCategorySummary[]> => {
    return await invoke<DeveloperCategorySummary[]>('get_developer_storage');
  },

  getApplicationStorage: async (): Promise<AppStorageSummary[]> => {
    return await invoke<AppStorageSummary[]>('get_application_storage');
  },

  executeCleanup: async (candidateIds: string[], useRecycleBin: boolean): Promise<CleanupReport> => {
    return await invoke<CleanupReport>('execute_cleanup', { candidateIds, useRecycleBin });
  },

  getScanHistory: async (): Promise<ScanReport[]> => {
    return await invoke<ScanReport[]>('get_scan_history');
  },

  getCleanupHistory: async (): Promise<CleanupReport[]> => {
    return await invoke<CleanupReport[]>('get_cleanup_history');
  },

  clearHistory: async (): Promise<void> => {
    return await invoke('clear_history');
  },

  openInExplorer: async (path: string): Promise<void> => {
    return await invoke('open_in_explorer', { path });
  },

  openUrl: async (url: string): Promise<void> => {
    try {
      await invoke('open_url', { url });
    } catch {
      window.open(url, '_blank');
    }
  },

  testGeminiKey: async (apiKey: string, model?: string): Promise<string> => {
    return await invoke<string>('test_gemini_key', { apiKey, model });
  },

  resetAppData: async (): Promise<Settings> => {
    return await invoke<Settings>('reset_app_data');
  },

  purgeAndUninstall: async (): Promise<void> => {
    return await invoke('purge_and_uninstall');
  },

  onScanProgress: async (callback: (event: ScanProgressEvent) => void): Promise<UnlistenFn> => {
    return await listen<ScanProgressEvent>('scan-progress', (event) => {
      callback(event.payload);
    });
  },

  onScanCandidatesReady: async (callback: (candidates: FileCandidate[]) => void): Promise<UnlistenFn> => {
    return await listen<FileCandidate[]>('scan-candidates-ready', (event) => {
      callback(event.payload);
    });
  },
};
