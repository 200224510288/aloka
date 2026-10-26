import { NextRequest, NextResponse } from 'next/server';
import { loadAgentsDataLocally, saveAgentsDataLocally, DEFAULT_SENDER_SETTINGS, INITIAL_AGENTS } from '@/lib/agent-storage';
import { AgentRecord, SenderSettings } from '@/types/agent';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = loadAgentsDataLocally();
    return NextResponse.json({
      success: true,
      agents: data.agents,
      senderSettings: data.senderSettings,
      updatedAt: data.updatedAt,
    });
  } catch (err: any) {
    console.error('Error in GET /api/agents:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch agent directory',
        agents: INITIAL_AGENTS,
        senderSettings: DEFAULT_SENDER_SETTINGS,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agents: AgentRecord[] | undefined = Array.isArray(body.agents) ? body.agents : undefined;
    const senderSettings: SenderSettings | undefined = body.senderSettings ? body.senderSettings : undefined;

    const saved = saveAgentsDataLocally({ agents, senderSettings });
    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Could not write agent data to disk' },
        { status: 500 }
      );
    }

    const updated = loadAgentsDataLocally();
    return NextResponse.json({
      success: true,
      agents: updated.agents,
      senderSettings: updated.senderSettings,
      updatedAt: updated.updatedAt,
    });
  } catch (err: any) {
    console.error('Error in POST /api/agents:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save agents' },
      { status: 500 }
    );
  }
}
