import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session in /api/trainings/upcoming:", session);

    if (!session?.user) {
      console.log("No session or user found");
      return NextResponse.json(
        { error: "Unauthorized - No session" },
        { status: 401 }
      );
    }

    if (!session.user.token) {
      console.log("No token found in session");
      return NextResponse.json(
        { error: "Unauthorized - No token" },
        { status: 401 }
      );
    }

    // Fetch upcoming trainings from the training service
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trainings/upcoming`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.user.token}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response from training service:", errorData);
      throw new Error(errorData.message || "Failed to fetch trainings");
    }

    const data = await response.json();
    console.log("Training data received:", data);

    // Semua user bisa melihat semua training, tanpa filter division
    return NextResponse.json(data.trainings);
  } catch (error) {
    console.error("Error in /api/trainings/upcoming:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming trainings" },
      { status: 500 }
    );
  }
} 