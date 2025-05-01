"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "../../context/AuthContext";
import { Presence } from "../../types/presence";
import { getAuthToken } from "../../lib/auth";
import Aurora from "@/components/effects/Aurora";
import { useRouter } from "next/navigation";

interface TrainingInfo {
  id: number;
  title: string;
}

export default function PresenceHistoryPage() {
  const [presenceHistory, setPresenceHistory] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<TrainingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (user) {
      // Contoh: jika ingin redirect ke halaman khusus
      // if (user.roles?.some(r => r.role === 'KADIV')) router.replace("/presence/history/kadiv");
      // else router.replace("/presence/history/staff");
      // Jika tidak, biarkan di halaman ini
    }
  }, [user, router]);

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchPresenceHistory(), fetchTrainings()]);
    setIsLoading(false);
  };

  const fetchPresenceHistory = async () => {
    try {
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6969';
      const response = await fetch(`${apiUrl}/api/presence/history`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch presence history");
      const data = await response.json();
      setPresenceHistory(data.attendance_history || []);
    } catch (error) {
      console.error("Error fetching presence history:", error);
      toast({
        title: "Error",
        description: "Failed to fetch presence history",
        variant: "error",
      });
    }
  };

  const fetchTrainings = async () => {
    try {
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6969';
      const response = await fetch(`${apiUrl}/api/trainings/upcoming`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch trainings");
      const data = await response.json();
      setTrainings(data.trainings || data);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      if (user && user.roles && user.roles.some((r: any) => r.role === 'KADIV')) {
        toast({
          title: "Error",
          description: "Failed to fetch trainings",
          variant: "error",
        });
      }
    }
  };

  const getTrainingTitle = (id: number) => {
    const found = trainings.find((t) => t.id === id);
    return found ? found.title : `ID: ${id}`;
  };

  if (!user || !user.roles || user.roles.length === 0) {
    return <div className="flex items-center justify-center min-h-screen text-white text-lg">Memuat data pengguna...</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1F1F1F] text-white p-4 md:p-6 relative">
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div className="w-full h-full" style={{ transform: 'scale(1.2)', transition: 'transform 0.3s ease-out' }}>
            <Aurora
              colorStops={["#FE7F00", "#FFFFFF", "#FE7F00"]}
              blend={0.3}
              amplitude={1.0}
              speed={0.2}
            />
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto relative z-10">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#1F1F1F] text-white p-4 md:p-6 relative">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="w-full h-full" style={{ transform: 'scale(1.2)', transition: 'transform 0.3s ease-out' }}>
          <Aurora
            colorStops={["#FE7F00", "#FFFFFF", "#FE7F00"]}
            blend={0.3}
            amplitude={1.0}
            speed={0.2}
          />
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto relative z-10">
        <h1 className="text-2xl font-bold mb-6">My Presence History</h1>

        <Card className="p-6 bg-dark-800/30 backdrop-blur-md border border-white/10">
          <div className="space-y-4">
            {presenceHistory.length === 0 ? (
              <p className="text-center text-gray-400">No presence records found</p>
            ) : (
              presenceHistory.map((presence) => (
                <div
                  key={presence.id}
                  className="flex items-center justify-between p-4 bg-dark-700 rounded-md"
                >
                  <div>
                    <p className="font-medium">
                      Training: {getTrainingTitle((presence as any).trainingId ?? presence.training_id)}
                    </p>
                    <p className="text-sm text-gray-400">
                      Type: {(presence as any).presenceType ?? presence.presence_type}
                    </p>
                    <p className="text-sm text-gray-400">
                      User: {user?.namaLengkap ?? '-'}
                    </p>
                    <p className="text-sm text-gray-400">
                      Time: {new Date(presence.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm ${
                      presence.status === "present"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {presence.status ?? '-'}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </main>
  );
} 