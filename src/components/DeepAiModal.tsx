import React, { useState } from 'react';
import { 
  Cpu, 
  AlertTriangle, 
  FolderOpen, 
  CheckCircle2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Send,
  HelpCircle,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { FileCandidate, Settings } from '../types/candidate';
import { formatBytes } from '../utils/formatters';
import { AIBadge, CategoryBadge, LockBadge, RiskBadge } from './Badges';
import { api } from '../services/api';
import { toast } from 'sonner';

interface DeepAiModalProps {
  candidate: FileCandidate | null;
  settings?: Settings | null;
  onClose: () => void;
  onCandidateUpdated: (updated: FileCandidate) => void;
  isSelected: boolean;
  onToggleSelect: (candidate: FileCandidate) => void;
}

export const DeepAiModal: React.FC<DeepAiModalProps> = ({
  candidate,
  settings,
  onClose,
  onCandidateUpdated,
  isSelected,
  onToggleSelect,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(settings?.geminiModel || 'gemini-3.5-flash-lite');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  if (!candidate) return null;

  const handleOpenExplorer = () => {
    api.openInExplorer(candidate.path);
  };

  const handleRunAnalysis = async (customPromptText?: string) => {
    // API key check
    const apiKey = settings?.geminiApiKey;
    if (!apiKey || !apiKey.trim()) {
      toast.error('Gemini API Key Required', {
        description: 'Please open Settings and enter your Google Gemini API key to run diagnostic reasoning.',
      });
      return;
    }

    const promptToSend = customPromptText !== undefined ? customPromptText : customQuestion;

    setIsAnalyzing(true);
    const toastId = toast.loading('Running Diagnostic Reasoning...', {
      description: `Connecting to ${selectedModel}...`,
    });

    try {
      const res = await api.askAiAboutCandidate(
        candidate.id, 
        promptToSend.trim() ? promptToSend.trim() : undefined, 
        selectedModel
      );

      const updated: FileCandidate = {
        ...candidate,
        explanation: res.explanation,
        deleteEffect: res.deleteEffect,
        category: res.category,
        confidence: res.confidence,
        riskLevel: res.risk,
        aiProvider: res.provider,
      };

      onCandidateUpdated(updated);
      
      if (promptToSend.trim()) {
        setCustomAnswer(res.explanation);
      }

      toast.success('Diagnosis Completed', {
        id: toastId,
        description: `Verified via ${res.provider}.`,
      });
    } catch (e: any) {
      console.error('Deep AI error:', e);
      toast.error('Diagnosis Failed', {
        id: toastId,
        description: e.toString(),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePresetQuestion = (q: string) => {
    setCustomQuestion(q);
    handleRunAnalysis(q);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#09090b] border border-[#222] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1c1c1c] flex items-center justify-between bg-[#0e0e10]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-zinc-300">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight truncate max-w-md" title={candidate.name}>
                  {candidate.name}
                </h2>
                <AIBadge provider={candidate.aiProvider} />
              </div>
              <p className="text-[11px] text-zinc-500 font-mono truncate max-w-md">
                {formatBytes(candidate.sizeBytes)} {candidate.itemCount ? `• ${candidate.itemCount.toLocaleString()} items` : ''} • {candidate.path}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-[#18181b] transition-colors outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Model Selection Bar */}
          <div className="p-3 rounded-xl border border-[#222] bg-[#0e0e10] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">
                Inference Model:
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'gemini-3.5-flash-lite', label: '3.5 Flash-Lite (Recommended)' },
                { id: 'gemini-3.7-flash', label: '3.7 Flash' },
                { id: 'gemini-2.5-flash', label: '2.5 Flash' },
                { id: 'gemini-2.5-pro', label: '2.5 Pro' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all outline-none select-none ${
                    selectedModel === m.id
                      ? 'bg-zinc-200 text-zinc-900 border-zinc-300 font-medium shadow-sm'
                      : 'bg-[#141416] text-zinc-400 border-[#222] hover:bg-[#1c1c1f] hover:text-zinc-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Badges Overview */}
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge risk={candidate.riskLevel} />
            <CategoryBadge category={candidate.category} />
            <LockBadge inUse={candidate.inUse} processName={candidate.owningProcess} />
            <div className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141416] text-zinc-400 border border-[#222]">
              Confidence: {Math.round(candidate.confidence * 100)}%
            </div>
          </div>

          {/* Diagnostic Breakdown */}
          <div className="space-y-3">
            {/* Technical Identity & Purpose */}
            <div className="p-4 rounded-xl bg-[#0e0e10] border border-[#1c1c1c] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Technical Identity & Purpose
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {candidate.explanation}
              </p>
              {candidate.relatedApplication && (
                <div className="pt-2 border-t border-[#18181b] text-[11px] text-zinc-500 font-mono">
                  Origin: <span className="text-zinc-300 font-medium">{candidate.relatedApplication}</span>
                </div>
              )}
            </div>

            {/* Consequence of Deletion & Regeneration */}
            <div className="p-4 rounded-xl bg-[#0e0e10] border border-[#1c1c1c] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                Deletion Impact & Regeneration
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {candidate.deleteEffect}
              </p>
            </div>

            {/* Active Lock & Process Verification */}
            <div className="p-3.5 rounded-xl bg-[#0e0e10] border border-[#1c1c1c] flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-mono text-[11px]">Process Dependency:</span>
              {candidate.inUse ? (
                <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Locked by {candidate.owningProcess || 'Active Process'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Idle (Safe to recycle)</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Diagnostic Inquiry Terminal */}
          <div className="p-4 rounded-xl border border-[#222] bg-[#0c0c0e] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                Technical Inquiry
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                {selectedModel}
              </span>
            </div>

            {/* Preset prompt pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Can I restore this if I need it later?',
                'Why is this folder so large?',
                'Will deleting this log me out or reset my app?',
                'How can I cleanly regenerate this?',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetQuestion(preset)}
                  disabled={isAnalyzing}
                  className="px-2 py-1 rounded text-[11px] bg-[#141416] text-zinc-400 border border-[#222] hover:text-zinc-100 hover:border-zinc-500 transition-colors text-left outline-none disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunAnalysis();
                }}
                placeholder="Ask technical questions regarding this path..."
                className="flex-1 bg-[#060608] border border-[#222] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 font-mono"
              />
              <button
                type="button"
                onClick={() => handleRunAnalysis()}
                disabled={isAnalyzing}
                className="px-3.5 py-2 rounded-lg bg-zinc-200 text-zinc-900 hover:bg-white transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 outline-none select-none"
              >
                <Send className="w-3 h-3" />
                Ask
              </button>
            </div>

            {/* Custom Answer Display */}
            {customAnswer && (
              <div className="p-3 rounded-lg bg-[#111114] border border-[#27272a] text-xs text-zinc-200 leading-relaxed space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Diagnosis Response:
                </span>
                <p>{customAnswer}</p>
              </div>
            )}
          </div>

          {/* Collapsible Technical Details */}
          <div className="pt-2 border-t border-[#18181b]">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors outline-none"
            >
              {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showTechnicalDetails ? 'Hide Filesystem Metadata' : 'View Filesystem Metadata'}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 p-3 rounded-lg bg-[#070708] border border-[#1a1a1d] text-[10px] font-mono text-zinc-400 space-y-1">
                <div>Path: {candidate.path}</div>
                <div>Size: {formatBytes(candidate.sizeBytes)} ({candidate.sizeBytes.toLocaleString()} bytes)</div>
                <div>Category: {candidate.category}</div>
                <div>Risk: {candidate.riskLevel}</div>
                <div>Directory: {candidate.isDirectory ? 'Yes' : 'No'} {candidate.itemCount ? `(${candidate.itemCount} items)` : ''}</div>
                <div>Fingerprint: {candidate.fingerprint || 'N/A'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1c1c1c] bg-[#0b0b0d] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenExplorer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141416] text-zinc-400 border border-[#242428] hover:text-zinc-200 hover:bg-[#1a1a1e] transition-colors outline-none select-none"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Explorer
            </button>

            <button
              type="button"
              onClick={() => onToggleSelect(candidate)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors outline-none select-none ${
                isSelected
                  ? 'bg-rose-950/30 text-rose-300 border-rose-800/40 hover:bg-rose-900/40'
                  : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
              }`}
            >
              {isSelected ? 'Deselect' : 'Select for Cleanup'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleRunAnalysis()}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-sm disabled:opacity-50 outline-none select-none"
          >
            <Cpu className="w-3.5 h-3.5 text-zinc-700" />
            {isAnalyzing ? 'Running Diagnosis...' : 'Diagnose Candidate'}
          </button>
        </div>
      </div>
    </div>
  );
};
