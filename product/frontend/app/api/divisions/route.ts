import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      console.error('No auth token found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Fetching divisions from:', `${BASE_URL}/api/divisions`);
    const response = await fetch(`${BASE_URL}/api/divisions`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store'
    });

    const data = await response.json();
    console.log('Backend divisions response:', data);

    if (!response.ok) {
      console.error('Backend error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.message || 'Failed to fetch divisions'
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in divisions API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch divisions'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      console.error('No auth token found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    console.log('Creating division:', body);
    const response = await fetch(`${BASE_URL}/api/divisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Backend response:', data);

    if (!response.ok) {
      console.error('Backend error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.message || 'Failed to create division'
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      division: data.division
    });
  } catch (error) {
    console.error('Error in divisions API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create division'
      },
      { status: 500 }
    );
  }
} 