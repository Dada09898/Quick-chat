import { PluginManifest, WorkerMessage, HostMessage, PluginPermission } from './types';

class PluginInstance {
  worker: Worker;
  manifest: PluginManifest;

  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
    // Create a blob URL to strictly sandbox the worker execution
    // In production, this would fetch the remote entrypoint, validate its signature, 
    // and then instantiate it as a blob to bypass some CORS and lock down origins.
    const blob = new Blob([`importScripts('${manifest.entrypoint}');`], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = this.handleMessage.bind(this);
    
    // Initialize Plugin
    this.sendMessage({ type: 'INIT', payload: manifest });
  }

  private handleMessage(event: MessageEvent<WorkerMessage>) {
    const msg = event.data;
    
    if (msg.type === 'RPC_CALL') {
      this.handleRPC(msg);
    } else if (msg.type === 'UI_UPDATE') {
      // Dispatch UI update event to the React Renderer
      window.dispatchEvent(new CustomEvent(`plugin:ui:${this.manifest.id}`, { detail: msg.payload }));
    }
  }

  private async handleRPC(msg: WorkerMessage) {
    const { method, args, callId } = msg;
    
    try {
      this.checkPermissionForMethod(method!);
      const result = await this.executeMethod(method!, args || []);
      
      this.sendMessage({ type: 'RPC_RESPONSE', callId, payload: { success: true, result } });
    } catch (e: any) {
      console.error(`Plugin ${this.manifest.id} RPC Error:`, e.message);
      this.sendMessage({ type: 'RPC_RESPONSE', callId, payload: { success: false, error: e.message } });
    }
  }

  private checkPermissionForMethod(method: string) {
    const methodToPermission: Record<string, PluginPermission> = {
      'dualconnect.messaging.getCurrentChat': 'read:chat:current',
      'dualconnect.vault.readItem': 'read:vault:selected',
      'dualconnect.notifications.show': 'write:notification',
      'dualconnect.ui.addSidebarPanel': 'ui:sidebar'
    };

    const required = methodToPermission[method];
    if (required && !this.manifest.permissions.includes(required)) {
      // Force kill the worker on privilege escalation attempt
      this.terminate();
      throw new Error(`CRITICAL: Unauthorized RPC call. Worker terminated. Missing permission: ${required}`);
    }
  }

  private async executeMethod(method: string, args: any[]): Promise<any> {
    // Scaffold routing to actual stores (chatStore, vaultStore, etc)
    if (method === 'dualconnect.notifications.show') {
      // e.g. toast(args[0].title)
      return true;
    }
    if (method === 'dualconnect.vault.readItem') {
      // Returns decrypted plaintext strictly matching the allowed ID
      return { id: args[0], content: "Mock decrypted data" };
    }
    throw new Error("Method not implemented in Host SDK.");
  }

  private sendMessage(msg: HostMessage) {
    this.worker.postMessage(msg);
  }

  terminate() {
    this.worker.terminate();
  }
}

export class PluginManagerHost {
  private plugins: Map<string, PluginInstance> = new Map();

  loadPlugin(manifest: PluginManifest) {
    if (this.plugins.has(manifest.id)) return; // Already loaded
    
    // In a real app, prompt the user for permission validation here before loading
    const instance = new PluginInstance(manifest);
    this.plugins.set(manifest.id, instance);
  }

  unloadPlugin(id: string) {
    const instance = this.plugins.get(id);
    if (instance) {
      instance.terminate();
      this.plugins.delete(id);
    }
  }
}

export const globalPluginHost = new PluginManagerHost();
