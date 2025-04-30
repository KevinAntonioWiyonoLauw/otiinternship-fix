import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!session.user.token) {
      return NextResponse.json(
        { error: "No authentication token found" },
        { status: 401 }
      );
    }

    // Fetch training counts for all divisions from the backend service
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/trainings/count/all-divisions`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.user.token}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response from training service:", errorData);
      throw new Error(errorData.message || "Failed to fetch training counts");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/trainings/count/all-divisions:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch training counts for divisions" 
      },
      { status: 500 }
    );
  }
}