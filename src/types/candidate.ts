export type CategoryType =
  | 'temporary'
  | 'cache'
  | 'log'
  | 'crash-data'
  | 'installer'
  | 'developer-cache'
  | 'build-output'
  | 'duplicate'
  | 'large-file'
  | 'old-file'
  | 'application-data'
  | 'personal-data'
  | 'system-data'
  | 'unknown';

export type RiskLevel = 'safe' | 'review' | 'protected' | 'unknown';

export interface FileCandidate {
  id: string;
  path: string;
  name: string;
  extension?: string;
  sizeBytes: number;
  createdAt?: string;
  modifiedAt?: string;
  accessedAt?: string;

  category: CategoryType;
  riskLevel: RiskLevel;
  confidence: number;

  inUse: boolean;
  owningProcess?: string;
  relatedApplication?: string;

  deleteEffect: string;
  explanation: string;
  evidence: string[];

  isDirectory: boolean;
  itemCount?: number;

  aiProvider?: string;
  fingerprint?: string;
}

export interface ScanProgressEvent {
  totalFiles: number;
  totalBytes: number;
  currentPath: string;
  scanSpeedFilesPerSec: number;
  skippedCount: number;
  potentialCleanupBytes: number;
  isComplete: boolean;
  phase: string;
}

export interface DriveInfo {
  name: string;
  mountPoint: string;
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  fileSystem: string;
  isSystem: boolean;
}

export interface DuplicateGroup {
  hash: string;
  sizeBytes: number;
  recoverableBytes: number;
  items: FileCandidate[];
}

export interface DeveloperCategorySummary {
  id: string;
  name: string;
  ecosystem: string;
  totalSizeBytes: number;
  itemCount: number;
  canRegenerate: boolean;
  deleteEffect: string;
  candidates: FileCandidate[];
}

export interface AppStorageSummary {
  appName: string;
  totalSizeBytes: number;
  cacheSizeBytes: number;
  logSizeBytes: number;
  isRunning: boolean;
  processName?: string;
  candidates: FileCandidate[];
}

export interface CleanupItemResult {
  id: string;
  path: string;
  sizeBytes: number;
  status: 'recycled' | 'deleted' | 'skipped_in_use' | 'skipped_protected' | 'skipped_missing' | 'failed';
  errorMessage?: string;
}

export interface CleanupReport {
  id: string;
  timestamp: string;
  totalSelectedItems: number;
  reclaimedBytes: number;
  recycledCount: number;
  skippedCount: number;
  failedCount: number;
  items: CleanupItemResult[];
}

export interface ScanReport {
  id: string;
  timestamp: string;
  targetPaths: string[];
  totalFilesScanned: number;
  totalBytesScanned: number;
  durationMs: number;
  potentialCleanupBytes: number;
  candidatesCount: number;
}

export interface Settings {
  scanLocations: string[];
  protectedPaths: string[];
  excludedPaths: string[];
  useRecycleBin: boolean;
  skipInUse: boolean;
  minSafeConfidence: number;
  aiProvider: 'local' | 'gemini' | 'hybrid' | 'none';
  geminiApiKey?: string;
  geminiModel?: string;
  privacyMetadataOnly: boolean;
  localModelPath?: string;
  llamaServerUrl?: string;
  animationsEnabled: boolean;
  reducedMotion: boolean;
  firstRunCompleted: boolean;
}

export interface AIAnalysisResult {
  candidateId: string;
  category: CategoryType;
  confidence: number;
  risk: RiskLevel;
  explanation: string;
  deleteEffect: string;
  recommendation: string;
  provider: string;
}
