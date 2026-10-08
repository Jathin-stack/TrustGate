import React from 'react';
import { 
  Play, 
  ShieldCheck, 
  EyeOff, 
  Database, 
  Activity, 
  Lock, 
  Zap, 
  ArrowRight, 
  Check, 
  TrendingUp, 
  FileCheck,
  Radio,
  Sliders
} from 'lucide-react';

export function HeroOrbCore({ 
  stats, 
  onLaunchSandbox, 
  onOpenFraudRadar,
  onOpenIntegration, 
  onOpenReport, 
  onOpenAuditChain 
}) {
  return (
    <div className="relative w-full max-w-6xl mx-auto pt-6 pb-14 px-4 overflow-hidden">
      {/* Background ambient radial glow matching reference image */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.18)_0%,rgba(3,11,30,0)_70%)] pointer-events-none -z-10" />

      {/* Hero Headline & Subtitle matching reference typography */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
          Zero-trust perimeter for <br />
          <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent">
            bulletproof AI.
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
          Intercept prompt injections, cloak sensitive PII in real time, block synthetic identity & arbitrage fraud, and deterministically sandbox autonomous agents — all in one inline gateway.
        </p>

        {/* Dual CTA Buttons matching reference design */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            onClick={onLaunchSandbox}
            className="glow-btn-primary px-6 py-3 rounded-2xl text-white font-semibold text-sm flex items-center space-x-2 tracking-wide"
          >
            <span>Launch Attack Sandbox</span>
          </button>

          <button
            onClick={onOpenFraudRadar}
            className="glass-pill px-5 py-3 rounded-2xl text-rose-300 hover:text-white font-medium text-sm flex items-center space-x-2 border border-rose-500/40 bg-rose-950/30 transition-all hover:bg-rose-950/60"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping" />
            <span>Fraud & Anomaly Radar</span>
          </button>

          <button
            onClick={onOpenIntegration}
            className="glass-pill px-5 py-3 rounded-2xl text-slate-200 hover:text-white font-medium text-sm flex items-center space-x-2.5"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />
            <span>1-Line Drop-in SDK</span>
          </button>
        </div>
      </div>

      {/* Main Orbit Architecture Core (Center Orb with 4 Connected Glass Cards) */}
      <div className="relative mt-8 sm:mt-12 flex items-center justify-center min-h-[460px]">
        {/* SVG Connector Circuit Traces matching reference line bends */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" 
          viewBox="0 0 1000 480" 
          fill="none"
        >
          {/* Top-Left Line: Core to Card 1 */}
          <path 
            d="M 500 240 C 440 240, 390 140, 310 140" 
            stroke="url(#cyanGlowGrad)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* Bottom-Left Line: Core to Card 2 */}
          <path 
            d="M 500 240 C 440 240, 390 340, 310 340" 
            stroke="url(#cyanGlowGrad)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* Top-Right Line: Core to Card 3 */}
          <path 
            d="M 500 240 C 560 240, 610 140, 690 140" 
            stroke="url(#cyanGlowGrad)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          {/* Bottom-Right Line: Core to Card 4 */}
          <path 
            d="M 500 240 C 560 240, 610 340, 690 340" 
            stroke="url(#cyanGlowGrad)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="cyanGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Central Luminous Electric Orb Core */}
        <div className="relative z-10 flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56">
          {/* Outer diffuse halo blur */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 opacity-60 blur-3xl animate-pulse" />
          
          {/* Outer rotating light ring */}
          <div className="absolute inset-2 rounded-full border border-cyan-400/50 shadow-[0_0_30px_rgba(56,189,248,0.5)] animate-spin-slow" />
          
          {/* Inner counter-rotating plasma stream */}
          <div className="absolute inset-5 rounded-full border-2 border-t-cyan-300 border-r-sky-500 border-b-blue-600 border-l-transparent shadow-[inset_0_0_20px_rgba(14,165,233,0.8)] animate-spin-reverse-slow" />

          {/* Core sphere with glowing depth */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-cyan-400 via-sky-600 to-blue-950 p-[2px] shadow-[0_0_50px_rgba(14,165,233,0.8)] flex items-center justify-center overflow-hidden">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#020617] via-[#051638] to-[#0a2558] flex flex-col items-center justify-center text-center p-3">
              <ShieldCheck className="w-8 h-8 text-cyan-300 drop-shadow-[0_0_12px_#38bdf8] mb-1 animate-pulse-subtle" />
              <span className="font-mono text-[11px] font-bold text-white tracking-widest uppercase">
                ENCLAVE
              </span>
              <span className="font-mono text-[9px] text-cyan-400">
                ZERO-TRUST
              </span>
            </div>
          </div>
        </div>

        {/* Floating Connected Card 1: Top-Left (PII & Secret Vault) */}
        <div 
          onClick={onLaunchSandbox}
          className="md:absolute top-4 left-0 lg:left-4 w-full md:w-72 navy-glass-card rounded-2xl p-4 cursor-pointer transition-all hover:scale-105 z-20 mb-4 md:mb-0"
        >
          <div className="flex items-center justify-between border-b border-sky-900/40 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
                <EyeOff className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-white">PII & Secret Vault</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800">
              REVERSIBLE
            </span>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-300">
              <span className="truncate">alice@defense.gov</span>
              <span className="text-cyan-400 font-semibold text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/60 flex items-center space-x-1">
                <Check className="w-2.5 h-2.5" />
                <span>Masked</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-300">
              <span className="truncate">4532-0150-****-2817</span>
              <span className="text-emerald-400 font-semibold text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center space-x-1">
                <Check className="w-2.5 h-2.5" />
                <span>Luhn Pass</span>
              </span>
            </div>
          </div>
        </div>

        {/* Floating Connected Card 2: Bottom-Left (Deterministic Tool Firewall) */}
        <div 
          onClick={onLaunchSandbox}
          className="md:absolute bottom-4 left-0 lg:left-4 w-full md:w-72 navy-glass-card rounded-2xl p-4 cursor-pointer transition-all hover:scale-105 z-20 mb-4 md:mb-0"
        >
          <div className="flex items-center justify-between border-b border-sky-900/40 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Database className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-white">Agent Firewall</span>
            </div>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800">
              OWASP LLM08
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-[11px] space-y-1">
              <div className="text-[10px] text-slate-500">Inbound SQL Query Intent:</div>
              <div className="text-rose-400 font-bold truncate">DROP TABLE customers CASCADE;</div>
              <div className="text-[10px] text-emerald-400 pt-0.5 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Blocked before execution (403)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Connected Card 3: Top-Right (Analytics & SLA with Bar Chart) */}
        <div 
          onClick={onOpenReport}
          className="md:absolute top-4 right-0 lg:right-4 w-full md:w-72 navy-glass-card rounded-2xl p-4 cursor-pointer transition-all hover:scale-105 z-20 mb-4 md:mb-0"
        >
          <div className="flex items-center justify-between border-b border-sky-900/40 pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-white">Threat Analytics</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800 flex items-center space-x-1">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>&lt; 20ms SLA</span>
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-2xl font-bold text-white tracking-tight">
                {stats.avg_guardrail_latency_ms || '0.34'} ms
              </span>
              <span className="text-[11px] text-slate-400">Median Latency</span>
            </div>

            {/* Micro Bar Chart matching reference image */}
            <div className="pt-1 flex items-end justify-between h-12 gap-1.5 px-1">
              {[40, 65, 30, 85, 95, 70, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    style={{ height: `${h}%` }}
                    className="w-full rounded-t bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 pt-0.5">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>LIVE</span>
            </div>
          </div>
        </div>

        {/* Floating Connected Card 4: Bottom-Right (Cryptographic Audit & Insights) */}
        <div 
          onClick={onOpenAuditChain}
          className="md:absolute bottom-4 right-0 lg:right-4 w-full md:w-72 navy-glass-card rounded-2xl p-4 cursor-pointer transition-all hover:scale-105 z-20"
        >
          <div className="flex items-center justify-between border-b border-sky-900/40 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-white">Cryptographic Audit</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
              MERKLE SHA-256
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Chain Integrity:</span>
                <span className="text-emerald-400 font-bold">100% VALID</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SOC 2 / GDPR:</span>
                <span className="text-cyan-400">Attestation Ready</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-800/60">
                Non-repudiation verified across all blocks
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
