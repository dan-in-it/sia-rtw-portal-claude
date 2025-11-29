import { NextResponse } from 'next/server';
import { getCsrfTokenForClient } from '@/lib/csrf';

/**
 * GET /api/csrf-token
 * Returns CSRF token for client-side usage
 */
export async function GET() {
  try {
    const token = await getCsrfTokenForClient();

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to get CSRF token' },
      { status: 500 }
    );
  }
}
