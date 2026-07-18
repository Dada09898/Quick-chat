export type Platform = 'web' | 'desktop' | 'mobile';

export class PlatformProvider {
  static get platform(): Platform {
    if ((window as any).__TAURI__) return 'desktop';
    if ((window as any)?.Capacitor?.isNativePlatform()) return 'mobile';
    return 'web';
  }

  static get isMobile(): boolean {
    return this.platform === 'mobile';
  }

  static get isDesktop(): boolean {
    return this.platform === 'desktop';
  }

  static get isWeb(): boolean {
    return this.platform === 'web';
  }

  static async init() {
    console.log(`Bootstrapping DualConnect for Platform: ${this.platform}`);
    if (this.isMobile) {
      await this.initMobile();
    } else if (this.isDesktop) {
      // Import and trigger DesktopIntegrations dynamically
      // await import('./DesktopIntegrations').then(m => m.DesktopIntegrations.init());
    }
  }

  private static async initMobile() {
    // 1. Background Blur (Privacy Screen)
    // import { App } from '@capacitor/app';
    const App = (window as any).Capacitor?.Plugins?.App;
    if (App) {
      App.addListener('appStateChange', (state: any) => {
        if (!state.isActive) {
          document.body.classList.add('blur-xl');
          document.body.style.pointerEvents = 'none';
        } else {
          document.body.classList.remove('blur-xl');
          document.body.style.pointerEvents = 'auto';
        }
      });
    }

    // 2. Jailbreak Detection
    // Utilizing a hypothetical community plugin
    const JailbreakDetector = (window as any).Capacitor?.Plugins?.JailbreakDetector;
    if (JailbreakDetector) {
      const isRooted = await JailbreakDetector.isJailbroken();
      if (isRooted.result) {
        console.error("CRITICAL: Device is Rooted/Jailbroken. Master Key extraction risk elevated.");
        // We might choose to forcefully terminate or present a massive warning
      }
    }

    // 3. Setup Push Notifications
    await this.setupPushNotifications();
  }

  private static async setupPushNotifications() {
    const PushNotifications = (window as any).Capacitor?.Plugins?.PushNotifications;
    if (!PushNotifications) return;

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    
    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
      
      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log("Push received:", notification);
        // Note: The notification payload here is ONLY metadata: { "chat_id": "123", "type": "NEW_MESSAGE" }
        // The React app wakes up, fetches the blind encrypted payload from Django, 
        // decrypts it locally with the Vault Master Key, and displays the UI safely.
      });
    }
  }

  static async triggerBiometricUnlock(): Promise<boolean> {
    const NativeBiometric = (window as any).Capacitor?.Plugins?.NativeBiometric;
    if (!NativeBiometric) return false;

    try {
      const result = await NativeBiometric.verifyIdentity({
        reason: "Unlock DualConnect Vault",
        title: "Biometric Auth"
      });
      return result.verified;
    } catch {
      return false;
    }
  }
}
