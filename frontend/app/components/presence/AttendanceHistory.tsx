"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Check, X, Search } from "lucide-react";

// Mock data - replace with API call
const mockHistory = [
  {
    id: "1",
    title: "Frontend Development with React",
    date: new Date(2024, 3, 20),
    status: "present" as const,
    checkInTime: "13:05",
  },
  {
    id: "2",
    title: "Backend Development with Node.js",
    date: new Date(2024, 3, 15),
    status: "absent" as const,
    checkInTime: null,
  },
  // Add more mock history...
];

export function AttendanceHistory() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHistory = mockHistory.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search trainings..."
          className="bg-[#1F1F1F] border-gray-800 pl-10 transition-colors focus:border-[#FF6B00] rounded-xl"
        />
      </div>

      {/* History Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead>Training</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.map((item) => (
              <TableRow
                key={item.id}
                className="border-gray-800 hover:bg-[#1F1F1F]/50"
              >
                <TableCell>{item.title}</TableCell>
                <TableCell>{format(item.date, "MMMM d, yyyy")}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === "present"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {item.status === "present" ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    {item.status}
                  </span>
                </TableCell>
                <TableCell>{item.checkInTime || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 