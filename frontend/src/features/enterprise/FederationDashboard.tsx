import React, { useState } from 'react';
import { Activity, ShieldAlert, Network, ServerCrash, Clock, CheckCircle } from 'lucide-react';

export const FederationDashboard = () => {
  const [activeTab, setActiveTab] = useState('slos');

  const sloMetrics = [
    { name: 'Relay Availability', current: '99.99%', target: '99.95%', status: 'passing' },
    { name: 'Handshake Latency (P95)', current: '142ms', target: '200ms', status: 'passing' },
    { name: 'Key Discovery Reliability', current: '99.99%', target: '99.99%', status: 'passing' },
    { name: 'Rate Limit Exhaustion', current: '0.01%', target: '< 1%', status: 'passing' }
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-200">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-8 flex items-center gap-2 text-cyan-500">
          <Network size={24}/> Federation Ops
        </h1>
        
        <nav className="flex-1 space-y-2 text-sm font-medium">
          <button 
            onClick={() => setActiveTab('slos')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'slos' ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-gray-800'}`}
          >
            <Activity size={16}/> SLO Monitor
          </button>
          <button 
            onClick={() => setActiveTab('chaos')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'chaos' ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-gray-800'}`}
          >
            <ServerCrash size={16}/> Chaos Engineering
          </button>
          <button 
            onClick={() => setActiveTab('incidents')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'incidents' ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-gray-800'}`}
          >
            <ShieldAlert size={16}/> Incident Response
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        
        {activeTab === 'slos' && (
          <div>
            <h2 className="text-3xl font-bold mb-2">Service Level Objectives (SLOs)</h2>
            <p className="text-gray-400 mb-8">Continuous telemetry across the Zero-Knowledge relay mesh.</p>
            
            <div className="grid grid-cols-2 gap-6">
              {sloMetrics.map(slo => (
                <div key={slo.name} className="bg-gray-900 border border-gray-800 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <h3 className="text-gray-400 font-semibold mb-1">{slo.name}</h3>
                    <p className="text-sm text-gray-500">Target: {slo.target}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${slo.status === 'passing' ? 'text-green-400' : 'text-red-400'}`}>
                      {slo.current}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chaos' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ServerCrash/> Chaos Engine Runs</h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-950 text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Experiment</th>
                    <th className="px-6 py-3">Vector</th>
                    <th className="px-6 py-3">Impact</th>
                    <th className="px-6 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  <tr className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium">Network Partition</td>
                    <td className="px-6 py-4">S2S Egress Blocked</td>
                    <td className="px-6 py-4">State transits to QUEUED</td>
                    <td className="px-6 py-4 text-green-400 flex items-center gap-1"><CheckCircle size={14}/> Passed</td>
                  </tr>
                  <tr className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium">Clock Skew (+6m)</td>
                    <td className="px-6 py-4">NTP Desync</td>
                    <td className="px-6 py-4">Relays EXPIRE (Replay Protection)</td>
                    <td className="px-6 py-4 text-green-400 flex items-center gap-1"><CheckCircle size={14}/> Passed</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
