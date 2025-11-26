import type { R2Bucket, R2ObjectBody } from '@cloudflare/workers-types';
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql } from 'drizzle-orm';
import { contentLibrary } from '../../../schema';
import type { ContentVisibilityOptions, UploadContentParams } from '../types';
import { addTagsToContent } from '../utils/tag-helpers';

export class MediaService {
  constructor(private readonly db: D1Database, private readonly bucket: R2Bucket) {}

  async uploadContent(params: UploadContentParams): Promise<{ id: string; r2Key: string }> {
    const contentId = crypto.randomUUID();
    const ext = params.fileName.split('.').pop() || 'bin';
    const r2Key = `${params.metadata.contentType}s/${contentId}.${ext}`;
    const now = new Date();
    const d1 = drizzle(this.db);

    try {
      // STEP 1: Create DB record with 'pending_upload' status
      // This prevents orphaned R2 files if the process crashes
      await d1.insert(contentLibrary).values({
        id: contentId,
        title: params.metadata.title,
        subtitle: params.metadata.subtitle,
        author: params.metadata.author,
        narrator: params.metadata.narrator,
        description: params.metadata.description,
        contentType: params.metadata.contentType,
        format: ext,
        r2Key,
        fileSize: params.fileSize,
        duration: params.metadata.duration,
        pageCount: params.metadata.pageCount,
        hskLevel: params.metadata.hskLevel,
        difficulty: params.metadata.difficulty,
        targetAudience: params.metadata.targetAudience,
        category: params.metadata.category,
        genre: params.metadata.genre,
        seriesName: params.metadata.seriesName,
        seriesOrder: params.metadata.seriesOrder,
        language: params.metadata.language || 'zh',
        isPublished: false,
        isFeatured: false,
        isFree: true,
        requiresPremium: false,
        uploadStatus: 'pending_upload', // Start as pending
        createdAt: now,
        updatedAt: now,
      });

      // Add tags
      await addTagsToContent(this.db, contentId, params.metadata.tags);

      // STEP 2: Update to 'uploading' before R2 operation
      await d1
        .update(contentLibrary)
        .set({ uploadStatus: 'uploading' })
        .where(eq(contentLibrary.id, contentId));

      // STEP 3: Upload to R2
      await this.bucket.put(r2Key, params.file, {
        httpMetadata: { contentType: params.fileType },
        customMetadata: {
          originalName: params.fileName,
          uploadedAt: now.toISOString(),
          contentId,
        },
      });

      // STEP 4: Mark as 'ready' - upload complete
      await d1
        .update(contentLibrary)
        .set({ uploadStatus: 'ready', updatedAt: new Date() })
        .where(eq(contentLibrary.id, contentId));

      return { id: contentId, r2Key };
    } catch (error: any) {
      // Mark as failed but keep the DB record for debugging
      try {
        await d1
          .update(contentLibrary)
          .set({ uploadStatus: 'failed', updatedAt: new Date() })
          .where(eq(contentLibrary.id, contentId));
      } catch {
        // If this fails, the cleanup cron will handle it
      }

      // Clean up R2 if it was partially uploaded
      try {
        await this.bucket.delete(r2Key);
      } catch {
        // Ignore cleanup failure - cleanup cron will handle it
      }

      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async uploadCoverImage(contentId: string, imageBuffer: ArrayBuffer, fileName: string, fileType: string) {
    const ext = fileName.split('.').pop() || 'jpg';
    const r2Key = `covers/${contentId}.${ext}`;
    const d1 = drizzle(this.db);

    await this.bucket.put(r2Key, imageBuffer, {
      httpMetadata: { contentType: fileType },
    });

    try {
      await d1
        .update(contentLibrary)
        .set({ coverImageR2Key: r2Key, updatedAt: new Date() })
        .where(eq(contentLibrary.id, contentId));
    } catch (error) {
      try {
        await this.bucket.delete(r2Key);
      } catch {
        // ignore cleanup issues
      }
      throw new Error(`Failed to update cover image: ${(error as Error).message}`);
    }

    return r2Key;
  }

  async uploadSample(contentId: string, sampleBuffer: ArrayBuffer, fileName: string, fileType: string) {
    const ext = fileName.split('.').pop() || 'mp3';
    const r2Key = `samples/${contentId}-preview.${ext}`;
    const d1 = drizzle(this.db);

    await this.bucket.put(r2Key, sampleBuffer, {
      httpMetadata: { contentType: fileType },
    });

    try {
      await d1
        .update(contentLibrary)
        .set({ sampleR2Key: r2Key, updatedAt: new Date() })
        .where(eq(contentLibrary.id, contentId));
    } catch (error) {
      try {
        await this.bucket.delete(r2Key);
      } catch {
        // ignore cleanup issues
      }
      throw new Error(`Failed to update sample: ${(error as Error).message}`);
    }

    return r2Key;
  }

  async getSignedUrl(contentId: string, options?: ContentVisibilityOptions): Promise<string> {
    const d1 = drizzle(this.db);
    const includeUnpublished = options?.includeUnpublished ?? false;

    const content = await d1
      .select({
        id: contentLibrary.id,
        r2Key: contentLibrary.r2Key,
        isPublished: contentLibrary.isPublished,
      })
      .from(contentLibrary)
      .where(eq(contentLibrary.id, contentId))
      .get();

    if (!content) {
      throw new Error('Content not found');
    }
    if (!includeUnpublished && !content.isPublished) {
      throw new Error('Content not published');
    }
    if (!content.r2Key) {
      throw new Error('Content has no R2 file');
    }

    const object = await this.bucket.head(content.r2Key);
    if (!object) {
      throw new Error('File not found in R2 storage');
    }

    return `/stream/${contentId}`;
  }

  async streamContent(contentId: string, options?: ContentVisibilityOptions): Promise<R2ObjectBody | null> {
    const includeUnpublished = options?.includeUnpublished ?? false;
    const d1 = drizzle(this.db);

    const content = await d1
      .select()
      .from(contentLibrary)
      .where(eq(contentLibrary.id, contentId))
      .get();

    if (!content || !content.r2Key) {
      return null;
    }

    if (!includeUnpublished && !content.isPublished) {
      return null;
    }

    await d1
      .update(contentLibrary)
      .set({ viewCount: sql`${contentLibrary.viewCount} + 1` })
      .where(eq(contentLibrary.id, contentId));

    return await this.bucket.get(content.r2Key);
  }

  async deleteContent(contentId: string) {
    const d1 = drizzle(this.db);
    const content = await d1
      .select()
      .from(contentLibrary)
      .where(eq(contentLibrary.id, contentId))
      .get();

    if (!content) {
      throw new Error('Content not found');
    }

    const deletePromises = [];
    if (content.r2Key) deletePromises.push(this.bucket.delete(content.r2Key));
    if (content.coverImageR2Key) deletePromises.push(this.bucket.delete(content.coverImageR2Key));
    if (content.sampleR2Key) deletePromises.push(this.bucket.delete(content.sampleR2Key));
    await Promise.all(deletePromises);

    await d1.delete(contentLibrary).where(eq(contentLibrary.id, contentId));
  }
}

