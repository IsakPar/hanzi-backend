import type { AppEnv } from '../../types/app';
import { drizzle } from 'drizzle-orm/d1';
import { StoriesService } from './services/stories.service';

export const createStoriesDomain = (env: AppEnv['Bindings']) => {
  const db = drizzle(env.DB);
  
  return {
    stories: new StoriesService(db),
  };
};

export * from './types';
export { StoriesService } from './services/stories.service';

