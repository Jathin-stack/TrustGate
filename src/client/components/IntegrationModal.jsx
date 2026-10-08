import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Code, 
  Terminal, 
  Zap, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

export function IntegrationModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('node');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const gatewayUrl = `${window.location.origin}/api/v1/gateway/chat`;

  const snippets = {
    node: `// 1-Line Drop-in Swap with OpenAI Node SDK
import OpenAI from 'openai';

// Instead of default:
// const client = new OpenAI();

// Route through TrustGate Zero-Trust Perimeter (1-Line Change):
const client = new OpenAI({
  baseURL: "${window.location.origin}/api/v1/gateway",
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_if_gateway_keys"
});

// Use completely standard inference syntax:
const response = await client.chat.completions.create({
  model: "gemini-2.5-flash",
  messages: [{ role: "user", content: "Contact alice@defense.gov with key sk-test12345" }]
});

console.log(response.choices[0].message.content);`,

    python: `# 1-Line Drop-in Swap with Python OpenAI SDK
from openai import OpenAI
import os

# Point base_url to TrustGate Security Gateway:
client = OpenAI(
    base_url="${window.location.origin}/api/v1/gateway",
    api_key=os.environ.get("OPENAI_API_KEY", "tg_runtime_token")
)

# Inbound prompts are automatically cleansed of PII, secrets & injections
completion = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[
        {"role": "user", "content": "Process payroll for user 123-45-6789"}
    ]
)

print(completion.choices[0].message.content)`,

    langchain: `// LangChain / LangGraph Zero-Trust Integration
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  configuration: {
    baseURL: "${window.location.origin}/api/v1/gateway",
  },
  modelName: "gemini-2.5-flash",
  temperature: 0.2
});

// Autonomous tool agents are deterministically firewalled:
const response = await model.invoke("Analyze customer records and cleanup database");`,

    curl: `# Direct Zero-Trust Reverse Proxy Ingestion
curl -X POST ${gatewayUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Hello! My credentials are sk-12345678901234567890123456789012 and email is bob@corp.internal",
    "client_id": "production_service_v1",
    "two_way_cloaking": true
  }'`
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-zinc-100 text-lg">
                  Drop-in SDK Integration
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold">
                  1-LINE PROXY SWAP
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Zero codebase refactoring. Intercept and secure existing LLM pipelines instantly.
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

        {/* Pitch Callout */}
        <div className="p-4 bg-emerald-950/20 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono text-emerald-300">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Simply replace baseURL with your TrustGate gateway URL. All OWASP guardrails execute inline.</span>
          </div>
          <span className="text-zinc-400 text-[11px] hidden sm:block">&lt; 2.0ms Overhead</span>
        </div>

        {/* Language Tabs */}
        <div className="flex border-b border-zinc-800 px-5 bg-zinc-900/30 text-xs font-mono">
          {[
            { id: 'node', label: 'Node.js / TS (OpenAI SDK)' },
            { id: 'python', label: 'Python (OpenAI / Anthropic)' },
            { id: 'langchain', label: 'LangChain & LangGraph' },
            { id: 'curl', label: 'cURL / REST API' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="p-5 flex-1 relative bg-zinc-950">
          <div className="absolute top-8 right-8 z-10">
            <button
              onClick={() => handleCopy(snippets[activeTab])}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-zinc-200 flex items-center space-x-1.5 transition-colors shadow-lg"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Snippet' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {snippets[activeTab]}
          </pre>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>Target Gateway: <code className="text-emerald-400">{gatewayUrl}</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
