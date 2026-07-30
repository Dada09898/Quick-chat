import React, { useState } from 'react';
import { useVaultStore } from './vaultStore';
import { VaultSecurity } from './VaultSecurity';
import { Lock, FileText, Key, Download, Trash, Search } from 'lucide-react';

export const VaultDashboard = () => {
  const { items, isLocked, unlock, lock } = useVaultStore();
  const [masterPassword, setMasterPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const encoder = new TextEncoder();
      const passwordKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(masterPassword),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      const rawKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('quickchat_vault_salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      const success = await unlock(rawKey);
      if (!success) alert("Invalid Master Password");
    } catch (e) {
      alert("Crypto derivation failed.");
    }
  };

  const handleExport = async () => {
    const verified = await VaultSecurity.requestWebAuthnVerification();
    if (!verified) return;
    
    // Generates a local encrypted backup (ciphertexts only)
    const backup = JSON.stringify(items.map(i => ({
      id: i.id, ciphertext: i.ciphertext, wrapped_key: i.wrapped_key, algorithm: i.algorithm 
    })));
    
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dualconnect_vault_backup_${new Date().toISOString()}.json`;
    a.click();
  };

  if (isLocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <form onSubmit={handleUnlock} className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-sm w-full text-center border border-gray-700">
          <Lock className="mx-auto mb-4 text-blue-500" size={48} />
          <h2 className="text-2xl font-bold mb-6">Vault Locked</h2>
          <input 
            type="password" 
            placeholder="Master Password" 
            className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-3 mb-6 focus:outline-none focus:border-blue-500 transition"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded transition shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            Unlock Vault
          </button>
        </form>
      </div>
    );
  }

  // Very simplified local search across decrypted memory state
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const name = item.decryptedData?.name || item.decryptedData?.title || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-8 flex items-center gap-2"><Lock className="text-blue-500"/> Digital Vault</h1>
        
        <nav className="flex-1 space-y-2">
          <button className="w-full text-left px-4 py-2 bg-gray-700 rounded flex items-center gap-2 hover:bg-gray-600 transition"><Key size={18}/> Passwords</button>
          <button className="w-full text-left px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-700 transition"><FileText size={18}/> Secure Notes</button>
        </nav>
        
        <div className="pt-4 border-t border-gray-700 space-y-2">
          <button onClick={handleExport} className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded flex items-center gap-2 transition"><Download size={16}/> Export Backup</button>
          <button onClick={lock} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded flex items-center gap-2 transition"><Lock size={16}/> Lock Vault</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-3 text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder="Search encrypted vault..." 
              className="w-full bg-gray-800 border border-gray-700 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition shadow-lg">
            + New Item
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    {item.item_type === 'PASSWORD' ? <Key size={24} /> : <FileText size={24} />}
                  </div>
                  <h3 className="font-semibold text-lg">{item.decryptedData?.name || item.decryptedData?.title || 'Unnamed Item'}</h3>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                {item.item_type === 'PASSWORD' ? item.decryptedData?.username : 'Secure Note'}
              </p>
              <div className="mt-4 flex opacity-0 group-hover:opacity-100 transition">
                 <button className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition"><Trash size={16}/></button>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && <p className="text-gray-500 italic">No items found.</p>}
        </div>
      </div>
    </div>
  );
};
