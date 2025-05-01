'use client';

import React from 'react';
import { Plus, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  isKadiv?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ isKadiv }) => {
  return (
    <div className="bg-dark-800 rounded-2xl p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="flex items-center justify-center gap-2"
          onClick={() => {}}
        >
          <Plus size={18} />
          New Meeting
        </Button>
        
        <Button
          variant="outline"
          className="flex items-center justify-center gap-2"
          onClick={() => {}}
        >
          <MessageSquare size={18} />
          Submit Aspirasi
        </Button>

        {isKadiv && (
          <Button
            variant="outline"
            className="flex items-center justify-center gap-2"
            onClick={() => {}}
          >
            <Sparkles size={18} />
            Generate Training
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuickActions;