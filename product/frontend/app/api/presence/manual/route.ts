import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isKadiv) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { training_id, participant_id, status } = await req.json();
    if (!training_id || !participant_id || !status) {
      return NextResponse.json(
        { error: "Training ID, participant ID, and status are required" },
        { status: 400 }
      );
    }

    if (status !== "present" && status !== "absent") {
      return NextResponse.json(
        { error: "Status must be either 'present' or 'absent'" },
        { status: 400 }
      );
    }

    // TODO: Check if the training exists and is currently active
    // TODO: Check if the participant is registered for this training
    // TODO: Check if the participant has already recorded presence for this training

    // Record presence
    const presence = {
      user_id: participant_id,
      training_id,
      presence_type: "manual",
      status,
      timestamp: new Date().toISOString(),
      marked_by: session.user.id,
    };

    // TODO: Save presence to database

    return NextResponse.json({
      message: "Presence marked successfully",
      presence,
    });
  } catch (error) {
    console.error("Error marking presence:", error);
    return NextResponse.json(
      { error: "Failed to mark presence" },
      { status: 500 }
    );
  }
}