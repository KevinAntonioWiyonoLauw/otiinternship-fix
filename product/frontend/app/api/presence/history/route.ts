import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Fetch presence history from database
    // For now, return mock data
    const mockPresenceHistory = [
      {
        id: 2,
        trainingId: 3,
        userId: session.user.id,
        presenceType: "QR",
        timestamp: "2025-04-28T03:34:31.238Z"
      },
      {
        id: 1,
        trainingId: 1,
        userId: session.user.id,
        presenceType: "QR",
        timestamp: "2025-04-28T03:23:21.332Z"
      }
    ];

    return NextResponse.json({
      success: true,
      attendance_history: mockPresenceHistory
    });
  } catch (error) {
    console.error("Error fetching presence history:", error);
    return NextResponse.json(
      { error: "Failed to fetch presence history" },
      { status: 500 }
    );
  }
} 