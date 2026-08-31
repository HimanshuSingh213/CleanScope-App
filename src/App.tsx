import { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Scan, 
  FileStack, 
  Copy, 
  LayoutGrid, 
  Code2, 
  History, 
  Settings as SettingsIcon, 
  ShieldCheck,
  LucideIcon
} from 'lucide-react';

import { 
  DriveInfo, 
  ScanReport, 
  CleanupReport 
} from './types/candidate';
import { api } from './services/api';

import { OverviewView } from './views/OverviewView';
import { ScanView } from './views/ScanView';
import { LargeFilesView } from './views/LargeFilesView';
import { DuplicatesView } from './views/DuplicatesView';
import { ApplicationsView } from './views/ApplicationsView';
import { DeveloperStorageView } from './views/DeveloperStorageView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { FirstRunModal } from './components/FirstRunModal';
import { AboutModal } from './components/AboutModal';
import { ProtectedPathsModal } from './components/ProtectedPathsModal';
import { Toaster } from 'sonner';

import { useAppStore, TabType } from './store/useAppStore';

interface NavItem {
  id: TabType;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export default function App() {
  const {
    activeTab,
    setActiveTab,
    candidates,
    loadSettings,
    showFirstRun,
    dismissFirstRun,
    startScan,
  } = useAppStore();

  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [lastScanReport, setLastScanReport] = useState<ScanReport | null>(null);
  const [lastCleanupReport, setLastCleanupReport] = useState<CleanupReport | null>(null);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showProtectedPathsModal, setShowProtectedPathsModal] = useState<boolean>(false);

  // Initialize data and listeners
  useEffect(() => {
    loadSettings();

    const initApp = async () => {
      try {
        const [loadedDrives, loadedCandidates, scanReports, cleanupReports] = await Promise.all([
          api.getDrives(),
          api.getCandidates(),
          api.getScanHistory(),
          api.getCleanupHistory(),
        ]);

        setDrives(loadedDrives);
        useAppStore.setState({ candidates: loadedCandidates });

        if (scanReports && scanReports.length > 0) {
          setLastScanReport(scanReports[0]);
          useAppStore.setState({ lastScanReport: scanReports[0] });
        }
        if (cleanupReports && cleanupReports.length > 0) {
          setLastCleanupReport(cleanupReports[0]);
        }
      } catch (e) {
        console.error('Failed to initialize app state:', e);
      }
    };

    initApp();

    // Listen for real-time scanner progress events
    let unlistenProgress: (() => void) | undefined;
    let unlistenCandidates: (() => void) | undefined;

    api.onScanProgress((progress) => {
      useAppStore.setState({ scanProgress: progress });
      if (progress.isComplete) {
        useAppStore.setState({ isScanning: false });
      }
    }).then((fn) => {
      unlistenProgress = fn;
    });

    api.onScanCandidatesReady((discovered) => {
      useAppStore.setState({ candidates: discovered });
    }).then((fn) => {
      unlistenCandidates = fn;
    });

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenCandidates) unlistenCandidates();
    };
  }, []);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: HardDrive },
    { id: 'scan', label: 'Smart Scan', icon: Scan, badge: candidates.length > 0 ? candidates.length : undefined },
    { id: 'large', label: 'Large Files', icon: FileStack },
    { id: 'duplicates', label: 'Duplicates', icon: Copy },
    { id: 'apps', label: 'Applications', icon: LayoutGrid },
    { id: 'dev', label: 'Developer Storage', icon: Code2 },
    { id: 'history', label: 'Cleanup History', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-[#f5f5f5] font-sans antialiased overflow-hidden select-none">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1a1a1a] bg-[#0a0a0a] flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 px-3 py-3.5 mb-4 border-b border-[#161616]">
            <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm text-[#f5f5f5] block">CleanScope</span>
              <span className="text-[10px] text-[#71717a] block -mt-0.5">Safe Windows Disk Analysis</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setActiveTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors select-none outline-none ring-0 border ${
                    isActive 
                      ? 'bg-[#161616] text-[#f5f5f5] border-[#262626] shadow-sm' 
                      : 'text-[#a1a1aa] border-transparent hover:text-[#f5f5f5] hover:bg-[#101010]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-[#71717a]'}`} />
                    {item.label}
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-[#71717a] border border-[#222222]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Status */}
        <div className="space-y-2">
          <button
            onClick={() => setShowProtectedPathsModal(true)}
            className="w-full p-3 rounded-lg bg-[#070707] border border-[#141414] hover:border-[#222222] transition-colors space-y-1.5 text-left outline-none"
            title="Click to view all protected Windows system boundaries"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#71717a]">Safety Engine</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#71717a]">Recycle Bin</span>
              <span className="text-[#a1a1aa]">Default</span>
            </div>
          </button>

          <button
            onClick={() => setShowAboutModal(true)}
            className="w-full px-3 py-2 rounded-lg bg-[#0c0c0e] border border-[#18181b] hover:border-[#27272a] hover:bg-[#121214] text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-between transition-colors outline-none"
          >
            <span>About CleanScope</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-[#1a1a1a] px-8 flex items-center justify-between bg-[#0a0a0a]/70 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-[#f5f5f5] capitalize">
              {activeTab === 'dev' ? 'Developer Storage' : activeTab.replace('-', ' ')}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowProtectedPathsModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 hover:bg-emerald-950/60 transition-colors outline-none cursor-pointer"
              title="Click to view all protected Windows system boundaries"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              System Paths Protected
            </button>

            <button
              onClick={() => setShowAboutModal(true)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141416] text-zinc-400 border border-[#222] hover:text-zinc-200 hover:bg-[#1a1a1d] transition-colors outline-none cursor-pointer"
            >
              About
            </button>
          </div>
        </header>

        {/* Dynamic View Container */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'overview' && (
            <OverviewView
              drives={drives}
              lastScanReport={lastScanReport}
              lastCleanupReport={lastCleanupReport}
            />
          )}

          {activeTab === 'scan' && <ScanView />}

          {activeTab === 'large' && <LargeFilesView />}

          {activeTab === 'duplicates' && <DuplicatesView />}

          {activeTab === 'apps' && <ApplicationsView />}

          {activeTab === 'dev' && <DeveloperStorageView />}

          {activeTab === 'history' && <HistoryView />}

          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* About CleanScope Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* Protected Windows System Boundaries Modal */}
      <ProtectedPathsModal
        isOpen={showProtectedPathsModal}
        onClose={() => setShowProtectedPathsModal(false)}
      />

      {/* First Run Privacy & Introduction Modal */}
      {showFirstRun && (
        <FirstRunModal
          onDismiss={dismissFirstRun}
          onStartFirstScan={async () => {
            await dismissFirstRun();
            startScan();
          }}
        />
      )}

      {/* Sonner Toast Notifications Container */}
      <Toaster 
        theme="dark" 
        position="bottom-right" 
        richColors 
        closeButton 
        toastOptions={{ 
          style: { 
            background: '#0a0a0a', 
            border: '1px solid #222222', 
            color: '#f5f5f5' 
          } 
        }} 
      />
    </div>
  );
}
