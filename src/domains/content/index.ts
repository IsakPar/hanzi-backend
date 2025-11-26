import type { AppBindings } from '../../types/app';
import { CatalogService } from './services/catalog.service';
import { MediaService } from './services/media.service';
import { UserLibraryService } from './services/user-library.service';

export function createContentServices(env: AppBindings) {
  return {
    catalog: new CatalogService(env.DB),
    media: new MediaService(env.DB, env.CONTENT_BUCKET),
    userLibrary: new UserLibraryService(env.DB),
  };
}

