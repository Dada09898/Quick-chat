import { SecureStorageProvider } from './SecureStorageProvider';

/**
 * Mobile-based Storage Provider using Capacitor Preferences & Secure Storage.
 * Binds directly into Apple Keychain and Android Keystore.
 */
export class CapacitorSecureStorageProvider implements SecureStorageProvider {
  private secureStorage: any = null;
  
  async init(vaultId: string): Promise<void> {
    if (!this.isMobile()) throw new Error("Cannot init Capacitor Secure Storage outside of Mobile Webview.");
    
    // Using @capacitor-community/secure-storage or similar plugin
    this.secureStorage = (window as any).Capacitor?.Plugins?.SecureStoragePlugin;
    console.log("Initialized Native Mobile OS Secure Enclave (Apple Keychain / Android Keystore).");
  }

  async get(key: string): Promise<string | null> {
    if (!this.secureStorage) return null;
    try {
      const result = await this.secureStorage.get({ key });
      return result.value;
    } catch {
      return null; // Key not found
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.secureStorage) return;
    await this.secureStorage.set({ key, value });
  }

  async remove(key: string): Promise<void> {
    if (!this.secureStorage) return;
    await this.secureStorage.remove({ key });
  }

  isDesktop(): boolean {
    return false;
  }

  isMobile(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform();
  }
}
