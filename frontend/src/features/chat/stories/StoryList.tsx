import React, { useState, useEffect } from 'react';
import { useStoryStore, type Story } from '../../../store/storyStore';
import { useAuthStore } from '../../../store/authStore';
import { StoryRing } from './StoryRing';
import { StoryViewer } from './StoryViewer';
import { AnimatePresence } from 'framer-motion';

export const StoryList: React.FC = () => {
  const { storiesByUser, fetchStories } = useStoryStore();
  const currentUser = useAuthStore(state => state.user);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  if (!currentUser) return null;

  const currentUserId = currentUser.id;
  const currentUserStories = storiesByUser[currentUserId] || [];

  // Get other users who have stories
  const otherUserIds = Object.keys(storiesByUser).filter(id => id !== currentUserId && storiesByUser[id].length > 0);

  const handleOpenViewer = (userId: string) => {
    setSelectedUser(userId);
  };

  const handleCloseViewer = () => {
    setSelectedUser(null);
  };

  return (
    <div className="py-4 border-b border-gray-800/50 bg-gray-900/20 backdrop-blur-sm">
      <div className="flex space-x-4 overflow-x-auto px-4 pb-2 scrollbar-hide">

        {/* Current User Ring */}
        <StoryRing
          userId={currentUserId}
          userEmail={currentUser.email}
          userDisplayName={currentUser.display_name}
          stories={currentUserStories}
          onClick={() => handleOpenViewer(currentUserId)}
          isCurrentUser={true}
        />

        {/* Other Users Rings */}
        {otherUserIds.map(userId => {
          const userStories = storiesByUser[userId];
          const firstStory = userStories[0];
          return (
            <StoryRing
              key={userId}
              userId={userId}
              userEmail={firstStory.author.email}
              userDisplayName={firstStory.author.display_name}
              stories={userStories}
              onClick={() => handleOpenViewer(userId)}
            />
          );
        })}

      </div>

      <AnimatePresence>
        {selectedUser && storiesByUser[selectedUser]?.length > 0 && (
          <StoryViewer
            stories={storiesByUser[selectedUser]}
            onClose={handleCloseViewer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
