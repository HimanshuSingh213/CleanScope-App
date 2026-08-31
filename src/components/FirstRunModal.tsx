import React from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  ArrowRight, 
  Cpu 
} from 'lucide-react';

interface FirstRunModalProps {
  onDismiss: () => void;
  onStartFirstScan: () => void;
}

export const FirstRunModal: React.FC<FirstRunModalProps> = ({
  onDismiss,
  onStartFirstScan,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden p-8 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-950/50 border border-indigo-800/40 text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#f5f5f5]">
              Welcome to CleanScope
            </h2>
            <p className="text-xs text-[#71717a]">
              Intelligent disk analysis with deterministic Windows safety
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0e0e0e] border border-[#1a1a1a] flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-[#f5f5f5]">
                Deterministic Safety Final Authority
              </h4>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Windows system, boot, and credential stores are protected by hardcoded safety rules. AI can never override protection.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0e0e] border border-[#1a1a1a] flex items-start gap-3.5">
            <Cpu className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-[#f5f5f5]">
                Metadata-Only Local Analysis
              </h4>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Scans inspect filenames, ages, and sizes locally. CleanScope never reads or uploads raw personal document contents.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#1a1a1a] flex items-start gap-3.5 bg-[#0e0e0e]">
            <Trash2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-[#f5f5f5]">
                Windows Recycle Bin Default
              </h4>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Cleanup moves items to the Windows Recycle Bin by default, allowing full restoration if you ever need a file back.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#141414]">
          <button
            onClick={onDismiss}
            className="text-xs font-medium text-[#71717a] hover:text-[#f5f5f5] transition-colors"
          >
            Explore Dashboard
          </button>

          <button
            onClick={onStartFirstScan}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-950/50"
          >
            Start First Smart Scan
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
