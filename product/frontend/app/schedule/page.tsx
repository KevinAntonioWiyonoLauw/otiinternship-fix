"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, Plus, AlertCircle, Calendar, Clock, MapPin, Copy, Check } from "lucide-react";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import { addMonths, isSameDay, isAfter, startOfDay, format, addDays, startOfToday } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import Aurora from "@/components/effects/Aurora";
import { useAuth } from "../context/AuthContext";
import { getMeetings, getTrainings, createMeeting, createTraining, getMeetingById } from '../lib/api';
import { format as formatDateFns, parseISO } from 'date-fns';
import { useRouter } from "next/navigation";

interface CreateMeetingFormProps {
  onSuccess: (code: string) => void;
}

interface CreateTrainingFormProps {
  onSuccess: () => void;
  user: any;
}

// Create Meeting Form Component
function CreateMeetingForm({ onSuccess }: CreateMeetingFormProps) {
  const [meetingDate, setMeetingDate] = useState<Date>();
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const handleCreateMeeting = async () => {
    if (!title || !meetingDate || !startTime || !endTime || !location) return;
    try {
      const res = await createMeeting({
        title,
        date: formatDateFns(meetingDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        location,
      });
      const code = res.data?.joinCode || res.data?.code || res.joinCode || res.code || '';
      onSuccess(code);
    } catch (err: any) {
      if (err.response && err.response.data) {
        console.error('Create meeting error:', err.response.data);
        alert('Create meeting error: ' + (err.response.data.message || JSON.stringify(err.response.data)));
      } else {
        console.error('Create meeting error:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Judul Meeting
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul meeting..."
          className="bg-[#1F1F1F] border-gray-800 h-11 transition-colors focus:border-[#FF6B00] rounded-xl"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">
          Tanggal
        </label>
        <DatePicker
          date={meetingDate}
          onSelect={setMeetingDate}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Waktu Mulai
          </label>
          <TimePicker
            time={startTime}
            onSelect={setStartTime}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Waktu Selesai
          </label>
          <TimePicker
            time={endTime}
            onSelect={setEndTime}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">
          Lokasi
        </label>
        <div className="relative">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Masukkan lokasi..."
            className="bg-[#1F1F1F] border-gray-800 h-11 transition-colors focus:border-[#FF6B00] rounded-xl pl-4 pr-10"
          />
          <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
      </div>
      <Button 
        onClick={handleCreateMeeting}
        className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors h-11 text-base font-medium mt-2 rounded-xl"
      >
        Create Meeting
      </Button>
    </div>
  );
}

// Create Training Form Component
function CreateTrainingForm({ onSuccess, user }: CreateTrainingFormProps) {
  const [trainingDate, setTrainingDate] = useState<Date>();
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const handleCreateTraining = async () => {
    if (!title || !trainingDate || !startTime || !endTime || !location) return;
    // Ambil division_id dari user context (role KADIV)
    const kadivRole = user?.roles?.find((r: any) => r.role === 'KADIV');
    const division_id = kadivRole?.division?.id;
    if (!division_id) {
      alert('Tidak ditemukan division_id pada user KADIV!');
      return;
    }
    try {
      await createTraining({
        title,
        date: formatDateFns(trainingDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        location,
        division_id,
      });
      onSuccess();
    } catch (err: any) {
      if (err.response && err.response.data) {
        console.error('Create training error:', err.response.data);
        alert('Create training error: ' + (err.response.data.message || JSON.stringify(err.response.data)));
      } else {
        console.error('Create training error:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Judul Pelatihan
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masukkan judul pelatihan..."
          className="bg-[#1F1F1F] border-gray-800 h-11 transition-colors focus:border-[#FF6B00] rounded-xl"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">
          Tanggal
        </label>
        <DatePicker
          date={trainingDate}
          onSelect={setTrainingDate}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Waktu Mulai
          </label>
          <TimePicker
            time={startTime}
            onSelect={setStartTime}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Waktu Selesai
          </label>
          <TimePicker
            time={endTime}
            onSelect={setEndTime}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">
          Lokasi
        </label>
        <div className="relative">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Masukkan lokasi..."
            className="bg-[#1F1F1F] border-gray-800 h-11 transition-colors focus:border-[#FF6B00] rounded-xl pl-4 pr-10"
          />
          <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
      </div>
      <Button 
        onClick={handleCreateTraining}
        className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors h-11 text-base font-medium mt-2 rounded-xl"
      >
        Create Training
      </Button>
    </div>
  );
}

export default function SchedulePage() {
  const { user, hasRole, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2025, 3, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"meeting" | "training">("meeting");
  const [joinCode, setJoinCode] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [newMeetingCode, setNewMeetingCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isSuccessJoinAlert, setIsSuccessJoinAlert] = useState(false);
  const [joinedMeetings, setJoinedMeetings] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [meetingDetail, setMeetingDetail] = useState<any | null>(null);
  const [loadingMeetingDetail, setLoadingMeetingDetail] = useState(false);

  const isKadiv = hasRole('KADIV');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      // Contoh: jika ingin redirect ke halaman khusus
      // if (hasRole('KADIV')) router.replace("/schedule/kadiv");
      // else router.replace("/schedule/staff");
      // Jika tidak, biarkan di halaman ini
    }
  }, [loading, user, hasRole, router]);

  async function fetchEvents() {
    setLoadingEvents(true);
    try {
      const [meetingsRes, trainingsRes] = await Promise.all([
        getMeetings().catch(err => {
          if (err.response?.status === 403) {
            return { data: [], meetings: [] };
          }
          throw err;
        }),
        getTrainings().catch(err => {
          if (err.response?.status === 403) {
            return { data: [], trainings: [] };
          }
          throw err;
        })
      ]);
      // Gabungkan dan normalisasi event
      const meetings = (meetingsRes.data || meetingsRes.meetings || []).map((m: any) => ({
        ...m,
        type: 'meeting',
        date: new Date(m.date),
        time: m.startTime && m.endTime ? `${m.startTime} - ${m.endTime}` : '',
        joinCode: m.joinCode || m.code || '',
      }));
      const trainings = (trainingsRes.data || trainingsRes.trainings || []).map((t: any) => {
        let start = t.start_time;
        let end = t.end_time;
        if (start && end && start.includes('T') && end.includes('T')) {
          try {
            start = formatDateFns(new Date(start), 'HH:mm');
            end = formatDateFns(new Date(end), 'HH:mm');
          } catch {}
        }
        return {
          ...t,
          type: 'training',
          date: new Date(t.date),
          time: start && end ? `${start} - ${end}` : '',
        };
      });
      setEvents([...meetings, ...trainings]);
    } catch (err: any) {
      // Tampilkan error dari backend jika ada
      if (err.response && err.response.data) {
        console.error('Fetch events error:', err.response.data);
        alert('Fetch events error: ' + (err.response.data.message || JSON.stringify(err.response.data)));
      } else {
        console.error('Fetch events error:', err);
      }
    } finally {
      setLoadingEvents(false);
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateSelect = (date: Date) => {
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  const handleClearSelection = () => {
    setSelectedDate(null);
  };

  const handleJoinMeeting = () => {
    const meetingToJoin = events.find(
      (event: any) => event.type === "meeting" && event.joinCode === joinCode
    );
    if (meetingToJoin) {
      setJoinedMeetings(prev => [...prev, meetingToJoin.id]);
      setIsJoinDialogOpen(false);
      setJoinCode("");
      setIsSuccessJoinAlert(true);
      setTimeout(() => {
        setIsSuccessJoinAlert(false);
      }, 3000);
    } else {
      setIsAlertOpen(true);
    }
  };

  const handleMeetingSuccess = async (code: string) => {
    setNewMeetingCode(code);
    setIsSuccessDialogOpen(true);
    await fetchEvents();
  };

  const handleTrainingSuccess = async () => {
    setIsCreateScheduleOpen(false);
    await fetchEvents();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(newMeetingCode);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        setIsSuccessDialogOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleEventClick = async (event: any) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
    // Jika event adalah meeting, fetch detail by id
    if (event.type === 'meeting') {
      setLoadingMeetingDetail(true);
      try {
        const res = await getMeetingById(event.id);
        setMeetingDetail(res.meeting || res.data || null);
      } catch (err) {
        setMeetingDetail(null);
      } finally {
        setLoadingMeetingDetail(false);
      }
    } else {
      setMeetingDetail(null);
    }
  };

  // Filter events based on selection and type
  const filteredEvents = useMemo(() => {
    const today = startOfToday();
    if (selectedDate) {
      return events.filter(event => isSameDay(event.date, selectedDate));
    }
    // Include events from today onwards
    return events
      .filter(event => isAfter(event.date, today) || isSameDay(event.date, today)) 
      .sort((a, b) => {
        // Sort by date first, then by time if dates are the same
        const dateComparison = a.date.getTime() - b.date.getTime();
        if (dateComparison !== 0) {
          return dateComparison;
        }
        // Basic time string comparison (assumes HH:mm format)
        const timeA = a.time?.split(' - ')[0] || '';
        const timeB = b.time?.split(' - ')[0] || '';
        return timeA.localeCompare(timeB);
      });
  }, [selectedDate, events]);

  if (loading || !user || !user.roles || user.roles.length === 0) {
    return <div className="flex items-center justify-center min-h-screen text-white text-lg">Memuat data pengguna...</div>;
  }

  return (
    <main className="min-h-screen bg-[#1F1F1F] text-white p-4 md:p-6 relative mt-12">
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-[#2F2F2F] transition-colors rounded-xl"
            > 
            <Link href="/dashboard">
              <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Booking Jadwal Kegiatan</h1>
          </div>
          <Dialog open={isCreateScheduleOpen} onOpenChange={setIsCreateScheduleOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors gap-2 text-base font-medium rounded-xl"
                size="lg"
              >
                <Plus className="h-5 w-5" />
                Create Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Create Schedule</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Add a new schedule to the calendar
                </DialogDescription>
              </DialogHeader>

              {isKadiv ? (
                <Tabs
                  defaultValue="meeting"
                  value={activeTab}
                  onValueChange={(value: string) =>
                    setActiveTab(value as "meeting" | "training")
                  }
                  className="w-full"
                >
                  <TabsList className="w-full mb-4 p-1 bg-[#1F1F1F] rounded-xl">
                    <TabsTrigger 
                      value="meeting" 
                      className="flex-1 rounded-lg data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white transition-all"
                    >
                      Meeting
                    </TabsTrigger>
                    <TabsTrigger 
                      value="training" 
                      className="flex-1 rounded-lg data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white transition-all"
                    >
                      Training
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="meeting">
                    <CreateMeetingForm onSuccess={handleMeetingSuccess} />
                  </TabsContent>

                  <TabsContent value="training">
                    <CreateTrainingForm onSuccess={handleTrainingSuccess} user={user} />
                  </TabsContent>
                </Tabs>
              ) : (
                <CreateMeetingForm onSuccess={handleMeetingSuccess} />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Calendar Section */}
          <CustomCalendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateChange={handleDateSelect}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            events={events.map((event: any) => ({
              date: event.date,
              type: event.type
            }))}
          />

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Events List */}
            <div className="bg-dark-800/30 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium">
                  {selectedDate ? 'Events on Selected Day' : 'Upcoming Events'}
                </h2>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    className="text-sm text-gray-400 hover:text-white"
                    onClick={handleClearSelection}
                  >
                    Show All
                  </Button>
                )}
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {filteredEvents.map((event) => (
                  <div
                    key={`${event.type}-${event.id}`}
                    className="bg-[#1A1A1A] rounded-xl p-6 hover:bg-[#2F2F2F] transition-colors cursor-pointer"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium">{event.title}</h3>
                        <p className="text-gray-400 mt-1">
                          {format(event.date, "MMMM d, yyyy")} at {event.time}
                        </p>
                        <p className="text-gray-400 mt-1">
                          {event.location}
                        </p>
                      </div>
                      <span className={`
                        px-3 py-1 rounded-full text-sm
                        ${event.type === "meeting" 
                          ? "bg-blue-500/20 text-blue-400" 
                          : "bg-purple-500/20 text-purple-400"
                        }
                      `}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <p className="text-gray-400 text-center py-4">
                    No events {selectedDate ? 'on selected day' : 'upcoming'}
                  </p>
                )}
              </div>
              <Button
                className="w-full mt-4 bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors h-11 text-base font-medium rounded-xl"
                onClick={() => setIsJoinDialogOpen(true)}
              >
                Join Meeting
              </Button>
            </div>
          </div>
        </div>

        {/* Event Details Dialog */}
        <Dialog open={isEventDetailsOpen} onOpenChange={setIsEventDetailsOpen}>
          <DialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                {selectedEvent?.title}
                <span className={`
                  px-3 py-1 rounded-full text-sm
                  ${selectedEvent?.type === "meeting" 
                    ? "bg-blue-500/20 text-blue-400" 
                    : "bg-purple-500/20 text-purple-400"
                  }
                `}>
                  {selectedEvent?.type}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-5 w-5" />
                <span>{selectedEvent && format(selectedEvent.date, "MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="h-5 w-5" />
                <span>{selectedEvent?.time}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="h-5 w-5" />
                <span>{selectedEvent?.location}</span>
              </div>
              {selectedEvent?.type === "meeting" && (
                loadingMeetingDetail ? (
                  <div className="mt-6 text-gray-400">Loading meeting details...</div>
                ) : meetingDetail && meetingDetail.participants && user && meetingDetail.participants.some((p: any) => p.userId === user.id) ? (
                  <div className="mt-6 p-4 bg-[#1F1F1F] rounded-xl">
                    <p className="text-sm text-gray-400 mb-2">Meeting Code</p>
                    <div className="flex items-center justify-between bg-[#2F2F2F] p-2 rounded-lg">
                      <code className="font-mono text-white">{meetingDetail.joinCode}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-[#3F3F3F]"
                        onClick={() => {
                          navigator.clipboard.writeText(meetingDetail.joinCode);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <Button 
                      className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors gap-2 text-base font-medium h-11 rounded-xl shadow-lg hover:shadow-xl"
                      onClick={() => {
                        setIsEventDetailsOpen(false);
                        setIsJoinDialogOpen(true);
                      }}
                    >
                      Join Meeting
                    </Button>
                  </div>
                )
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Join Meeting Dialog */}
        <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
          <DialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Join Meeting</DialogTitle>
              <DialogDescription className="text-gray-400">
                Enter the meeting code to join
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Enter meeting code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="bg-[#1F1F1F] border-gray-800 h-11 transition-colors focus:border-[#FF6B00] rounded-xl"
              />
              <Button 
                onClick={handleJoinMeeting}
                disabled={!joinCode}
                className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors h-11 text-base font-medium rounded-xl"
              >
                Join
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Dialog with Join Code */}
        <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
          <DialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-green-500">
                <Check className="h-6 w-6" />
                Meeting Created Successfully
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Share this code with participants to join the meeting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="relative">
                <Input
                  readOnly
                  value={newMeetingCode}
                  className="bg-[#1F1F1F] border-gray-800 h-11 transition-colors focus:border-[#FF6B00] rounded-xl pr-24 font-mono text-lg text-center"
                />
                <Button
                  onClick={handleCopyCode}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-3 rounded-lg bg-[#2F2F2F] hover:bg-[#3F3F3F] transition-colors gap-2"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <Button 
                onClick={() => setIsSuccessDialogOpen(false)}
                className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors h-11 text-base font-medium rounded-xl"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Error Alert Dialog */}
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                Failed to Join Meeting
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Invalid join code. Please check the code and try again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => setIsAlertOpen(false)}
                className="text-white hover:bg-[#2F2F2F] transition-colors rounded-lg"
              >
                OK
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Success Join Alert */}
        <AlertDialog open={isSuccessJoinAlert} onOpenChange={setIsSuccessJoinAlert}>
          <AlertDialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-green-500">
                <Check className="h-5 w-5" />
                Successfully Joined
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                You have successfully joined the meeting!
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => setIsSuccessJoinAlert(false)}
                className="text-white hover:bg-[#2F2F2F] transition-colors rounded-lg"
              >
                OK
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}