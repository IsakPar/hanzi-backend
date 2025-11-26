import { AIService } from './services/ai.service';

export function createAIDomain() {
  return {
    ai: new AIService(),
  };
}

