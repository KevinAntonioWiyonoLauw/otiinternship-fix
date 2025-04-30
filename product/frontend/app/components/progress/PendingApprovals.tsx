"use client";

import { Users, BookOpen, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Approval {
  id: string;
  staffId: string;
  staffName: string;
  staffAvatar: string;
  title: string;
  type: "committee" | "assignment" | "training";
  date: string;
  description: string;
}

interface PendingApprovalsProps {
  approvals: Approval[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function PendingApprovals({
  approvals,
  onApprove,
  onReject,
}: PendingApprovalsProps) {
  const getTypeIcon = (type: Approval["type"]) => {
    switch (type) {
      case "committee":
        return Users;
      case "assignment":
        return BookOpen;
      case "training":
        return GraduationCap;
      default:
        return Users;
    }
  };

  if (approvals.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        No pending approvals at the moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {approvals.map((approval) => {
        const TypeIcon = getTypeIcon(approval.type);

        return (
          <Card
            key={approval.id}
            className="bg-[#1F1F1F]/50 border-gray-800/50 shadow-lg rounded-xl"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 bg-gray-800">
                    <AvatarImage
                      src={approval.staffAvatar}
                      alt={approval.staffName}
                    />
                    <AvatarFallback className="bg-gray-800 text-gray-400">
                      {approval.staffName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {approval.staffName}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400">
                      {approval.date}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <TypeIcon className="h-4 w-4" />
                  <span className="capitalize">{approval.type}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm">{approval.title}</h4>
                <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">
                  {approval.description}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onReject(approval.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => onApprove(approval.id)}
                  size="sm"
                  className="flex-1 bg-[#F97316] hover:bg-[#F97316]/90 transition-colors"
                >
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 