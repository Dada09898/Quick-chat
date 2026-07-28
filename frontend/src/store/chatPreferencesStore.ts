import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatPreferences {
  wallpaper: string;
  wallpaperColor: string;
  accentColor: string;
  fontSize: string;
  compactMode: boolean;
}

interface ChatPreferencesState extends ChatPreferences {
  setWallpaper: (wallpaper: string, color: string) => void;
  setAccentColor: (color: string) => void;
  setFontSize: (size: string) => void;
  setCompactMode: (compact: boolean) => void;
}

export const useChatPreferencesStore = create<ChatPreferencesState>()(
  persist(
    (set) => ({
      wallpaper: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
      wallpaperColor: '#0b141a',
      accentColor: '#00a884',
      fontSize: '15px',
      compactMode: false,

      setWallpaper: (wallpaper, color) => set({ wallpaper, wallpaperColor: color }),
      setAccentColor: (color) => set({ accentColor: color }),
      setFontSize: (size) => set({ fontSize: size }),
      setCompactMode: (compact) => set({ compactMode: compact }),
    }),
    {
      name: 'quick-chat-preferences',
    }
  )
);
