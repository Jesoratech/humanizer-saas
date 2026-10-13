import type { PromptVersion } from '../../shared/schemas.ts';
import type { PromptEngine } from './types.ts';
import { promptEngineV1 } from './v1.ts';
import { promptEngineV2 } from './v2.ts';
import { promptEngineV3 } from './v3.ts';

export * from './types.ts';
export * from './v1.ts';
export * from './v2.ts';
export * from './v3.ts';

export function getPromptEngine(version: PromptVersion = 'v3'): PromptEngine {
  if (version === 'v1') {
    return promptEngineV1;
  }
  if (version === 'v2') {
    return promptEngineV2;
  }
  return promptEngineV3;
}
