import { KeyManager } from './KeyManager';
import { apiJson, apiClient } from '../lib/api';

export async function registerDeviceCryptoFlow(deviceName: string) {
  // 1. Generate keys locally
  const { x25519Public, ed25519Public } = await KeyManager.initializeDeviceKeys();
  
  // 2. Register device on server
  const payload = {
    device_name: deviceName,
    public_key_x25519: x25519Public,
    public_key_ed25519: ed25519Public
  };

  const response = await apiJson('/api/auth/devices/register/', {
    method: 'POST',
    body: payload,
  });

  if (!response.ok) {
    await KeyManager.destroyAllKeys();
    throw new Error('Device registration failed on server');
  }

  const device = await response.json();
  localStorage.setItem('quickchat_device_id', device.id);

  // 3. Generate and upload pre-key bundle (SignedPreKey + OneTimePreKeys)
  const bundle = await KeyManager.generatePreKeyBundle(50);
  await apiJson('/api/auth/devices/keys/upload/', {
    method: 'POST',
    body: {
      device_id: device.id,
      signed_pre_key: bundle.signedPreKey,
      one_time_pre_keys: bundle.oneTimePreKeys
    }
  });

  return device;
}

export async function ensureDeviceAndKeysRegistered() {
  let deviceId = localStorage.getItem('quickchat_device_id');
  if (!deviceId) {
    const device = await registerDeviceCryptoFlow('Web Browser');
    deviceId = device.id;
  }

  // Periodic check / top-up for pre-keys
  try {
    const countRes = await apiClient(`/api/auth/devices/keys/count/?device_id=${deviceId}`);
    if (countRes.ok) {
      const data = await countRes.json();
      if (data.remaining < 10) {
        const bundle = await KeyManager.generatePreKeyBundle(50);
        await apiJson('/api/auth/devices/keys/upload/', {
          method: 'POST',
          body: {
            device_id: deviceId,
            signed_pre_key: bundle.signedPreKey,
            one_time_pre_keys: bundle.oneTimePreKeys
          }
        });
      }
    }
  } catch (err) {
    console.warn('Prekey top-up check failed:', err);
  }
}
