import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDriveClient, deleteDriveItem } from '@/lib/drive';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const drive = getDriveClient(session.accessToken);

  try {
    // Execute the purge
    await deleteDriveItem(drive, resolvedParams.id);
    return NextResponse.json({ success: true, message: 'Target destroyed.' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
