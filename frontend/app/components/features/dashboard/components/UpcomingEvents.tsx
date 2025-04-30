'use client';

import React from 'react';
import { Calendar, Video, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'training';
}

const EventCard: React.FC<Event> = ({ title, date, time, type }) => {
  const icon = type === 'meeting' ? <Users size={18} /> : <Video size={18} />;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-dark-700 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-dark-600 transition-colors"
    >
      <div className="p-3 bg-dark-800 rounded-lg text-primary-500">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-white font-medium">{title}</h3>
        <p className="text-sm text-gray-400">
          <Calendar size={14} className="inline mr-1" />
          {date} • {time}
        </p>
      </div>
      <button className="px-3 py-1 text-sm text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors">
        Join
      </button>
    </motion.div>
  );
};

const UpcomingEvents: React.FC = () => {
  const events: Event[] = [
    {
      id: '1',
      title: 'Weekly Division Meeting',
      date: 'Today',
      time: '15:00',
      type: 'meeting',
    },
    {
      id: '2',
      title: 'Frontend Development Training',
      date: 'Tomorrow',
      time: '13:00',
      type: 'training',
    },
  ];

  return (
    <div className="bg-dark-800 rounded-2xl p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-white mb-4">Upcoming Events</h2>
      <div className="space-y-3">
        {events.map((event) => (
          <EventCard key={event.id} {...event} />
        ))}
      </div>
    </div>
  );
};

export default UpcomingEvents; 