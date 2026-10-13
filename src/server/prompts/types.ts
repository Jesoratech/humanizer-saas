import type { HumanizeRequest } from '../../shared/schemas.ts';

export interface PromptConfig {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  topP: number;
}

export interface PromptEngine {
  version: 'v1' | 'v2' | 'v3';
  build(request: HumanizeRequest): PromptConfig;
}
