import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Terminal, 
  Clock, 
  Database, 
  UserCheck, 
  Lock 
} from 'lucide-react';

export function ApprovalModal({ request, onResolve }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!request) return;
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request]);

  if (!request) return null;

  const handleDecision = async (decision) => {
    setIsSubmitting(true);
    try {
      await fetch('/api/v1/gateway/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_id: request.id,
          decision,
          decided_by: 'Dashboard Security Operator'
        })
      });
      if (onResolve) onResolve(decision);
    } catch (err) {
      console.error('Failed to submit HITL decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="w-full max-w-xl bg-zinc-950 border-2 border-amber-500/80 rounded-2xl shadow-2xl glow-amber overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pulsing Alert Banner */}
        <div className="p-4 bg-amber-500/20 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <AlertTriangle className="w-4 h-4" />
            <span>Human-in-the-Loop Guardrail Interception</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-mono text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s remaining</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100 flex items-center space-x-2">
              <Database className="w-5 h-5 text-amber-400" />
              <span>Autonomous Agent Tool Execution Intent</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              An autonomous agent requested execution of a restricted system function that exceeds the risk threshold (0.70). Manual operator authorization is required.
            </p>
          </div>

          {/* Tool Details Grid */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 font-mono text-xs space-y-2.5">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Tool Name:</span>
              <span className="text-amber-300 font-bold">{request.tool_name}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Originating Client:</span>
              <span className="text-zinc-300">{request.client_id}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Assessed Risk Score:</span>
              <span className="text-rose-400 font-bold">{request.risk_score || 0.95} (CRITICAL)</span>
            </div>

            <div>
              <span className="text-zinc-500 block mb-1">Invoked Parameters:</span>
              <pre className="p-2.5 bg-zinc-950 rounded-lg text-[11px] text-zinc-300 overflow-x-auto">
                {JSON.stringify(request.parameters, null, 2)}
              </pre>
            </div>

            {(request.violations && request.violations.length > 0) && (
              <div className="pt-1">
                <span className="text-rose-400 font-semibold block mb-1">Violations Detected:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-300 text-[11px]">
                  {request.violations.map((v, i) => (
                    <li key={i}>{v.reason || v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleDecision('REJECT')}
              disabled={isSubmitting || timeLeft === 0}
              className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-rose-950 border border-zinc-700 hover:border-rose-800 text-rose-300 font-mono text-xs font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Reject & Terminate (403)</span>
            </button>

            <button
              onClick={() => handleDecision('APPROVE')}
              disabled={isSubmitting || timeLeft === 0}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve Once (Override)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
