import { useChatStore } from './chatStore';

export class NotificationManager {
  static quietHoursStart = 22; // 10 PM
  static quietHoursEnd = 7; // 7 AM

  static isQuietHours(): boolean {
    const hour = new Date().getHours();
    return hour >= this.quietHoursStart || hour < this.quietHoursEnd;
  }

  static async notifyNewMessage(title: string, body: string) {
    if (this.isQuietHours()) return;

    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo192.png' });
      
      // Play sound
      try {
        const audio = new Audio('/notification.mp3');
        await audio.play();
      } catch (e) {
        console.log("Audio play blocked by browser policy");
      }
    }
  }

  static updateBadgeCount() {
    if ('setAppBadge' in navigator) {
      // Get unread count from state (mocking logic here)
      const unreadCount = 1; // Real app would sum unread messages
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch(console.error);
      } else {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    }
  }

  static async requestPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  }
}
