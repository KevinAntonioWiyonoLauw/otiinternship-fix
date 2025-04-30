"use client";

import { Users, BookOpen, GraduationCap, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Participation {
  id: string;
  title: string;
  type: "committee" | "assignment" | "training";
  date: string;
  status: "pending" | "accepted" | "rejected";
  description: string;
}

interface ParticipationListProps {
  participations: Participation[];
}

export function ParticipationList({ participations }: ParticipationListProps) {
  const getTypeIcon = (type: Participation["type"]) => {
    switch (type) {
      case "committee":
        return Users;
      case "assignment":
        return BookOpen;
      case "training":
        return GraduationCap;
    }
  };

  const getStatusColor = (status: Participation["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "accepted":
        return "bg-green-500/20 text-green-400";
      case "rejected":
        return "bg-red-500/20 text-red-400";
    }
  };

  const getStatusIcon = (status: Participation["status"]) => {
    switch (status) {
      case "pending":
        return Clock;
      case "accepted":
        return CheckCircle2;
      case "rejected":
        return XCircle;
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participations.map((participation) => {
            const TypeIcon = getTypeIcon(participation.type);
            const StatusIcon = getStatusIcon(participation.status);

            return (
              <TableRow
                key={participation.id}
                className="border-gray-800 hover:bg-[#1F1F1F]/50"
              >
                <TableCell className="font-mono text-sm">
                  {participation.date}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{participation.title}</div>
                    <div className="text-sm text-gray-400">
                      {participation.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-gray-400" />
                    <span className="capitalize">{participation.type}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      participation.status
                    )}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="capitalize">{participation.status}</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
} 