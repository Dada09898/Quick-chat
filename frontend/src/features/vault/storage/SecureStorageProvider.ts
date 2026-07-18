// Interfaces for Secure Storage

export interface SecureStorageProvider {
  /**
   * Initializes the storage provider (e.g., unlocking the OS enclave)
   */
  init(vaultId: string): Promise<void>;
  
  /**
   * Reads an encrypted session token or wrapped master key
   */
  get(key: string): Promise<string | null>;
  
  /**
   * Securely persists a value
   */
  set(key: string, value: string): Promise<void>;
  
  /**
   * Removes a value from the secure enclave
   */
  remove(key: string): Promise<void>;
  
  /**
   * Returns true if running in a Desktop environment (Tauri)
   */
  isDesktop(): boolean;
}
