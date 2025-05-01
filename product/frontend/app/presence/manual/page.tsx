"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "../../context/AuthContext";
import { TrainingPresence } from "../../types/presence";
import { getAuthToken } from "../../lib/auth";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, addHours } from "date-fns";
import Aurora from "@/components/effects/Aurora";
import { useRouter } from "next/navigation";

// Function to format time string (handle format HH:mm or ISO string)
function formatTimeString(timeStr: string | null | undefined) {
  if (!timeStr) return "-";
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) return timeStr.slice(0, 5);
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) return date.toISOString().slice(11, 16);
  return "-";
}

// Function to convert UTC time to UTC+7 (WIB)
function toWIBTime(date: Date): Date {
  return addHours(date, 7);
}

// Function to add hours to a time string (HH:mm)
function addHoursToTimeString(timeStr: string | null | undefined, hoursToAdd: number): string {
  if (!timeStr || timeStr === "-") return "-";
  
  // Convert time string to Date object for calculation
  let hours: number;
  let minutes: number;
  
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    // Format is HH:mm or HH:mm:ss
    const [h, m] = timeStr.split(':').map(Number);
    hours = h;
    minutes = m;
  } else {
    // Try to parse as ISO date string
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      hours = date.getUTCHours();
      minutes = date.getUTCMinutes();
    } else {
      return "-";
    }
  }
  
  // Add hours
  hours = (hours + hoursToAdd) % 24;
  
  // Format back to HH:mm
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Function to format time with WIB label and convert from UTC to UTC+7
function formatTimeWithWIB(time: string | null | undefined): string {
  // Convert time string from UTC to UTC+7
  const wibTime = addHoursToTimeString(time, 7);
  return wibTime !== "-" ? `${wibTime} WIB` : "-";
}

