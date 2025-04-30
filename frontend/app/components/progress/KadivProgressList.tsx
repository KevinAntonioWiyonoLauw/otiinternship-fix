"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/custom-toast";

interface Participation {
  id: string;
  eventType: string;
  details: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export function KadivProgressList() {
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const { authenticatedFetch } = useAuthenticatedApi();

  const fetchParticipations = async () => {
    try {
      const res = await authenticatedFetch("/api/progress");
      if (res && res.success) {
        setParticipations(res.data);
      }
    } catch (error) {
      console.error("Error fetching participations:", error);
      showToast({
        title: "Error",
        description: "Failed to fetch participations",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipations();
  }, []);

  const handleAction = async (id: string, action: "accept" | "reject") => {
    try {
      const res = await authenticatedFetch(`/api/progress/${id}/${action}`, {
        method: "PATCH",
      });

      if (res && res.success) {
        showToast({
          title: "Success",
          description: `Participation ${action}ed successfully`,
          variant: "success",
        });
        fetchParticipations(); // Refresh the list
      }
    } catch (error) {
      console.error(`Error ${action}ing participation:`, error);
      showToast({
        title: "Error",
        description: `Failed to ${action} participation`,
        variant: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "accepted":
        return <Badge variant="default">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Staff Participations</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participations.map((participation) => (
              <TableRow key={participation.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{participation.user.name}</div>
                    <div className="text-sm text-gray-500">
                      {participation.user.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{participation.eventType}</TableCell>
                <TableCell className="max-w-md">
                  <div className="whitespace-pre-wrap">
                    {participation.details}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(participation.status)}</TableCell>
                <TableCell>
                  {new Date(participation.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {participation.status === "pending" && (
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction(participation.id, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(participation.id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 