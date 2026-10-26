import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentRecord, SenderSettings, DEFAULT_SENDER_SETTINGS, INITIAL_AGENTS } from '@/types/agent';

export { DEFAULT_SENDER_SETTINGS, INITIAL_AGENTS };

function resolveAgentsFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmp = path.join(os.tmpdir(), 'lottery_data');
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
    return path.join(tmp, 'agents.json');
  }

  const localDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      const tmp = path.join(os.tmpdir(), 'lottery_data');
      if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
      return path.join(tmp, 'agents.json');
    }
  }
  return path.join(localDir, 'agents.json');
}

export interface AgentStorageData {
  agents: AgentRecord[];
  senderSettings: SenderSettings;
  updatedAt: string;
}

export function loadAgentsDataLocally(): AgentStorageData {
  try {
    const filePath = resolveAgentsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        agents: Array.isArray(parsed.agents) && parsed.agents.length > 0 ? parsed.agents : INITIAL_AGENTS,
        senderSettings: parsed.senderSettings ? { ...DEFAULT_SENDER_SETTINGS, ...parsed.senderSettings } : DEFAULT_SENDER_SETTINGS,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('[AgentStorage] Error reading agents file, using defaults:', err);
  }

  return {
    agents: INITIAL_AGENTS,
    senderSettings: DEFAULT_SENDER_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
}

export function saveAgentsDataLocally(data: { agents?: AgentRecord[]; senderSettings?: SenderSettings }): boolean {
  try {
    const filePath = resolveAgentsFilePath();
    const current = loadAgentsDataLocally();
    const updated: AgentStorageData = {
      agents: data.agents !== undefined ? data.agents : current.agents,
      senderSettings: data.senderSettings !== undefined ? data.senderSettings : current.senderSettings,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[AgentStorage] Error saving agents data:', err);
    return false;
  }
}
