import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, sql } from 'drizzle-orm';
import { contentLibrary, userLibrary } from '../../../schema';

export class UserLibraryService {
  constructor(private readonly db: D1Database) {}

  async updateUserProgress(params: {
    userId: string;
    contentId: string;
    progressSeconds?: number;
    progressPage?: number;
    progressPercentage?: number;
    status?: 'not_started' | 'in_progress' | 'completed';
    userRating?: number;
  }) {
    const d1 = drizzle(this.db);

    await d1
      .insert(userLibrary)
      .values({
        userId: params.userId,
        contentId: params.contentId,
        progressSeconds: params.progressSeconds || 0,
        progressPage: params.progressPage || 0,
        progressPercentage: params.progressPercentage || 0,
        status: params.status || 'in_progress',
        userRating: params.userRating,
        startedAt: new Date(),
        lastAccessedAt: new Date(),
        ...(params.status === 'completed' && { completedAt: new Date() }),
      })
      .onConflictDoUpdate({
        target: [userLibrary.userId, userLibrary.contentId],
        set: {
          ...(params.progressSeconds !== undefined && { progressSeconds: params.progressSeconds }),
          ...(params.progressPage !== undefined && { progressPage: params.progressPage }),
          ...(params.progressPercentage !== undefined && { progressPercentage: params.progressPercentage }),
          ...(params.status && { status: params.status }),
          ...(params.userRating !== undefined && { userRating: params.userRating }),
          lastAccessedAt: new Date(),
          ...(params.status === 'completed' && { completedAt: new Date() }),
        },
      });
  }

  async toggleFavorite(userId: string, contentId: string) {
    const d1 = drizzle(this.db);

    const current = await d1
      .select()
      .from(userLibrary)
      .where(and(eq(userLibrary.userId, userId), eq(userLibrary.contentId, contentId)))
      .get();

    const newFavoriteState = current ? !current.isFavorite : true;

    await d1
      .insert(userLibrary)
      .values({
        userId,
        contentId,
        isFavorite: newFavoriteState,
        lastAccessedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userLibrary.userId, userLibrary.contentId],
        set: {
          isFavorite: newFavoriteState,
          lastAccessedAt: new Date(),
        },
      });

    const favoriteTotal = await this.getFavoriteCount(contentId);

    await d1
      .update(contentLibrary)
      .set({ favoriteCount: favoriteTotal })
      .where(eq(contentLibrary.id, contentId));

    return newFavoriteState;
  }

  private async getFavoriteCount(contentId: string) {
    const d1 = drizzle(this.db);
    const favoriteCountRow = await d1
      .select({
        total: sql<number>`count(*)`,
      })
      .from(userLibrary)
      .where(and(eq(userLibrary.contentId, contentId), eq(userLibrary.isFavorite, true)))
      .get();
    return favoriteCountRow?.total ?? 0;
  }
}

