import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Wrench, BarChart2, ServerCrash, CheckCircle, Clock } from 'lucide-react';

export const OpsDashboard = () => {
  const [activeTab, setActiveTab] = useState('health');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any>(null);

  // In a real app, this would fetch from /api/ops/
  useEffect(() => {
    // Mock data for the scaffold
    setIncidents([
      { id: '1', title: 'Redis Connection Spikes', state: 'INVESTIGATING', severity: 'SEV2', created_at: new Date().toISOString() },
      { id: '2', title: 'OpenAI API Latency', state: 'RESOLVED', severity: 'SEV3', created_at: new Date(Date.now() - 86400000).toISOString() }
    ]);
    
    setAuditLogs([
      { id: '1', timestamp: new Date().toISOString(), category: 'VAULT', action: 'VAULT_UNLOCK', severity: 'INFO', trace_id: 'tr-abc-123' },
      { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), category: 'AI', action: 'AI_PERMISSION_GRANT', severity: 'WARNING', trace_id: 'tr-def-456' }
    ]);
  }, []);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-200">
      {/* Ops Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-8 flex items-center gap-2 text-indigo-400">
          <Activity size={24}/> SRE Center
        </h1>
        
        <nav className="flex-1 space-y-2 text-sm font-medium">
          <button 
            onClick={() => setActiveTab('health')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'health' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-gray-800'}`}
          >
            <BarChart2 size={16}/> System Health
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'audit' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-gray-800'}`}
          >
            <ShieldAlert size={16}/> Audit Logs
          </button>
          <button 
            onClick={() => setActiveTab('incidents')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'incidents' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-gray-800'}`}
          >
            <ServerCrash size={16}/> Incidents
          </button>
          <button 
            onClick={() => setActiveTab('maintenance')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'maintenance' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-gray-800'}`}
          >
            <Wrench size={16}/> Maintenance Mode
          </button>
        </nav>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'health' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><BarChart2/> System Topology</h2>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <h3 className="text-gray-400 font-semibold mb-2">API Gateway</h3>
                <div className="flex items-center gap-2 text-green-400 font-bold text-lg"><CheckCircle size={20}/> HEALTHY</div>
                <p className="text-xs text-gray-500 mt-2">Latency: 42ms</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <h3 className="text-gray-400 font-semibold mb-2">PostgreSQL (pgBouncer)</h3>
                <div className="flex items-center gap-2 text-green-400 font-bold text-lg"><CheckCircle size={20}/> HEALTHY</div>
                <p className="text-xs text-gray-500 mt-2">Pool Saturation: 14%</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <h3 className="text-gray-400 font-semibold mb-2">Redis PubSub</h3>
                <div className="flex items-center gap-2 text-green-400 font-bold text-lg"><CheckCircle size={20}/> HEALTHY</div>
                <p className="text-xs text-gray-500 mt-2">Active WS Channels: 1,402</p>
              </div>
            </div>
            
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6">
              <h3 className="font-bold text-indigo-400 mb-2">Advanced Infrastructure Telemetry</h3>
              <p className="text-sm text-gray-400 mb-4">Detailed hardware metrics, container orchestration statuses, and OpenTelemetry traces are actively provisioned via Grafana.</p>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-semibold transition">
                Open Grafana Dashboard
              </button>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ShieldAlert/> Zero-Knowledge Audit Center</h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-950 text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Severity</th>
                    <th className="px-6 py-3">Trace ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 font-semibold text-indigo-400">{log.category}</td>
                      <td className="px-6 py-4">{log.action}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.severity === 'WARNING' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-700 text-gray-300'}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-500">{log.trace_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div>
             <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ServerCrash/> Incident Tracking</h2>
             <div className="space-y-4">
               {incidents.map(inc => (
                 <div key={inc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="font-bold text-lg">{inc.title}</h3>
                       <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock size={12}/> Opened {new Date(inc.created_at).toLocaleString()}</p>
                     </div>
                     <span className={`px-3 py-1 rounded font-bold text-xs ${inc.state === 'RESOLVED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                       {inc.state}
                     </span>
                   </div>
                   <div className="bg-gray-950 p-4 rounded border border-gray-800">
                     <p className="text-sm text-gray-400">Severity: <strong className="text-white">{inc.severity}</strong></p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Wrench/> Maintenance Mode</h2>
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 max-w-2xl">
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-400">Maintenance Scope</label>
                <select className="w-full bg-gray-950 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
                  <option value="FULL">Full Maintenance (App Offline)</option>
                  <option value="READ_ONLY">Read-Only Mode (Database Locked)</option>
                  <option value="PARTIAL">Partial Degradation (AI/WebRTC Offline)</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-400">Public Message</label>
                <textarea 
                  className="w-full bg-gray-950 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-indigo-500 h-24"
                  placeholder="DualConnect is undergoing scheduled maintenance..."
                />
              </div>
              <button className="bg-red-600 hover:bg-red-700 font-bold py-2 px-6 rounded transition shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                Engage Maintenance Mode
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
