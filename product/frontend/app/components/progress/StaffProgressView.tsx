"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProgressSummary } from "./ProgressSummary";
import { ParticipationList } from "./ParticipationList";
import { AddParticipationDialog } from "./AddParticipationDialog";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";

interface Progress {
  id: number;
  userId: string;
  committeeProgress: number;
  taskProgress: number;
  presenceProgress: number;
  totalProgress: number;
  updatedAt: string;
}

interface Metrics {
  committeeCount: number;
  taskCount: number;
  presenceCount: number;
  totalSessions: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    progress: Progress;
    metrics: Metrics;
    participations: any[]; // We'll type this properly when we have the participation data structure
  };
}

// Helper function to round to 2 decimal places
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

// Calculate progress based on the new requirements
const calculateProgress = (metrics: Metrics) => {
  // Committee: 100% if at least 1 participation (worth 25% of total)
  const committeeBase = metrics.committeeCount >= 1 ? 100 : 0;
  const committeeProgress = (committeeBase * 25) / 100;
  
  // Task: 100% if at least 1 completion (worth 25% of total)
  const taskBase = metrics.taskCount >= 1 ? 100 : 0;
  const taskProgress = (taskBase * 25) / 100;
  
  // Presence: Up to 100% based on attendance ratio (worth 50% of total)
  const presenceBase = roundToTwoDecimals((metrics.presenceCount / metrics.totalSessions) * 100);
  const presenceProgress = (presenceBase * 50) / 100;
  
  // Total progress is the sum of all components
  const totalProgress = roundToTwoDecimals(committeeProgress + taskProgress + presenceProgress);

  return {
    committee: committeeBase, // Return the base percentage (100% if done)
    task: taskBase, // Return the base percentage (100% if done)
    presence: presenceBase, // Return the base percentage (proportional to attendance)
    total: totalProgress // Return the weighted total (max 100%)
  };
};

export function StaffProgressView() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [participations, setParticipations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { authenticatedFetch } = useAuthenticatedApi();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch summary (progress, metrics, participations)
        const summaryRes = await authenticatedFetch("/api/progress/me/summary");
        
        // Fetch presence count from updated endpoint
        const presenceRes = await authenticatedFetch("/api/presence/me/count");
        
        // Fetch division-specific training count (new endpoint)
        const trainingCountRes = await authenticatedFetch("/api/trainings/count/all-divisions");

        console.log("Training count response:", trainingCountRes);
        console.log("Presence count response:", presenceRes);

        if (summaryRes?.success && presenceRes?.success) {
          const { metrics, participations } = summaryRes.data;
          setMetrics(metrics);
          
          // Mapping participations to match the ParticipationList component format
          const mappedParticipations = (participations || []).map((p: any) => ({
            id: String(p.id),
            title: p.details?.split('\n')[0] || p.eventType,
            type: p.eventType === 'COMMITTEE' ? 'committee' : p.eventType === 'TASK' ? 'assignment' : 'training',
            date: new Date(p.createdAt).toLocaleDateString(),
            status: p.status?.toLowerCase() || 'pending',
            description: p.details?.split('\n').slice(1).join(' ').trim() || '',
          }));
          setParticipations(mappedParticipations);
          
          // Get user's division training count from all-divisions response
          let userDivisionTrainingCount = 0;
          const userDivisionId = presenceRes.userDivisionId;
          
          if (trainingCountRes?.success && Array.isArray(trainingCountRes.divisionCounts)) {
            // Find the count for user's division
            const userDivisionData = trainingCountRes.divisionCounts.find(
              (div: any) => div.divisionId === userDivisionId
            );
            
            if (userDivisionData) {
              userDivisionTrainingCount = userDivisionData.count;
              console.log(`Found ${userDivisionTrainingCount} trainings for division ${userDivisionId}`);
            }
          }
          
          // Prioritize the division-specific training count from the training service
          // instead of using the presence service's count which might be outdated
          const totalSessions = userDivisionTrainingCount > 0 
            ? userDivisionTrainingCount 
            : (presenceRes.totalSessions > 0 ? presenceRes.totalSessions : 1);
            
          // Calculate presence progress percentage
          const presenceBar = totalSessions > 0 
            ? roundToTwoDecimals((presenceRes.count / totalSessions) * 100) 
            : 0;
          
          // Calculate total progress (25% committee + 25% task + 50% presence)
          const totalProgress =
            roundToTwoDecimals((metrics.committeeCount >= 1 ? 25 : 0) +
            (metrics.taskCount >= 1 ? 25 : 0) +
            (totalSessions > 0 ? (presenceRes.count / totalSessions) * 50 : 0));
          
          setProgress({
            committee: metrics.committeeCount >= 1 ? 100 : 0,
            task: metrics.taskCount >= 1 ? 100 : 0,
            presence: presenceBar,
            total: totalProgress,
          });
          
          // Update metrics with correct totalSessions
          setMetrics({
            ...metrics,
            presenceCount: presenceRes.count,
            totalSessions: totalSessions
          });
        } else {
          console.error("Failed to fetch progress data:", { 
            summarySuccess: summaryRes?.success, 
            presenceSuccess: presenceRes?.success,
            trainingCountSuccess: trainingCountRes?.success
          });
          setMetrics(null);
          setParticipations([]);
          setProgress(null);
        }
      } catch (e) {
        console.error("Error fetching progress data:", e);
        setMetrics(null);
        setParticipations([]);
        setProgress(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-white">Loading progress...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-[#1F1F1F]/30 rounded-2xl p-6 shadow-lg space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Progress Summary</h2>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#F97316] hover:bg-[#F97316]/90 transition-colors gap-2 rounded"
              >
                <Plus className="h-4 w-4" />
                Add Participation
              </Button>
            </div>
            {progress && metrics && (
              <ProgressSummary 
                progress={progress}
                metrics={metrics}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#1F1F1F]/30 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Requirements</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Committee</span>
                <span className="font-medium">Min. 1× (25%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Task</span>
                <span className="font-medium">Min. 1× (25%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Presence</span>
                <span className="font-medium">Full attendance (50%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Participation List */}
      <div className="bg-[#1F1F1F]/30 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-6">My Participations</h2>
        <ParticipationList participations={participations} />
      </div>

      {/* Add Participation Dialog */}
      <AddParticipationDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}