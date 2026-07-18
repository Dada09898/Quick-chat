import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'circular' | 'rectangular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const baseClass = 'bg-[#2a3942]';
  const variantClass = {
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    text: 'rounded-sm',
  }[variant];

  // We use a subtle opacity pulse instead of a heavy CSS shimmer to save GPU/CPU cycles
  return (
    <motion.div
      className={`${baseClass} ${variantClass} ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut'
      }}
    />
  );
};
