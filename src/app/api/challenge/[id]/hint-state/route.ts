import { NextResponse } from 'next/server';
import { getHintStateFromDb } from '@/lib/supabase-store';

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

    const state = await getHintStateFromDb(learnerId, challengeId);

    return NextResponse.json({
      success: true,
      state: state || null
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Database error fetching hint state.' },
      { status: 500 }
    );
  }
}
