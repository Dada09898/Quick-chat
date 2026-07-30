import React from 'react';

interface AvatarProps {
  url?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'away' | 'dnd';
  className?: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const Avatar: React.FC<AvatarProps> = ({ url, name, size = 'md', status, className = '' }) => {
  const resolvedUrl = url && url.startsWith('/') ? `${BASE_URL}${url}` : url;

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    away: 'bg-yellow-500',
    dnd: 'bg-red-500'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {resolvedUrl ? (
        <img src={resolvedUrl} alt={name || 'Avatar'} className={`${sizeClasses[size]} rounded-full object-cover bg-gray-800`} loading="lazy" decoding="async" />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-indigo-600 flex items-center justify-center font-medium text-white`}>
          {getInitials(name)}
        </div>
      )}
      
      {status && (
        <span 
          className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-gray-950 ${statusColors[status]}`}
        />
      )}
    </div>
  );
};
