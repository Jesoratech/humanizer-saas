import type { PromptVersion } from '../../shared/schemas.ts';
import type { PromptEngine } from './types.ts';
import { promptEngineV1 } from './v1.ts';
import { promptEngineV2 } from './v2.ts';

export * from './types.ts';
export * from './v1.ts';
export * from './v2.ts';

export function getPromptEngine(version: PromptVersion = 'v2'): PromptEngine {
  if (version === 'v1') {
    return promptEngineV1;
  }
  return promptEngineV2;
}
