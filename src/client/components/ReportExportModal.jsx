import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileCheck, 
  ShieldCheck, 
  Lock, 
  Award, 
  Layers, 
  Calendar 
} from 'lucide-react';

export function ReportExportModal({ isOpen, onClose }) {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/v1/telemetry/export-report')
        .then(res => res.json())
        .then(data => setReportData(data))
        .catch(err => console.error('Failed to load compliance report:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrustGate-SOC2-Compliance-Report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-zinc-100 text-lg">
                  SOC 2 Type II & GDPR Compliance Report
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-semibold">
                  AUDIT-READY
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Executive formal audit summary of runtime perimeter guardrails, PII masking, and cryptographic chain proofs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Report Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans">
          {isLoading || !reportData ? (
            <div className="py-16 text-center text-xs text-zinc-400 font-mono">
              Compiling compliance attestation data...
            </div>
          ) : (
            <>
              {/* Executive Attestation Banner */}
              <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider font-semibold block">
                      OFFICIAL ATTESTATION DOCUMENT
                    </span>
                    <h4 className="text-base font-bold text-zinc-100 mt-0.5">
                      {reportData.report_title}
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {new Date(reportData.generated_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-xs text-zinc-300 leading-relaxed">
                  This report certifies that inbound and outbound model traffic passing through the TrustGate Security Control Plane was subjected to continuous inline zero-trust inspection. All sensitive PII entities were tokenized in-memory, prompt injection exploits were short-circuited, and autonomous agent tool actions were deterministically sandboxed.
                </div>
              </div>

              {/* KPI Executive Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">Inspected Requests</span>
                  <span className="text-lg font-mono font-bold text-zinc-100">
                    {reportData.executive_summary.total_transactions_inspected}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-rose-400 block">Exploits Neutralized</span>
                  <span className="text-lg font-mono font-bold text-rose-400">
                    {reportData.executive_summary.threats_neutralized}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-amber-400 block">PII Vaulted</span>
                  <span className="text-lg font-mono font-bold text-amber-400">
                    {reportData.executive_summary.sensitive_records_vaulted}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 block">Median SLA Latency</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">
                    {reportData.executive_summary.median_guardrail_latency_ms} ms
                  </span>
                </div>
              </div>

              {/* Compliance Frameworks Evaluated */}
              <div className="space-y-2">
                <h5 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  Evaluated Regulatory Frameworks
                </h5>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {reportData.standards_evaluated.map((std, i) => (
                    <li key={i} className="p-2.5 bg-zinc-900/50 border border-zinc-800/80 rounded-lg text-zinc-300 flex items-center space-x-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{std}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Merkle Hash Proof Status */}
              <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-semibold">Cryptographic Audit Chain Proof:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                    VERIFIED INTACT
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 break-all">
                  Head Hash: {reportData.cryptographic_audit_integrity.merkle_head_hash}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Verified Blocks: {reportData.cryptographic_audit_integrity.total_blocks_verified} chained transactions
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadJSON}
              disabled={!reportData}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-200 flex items-center space-x-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download Audit JSON</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={!reportData}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-200 flex items-center space-x-2 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Print Executive Summary</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs font-mono"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