export default function ManualPresencePage() {
  const [trainings, setTrainings] = useState<TrainingPresence[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successStates, setSuccessStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});
  const { user, hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [participantStatus, setParticipantStatus] = useState<string | null>(null);
  const [participantsWithUser, setParticipantsWithUser] = useState<any[]>([]);
  const router = useRouter();

  const selectedTrainingData = trainings.find(t => String(t.id) === String(selectedTraining));
  const selectedParticipantData = participantsWithUser.find(p => String(p.id) === String(selectedParticipant));

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    if (selectedTraining) {
      const fetchDetailAndUsers = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6969';
          const token = getAuthToken();
          const res = await fetch(`${apiUrl}/api/trainings/${selectedTraining}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.message || 'Failed to fetch training detail');
          const participants = data.training.participants || [];
          // Fetch user data for each participant from auth service
          const users = await Promise.all(participants.map(async (p: any) => {
            try {
              const userRes = await fetch(`${apiUrl}/api/users/${p.userId}`, {
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
              });
              const userData = await userRes.json();
              console.log('Fetched user:', userData.user);
              if (!userData.success) {
                console.error(`Failed to fetch user data for userId ${p.userId}:`, userData.message);
                return {
                  ...p,
                  user: { namaLengkap: `User ${p.userId}`, nama_lengkap: `User ${p.userId}`, name: `User ${p.userId}`, roles: [] },
                };
              }
              return {
                ...p,
                user: userData.user || { namaLengkap: `User ${p.userId}`, nama_lengkap: `User ${p.userId}`, name: `User ${p.userId}`, roles: [] },
              };
            } catch (error) {
              console.error(`Error fetching user data for userId ${p.userId}:`, error);
              return {
                ...p,
                user: { namaLengkap: `User ${p.userId}`, nama_lengkap: `User ${p.userId}`, name: `User ${p.userId}`, roles: [] },
              };
            }
          }));
          // Filter hanya user yang bukan Kadiv
          const filteredUsers = users.filter(u => !u.user.roles?.some((r: any) => r.role === 'KADIV'));
          setParticipantsWithUser(filteredUsers);
        } catch (err) {
          console.error('Error fetching training detail:', err);
          setParticipantsWithUser([]);
        }
      };
      fetchDetailAndUsers();
    } else {
      setParticipantsWithUser([]);
    }
  }, [selectedTraining]);

  useEffect(() => {
    if (selectedTrainingData && selectedParticipant) {
      const participant = selectedTrainingData.participants.find(p => String(p.id) === String(selectedParticipant));
      setParticipantStatus(participant ? participant.status : null);
    } else {
      setParticipantStatus(null);
    }
  }, [selectedTrainingData, selectedParticipant]);

  useEffect(() => {
    if (user && !hasRole('KADIV')) {
      router.replace('/'); // Atau halaman lain yang sesuai
    }
  }, [user, hasRole, router]);

  const fetchTrainings = async () => {
    try {
      // Get the API URL from environment variable
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6969';
      
      // Get auth token from auth library
      const token = getAuthToken();
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const response = await fetch(`${apiUrl}/api/trainings/upcoming`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch trainings");
      }

      const data = await response.json();
      setTrainings(data.trainings || data);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch trainings",
        variant: "error",
      });
    }
  };

  const markPresence = async (participantId: string) => {
    try {
      setIsLoading(true);
      setSuccessStates(prev => ({ ...prev, [participantId]: false }));
      setErrorStates(prev => ({ ...prev, [participantId]: false }));
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6969';
      const token = getAuthToken();
      const response = await fetch(`${apiUrl}/api/presence/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          training_id: selectedTraining,
          user_id: participantId
        }),
        credentials: "include",
      });

      if (!response.ok) {
        let errorMsg = "Failed to mark presence";
        try {
          const errJson = await response.json();
          errorMsg = errJson.message || errorMsg;
          console.error('Presence API error:', errJson);
        } catch (e) {
          // ignore
        }
        setErrorStates(prev => ({ ...prev, [participantId]: true }));
        throw new Error(errorMsg);
      }

      setSuccessStates(prev => ({ ...prev, [participantId]: true }));
      toast({
        title: "Success",
        description: "Presence marked successfully",
        variant: "success",
      });

      // Reset success state after 2 seconds
      setTimeout(() => {
        setSuccessStates(prev => ({ ...prev, [participantId]: false }));
      }, 2000);

      // Refresh the training data
      fetchTrainings();
    } catch (error) {
      console.error("Error marking presence:", error);
      setErrorStates(prev => ({ ...prev, [participantId]: true }));
      toast({
        title: "Error",
        description: "Failed to mark presence",
        variant: "error",
      });

      // Reset error state after 2 seconds
      setTimeout(() => {
        setErrorStates(prev => ({ ...prev, [participantId]: false }));
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !user.roles || user.roles.length === 0) {
    return <div className="flex items-center justify-center min-h-screen text-white text-lg">Memuat data pengguna...</div>;
  }

  if (!hasRole('KADIV')) {
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
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Only Kadiv can access this page.</p>
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
        <h1 className="text-2xl font-bold mb-6">Manual Presence</h1>

        <Card className="p-6 bg-dark-800/80 rounded-lg border border-white/5 mb-6 shadow-md">
          <label className="block mb-2 font-medium">Pilih Training</label>
          <select
            value={selectedTraining ?? ''}
            onChange={(e) => setSelectedTraining(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-2 bg-dark-700 rounded-lg border border-neutral-700 focus:border-primary-500 mb-6 transition-colors outline-none"
            style={{ backgroundColor: '#23232b' }}
          >
            <option value="">Select Training</option>
            {trainings.map((training) => (
              <option key={training.id} value={training.id}>
                {training.title} - {format(toWIBTime(new Date(training.date)), 'yyyy-MM-dd')} {formatTimeWithWIB(training.start_time)} - {formatTimeWithWIB(training.end_time)}
              </option>
            ))}
          </select>

          {selectedTraining && (
            <>
              <label className="block mb-2 font-medium">Cari/Pilih Anggota</label>
              <Input
                placeholder="Cari nama anggota..."
                className="mb-4 rounded-lg border border-neutral-700 bg-dark-700 focus:border-primary-500 transition-colors outline-none shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Select onValueChange={setSelectedParticipant} value={selectedParticipant}>
                <SelectTrigger className="mb-4 rounded-lg border border-neutral-700 bg-dark-700 focus:border-primary-500 transition-colors outline-none shadow-sm" style={{ backgroundColor: '#23232b' }}>
                  <SelectValue placeholder="Pilih anggota" />
                </SelectTrigger>
                <SelectContent className="rounded-lg bg-dark-700 border border-neutral-700 shadow-lg" style={{ backgroundColor: '#23232b' }}>
                  {participantsWithUser
                    .filter(p => {
                      const nama = (p.user?.namaLengkap || p.user?.nama_lengkap || p.user?.name || '').toLowerCase();
                      return !search || nama.includes(search.toLowerCase());
                    })
                    .map((participant, idx, arr) => (
                      <SelectItem
                        key={participant.id}
                        value={participant.id}
                        className={`rounded-lg px-4 py-2 pl-8 ${idx !== arr.length - 1 ? 'border-b border-neutral-700' : ''} bg-dark-700 hover:bg-dark-600 transition-colors`}
                      >
                        {participant.user?.namaLengkap || participant.user?.nama_lengkap || participant.user?.name || '-'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedParticipantData && (
                <div className="mt-4 p-4 bg-dark-700 rounded-lg shadow-sm">
                  <p className="mb-2 font-semibold">{selectedParticipantData.user?.namaLengkap || selectedParticipantData.user?.nama_lengkap || selectedParticipantData.user?.name || '-'}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => markPresence(selectedParticipantData.user.id)}
                      disabled={isLoading}
                      variant="outline"
                      className={`rounded-lg border shadow-sm transition-all duration-300 ${
                        successStates[selectedParticipantData.user.id] 
                          ? 'bg-green-500/20 border-green-700/30 scale-105' 
                          : errorStates[selectedParticipantData.user.id]
                          ? 'bg-red-500/20 border-red-700/30 scale-105'
                          : 'bg-green-500/20 hover:bg-green-500/30 border-green-700/30'
                      }`}
                    >
                      {successStates[selectedParticipantData.user.id] ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Success
                        </span>
                      ) : errorStates[selectedParticipantData.user.id] ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Failed
                        </span>
                      ) : (
                        'Present'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {selectedTraining && participantsWithUser.length > 0 && (
          <Card className="p-6 bg-dark-800/80 rounded-lg border border-white/5 mt-6 shadow-md">
            <h2 className="text-xl font-medium mb-4">Participants</h2>
            <div className="space-y-4">
              {participantsWithUser.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 bg-dark-700 rounded-lg border border-neutral-700 shadow-sm"
                >
                  <div>
                    <p className="font-medium">{participant.user?.namaLengkap || participant.user?.nama_lengkap || participant.user?.name || '-'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => markPresence(participant.user.id)}
                      disabled={isLoading}
                      variant="outline"
                      className={`rounded-lg border shadow-sm transition-all duration-300 ${
                        successStates[participant.user.id] 
                          ? 'bg-green-500/20 border-green-700/30 scale-105' 
                          : errorStates[participant.user.id]
                          ? 'bg-red-500/20 border-red-700/30 scale-105'
                          : 'bg-green-500/20 hover:bg-green-500/30 border-green-700/30'
                      }`}
                    >
                      {successStates[participant.user.id] ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Success
                        </span>
                      ) : errorStates[participant.user.id] ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Failed
                        </span>
                      ) : (
                        'Present'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}