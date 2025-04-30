"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Loader2 } from "lucide-react";
import { getAuthToken } from "../../lib/auth";

interface Training {
  id: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  divisionId: number;
  participantCount: number;
}

interface TrainingSelectorProps {
  onSelect: (trainingId: string) => void;
  isLoading: boolean;
}

function formatTimeString(timeStr: string | null | undefined) {
  if (!timeStr) return null;
  // Jika sudah format HH:mm atau HH:mm:ss
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    return timeStr.slice(0, 5); // Ambil HH:mm
  }
  // Jika ISO string
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return format(date, 'HH:mm');
  }
  // Fallback
  return null;
}

export function TrainingSelector({ onSelect, isLoading }: TrainingSelectorProps) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTrainings = async () => {
      try {
        setIsFetching(true);
        const token = getAuthToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          throw new Error('NEXT_PUBLIC_API_URL environment variable is not set.');
        }
        const response = await fetch(`${apiUrl}/api/trainings/upcoming`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });

        if (!response.ok) {
          let errorMsg = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (e) {
            // response is not JSON
            errorMsg = await response.text();
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        let trainingsArr = [];
        if (Array.isArray(data)) {
          trainingsArr = data;
        } else if (Array.isArray(data.trainings)) {
          trainingsArr = data.trainings;
        } else {
          throw new Error('API response does not contain a trainings array.');
        }
        setTrainings(trainingsArr);
      } catch (error) {
        console.error("Error fetching trainings:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch upcoming trainings",
          variant: "error",
        });
        setTrainings([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchTrainings();
  }, [toast]);

  const handleSelect = (trainingId: string) => {
    setSelectedTraining(trainingId);
    onSelect(trainingId);
  };

  // Filter hanya pelatihan hari ini
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const todaysTrainings = trainings.filter(t =>
    new Date(t.date).toISOString().slice(0, 10) === todayStr
  );

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#FE7F00]" />
        <span className="ml-2">Loading trainings...</span>
      </div>
    );
  }

  if (todaysTrainings.length === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        No trainings found for today.
      </div>
    );
  }

  if (!process.env.NEXT_PUBLIC_API_URL) {
    return (
      <div className="text-center p-8 text-red-500">
        Error: <b>NEXT_PUBLIC_API_URL</b> environment variable is not set in your frontend. <br />
        Please set it in your <code>.env.local</code> file and restart the dev server.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Select Training</h2>
      <div className="grid gap-4">
        {todaysTrainings.map((training) => (
          <Card
            key={training.id}
            className={`p-6 mb-2 rounded-xl border border-white/10 bg-[#1F1F1F]/30 shadow-lg backdrop-blur-sm transition-all duration-200 cursor-pointer 
              ${selectedTraining === training.id.toString()
                ? "border-[#FE7F00] bg-[#2F2F2F]/60"
                : "hover:border-[#FE7F00] hover:bg-[#2F2F2F]/40"}
            `}
            onClick={() => handleSelect(training.id.toString())}
          >
            <div className="space-y-2">
              <h3 className="font-medium text-lg text-white">{training.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(training.date), "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTimeString(training.start_time) || '-'}{" - " }{formatTimeString(training.end_time) || '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>{training.location}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 