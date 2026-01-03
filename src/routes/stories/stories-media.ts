/**
 * Stories Media Routes
 * Cover image and audio file uploads
 */

import { Hono } from 'hono';
import type { AppEnv } from '../../types/app';
import { createStoriesDomain } from '../../domains/stories';
import { logWithContext } from '../../utils/logger';

const app = new Hono<AppEnv>();

const getServices = (env: AppEnv['Bindings']) => createStoriesDomain(env);

/**
 * POST /stories/:id/cover
 * Upload cover image for story
 */
app.post('/:id/cover', async (c) => {
  const storyId = c.req.param('id');
  
  try {
    const formData = await c.req.formData();
    const cover = formData.get('cover') as File | null;
    
    if (!cover) {
      return c.json({ error: 'No cover image provided' }, 400);
    }

    if (cover.size > 5 * 1024 * 1024) {
      return c.json({ error: 'Cover image too large (max 5MB)' }, 400);
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(cover.type)) {
      return c.json({ error: 'Invalid image type' }, 400);
    }

    // Upload to R2
    const ext = cover.name.split('.').pop() || 'jpg';
    const r2Key = `images/stories/${storyId}.${ext}`;
    
    await c.env.CONTENT_BUCKET.put(r2Key, await cover.arrayBuffer(), {
      httpMetadata: { contentType: cover.type },
    });

    // Update story
    const { stories } = getServices(c.env);
    await stories.uploadCoverImage(storyId, r2Key);

    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext('error', 'stories.cover.upload_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to upload cover' }, 500);
  }
});

/**
 * POST /stories/:id/sentences/:sentenceId/audio
 * Upload audio for a sentence
 * 
 * Supports "draft" as storyId for new stories - will upload to R2 only
 * without updating database (no sentence exists yet)
 */
app.post('/:id/sentences/:sentenceId/audio', async (c) => {
  const storyId = c.req.param('id');
  const sentenceId = c.req.param('sentenceId');
  const isDraft = storyId === 'draft';
  
  try {
    const formData = await c.req.formData();
    const audio = formData.get('audio') as File | null;
    
    if (!audio) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    if (audio.size > 10 * 1024 * 1024) {
      return c.json({ error: 'Audio file too large (max 10MB)' }, 400);
    }

    // Log file details for debugging
    logWithContext('info', 'stories.audio.upload_attempt', {
      requestId: c.get('requestId'),
      meta: { 
        storyId, 
        sentenceId, 
        fileName: audio.name, 
        fileType: audio.type, 
        fileSize: audio.size,
        isDraft,
      },
    });

    // Be more permissive with audio types (browsers report different types)
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/wav', 'audio/mp4', 'audio/x-mp3'];
    const isAudioFile = audio.type.startsWith('audio/') || audio.name.toLowerCase().endsWith('.mp3');
    
    if (!isAudioFile && !allowedTypes.includes(audio.type)) {
      logWithContext('warn', 'stories.audio.invalid_type', {
        requestId: c.get('requestId'),
        meta: { fileType: audio.type, fileName: audio.name },
      });
      return c.json({ error: `Invalid audio type: ${audio.type}` }, 400);
    }

    // Upload to R2
    const ext = audio.name.split('.').pop()?.toLowerCase() || 'mp3';
    const r2Key = `stories/sentences/${storyId}/${sentenceId}.${ext}`;
    
    const arrayBuffer = await audio.arrayBuffer();
    logWithContext('info', 'stories.audio.uploading_to_r2', {
      requestId: c.get('requestId'),
      meta: { r2Key, bufferSize: arrayBuffer.byteLength },
    });
    
    await c.env.CONTENT_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: { contentType: 'audio/mpeg' }, // Force correct content type
    });

    // Only update database if NOT a draft (sentence exists)
    if (!isDraft) {
      const { stories } = getServices(c.env);
      await stories.uploadSentenceAudio(sentenceId, r2Key);
    }

    logWithContext('info', 'stories.audio.uploaded', {
      requestId: c.get('requestId'),
      meta: { storyId, sentenceId, r2Key, isDraft },
    });

    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext('error', 'stories.audio.upload_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, sentenceId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to upload audio' }, 500);
  }
});

/**
 * DELETE /stories/:id/sentences/:sentenceId/audio
 * Delete audio for a sentence
 * 
 * For draft stories (storyId='draft'), deletes directly from R2 using known path
 * For saved stories, looks up the sentence in DB first
 */
app.delete('/:id/sentences/:sentenceId/audio', async (c) => {
  const storyId = c.req.param('id');
  const sentenceId = c.req.param('sentenceId');
  const isDraft = storyId === 'draft';
  
  try {
    // For drafts, we know the R2 key format - delete directly
    if (isDraft) {
      const r2Key = `stories/sentences/draft/${sentenceId}.mp3`;
      try {
        await c.env.CONTENT_BUCKET.delete(r2Key);
        logWithContext('info', 'stories.audio.deleted_draft', {
          requestId: c.get('requestId'),
          meta: { storyId, sentenceId, r2Key },
        });
      } catch (r2Err) {
        // File might not exist, that's ok
        logWithContext('warn', 'stories.audio.draft_delete_r2_failed', {
          requestId: c.get('requestId'),
          meta: { r2Key, error: (r2Err as Error).message },
        });
      }
      return c.json({ success: true });
    }

    // For saved stories, look up sentence in DB
    const { stories } = getServices(c.env);
    const sentence = await stories.getSentence(sentenceId);
    
    if (!sentence) {
      return c.json({ error: 'Sentence not found' }, 404);
    }

    // Delete from R2 if there's an audio file
    if (sentence.audioR2Key) {
      try {
        await c.env.CONTENT_BUCKET.delete(sentence.audioR2Key);
      } catch (r2Err) {
        // Log but don't fail - the file might not exist
        logWithContext('warn', 'stories.audio.r2_delete_failed', {
          requestId: c.get('requestId'),
          meta: { storyId, sentenceId, r2Key: sentence.audioR2Key, error: (r2Err as Error).message },
        });
      }
    }

    // Clear audio fields on the sentence
    await stories.clearSentenceAudio(sentenceId);

    logWithContext('info', 'stories.audio.deleted', {
      requestId: c.get('requestId'),
      meta: { storyId, sentenceId },
    });

    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.audio.delete_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, sentenceId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to delete audio' }, 500);
  }
});

export default app;

