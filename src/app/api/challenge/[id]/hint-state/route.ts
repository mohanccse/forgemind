import { NextResponse } from 'next/server';
import { serverHintStateStore } from '@/lib/serverStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params;
    const { searchParams } = new URL(request.url);
    const learnerId =
      searchParams.get('learner_id') ||
      searchParams.get('learnerId') ||
      'default_learner';

    const stateKey = `${learnerId}:${challengeId}`;
    const state = serverHintStateStore.get(stateKey);

    return NextResponse.json({
      success: true,
      state: state || null
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch hint state.' },
      { status: 500 }
    );
  }
}
