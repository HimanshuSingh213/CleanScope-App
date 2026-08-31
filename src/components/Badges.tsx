import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  HelpCircle, 
  Cpu, 
  FileCode2, 
  Lock, 
  Unlock 
} from 'lucide-react';
import { CategoryType, RiskLevel } from '../types/candidate';

export const RiskBadge: React.FC<{ risk: RiskLevel; showIcon?: boolean }> = ({ risk, showIcon = true }) => {
  switch (risk) {
    case 'safe':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/30 text-emerald-400 border border-emerald-800/40">
          {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          Safe
        </span>
      );
    case 'review':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950/30 text-amber-300 border border-amber-800/40">
          {showIcon && <AlertTriangle className="w-3 h-3 text-amber-400" />}
          Review
        </span>
      );
    case 'protected':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-950/30 text-rose-300 border border-rose-800/40">
          {showIcon && <ShieldAlert className="w-3 h-3 text-rose-400" />}
          Protected
        </span>
      );
    case 'unknown':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#71717a] border border-[#222222]">
          {showIcon && <HelpCircle className="w-3 h-3 text-[#71717a]" />}
          Unknown
        </span>
      );
  }
};

export const CategoryBadge: React.FC<{ category: CategoryType }> = ({ category }) => {
  const formatLabel = (cat: CategoryType) => {
    switch (cat) {
      case 'temporary':
        return 'Temporary';
      case 'cache':
        return 'Cache';
      case 'log':
        return 'Log';
      case 'crash-data':
        return 'Crash Dump';
      case 'installer':
        return 'Installer';
      case 'developer-cache':
        return 'Dev Cache';
      case 'build-output':
        return 'Build Output';
      case 'duplicate':
        return 'Duplicate';
      case 'large-file':
        return 'Large File';
      case 'old-file':
        return 'Old File';
      case 'application-data':
        return 'App Data';
      case 'personal-data':
        return 'Personal';
      case 'system-data':
        return 'System';
      default:
        return 'General';
    }
  };

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-[#a1a1aa] bg-[#111111] border border-[#1e1e1e]">
      {formatLabel(category)}
    </span>
  );
};

export const ConfidenceBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
  const percent = Math.round(confidence * 100);
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#0e0e0e] text-[#71717a] border border-[#1a1a1a]">
      {percent}%
    </span>
  );
};

export const AIBadge: React.FC<{ provider?: string }> = ({ provider }) => {
  if (!provider || provider === 'none' || provider === 'rules') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#71717a] bg-[#111111] border border-[#1f1f1f]">
        <FileCode2 className="w-2.5 h-2.5 text-[#52525b]" />
        Deterministic
      </span>
    );
  }

  const cleanName = provider.replace('gemini-', '').replace('qwen-', '');
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-indigo-300 bg-indigo-950/30 border border-indigo-800/40">
      <Cpu className="w-2.5 h-2.5 text-indigo-400" />
      {cleanName}
    </span>
  );
};

export const LockBadge: React.FC<{ inUse: boolean; processName?: string }> = ({ inUse, processName }) => {
  if (inUse) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-300 bg-amber-950/25 border border-amber-800/30" title={processName ? `Locked by ${processName}` : 'Locked in use'}>
        <Lock className="w-2.5 h-2.5 text-amber-400" />
        {processName ? processName : 'Locked'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#71717a] bg-[#111111] border border-[#1e1e1e]">
      <Unlock className="w-2.5 h-2.5 text-[#52525b]" />
      Idle
    </span>
  );
};
