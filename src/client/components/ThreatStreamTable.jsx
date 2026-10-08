import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  EyeOff, 
  Clock, 
  ArrowRight, 
  Search, 
  Filter, 
  ExternalLink,
  Pause,
  Play
} from 'lucide-react';

export function ThreatStreamTable({ events, onSelectEvent }) {
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterText, setFilterText] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const filteredEvents = events.filter((ev) => {
    if (filterAction !== 'ALL' && ev.action_taken !== filterAction) return false;
    if (filterText) {
      const q = filterText.toLowerCase();
      const promptMatch = (ev.raw_prompt || '').toLowerCase().includes(q);
      const clientMatch = (ev.client_id || '').toLowerCase().includes(q);
      const threatMatch = (ev.threat_types || []).some(t => t.toLowerCase().includes(q));
      if (!promptMatch && !clientMatch && !threatMatch) return false;
    }
    return true;
  });

  const getActionBadge = (action) => {
    switch (action) {
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/90 text-rose-400 border border-rose-800/80 glow-crimson">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span>BLOCKED</span>
          </span>
        );
      case 'SANITIZED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/90 text-amber-400 border border-amber-800/80 glow-amber">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>SANITIZED</span>
          </span>
        );
      case 'PASSED':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 glow-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>PASSED</span>
          </span>
        );
    }
  };

  const getRiskBadge = (risk) => {
    const riskColors = {
      CRITICAL: 'text-rose-400 bg-rose-950/40 border-rose-800/60',
      HIGH: 'text-orange-400 bg-orange-950/40 border-orange-800/60',
      MEDIUM: 'text-amber-400 bg-amber-950/40 border-amber-800/60',
      LOW: 'text-sky-400 bg-sky-950/40 border-sky-800/60',
      INFO: 'text-zinc-400 bg-zinc-900 border-zinc-800'
    };
    return (
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${riskColors[risk] || riskColors.INFO}`}>
        {risk || 'INFO'}
      </span>
    );
  };

  return (
    <div className="glass-panel rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
      {/* Table Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
              Real-Time Gateway Telemetry Stream
            </h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {filteredEvents.length} events
          </span>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Quick Action Filters */}
          <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800 text-xs">
            {['ALL', 'BLOCKED', 'SANITIZED', 'PASSED'].map((act) => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
                  filterAction === act
                    ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter prompt or threat..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 pr-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500/50 w-40 sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Decision</th>
              <th className="py-3 px-4">Risk</th>
              <th className="py-3 px-4">Inbound Payload Snippet</th>
              <th className="py-3 px-4">Threat Vectors</th>
              <th className="py-3 px-4 text-right">Guardrail Latency</th>
              <th className="py-3 px-4 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 font-mono text-xs">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-zinc-600" />
                    <p className="text-zinc-400 font-sans text-sm">
                      No matching telemetry events recorded yet.
                    </p>
                    <p className="text-zinc-400 text-xs font-sans">
                      Dispatch requests via the Attack Sandbox or POST to /api/v1/gateway/chat.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev, index) => {
                const timeString = new Date(ev.timestamp || ev.created_at || Date.now()).toLocaleTimeString();
                const threats = ev.threat_types || [];

                return (
                  <tr
                    key={ev.id || index}
                    className="hover:bg-zinc-900/60 transition-colors group cursor-pointer"
                    onClick={() => onSelectEvent(ev)}
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap text-[11px]">
                      {timeString}
                    </td>

                    {/* Decision Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(ev.action_taken)}
                    </td>

                    {/* Risk Level */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getRiskBadge(ev.risk_level)}
                    </td>

                    {/* Prompt Snippet */}
                    <td className="py-3 px-4 text-zinc-300 max-w-xs sm:max-w-md truncate">
                      <span className="font-sans text-xs">
                        {ev.raw_prompt || '—'}
                      </span>
                    </td>

                    {/* Threats */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {threats.length === 0 ? (
                          <span className="text-zinc-400 text-[11px]">None (Passed)</span>
                        ) : (
                          threats.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                            >
                              {t.replace(/_/g, ' ')}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Latency */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="text-emerald-400 font-semibold">
                        {ev.guardrail_latency_ms != null ? `${ev.guardrail_latency_ms} ms` : '—'}
                      </span>
                    </td>

                    {/* Inspect Link */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:bg-zinc-700 transition-colors"
                        title="View Full Forensics"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
