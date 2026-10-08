import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  EyeOff, 
  Copy, 
  Check, 
  Code, 
  Terminal, 
  Clock, 
  User, 
  FileText,
  AlertTriangle,
  Zap
} from 'lucide-react';

export function LogDrawer({ event, onClose }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('diff'); // 'diff' or 'json'

  if (!event) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'BLOCKED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
            BLOCKED
          </span>
        );
      case 'SANITIZED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
            SANITIZED
          </span>
        );
      case 'PASSED':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            PASSED
          </span>
        );
    }
  };

  // Highlighting tokens in sanitized text
  const renderSanitizedHighlight = (text) => {
    if (!text) return '—';
    const parts = text.split(/(\[REDACTED_[A-Z0-9_]+\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[REDACTED_')) {
        return (
          <span key={i} className="diff-redacted">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-zinc-100 text-base">
                  Forensic Audit Inspection
                </h3>
                {getActionBadge(event.action_taken)}
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                ID: {event.id || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCopy(JSON.stringify(event, null, 2))}
              className="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs flex items-center space-x-1"
              title="Copy JSON Payload"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/20 text-xs font-mono">
          <button
            onClick={() => setViewMode('diff')}
            className={`py-2.5 px-4 border-b-2 font-medium transition-colors ${
              viewMode === 'diff' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Forensic Diff & Traces
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`py-2.5 px-4 border-b-2 font-medium transition-colors ${
              viewMode === 'json' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Raw JSON Audit Record
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {viewMode === 'json' ? (
            <div className="relative">
              <pre className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          ) : (
            <>
              {/* Telemetry Summary KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block">Risk Level</span>
                  <span className="text-sm font-mono font-bold text-zinc-200">{event.risk_level || 'INFO'}</span>
                </div>
                <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block">Guardrail Latency</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{event.guardrail_latency_ms || 0} ms</span>
                </div>
                <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block">Total Latency</span>
                  <span className="text-sm font-mono font-bold text-zinc-200">{event.total_latency_ms || 0} ms</span>
                </div>
                <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block">Client ID</span>
                  <span className="text-sm font-mono text-zinc-300 truncate block">{event.client_id || 'default'}</span>
                </div>
              </div>

              {/* Matched Threats */}
              {(event.threat_types && event.threat_types.length > 0) && (
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold flex items-center space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Detected Threat Signatures</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {event.threat_types.map((threat, idx) => (
                      <div 
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center space-x-2"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>{threat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw vs Sanitized Prompt Diff */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium">
                      Inbound Raw Prompt (Interception)
                    </span>
                    <button 
                      onClick={() => handleCopy(event.raw_prompt)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono"
                    >
                      Copy Raw
                    </button>
                  </div>
                  <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {event.raw_prompt || '—'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-medium flex items-center space-x-1.5">
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Sanitized Prompt (Dispatched Upstream)</span>
                    </span>
                    <button 
                      onClick={() => handleCopy(event.sanitized_prompt)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono"
                    >
                      Copy Sanitized
                    </button>
                  </div>
                  <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {renderSanitizedHighlight(event.sanitized_prompt)}
                  </div>
                </div>
              </div>

              {/* Tool Calls Evaluation */}
              {(event.tool_calls && event.tool_calls.length > 0) && (
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-medium flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Agent Tool Call Invocations</span>
                  </span>
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                    <pre className="font-mono text-xs text-zinc-300 overflow-x-auto">
                      {JSON.stringify(event.tool_calls, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Upstream Completion */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Upstream Model Response</span>
                </span>
                <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {event.upstream_response || (event.action_taken === 'BLOCKED' ? '[Short-circuited before upstream dispatch due to policy breach]' : 'No response recorded')}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
