import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isKadiv) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Fetch presence statistics from database
    // For now, return mock data
    const mockStats = {
      total_participants: 10,
      present_count: 8,
      absent_count: 2,
      attendance_rate: 80,
      arrival_times: [
        { time: "08:00", count: 2 },
        { time: "08:15", count: 3 },
        { time: "08:30", count: 2 },
        { time: "08:45", count: 1 },
      ],
      participant_stats: [
        {
          user_id: "1",
          name: "John Doe",
          status: "present",
          timestamp: "2024-03-20T08:15:00Z",
        },
        {
          user_id: "2",
          name: "Jane Smith",
          status: "present",
          timestamp: "2024-03-20T08:00:00Z",
        },
        {
          user_id: "3",
          name: "Bob Johnson",
          status: "absent",
        },
      ],
    };

    return NextResponse.json(mockStats);
  } catch (error) {
    console.error("Error fetching presence stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch presence statistics" },
      { status: 500 }
    );
  }
} 