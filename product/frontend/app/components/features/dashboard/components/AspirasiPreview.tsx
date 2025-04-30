'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

interface Aspirasi {
  id: string;
  message: string;
  date: string;
  sender: string;
}

interface AspirasiPreviewProps {
  aspirations: Aspirasi[];
  isKadiv?: boolean;
}

const AspirasiPreview: React.FC<AspirasiPreviewProps> = ({ aspirations, isKadiv }) => {
  if (!aspirations.length) {
    return null;
  }

  return (
    <div className="bg-dark-800 rounded-2xl p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-white mb-4">
        {isKadiv ? 'Recent Aspirations' : 'Your Aspirations'}
      </h2>
      <div className="space-y-4">
        {aspirations.map((aspirasi) => (
          <div
            key={aspirasi.id}
            className="bg-dark-700 rounded-xl p-4 hover:bg-dark-600 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                <MessageSquare size={16} />
              </div>
              <div className="flex-1">
                <p className="text-gray-300 text-sm">{aspirasi.message}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{aspirasi.date}</span>
                  {isKadiv && (
                    <span className="text-xs text-primary-500">
                      From: {aspirasi.sender}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AspirasiPreview; 