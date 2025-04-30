"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, BookOpen, GraduationCap } from "lucide-react";

interface DivisionStatsProps {
  stats: {
    averageProgress: number;
    categoryStats: {
      committee: number;
      assignment: number;
      training: number;
    };
  };
}

// Helper function to round to 2 decimal places
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export function DivisionStats({ stats }: DivisionStatsProps) {
  const roundedAvgProgress = roundToTwoDecimals(stats.averageProgress);
  
  const categories = [
    {
      name: "Committee",
      value: roundToTwoDecimals(stats.categoryStats.committee),
      icon: Users,
      color: "bg-blue-500",
    },
    {
      name: "Assignment",
      value: roundToTwoDecimals(stats.categoryStats.assignment),
      icon: BookOpen,
      color: "bg-green-500",
    },
    {
      name: "Training",
      value: roundToTwoDecimals(stats.categoryStats.training),
      icon: GraduationCap,
      color: "bg-[#F97316]",
    },
  ];

  const renderProgressBar = (progress: number, color: string) => (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500 ease-out rounded-full`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="bg-card border-gray-800">
        <CardHeader>
          <CardTitle>Division Progress</CardTitle>
          <CardDescription>Overall progress across all categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Average Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Average Progress</span>
              <span className="font-medium">{roundedAvgProgress}%</span>
            </div>
            {renderProgressBar(roundedAvgProgress, "bg-[#F97316]")}
          </div>

          {/* Category Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.name} className="space-y-2">
                <div className="flex items-center gap-2">
                  <category.icon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{category.name}</span>
                </div>
                {renderProgressBar(category.value, category.color)}
                <span className="text-xs text-gray-400">{category.value}% completed</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}