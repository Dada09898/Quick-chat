import type { Transition } from 'framer-motion';

export const springPresets = {
  // Snappy, fast reactions (e.g., hover states, micro-interactions)
  fast: { type: 'spring', stiffness: 500, damping: 30, mass: 1 } as Transition,
  
  // Standard UI interactions (e.g., modals, drawers sliding in)
  normal: { type: 'spring', stiffness: 400, damping: 40, mass: 1 } as Transition,
  
  // Slightly looser for organic feels (e.g., messages popping in)
  bouncy: { type: 'spring', stiffness: 400, damping: 30, mass: 1 } as Transition,
  
  // Slower, used for large layout changes or emphasizing context
  slow: { type: 'spring', stiffness: 300, damping: 40, mass: 1 } as Transition,

  // Dedicated presets for specific components
  message: { type: 'spring', stiffness: 400, damping: 30, mass: 1 } as Transition,
  drawer: { type: 'spring', stiffness: 400, damping: 40, mass: 1 } as Transition,
  fab: { type: 'spring', stiffness: 300, damping: 20, mass: 1 } as Transition,
  accordion: { type: 'tween', duration: 0.2, ease: 'easeInOut' } as Transition, // Accordions often feel better with tween to prevent layout snapping
};
