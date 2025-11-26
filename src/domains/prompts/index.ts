import type { AppBindings } from '../../types/app';
import { PromptTemplateService } from './services/prompt-template.service';

export function createPromptsDomain(env: AppBindings) {
  return {
    prompts: new PromptTemplateService(env.DB),
  };
}

