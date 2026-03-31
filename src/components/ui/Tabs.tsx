import React from 'react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`relative flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md
            transition-colors duration-150 cursor-pointer z-10
            ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-200'}
          `}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 bg-white rounded-md"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
};

interface TabContentProps {
  children: React.ReactNode;
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ children, className = '' }) => {
  return <div className={className}>{children}</div>;
};
