import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { contentTags } from '../../../schema';
import { eq } from 'drizzle-orm';

export async function addTagsToContent(db: D1Database, contentId: string, tagIds?: string[]) {
  if (!tagIds || tagIds.length === 0) {
    return;
  }

  const d1 = drizzle(db);
  const tagValues = tagIds.map((tagId) => ({
    contentId,
    tagId,
  }));

  await d1.insert(contentTags).values(tagValues);
}

export async function replaceContentTags(db: D1Database, contentId: string, tagIds?: string[]) {
  const d1 = drizzle(db);
  await d1.delete(contentTags).where(eq(contentTags.contentId, contentId));
  await addTagsToContent(db, contentId, tagIds);
}

