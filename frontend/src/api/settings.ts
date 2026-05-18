import { client } from './client';

export interface LLMSettings {
  base_url: string;
  model: string;
  api_key_set: boolean;
}

export interface LLMSettingsUpdate {
  base_url?: string;
  api_key?: string;
  model?: string;
}

export async function getLLMSettings(): Promise<LLMSettings> {
  const { data } = await client.get<LLMSettings>('/settings/llm');
  return data;
}

export async function updateLLMSettings(data: LLMSettingsUpdate): Promise<LLMSettings> {
  const { data: result } = await client.post<LLMSettings>('/settings/llm', data);
  return result;
}
