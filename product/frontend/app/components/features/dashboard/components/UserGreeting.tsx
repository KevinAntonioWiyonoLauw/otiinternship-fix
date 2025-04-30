'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../components/ui/avatar';
import { format } from 'date-fns';

interface UserGreetingProps {
  userName: string;
  avatarUrl?: string;
}

const UserGreeting: React.FC<UserGreetingProps> = ({ userName, avatarUrl }) => {
  return (
    <div className="bg-dark-800 rounded-2xl p-6 shadow-lg">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-sm text-gray-400">
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary-500">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};

export default UserGreeting; 