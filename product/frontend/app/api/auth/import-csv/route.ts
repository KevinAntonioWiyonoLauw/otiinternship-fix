import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', file);

    const response = await fetch(`${AUTH_URL}/api/auth/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formDataToSend,
    });

    if (!response.ok) {
      throw new Error('Failed to import users');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to import users' },
      { status: 500 }
    );
  }
} 