import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  EyeOff
} from 'lucide-react';

export function AuditLogExplorer({ onSelectLog }) {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        action: actionFilter,
        risk: riskFilter,
        search: searchTerm
      });

      const res = await fetch(`/api/v1/telemetry/logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('AuditLog fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [limit, offset, actionFilter, riskFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0);
    fetchLogs();
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'BLOCKED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
            BLOCKED
          </span>
        );
      case 'SANITIZED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
            SANITIZED
          </span>
        );
      case 'PASSED':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            PASSED
          </span>
        );
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center space-x-2">
            <ScrollText className="w-6 h-6 text-cyan-400" />
            <span>Audit Log Explorer</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Complete cryptographic audit trail of all transactions, prompt scrubbings, and intercepted exploits.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-zinc-100 hover:bg-zinc-850 flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="glass-panel p-4 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prompt payload or client ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-mono"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-zinc-400 font-mono">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">ALL</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="SANITIZED">SANITIZED</option>
              <option value="PASSED">PASSED</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-zinc-400 font-mono">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setOffset(0); }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">ALL</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
              <option value="INFO">INFO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Client ID</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4">Inbound Prompt</th>
                <th className="py-3 px-4">Threat Vectors</th>
                <th className="py-3 px-4 text-right">Guardrail Latency</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-zinc-500 font-sans">
                    No audit records match the selected query criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className="hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                      {log.client_id}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action_taken)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold uppercase text-zinc-400">
                        {log.risk_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300 max-w-xs sm:max-w-md truncate font-sans text-xs">
                      {log.raw_prompt}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(log.threat_types || []).slice(0, 2).map((t, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-850 text-zinc-300 border border-zinc-700">
                            {t}
                          </span>
                        ))}
                        {(log.threat_types || []).length > 2 && (
                          <span className="text-[10px] text-zinc-500">
                            +{log.threat_types.length - 2} more
                          </span>
                        )}
                        {(log.threat_types || []).length === 0 && (
                          <span className="text-zinc-600 text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-semibold whitespace-nowrap">
                      {log.guardrail_latency_ms} ms
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectLog(log); }}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:bg-zinc-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>
            Showing {totalCount === 0 ? 0 : offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount} records
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= totalCount}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
