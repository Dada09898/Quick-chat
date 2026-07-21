import { create } from 'zustand';
import { apiClient, apiJson } from '../lib/api';

export type Story = {
  id: string;
  author: {
    id: string;
    email: string;
    display_name?: string;
  };
  media?: any;
  ciphertext: string;
  nonce: string;
  signature: string;
  key_version: number;
  algorithm: string;
  background_color?: string;
  expires_at: string;
  created_at: string;
  viewers_count: number;
}

interface StoryStore {
  storiesByUser: Record<string, Story[]>;
  isLoading: boolean;
  fetchStories: () => Promise<void>;
  addStory: (story: Story) => void;
  markViewed: (storyId: string) => Promise<void>;
}

export const useStoryStore = create<StoryStore>((set, get) => ({
  storiesByUser: {},
  isLoading: false,

  fetchStories: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient('/api/chat/stories/');
      const data = await response.json();

      const grouped: Record<string, Story[]> = {};
      data.forEach((story: Story) => {
        const authorId = story.author.id;
        if (!grouped[authorId]) {
          grouped[authorId] = [];
        }
        grouped[authorId].push(story);
      });

      // Sort stories for each user by creation date
      Object.keys(grouped).forEach(userId => {
        grouped[userId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      set({ storiesByUser: grouped, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch stories', error);
      set({ isLoading: false });
    }
  },

  addStory: (story: Story) => {
    set((state) => {
      const authorId = story.author.id;
      const userStories = state.storiesByUser[authorId] ? [...state.storiesByUser[authorId]] : [];

      // Avoid duplicates
      if (!userStories.find(s => s.id === story.id)) {
        userStories.push(story);
      }

      return {
        storiesByUser: {
          ...state.storiesByUser,
          [authorId]: userStories
        }
      };
    });
  },

  markViewed: async (storyId: string) => {
    try {
      await apiJson(`/api/chat/stories/${storyId}/view/`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark story as viewed', error);
    }
  }
}));
