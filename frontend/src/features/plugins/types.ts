export type PluginPermission = 
  | 'read:chat:current'
  | 'read:vault:selected'
  | 'write:notification'
  | 'ui:sidebar'
  | 'ui:context_menu';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: PluginPermission[];
  entrypoint: string; // URL to the Web Worker script
}

export type UIElementType = 'button' | 'text' | 'input' | 'list';

export interface UIElement {
  type: UIElementType;
  id: string;
  props: Record<string, any>;
  children?: UIElement[];
}

// Messages from Host -> Worker
export interface HostMessage {
  type: 'INIT' | 'RPC_RESPONSE' | 'EVENT';
  payload?: any;
  callId?: string;
}

// Messages from Worker -> Host
export interface WorkerMessage {
  type: 'RPC_CALL' | 'UI_UPDATE';
  method?: string; // e.g., 'dualconnect.messaging.getCurrentChat'
  args?: any[];
  payload?: any; // e.g., Declarative UI schema
  callId?: string;
}
