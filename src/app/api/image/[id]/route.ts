import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: NextRequest,
  // 1. Tell TypeScript that params is a Promise
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Await the params before trying to use the ID!
  const resolvedParams = await params;

  // Use the unwrapped ID
  const url = `https://www.googleapis.com/drive/v3/files/${resolvedParams.id}?alt=media`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch image from Drive');

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
