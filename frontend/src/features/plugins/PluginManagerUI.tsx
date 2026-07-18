import React, { useState } from 'react';
import { PluginManifest } from './types';
import { globalPluginHost } from './PluginHost';
import { Puzzle, ShieldAlert, Check, X, Download } from 'lucide-react';

export const PluginManagerUI = () => {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [manifestUrl, setManifestUrl] = useState('');
  
  const handleInstall = async () => {
    try {
      // Mock fetching a manifest from a remote URL
      const dummyManifest: PluginManifest = {
        id: 'com.example.hello_vault',
        name: 'Hello Vault Integration',
        version: '1.0.0',
        author: 'Alice (alice@example.com)',
        description: 'Demonstrates reading a specific vault item and rendering a sidebar.',
        permissions: ['read:vault:selected', 'ui:sidebar'],
        entrypoint: 'https://example.com/worker.js' // Will fail in reality, but mock proves the architecture
      };
      
      setPlugins([...plugins, dummyManifest]);
      setManifestUrl('');
      
    } catch (e) {
      alert("Failed to parse plugin manifest.");
    }
  };

  const togglePlugin = (manifest: PluginManifest, enable: boolean) => {
    if (enable) {
      // Here we would normally trigger a Permission Review modal
      globalPluginHost.loadPlugin(manifest);
      alert(`Enabled plugin: ${manifest.name}`);
    } else {
      globalPluginHost.unloadPlugin(manifest.id);
      alert(`Disabled plugin: ${manifest.name}`);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto bg-gray-950 min-h-screen text-gray-200">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Puzzle className="text-emerald-500" size={32}/> Enterprise Extensions
      </h1>

      <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-xl mb-8 flex items-start gap-4">
        <ShieldAlert className="text-emerald-400 mt-1" />
        <div>
          <h3 className="font-semibold text-emerald-400 mb-2">Zero-Knowledge Sandbox Guaranteed</h3>
          <p className="text-sm text-gray-400">
            All plugins execute natively inside strictly isolated Web Workers. They have zero access to the DOM, React Context, or IndexedDB. 
            Cryptographic primitives (Master Keys, DEKs) are structurally incapable of being transmitted over the RPC bridge.
          </p>
        </div>
      </div>

      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8">
        <h2 className="text-xl font-semibold mb-4">Install from URL</h2>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="https://example.com/plugin.json"
            value={manifestUrl}
            onChange={(e) => setManifestUrl(e.target.value)}
            className="flex-1 bg-gray-950 border border-gray-700 rounded px-4 py-2 focus:border-emerald-500 focus:outline-none"
          />
          <button onClick={handleInstall} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded font-bold transition">
            <Download size={18}/> Fetch Manifest
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4 border-b border-gray-800 pb-2">Installed Plugins</h2>
        {plugins.map(p => (
          <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">{p.name} <span className="text-xs text-gray-500 font-mono ml-2">v{p.version}</span></h3>
              <p className="text-sm text-gray-400 mt-1">{p.description}</p>
              <p className="text-xs text-gray-500 mt-1">Author: {p.author}</p>
              
              <div className="mt-4 flex gap-2 flex-wrap">
                {p.permissions.map(perm => (
                  <span key={perm} className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-1 rounded">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => togglePlugin(p, true)} className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-2 rounded font-bold transition">
                Enable
              </button>
              <button onClick={() => togglePlugin(p, false)} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded font-bold transition">
                Disable
              </button>
            </div>
          </div>
        ))}
        
        {plugins.length === 0 && <p className="text-gray-500 italic">No plugins installed.</p>}
      </div>
    </div>
  );
}
