import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from './components/AppLayout';
import { MetricsCards } from './components/MetricsCards';
import { ThreatStreamTable } from './components/ThreatStreamTable';
import { LogDrawer } from './components/LogDrawer';
import { SandboxPlayground } from './components/SandboxPlayground';
import { PolicyMatrix } from './components/PolicyMatrix';
import { AuditLogExplorer } from './components/AuditLogExplorer';
import { IntegrationModal } from './components/IntegrationModal';
import { AuditChainVerifier } from './components/AuditChainVerifier';
import { ReportExportModal } from './components/ReportExportModal';
import { ApprovalModal } from './components/ApprovalModal';
import { FraudCommandCenter } from './components/FraudCommandCenter';
import EmailUrlFraudCenter from './components/EmailUrlFraudCenter';
import { 
  ShieldCheck, 
  Terminal, 
  Sliders, 
  ScrollText, 
  Activity, 
  Zap, 
  Lock, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Cpu,
  FileCheck,
  Code
} from 'lucide-react';

import { HeroOrbCore } from './components/HeroOrbCore';

export function LegacyApp() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sseConnected, setSseConnected] = useState(false);
  const [telemetryEvents, setTelemetryEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activePolicy, setActivePolicy] = useState(null);

  // Modals state
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [isAuditChainOpen, setIsAuditChainOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);

  const [stats, setStats] = useState({
    total_requests: 0,
    blocked_count: 0,
    sanitized_count: 0,
    passed_count: 0,
    avg_guardrail_latency_ms: '0.00',
    threat_distribution: {
      PROMPT_INJECTION: 0,
      SECRET_LEAK: 0,
      PII_EXPOSURE: 0,
      DESTRUCTIVE_TOOL_CALL: 0
    }
  });

  const eventSourceRef = useRef(null);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/telemetry/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          total_requests: data.total_requests || 0,
          blocked_count: data.blocked_count || 0,
          sanitized_count: data.sanitized_count || 0,
          passed_count: data.passed_count || 0,
          avg_guardrail_latency_ms: data.avg_guardrail_latency_ms || '0.00',
          threat_distribution: data.threat_distribution || {
            PROMPT_INJECTION: 0,
            SECRET_LEAK: 0,
            PII_EXPOSURE: 0,
            DESTRUCTIVE_TOOL_CALL: 0
          }
        });
      }
    } catch (err) {
      console.warn('Failed to fetch stats:', err.message);
    }
  };

  // Fetch Active Policy
  const fetchPolicy = async () => {
    try {
      const res = await fetch('/api/v1/policies');
      if (res.ok) {
        const data = await res.json();
        setActivePolicy(data.policy);
      }
    } catch (err) {
      console.warn('Failed to fetch policy:', err.message);
    }
  };

  // Setup Native EventSource for SSE Stream
  useEffect(() => {
    fetchStats();
    fetchPolicy();

    let retryTimeout = null;

    const connectSSE = () => {
      const es = new EventSource('/api/v1/telemetry/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.addEventListener('connected', () => {
        setSseConnected(true);
      });

      es.addEventListener('telemetry', (e) => {
        try {
          const payload = JSON.parse(e.data);
          setTelemetryEvents((prev) => {
            const exists = prev.some(item => item.id === payload.id);
            if (exists) return prev;
            return [payload, ...prev].slice(0, 50);
          });
          // Refresh aggregated KPI stats on new telemetry
          fetchStats();
        } catch (err) {
          console.error('Failed to parse SSE telemetry event:', err);
        }
      });

      es.addEventListener('approval_request', (e) => {
        try {
          const req = JSON.parse(e.data);
          setPendingApproval(req);
        } catch (err) {
          console.error('Failed to parse approval_request event:', err);
        }
      });

      es.addEventListener('approval_resolved', () => {
        setPendingApproval(null);
      });

      es.addEventListener('policy_updated', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.policy) {
            setActivePolicy(payload.policy);
          }
        } catch (err) {
          console.error('Failed to parse SSE policy_updated event:', err);
        }
      });

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        retryTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  return (
    <AppLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      sseConnected={sseConnected}
      systemStats={stats}
      onOpenIntegration={() => setIsIntegrationOpen(true)}
      onOpenAuditChain={() => setIsAuditChainOpen(true)}
      onOpenReport={() => setIsReportOpen(true)}
    >
      {/* Tab 1: Mission Control Dashboard */}
      {currentTab === 'dashboard' && (
        <div className="space-y-10 animate-in fade-in duration-200">
          <HeroOrbCore
            stats={stats}
            onLaunchSandbox={() => setCurrentTab('sandbox')}
            onOpenFraudRadar={() => setCurrentTab('fraud')}
            onOpenIntegration={() => setIsIntegrationOpen(true)}
            onOpenReport={() => setIsReportOpen(true)}
            onOpenAuditChain={() => setIsAuditChainOpen(true)}
          />

          <div className="border-t border-sky-950/80 pt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />
                  <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                    Telemetry Stream Active
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
                  Live Perimeter Telemetry & KPIs
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsIntegrationOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl glass-pill text-xs font-mono text-cyan-300 flex items-center space-x-1.5 hover:text-white"
                >
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                  <span>1-Line Proxy</span>
                </button>
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl glass-pill text-xs font-mono text-amber-300 flex items-center space-x-1.5 hover:text-white"
                >
                  <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>SOC 2 Report</span>
                </button>
              </div>
            </div>

            <MetricsCards stats={stats} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                title: 'Prompt Injections',
                code: 'OWASP LLM01',
                count: stats.threat_distribution?.PROMPT_INJECTION || 0,
                border: 'border-rose-900/40',
                text: 'text-rose-400'
              },
              {
                title: 'Secret Leaks',
                code: 'OWASP LLM06',
                count: stats.threat_distribution?.SECRET_LEAK || 0,
                border: 'border-amber-900/40',
                text: 'text-amber-400'
              },
              {
                title: 'PII Exposures',
                code: 'PCI / GDPR',
                count: stats.threat_distribution?.PII_EXPOSURE || 0,
                border: 'border-cyan-900/40',
                text: 'text-cyan-400'
              },
              {
                title: 'Destructive Tools',
                code: 'OWASP LLM08',
                count: stats.threat_distribution?.DESTRUCTIVE_TOOL_CALL || 0,
                border: 'border-purple-900/40',
                text: 'text-purple-400'
              }
            ].map((threat, idx) => (
              <div 
                key={idx}
                className={`glass-panel p-4 rounded-xl border ${threat.border} flex items-center justify-between`}
              >
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">{threat.code}</div>
                  <div className="text-xs font-semibold text-zinc-200 mt-0.5">{threat.title}</div>
                </div>
                <div className={`text-xl font-mono font-bold ${threat.text}`}>
                  {threat.count}
                </div>
              </div>
            ))}
          </div>

          <ThreatStreamTable
            events={telemetryEvents}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        </div>
      )}

      {currentTab === 'fraud' && (
        <div className="animate-in fade-in duration-200">
          <FraudCommandCenter
            onLaunchSandbox={() => setCurrentTab('sandbox')}
            onSelectIncident={(inc) => setSelectedEvent(inc)}
          />
        </div>
      )}

      {currentTab === 'email_url' && (
        <div className="animate-in fade-in duration-200">
          <EmailUrlFraudCenter />
        </div>
      )}

      {currentTab === 'sandbox' && (
        <div className="animate-in fade-in duration-200">
          <SandboxPlayground
            onEventTriggered={() => {
              fetchStats();
            }}
          />
        </div>
      )}

      {currentTab === 'policies' && (
        <div className="animate-in fade-in duration-200">
          <PolicyMatrix
            initialPolicy={activePolicy}
            onPolicySaved={(newPol) => {
              setActivePolicy(newPol);
            }}
          />
        </div>
      )}

      {currentTab === 'logs' && (
        <div className="animate-in fade-in duration-200">
          <div className="flex justify-end mb-4 gap-2">
            <button
              onClick={() => setIsAuditChainOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 text-xs font-mono text-cyan-300 flex items-center space-x-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Verify Cryptographic Audit Chain</span>
            </button>
            <button
              onClick={() => setIsReportOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-xs font-mono text-amber-300 flex items-center space-x-1.5 transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Generate SOC 2 Report</span>
            </button>
          </div>
          <AuditLogExplorer
            onSelectLog={(log) => setSelectedEvent(log)}
          />
        </div>
      )}

      {selectedEvent && (
        <LogDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      <IntegrationModal
        isOpen={isIntegrationOpen}
        onClose={() => setIsIntegrationOpen(false)}
      />

      <AuditChainVerifier
        isOpen={isAuditChainOpen}
        onClose={() => setIsAuditChainOpen(false)}
      />

      <ReportExportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {pendingApproval && (
        <ApprovalModal
          request={pendingApproval}
          onResolve={() => setPendingApproval(null)}
        />
      )}
    </AppLayout>
  );
}
