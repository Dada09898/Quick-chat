import React, { useState } from 'react';
import { Building2, Users, ShieldAlert, MonitorSmartphone, Key, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const EnterpriseDashboard = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchDevices = async () => {
      try {
        const { apiJson } = await import('../../lib/api');
        const res = await apiJson('/api/auth/devices/');
        if (res.ok) {
          const data = await res.json();
          setDevices(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDevices();
  }, []);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-200">
      {/* Enterprise Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-8 flex items-center gap-2 text-violet-500">
          <Building2 size={24}/> Enterprise Admin
        </h1>
        
        <nav className="flex-1 space-y-2 text-sm font-medium">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'overview' ? 'bg-violet-600/20 text-violet-400' : 'hover:bg-gray-800'}`}
          >
            <ShieldAlert size={16}/> Security Overview
          </button>
          <button 
            onClick={() => setActiveTab('devices')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'devices' ? 'bg-violet-600/20 text-violet-400' : 'hover:bg-gray-800'}`}
          >
            <MonitorSmartphone size={16}/> Device Fleet
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'users' ? 'bg-violet-600/20 text-violet-400' : 'hover:bg-gray-800'}`}
          >
            <Users size={16}/> Users & SCIM
          </button>
          <button 
            onClick={() => setActiveTab('policy')}
            className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 transition ${activeTab === 'policy' ? 'bg-violet-600/20 text-violet-400' : 'hover:bg-gray-800'}`}
          >
            <Key size={16}/> Enterprise Policies
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-3xl font-bold mb-2">Acme Corp Security Posture</h2>
            <p className="text-gray-400 mb-8">Zero-Knowledge Compliance Dashboard</p>
            
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl mb-8 flex items-start gap-4">
              <ShieldAlert className="text-red-400 mt-1" />
              <div>
                <h3 className="font-semibold text-red-400 mb-2">Zero-Knowledge Architecture Enforced</h3>
                <p className="text-sm text-gray-300">
                  As an Enterprise Administrator, you have the ability to revoke sessions, delete accounts, and enforce MFA. 
                  However, you <strong>cannot</strong> read user messages, vault contents, or AI prompts. There is no Enterprise Escrow Key.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <h3 className="text-gray-400 font-semibold mb-2">Active Users (SCIM)</h3>
                <p className="text-3xl font-bold">1,402</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <h3 className="text-gray-400 font-semibold mb-2">Trusted Devices</h3>
                <p className="text-3xl font-bold text-green-400">3,291</p>
              </div>
              <div className="bg-gray-900 border border-red-900 p-6 rounded-xl">
                <h3 className="text-gray-400 font-semibold mb-2">Compromised Devices</h3>
                <p className="text-3xl font-bold text-red-400">1</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><MonitorSmartphone/> Device Trust Fleet</h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-950 text-gray-400">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Platform</th>
                    <th className="px-6 py-3">Trust State</th>
                    <th className="px-6 py-3">Last Seen</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {mockDevices.map(d => (
                    <tr key={d.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium">{d.user}</td>
                      <td className="px-6 py-4">{d.platform}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          d.state === 'TRUSTED' ? 'bg-green-500/20 text-green-400' :
                          d.state === 'COMPROMISED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {d.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{d.lastSeen}</td>
                      <td className="px-6 py-4">
                        {d.state === 'COMPROMISED' ? (
                          <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded font-semibold transition">
                            Revoke Device
                          </button>
                        ) : (
                          <button className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded font-semibold transition">
                            Manage
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'policy' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Key/> Enterprise Policies</h2>
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 max-w-3xl space-y-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Enforce Split-Authentication (SSO)</h3>
                  <p className="text-sm text-gray-400">Users must authenticate via Okta, then supply local Vault PIN.</p>
                </div>
                <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Allow Cloud AI Providers</h3>
                  <p className="text-sm text-gray-400">If disabled, users can only use Local WebAssembly or Ollama inference.</p>
                </div>
                <div className="w-12 h-6 bg-gray-600 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Disable Vault Exports</h3>
                  <p className="text-sm text-gray-400">Prevents users from exporting their enterprise vault to JSON/CSV.</p>
                </div>
                <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
