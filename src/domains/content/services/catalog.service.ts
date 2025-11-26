import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import {
  contentLibrary,
  contentTags,
  tags,
  userLibrary,
} from '../../../schema';
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  like,
  or,
  sql,
} from 'drizzle-orm';
import type { ContentVisibilityOptions, SearchContentParams, UpdateContentMetadata } from '../types';
import { replaceContentTags } from '../utils/tag-helpers';

export class CatalogService {
  constructor(private readonly db: D1Database) {}

  async getContent(contentId: string, options?: ContentVisibilityOptions) {
    const d1 = drizzle(this.db);
    const includeUnpublished = options?.includeUnpublished ?? false;

    const content = await d1
      .select()
      .from(contentLibrary)
      .where(eq(contentLibrary.id, contentId))
      .get();

    if (!content) {
      throw new Error('Content not found');
    }

    if (!includeUnpublished && !content.isPublished) {
      throw new Error('Content not published');
    }

    const tagResults = await d1
      .select({
        id: tags.id,
        name: tags.name,
        category: tags.category,
        color: tags.color,
      })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.id))
      .where(eq(contentTags.contentId, contentId))
      .all();

    return {
      ...content,
      tags: tagResults,
    };
  }

  async searchContent(params: SearchContentParams) {
    const d1 = drizzle(this.db);
    const conditions = [];
    if (!params.includeUnpublished) {
      conditions.push(eq(contentLibrary.isPublished, true));
    }
    if (params.contentType) {
      conditions.push(eq(contentLibrary.contentType, params.contentType));
    }
    if (params.hskLevel) {
      conditions.push(eq(contentLibrary.hskLevel, params.hskLevel));
    }
    if (params.category) {
      conditions.push(eq(contentLibrary.category, params.category));
    }
    if (params.genre) {
      conditions.push(eq(contentLibrary.genre, params.genre));
    }
    if (params.difficulty) {
      conditions.push(eq(contentLibrary.difficulty, params.difficulty as any));
    }
    if (params.isFeatured !== undefined) {
      conditions.push(eq(contentLibrary.isFeatured, params.isFeatured));
    }
    if (params.isFree !== undefined) {
      conditions.push(eq(contentLibrary.isFree, params.isFree));
    }
    if (params.query) {
      conditions.push(
        or(
          like(contentLibrary.title, `%${params.query}%`),
          like(contentLibrary.author, `%${params.query}%`),
          like(contentLibrary.description, `%${params.query}%`)
        )!
      );
    }

    const baseQuery =
      conditions.length > 0
        ? d1.select().from(contentLibrary).where(and(...conditions))
        : d1.select().from(contentLibrary);

    let finalQuery: any = baseQuery;
    switch (params.sortBy) {
      case 'newest':
        finalQuery = baseQuery.orderBy(desc(contentLibrary.createdAt));
        break;
      case 'popular':
        finalQuery = baseQuery.orderBy(desc(contentLibrary.viewCount));
        break;
      case 'rating':
        finalQuery = baseQuery.orderBy(desc(contentLibrary.averageRating));
        break;
      case 'title':
        finalQuery = baseQuery.orderBy(asc(contentLibrary.title));
        break;
      default:
        finalQuery = baseQuery.orderBy(desc(contentLibrary.createdAt));
    }

    const results = await finalQuery
      .limit(params.limit || 20)
      .offset(params.offset || 0)
      .all();

    if (params.tags && params.tags.length > 0) {
      const contentIds = results.map((content: any) => content.id);
      if (contentIds.length === 0) {
        return [];
      }
      const taggedContent = await d1
        .select({ contentId: contentTags.contentId, tagId: contentTags.tagId })
        .from(contentTags)
        .where(
          and(
            inArray(contentTags.contentId, contentIds),
            inArray(contentTags.tagId, params.tags)
          )
        )
        .all();
      const matchMap = new Map<string, number>();
      taggedContent.forEach(({ contentId }) => {
        matchMap.set(contentId, (matchMap.get(contentId) || 0) + 1);
      });
      return results.filter((content: any) => matchMap.get(content.id) === params.tags?.length);
    }

    return results;
  }

  async updateContent(contentId: string, updates: UpdateContentMetadata) {
    const d1 = drizzle(this.db);
    const { tags: newTags, ...contentUpdates } = updates;

    if (Object.keys(contentUpdates).length > 0) {
      await d1
        .update(contentLibrary)
        .set({
          ...(contentUpdates as any),
          updatedAt: new Date(),
          ...(updates.isPublished === true && { publishedAt: new Date() }),
        })
        .where(eq(contentLibrary.id, contentId));
    }

    if (newTags) {
      await replaceContentTags(this.db, contentId, newTags);
    }
  }

  async createTag(params: {
    name: string;
    category?: 'topic' | 'grammar' | 'skill' | 'genre';
    color?: string;
    description?: string;
  }) {
    const d1 = drizzle(this.db);
    const tagId = crypto.randomUUID();
    const slug = params.name.toLowerCase().replace(/\s+/g, '-');

    await d1.insert(tags).values({
      id: tagId,
      name: params.name,
      slug,
      category: params.category,
      color: params.color,
      description: params.description,
    });

    return { id: tagId };
  }

  async getAllTags() {
    const d1 = drizzle(this.db);
    return await d1.select().from(tags).all();
  }

  async getFavoriteCounts(contentId: string) {
    const d1 = drizzle(this.db);
    const result = await d1
      .select({
        total: sql<number>`count(*)`,
      })
      .from(userLibrary)
      .where(and(eq(userLibrary.contentId, contentId), eq(userLibrary.isFavorite, true)))
      .get();
    return result?.total ?? 0;
  }
}

