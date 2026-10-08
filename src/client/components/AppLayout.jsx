import React from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  Sliders, 
  ScrollText, 
  Activity, 
  Zap, 
  Lock, 
  FileCheck, 
  Code,
  Sparkles,
  ShieldAlert,
  Globe
} from 'lucide-react';

export function AppLayout({ 
  currentTab, 
  setCurrentTab, 
  sseConnected, 
  systemStats,
  onOpenIntegration,
  onOpenAuditChain,
  onOpenReport,
  children 
}) {
  const navItems = [
    { id: 'dashboard', label: 'Mission Control', icon: Activity },
    { id: 'fraud', label: 'Fraud Radar', icon: ShieldAlert },
    { id: 'email_url', label: 'Email & URL Radar', icon: Globe },
    { id: 'sandbox', label: 'Attack Sandbox', icon: Terminal },
    { id: 'policies', label: 'Policy Matrix', icon: Sliders },
    { id: 'logs', label: 'Audit Explorer', icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-300">
      {/* Background Ambient Midnight Gradient from Reference */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_800px_at_50%_-100px,rgba(14,165,233,0.15),rgba(2,6,23,0))] -z-10" />

      {/* Top Navigation Bar matching reference image layout */}
      <header className="sticky top-0 z-40 border-b border-sky-950/60 bg-[#020617]/85 backdrop-blur-2xl px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Brand Identity matching reference icon */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setCurrentTab('dashboard')}
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 shadow-[0_0_20px_rgba(14,165,233,0.6)] group-hover:shadow-[0_0_25px_rgba(56,189,248,0.8)] transition-all">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  TrustGate
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono tracking-wider font-bold uppercase bg-sky-950/80 border border-sky-500/30 text-sky-400 rounded-md">
                  ENCLAVE
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links matching reference layout */}
          <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons matching reference glowing pill */}
          <div className="flex items-center space-x-2.5">
            {/* Quick Action Badges */}
            <button
              onClick={onOpenAuditChain}
              className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass-pill text-xs font-mono text-slate-300 hover:text-white transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Chain</span>
            </button>

            <button
              onClick={onOpenReport}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass-pill text-xs font-mono text-slate-300 hover:text-white transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>SOC 2 Export</span>
            </button>

            {/* Glowing Pill CTA Button from Reference Image */}
            <button
              onClick={onOpenIntegration}
              className="glow-btn-primary px-5 py-2 rounded-full text-white font-semibold text-xs tracking-wide flex items-center space-x-1.5 shadow-lg"
            >
              <Code className="w-3.5 h-3.5" />
              <span>1-Line SDK</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {children}
      </main>

      {/* Cockpit Footer */}
      <footer className="border-t border-sky-950/60 bg-[#020617] py-5 px-6 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto w-full gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>TrustGate (Enclave) AI Security Gateway: OWASP LLM01, LLM06, LLM08 Secured</span>
        </div>
        <div className="flex items-center space-x-4 text-slate-400">
          <span className="text-cyan-400">Overhead: {systemStats.avg_guardrail_latency_ms || '0.34'}ms (&lt; 1%)</span>
          <span>Zero-Trust Inline Reverse Proxy</span>
        </div>
      </footer>
    </div>
  );
}
