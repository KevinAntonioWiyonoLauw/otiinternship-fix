"use client";

import { CalendarIcon, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface EventItemProps {
  id: string;
  title: string;
  type: "meeting" | "training";
  date: Date;
  time: string;
  location: string;
  joinCode?: string;
}

export function EventItem({ id, title, type, date, time, location, joinCode }: EventItemProps) {
  return (
    <div className="bg-[#1F1F1F] rounded-lg p-4 hover:bg-[#2F2F2F] transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <h3 className="font-medium text-base group-hover:text-[#FF6B00] transition-colors">
            {title}
          </h3>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <span>{format(date, "dd MMMM yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{location}</span>
            </div>
          </div>
        </div>

        {/* Join Meeting Dialog - Only show for meetings */}
        {type === "meeting" && joinCode && (
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white transition-all duration-200"
              >
                Join
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Join Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Join Code
                  </label>
                  <Input
                    placeholder="Masukkan kode meeting..."
                    className="bg-[#1F1F1F] border-gray-800 h-11 transition-colors focus:border-[#FF6B00]"
                  />
                </div>
                <Button className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors h-11 text-base font-medium">
                  Join Meeting
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 