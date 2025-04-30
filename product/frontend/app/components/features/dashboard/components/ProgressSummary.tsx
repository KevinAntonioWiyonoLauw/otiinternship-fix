'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, GraduationCap } from 'lucide-react';

interface ProgressItemProps {
  label: string;
  progress: number;
  icon: React.ReactNode;
}

const ProgressItem: React.FC<ProgressItemProps> = ({ label, progress, icon }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <div className="text-primary-500">{icon}</div>
      <span className="text-sm text-gray-300">{label}</span>
      <span className="ml-auto text-sm font-medium text-white">{progress}%</span>
    </div>
    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-primary-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  </div>
);

const ProgressSummary: React.FC = () => {
  const progressData = [
    { label: 'Committee', progress: 25, icon: <Users size={18} /> },
    { label: 'Assignment', progress: 15, icon: <BookOpen size={18} /> },
    { label: 'Training', progress: 35, icon: <GraduationCap size={18} /> },
  ];

  return (
    <div className="bg-dark-800 rounded-2xl p-6 shadow-lg space-y-6">
      <h2 className="text-lg font-semibold text-white">Progress Summary</h2>
      <div className="space-y-4">
        {progressData.map((item) => (
          <ProgressItem
            key={item.label}
            label={item.label}
            progress={item.progress}
            icon={item.icon}
          />
        ))}
      </div>
    </div>
  );
};

export default ProgressSummary; 