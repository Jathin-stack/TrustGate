import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  Link, 
  Hash, 
  Layers 
} from 'lucide-react';

export function AuditChainVerifier({ isOpen, onClose }) {
  const [verification, setVerification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runVerification = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/telemetry/audit-chain/verify');
      const data = await res.json();
      setVerification(data.chain_verification);
    } catch (err) {
      console.error('Failed to verify audit chain:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runVerification();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-zinc-100 text-lg">
                  Tamper-Proof Audit Log Verification
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold">
                  MERKLE SHA-256
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every transaction is cryptographically chained to its predecessor to prevent retroactive log alteration.
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-mono text-zinc-400">
                Recalculating SHA-256 Merkle chain from genesis block...
              </p>
            </div>
          ) : !verification ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">
              Unable to load chain verification report.
            </div>
          ) : (
            <>
              {/* Verification Status Card */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                verification.valid 
                  ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300' 
                  : 'bg-rose-950/30 border-rose-800/80 text-rose-300'
              }`}>
                <div className="flex items-center space-x-3">
                  {verification.valid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-sm">
                      {verification.valid ? 'Cryptographic Chain Integrity: 100% VALID' : 'Integrity Compromise Detected'}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                      {verification.message}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs hidden sm:block">
                  <div className="text-zinc-400 text-[10px]">VERIFIED BLOCKS</div>
                  <div className="font-bold text-zinc-100">{verification.totalBlocks} Transactions</div>
                </div>
              </div>

              {/* Technical Hash Parameters */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 font-mono text-xs space-y-3">
                <div>
                  <span className="text-zinc-500 text-[11px] block mb-1">Current Chain Head Hash (Latest Block):</span>
                  <div className="p-2.5 bg-zinc-950 rounded-lg text-emerald-400 text-[11px] truncate border border-zinc-850">
                    {verification.headHash}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 text-[11px] block mb-1">Genesis Block Root (Base):</span>
                  <div className="p-2.5 bg-zinc-950 rounded-lg text-zinc-400 text-[11px] truncate border border-zinc-850">
                    {verification.genesisHash}
                  </div>
                </div>

                <div className="flex justify-between text-[11px] text-zinc-500 pt-1">
                  <span>Audit Verification Timestamp:</span>
                  <span className="text-zinc-400">{new Date(verification.verifiedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Compliance Pitch Box */}
              <div className="p-3.5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 leading-relaxed font-sans flex items-start space-x-3">
                <Link className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-zinc-200">Legal & Regulatory Compliance:</strong> Chained hashing ensures non-repudiation. Once an event is written by TrustGate, modifying any raw prompt, timestamp, or classification invalidates all downstream hashes.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs font-mono">
          <button
            onClick={runVerification}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-Calculate Proof</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
