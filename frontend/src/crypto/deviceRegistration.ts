import { KeyManager } from './KeyManager';

export async function registerDeviceCryptoFlow(deviceName: string) {
  // 1. Generate keys locally
  const { x25519Public, ed25519Public } = await KeyManager.initializeDeviceKeys();
  
  // 2. Send to API (Assume fetch wrapper exists in the real app)
  const payload = {
    device_name: deviceName,
    public_key_x25519: x25519Public,
    public_key_ed25519: ed25519Public
  };

  // 3. API Call
  const response = await fetch('/api/auth/devices/register/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Revert local generation on failure
    await KeyManager.destroyAllKeys();
    throw new Error('Device registration failed on server');
  }

  return await response.json();
}
