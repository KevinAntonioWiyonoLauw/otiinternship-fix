'use client';

import React, { useState, useEffect } from 'react';
import Aurora from '../components/effects/Aurora';
import { BarChart3, Users, Calendar, Clock, ListChecks, MessageSquare } from 'lucide-react';
import DashboardSkeleton from '@/components/molecules/DashboardSkeleton';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

// Mock data types (replace with actual types from API)
interface ProgressData {
  overallCompletion: number;
}
interface DivisionData {
  activeMembers: number;
}
interface ScheduleData {
  upcomingEvents: number;
}
interface PresenceData {
  workedHoursThisWeek: number;
}
interface RecentActivity {
  id: string;
  title: string;
  timestamp: string; // Or Date object
}
interface UpcomingTask {
  id: string;
  title: string;
  deadline: string; // Or Date object
}

const DashboardPage = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // State for fetched data (initialize with null or default values)
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [divisionData, setDivisionData] = useState<DivisionData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [presenceData, setPresenceData] = useState<PresenceData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return; // Don't fetch if user is not loaded

      setIsLoading(true);
      try {
        // --- TODO: Replace mock fetching with actual API calls --- 
        // Example API calls (adjust endpoints as needed)
        // const progressRes = await fetch('/api/progress/summary');
        // setProgressData(await progressRes.json());

        // const divisionRes = await fetch('/api/divisions/summary'); // Or based on user's division
        // setDivisionData(await divisionRes.json());

        // const scheduleRes = await fetch('/api/schedule/summary');
        // setScheduleData(await scheduleRes.json());

        // const presenceRes = await fetch('/api/presence/summary');
        // setPresenceData(await presenceRes.json());

        // const activityRes = await fetch('/api/activity/recent');
        // setRecentActivity(await activityRes.json());

        // const tasksRes = await fetch('/api/tasks/upcoming');
        // setUpcomingTasks(await tasksRes.json());

        // Mock data for now:
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        setProgressData({ overallCompletion: 75 });
        setDivisionData({ activeMembers: 12 });
        setScheduleData({ upcomingEvents: 5 });
        setPresenceData({ workedHoursThisWeek: 24.5 });
        setRecentActivity([
          { id: '1', title: 'Submitted weekly report', timestamp: '2 hours ago' },
          { id: '2', title: 'Attended team meeting', timestamp: '4 hours ago' },
          { id: '3', title: 'Completed frontend task', timestamp: 'Yesterday' },
        ]);
        setUpcomingTasks([
          { id: '1', title: 'Review project documentation', deadline: 'Today, 5 PM' },
          { id: '2', title: 'Team sync meeting', deadline: 'Tomorrow, 10 AM' },
          { id: '3', title: 'Submit progress report', deadline: 'Friday' },
        ]);
        // --- End of Mock Data ---

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        // Optionally show a toast notification for errors
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]); // Re-fetch if user changes

  // Show skeleton while auth is loading or initial data fetch is happening
  if (authLoading || isLoading) {
    return <DashboardSkeleton />;
  }

  // Handle case where user is somehow null after loading (e.g., auth failed silently)
  if (!user) {
     // Optional: Redirect to login or show an error message
     return <div>Error loading user data. Please try logging in again.</div>;
  }

  const firstName = user.namaLengkap?.split(' ')[0] || 'Intern';

  return (
    <div className="relative min-h-screen p-6 bg-dark-900">
      {/* Content */}
      <div className="relative z-10 space-y-6 mt-8">
        {/* Welcome Section */}
        <div className="bg-dark-800/30 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {firstName}! 👋</h1>
          <p className="text-gray-200">Here's what's happening with your internship today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Progress Card */}
          <Link href="/progress" className="block hover:no-underline">
            <div className="bg-dark-800/30 backdrop-blur-md rounded-xl p-6 border border-white/10 h-full
              hover:bg-dark-700/40 transition-all duration-300 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-gray-200 text-sm">Progress</span>
                  <div className="text-2xl font-bold text-white mt-1">{progressData?.overallCompletion ?? 'N/A'}%</div>
                  <span className="text-gray-200 text-sm">Overall completion</span>
                </div>
                <BarChart3 className="text-orange-500 w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Division/Committee Card (Example - adjust based on actual data) */}
          {/* Link might go to a division page or user list if KADIV */}
          <div className="bg-dark-800/30 backdrop-blur-md rounded-xl p-6 border border-white/10 h-full
              hover:bg-dark-700/40 transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-gray-200 text-sm">{hasRole('KADIV') ? 'Total Interns' : 'Division Members'}</span>
                <div className="text-2xl font-bold text-white mt-1">{divisionData?.activeMembers ?? 'N/A'}</div>
                <span className="text-gray-200 text-sm">Active members</span>
              </div>
              <Users className="text-orange-500 w-6 h-6 group-hover:scale-110 transition-transform" />
            </div>
          </div>

          {/* Schedule/Events Card */}
          <Link href="/schedule" className="block hover:no-underline">
            <div className="bg-dark-800/30 backdrop-blur-md rounded-xl p-6 border border-white/10 h-full
                hover:bg-dark-700/40 transition-all duration-300 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-gray-200 text-sm">Schedule</span>
                  <div className="text-2xl font-bold text-white mt-1">{scheduleData?.upcomingEvents ?? 'N/A'}</div>
                  <span className="text-gray-200 text-sm">Upcoming this week</span>
                </div>
                <Calendar className="text-orange-500 w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Presence/Hours Card */}
          <Link href="/presence" className="block hover:no-underline">
            <div className="bg-dark-800/30 backdrop-blur-md rounded-xl p-6 border border-white/10 h-full
                hover:bg-dark-700/40 transition-all duration-300 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-gray-200 text-sm">Presence</span>
                  <div className="text-2xl font-bold text-white mt-1">{presenceData?.workedHoursThisWeek ?? 'N/A'}</div>
                  <span className="text-gray-200 text-sm">Hours worked this week</span>
                </div>
                <Clock className="text-orange-500 w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
        

        {/* Optional: Link to Aspirasi */}
        <div className="bg-dark-800/30 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <Link href="/aspirasi" className="flex items-center justify-between group">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1 group-hover:text-orange-500 transition-colors">Aspirasi</h2>
              <p className="text-gray-300 text-sm">Share your feedback and suggestions.</p>
            </div>
            <MessageSquare className="text-orange-500 w-6 h-6 group-hover:scale-110 transition-transform" />
          </Link>
        </div>

      </div>
      {/* Aurora Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Aurora
            colorStops={["#FE7F00", "#FFFFFF", "#FE7F00"]}
            blend={0.3}
            amplitude={1.0}
            speed={0.2}
        />
      </div>
    </div>
  );
};

export default DashboardPage;