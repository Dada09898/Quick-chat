import React from 'react';
import { useAIStore, PermissionScope } from '../store/aiStore';

interface ConsentModalProps {
  targetId: string;
  targetName: string;
  targetType: 'CHAT' | 'VAULT_FOLDER' | 'VAULT_ITEM';
  onGrant: () => void;
  onDeny: () => void;
}

export const AIConsentModal: React.FC<ConsentModalProps> = ({ targetId, targetName, targetType, onGrant, onDeny }) => {
  const { activeProviderId, grantPermission } = useAIStore();
  
  const isCloud = activeProviderId !== 'ollama' && activeProviderId !== 'lmstudio';
  const [scope, setScope] = React.useState<PermissionScope>('ONE_TIME');

  const handleConfirm = () => {
    grantPermission({
      id: targetId,
      targetType,
      scope,
      grantedAt: Date.now()
    });
    onGrant();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-md w-full border border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          ✨ AI Authorization Request
        </h2>
        
        <div className="bg-gray-900 p-4 rounded text-sm text-gray-300 mb-4 border-l-4 border-blue-500">
          The AI Assistant is requesting access to decrypt and analyze:
          <strong className="block text-white mt-1">{targetName}</strong>
        </div>

        {isCloud && (
          <div className="bg-red-500/10 p-4 rounded text-sm text-red-400 mb-4 border border-red-500/50">
            <strong>⚠️ Privacy Warning:</strong> You have selected a Cloud Provider ({activeProviderId}). 
            If you proceed, decrypted data for this specific item will be transmitted securely to this 3rd-party provider.
          </div>
        )}

        {!isCloud && (
          <div className="bg-green-500/10 p-4 rounded text-sm text-green-400 mb-4 border border-green-500/50">
            <strong>🛡️ Local Processing:</strong> You have selected a Local Provider ({activeProviderId}). 
            Data will remain entirely on your device and will never touch the internet.
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Permission Scope</label>
          <select 
            value={scope} 
            onChange={(e) => setScope(e.target.value as PermissionScope)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value="ONE_TIME">One Time Only</option>
            <option value="SESSION">Until Application Closes (Session)</option>
            <option value="PERSISTENT">Persistent (Revocable in Settings)</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button onClick={onDeny} className="flex-1 bg-gray-700 hover:bg-gray-600 font-bold py-2 rounded transition">
            Deny Access
          </button>
          <button onClick={handleConfirm} className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold py-2 rounded transition shadow-lg">
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};
