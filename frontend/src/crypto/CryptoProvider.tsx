import React, { createContext, useContext, useEffect, useState } from 'react';
import { KeyManager } from './KeyManager';

interface CryptoContextState {
  isInitialized: boolean;
  isError: boolean;
  initializeDevice: () => Promise<{ x25519Public: string; ed25519Public: string }>;
  destroyDevice: () => Promise<void>;
}

const CryptoContext = createContext<CryptoContextState | null>(null);

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Check if keys exist on mount
    KeyManager.getIdentityPrivateKey()
      .then(() => setIsInitialized(true))
      .catch(() => setIsInitialized(false));
  }, []);

  const initializeDevice = async () => {
    try {
      const publicKeys = await KeyManager.initializeDeviceKeys();
      setIsInitialized(true);
      return publicKeys;
    } catch (err) {
      setIsError(true);
      throw err;
    }
  };

  const destroyDevice = async () => {
    await KeyManager.destroyAllKeys();
    setIsInitialized(false);
  };

  return (
    <CryptoContext.Provider value={{ isInitialized, isError, initializeDevice, destroyDevice }}>
      {children}
    </CryptoContext.Provider>
  );
};

export const useCrypto = () => {
  const context = useContext(CryptoContext);
  if (!context) throw new Error('useCrypto must be used within CryptoProvider');
  return context;
};
