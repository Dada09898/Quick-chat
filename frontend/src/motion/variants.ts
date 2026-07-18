import type { Variants } from 'framer-motion';

export const interactionVariants = {
  button: {
    rest: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.97 }, // Very short duration press feedback
  } as Variants,
  icon: {
    rest: { scale: 1, opacity: 0.7 },
    hover: { scale: 1.1, opacity: 1 },
    tap: { scale: 0.9 },
  } as Variants,
};

export const layoutVariants = {
  messageIncoming: {
    initial: { opacity: 0, x: -10, y: 10, scale: 0.95 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
  } as Variants,
  
  messageOutgoing: {
    initial: { opacity: 0, x: 10, y: 10, scale: 0.95 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
  } as Variants,

  drawerRight: {
    initial: { width: 0, opacity: 0 },
    animate: { width: 320, opacity: 1 },
    exit: { width: 0, opacity: 0 }
  } as Variants,

  popoverMenu: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.95 }
  } as Variants,

  popoverAttachment: {
    initial: { opacity: 0, y: 20, scale: 0.8, originY: 1, originX: 0 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.8 }
  } as Variants,
};
