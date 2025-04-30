"use client";

import { Trophy, Users, BookOpen, Clock } from "lucide-react";

interface ProgressSummaryProps {
  progress: {
    committee: number;
    task: number;
    presence: number;
    total: number;
  };
  metrics: {
    committeeCount: number;
    taskCount: number;
    presenceCount: number;
    totalSessions: number;
  };
}

// Helper function to round to 2 decimal places
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export function ProgressSummary({ progress, metrics }: ProgressSummaryProps) {
  const categories = [
    {
      name: "Committee",
      value: roundToTwoDecimals(progress.committee),
      count: metrics.committeeCount,
      icon: Users,
      color: "bg-blue-500",
      description: "Participation in organizational activities"
    },
    {
      name: "Task",
      value: roundToTwoDecimals(progress.task),
      count: metrics.taskCount,
      icon: BookOpen,
      color: "bg-green-500",
      description: "Completion of assigned tasks and projects"
    },
    {
      name: "Presence",
      value: roundToTwoDecimals(progress.presence),
      count: metrics.presenceCount,
      icon: Clock,
      color: "bg-[#F97316]",
      description: "Attendance in sessions and meetings"
    }
  ];

  // Round total progress
  const roundedTotal = roundToTwoDecimals(progress.total);

  return (
    <div className="space-y-6">
      {/* Total Progress */}
      <div className="flex items-center gap-4 p-4 bg-[#F97316]/10 rounded-xl">
        <div className="p-3 bg-[#F97316]/20 rounded-lg">
          <Trophy className="h-6 w-6 text-[#F97316]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Total Progress</h3>
            <span className="text-[#F97316] font-semibold">{roundedTotal}%</span>
          </div>
          <div className="h-2 bg-[#F97316]/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F97316] transition-all duration-500 ease-out rounded-full"
              style={{ width: `${roundedTotal}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Progress */}
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <category.icon className="h-4 w-4 text-gray-400" />
                <span>{category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">
                  {category.name === "Presence" 
                    ? `${category.count}/${metrics.totalSessions}`
                    : category.count
                  }
                </span>
                <span className="font-medium">{category.value}%</span>
              </div>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${category.color} transition-all duration-500 ease-out rounded-full`}
                style={{ width: `${category.value}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{category.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}