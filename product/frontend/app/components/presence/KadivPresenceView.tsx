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
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, MapPin, MoreVertical, Download, Copy, Check, X } from "lucide-react";

// Mock data - replace with API call
const mockTraining = {
  id: "1",
  title: "Frontend Development with React",
  date: new Date(2024, 3, 25), // April 25, 2024
  startTime: "13:00",
  endTime: "15:00",
  location: "Basecamp OmahTI",
  qrToken: "ABC123XYZ",
};

const mockAttendees = [
  {
    id: "1",
    name: "John Doe",
    email: "john@omahti.com",
    status: "present" as const,
    checkInTime: "13:05",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@omahti.com",
    status: "absent" as const,
    checkInTime: null,
  },
  // Add more mock attendees...
];

export function KadivPresenceView() {
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateQr = () => {
    setIsQrDialogOpen(true);
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(mockTraining.qrToken);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Token Copied!",
        description: "The token has been copied to your clipboard.",
        variant: "success",
      });
    } catch (err) {
      console.error("Failed to copy token:", err);
    }
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = "#0f0f0f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qr-${mockTraining.title}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    const svgData = new XMLSerializer().serializeToString(svg);
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleMarkAttendance = (attendeeId: string, status: "present" | "absent") => {
    // Mock API call - replace with actual API call
    toast({
      title: "Attendance Updated",
      description: `Attendance status has been updated to ${status}`,
      variant: "success",
    });
  };

  const handleBatchAction = (status: "present" | "absent") => {
    // Mock API call - replace with actual API call
    toast({
      title: "Batch Update Successful",
      description: `Updated ${selectedAttendees.length} attendees to ${status}`,
      variant: "success",
    });
    setSelectedAttendees([]);
  };

  return (
    <div className="space-y-6">
      {/* Training Details Card */}
      <div className="bg-dark-800/30 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium">{mockTraining.title}</h2>
            <div className="flex flex-col gap-2 mt-2 text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {format(mockTraining.date, "MMMM d, yyyy")} at {mockTraining.startTime} - {mockTraining.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{mockTraining.location}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleGenerateQr}
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 transition-colors gap-2"
          >
            Generate QR
          </Button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-dark-800/30 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium">Attendance List</h2>
          {selectedAttendees.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleBatchAction("present")}
                className="border-green-500 text-green-500 hover:bg-green-500/10"
              >
                Mark Present
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBatchAction("absent")}
                className="border-red-500 text-red-500 hover:bg-red-500/10"
              >
                Mark Absent
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedAttendees.length === mockAttendees.length}
                    onCheckedChange={(checked) => {
                      setSelectedAttendees(
                        checked ? mockAttendees.map((a) => a.id) : []
                      );
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAttendees.map((attendee) => (
                <TableRow
                  key={attendee.id}
                  className="border-gray-800 hover:bg-[#1F1F1F]/50"
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedAttendees.includes(attendee.id)}
                      onCheckedChange={(checked) => {
                        setSelectedAttendees(
                          checked
                            ? [...selectedAttendees, attendee.id]
                            : selectedAttendees.filter((id) => id !== attendee.id)
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>{attendee.name}</TableCell>
                  <TableCell>{attendee.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        attendee.status === "present"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {attendee.status === "present" ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {attendee.status}
                    </span>
                  </TableCell>
                  <TableCell>{attendee.checkInTime || "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-[#2F2F2F]"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40 bg-[#1F1F1F] border-gray-800"
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            handleMarkAttendance(
                              attendee.id,
                              attendee.status === "present" ? "absent" : "present"
                            )
                          }
                          className="text-sm"
                        >
                          Mark as{" "}
                          {attendee.status === "present" ? "Absent" : "Present"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="bg-[#0f0f0f] text-white border-gray-800 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">QR Code</DialogTitle>
            <DialogDescription className="text-gray-400">
              Scan this QR code to check in
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="bg-white p-4 rounded-xl mx-auto w-fit">
              <QRCodeSVG
                id="qr-code"
                value={mockTraining.qrToken}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopyToken}
                className="flex-1 bg-[#1F1F1F] hover:bg-[#2F2F2F] transition-colors gap-2"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Token
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownloadQr}
                className="flex-1 bg-[#1F1F1F] hover:bg-[#2F2F2F] transition-colors gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="text-center text-sm text-gray-400">
              Token: <code className="font-mono">{mockTraining.qrToken}</code>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 