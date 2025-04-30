"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format, addMinutes, isAfter, isBefore } from "date-fns";
import { QrScanner } from "@/components/presence/QrScanner";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Clock, MapPin, QrCode, Loader2 } from "lucide-react";

// Mock data - replace with API call
const mockTrainings = [
  {
    id: "1",
    title: "Frontend Development with React",
    date: new Date(2024, 3, 25), // April 25, 2024
    startTime: "13:00",
    endTime: "15:00",
    location: "Basecamp OmahTI",
  },
  {
    id: "2",
    title: "Backend Development with Node.js",
    date: new Date(2024, 3, 28), // April 28, 2024
    startTime: "10:00",
    endTime: "12:00",
    location: "Online via Zoom",
  },
];

export function StaffPresenceView() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<typeof mockTrainings[0] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCheckIn = (training: typeof mockTrainings[0]) => {
    setSelectedTraining(training);
    setIsCheckInOpen(true);
  };

  const handleQrSuccess = async (result: string) => {
    setIsScanning(false);
    setIsSubmitting(true);
    
    // Mock API call - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsCheckInOpen(false);
    toast({
      title: "Check-in Successful!",
      description: `You have checked in at ${format(new Date(), "HH:mm")}`,
      variant: "success",
    });
  };

  const handleTokenSubmit = async () => {
    if (!token) return;
    
    setIsSubmitting(true);
    
    // Mock API call - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsCheckInOpen(false);
    setToken("");
    toast({
      title: "Check-in Successful!",
      description: `You have checked in at ${format(new Date(), "HH:mm")}`,
      variant: "success",
    });
  };

  const isCheckInEnabled = (training: typeof mockTrainings[0]) => {
    const now = new Date();
    const [hours, minutes] = training.startTime.split(":").map(Number);
    const startTime = new Date(training.date);
    startTime.setHours(hours, minutes);
    
    const checkInStartTime = addMinutes(startTime, -15); // 15 minutes before start
    const [endHours, endMinutes] = training.endTime.split(":").map(Number);
    const endTime = new Date(training.date);
    endTime.setHours(endHours, endMinutes);
    
    return isAfter(now, checkInStartTime) && isBefore(now, endTime);
  };

  return (
    <div className="space-y-4">
      {mockTrainings.map((training) => (
        <div
          key={training.id}
          className="bg-dark-800/30 backdrop-blur-md rounded-2xl p-6 border border-white/10"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium">{training.title}</h3>
              <div className="flex flex-col gap-2 mt-2 text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(training.date, "MMMM d, yyyy")} at {training.startTime} - {training.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{training.location}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleCheckIn(training)}
              disabled={!isCheckInEnabled(training)}
              className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors gap-2"
            >
              Check In
            </Button>
          </div>
        </div>
      ))}

      {/* Check-in Dialog */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Check In</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedTraining?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {isScanning ? (
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <QrScanner onResult={handleQrSuccess} />
                <div className="absolute inset-0 border-2 border-[#FF6B00] rounded-xl" />
              </div>
            ) : (
              <Button
                onClick={() => setIsScanning(true)}
                className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors gap-2"
              >
                <Camera className="h-5 w-5" />
                Scan QR Code
              </Button>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0f0f0f] text-gray-400">Or enter token</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter token..."
                className="bg-[#1F1F1F] border-gray-800 transition-colors focus:border-[#FF6B00] rounded-xl"
              />
              <Button
                onClick={handleTokenSubmit}
                disabled={!token || isSubmitting}
                className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors min-w-[100px]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 