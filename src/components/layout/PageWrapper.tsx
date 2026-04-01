import React from 'react';
import { motion } from 'framer-motion';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const PageWrapper: React.FC<PageWrapperProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-6 ${className}`}
    >
      {children}
    </motion.div>
  );
};
