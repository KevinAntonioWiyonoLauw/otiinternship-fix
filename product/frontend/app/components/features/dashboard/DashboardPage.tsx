'use client';

import React from 'react';
import UserGreeting from './components/UserGreeting';
import ProgressSummary from './components/ProgressSummary';
import UpcomingEvents from './components/UpcomingEvents';
import AspirasiPreview from './components/AspirasiPreview';
import QuickActions from './components/QuickActions';

const mockUser = {
  name: 'John Doe',
  avatarUrl: '/images/avatar.jpeg',
  isKadiv: true,
};

const mockAspirations = [
  {
    id: '1',
    message: 'We need more frontend development workshops',
    date: '2 hours ago',
    sender: 'Jane Smith',
  },
  {
    id: '2',
    message: 'Can we have a team building session next month?',
    date: '5 hours ago',
    sender: 'Mike Johnson',
  },
];

const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 mt-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <UserGreeting
              userName={mockUser.name}
              avatarUrl={mockUser.avatarUrl}
            />
            <ProgressSummary />
            <QuickActions isKadiv={mockUser.isKadiv} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <UpcomingEvents />
            <AspirasiPreview
              aspirations={mockAspirations}
              isKadiv={mockUser.isKadiv}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 