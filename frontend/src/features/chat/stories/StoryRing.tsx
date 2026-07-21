import React from 'react';
import type { Story } from '../../../store/storyStore';

interface StoryRingProps {
  userId: string;
  userEmail: string;
  userDisplayName?: string;
  stories: Story[];
  onClick: () => void;
  isCurrentUser?: boolean;
}

export const StoryRing: React.FC<StoryRingProps> = ({
  userEmail,
  userDisplayName,
  stories,
  onClick,
  isCurrentUser
}) => {
  // A simple representation of user avatar
  const initials = (userDisplayName || userEmail).substring(0, 2).toUpperCase();

  // Assuming unread logic would be here. For now, if stories > 0, show ring.
  const hasStories = stories.length > 0;

  return (
    <div className="flex flex-col items-center space-y-1 cursor-pointer w-16" onClick={onClick}>
      <div className={`relative p-[2px] rounded-full ${hasStories ? 'bg-gradient-to-tr from-cyan-400 to-blue-500' : 'bg-gray-700'}`}>
        <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center border-2 border-background overflow-hidden">
          <span className="text-gray-300 font-medium text-sm">{initials}</span>
        </div>
        {isCurrentUser && (
          <div className="absolute bottom-0 right-0 bg-cyan-500 rounded-full w-5 h-5 flex items-center justify-center border-2 border-background text-white text-xs font-bold shadow-sm">
            +
          </div>
        )}
      </div>
      <span className="text-xs text-gray-400 truncate w-full text-center">
        {isCurrentUser ? 'Your Story' : (userDisplayName || userEmail.split('@')[0])}
      </span>
    </div>
  );
};
