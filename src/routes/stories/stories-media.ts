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
 */
app.post('/:id/sentences/:sentenceId/audio', async (c) => {
  const storyId = c.req.param('id');
  const sentenceId = c.req.param('sentenceId');
  
  try {
    const formData = await c.req.formData();
    const audio = formData.get('audio') as File | null;
    
    if (!audio) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    if (audio.size > 10 * 1024 * 1024) {
      return c.json({ error: 'Audio file too large (max 10MB)' }, 400);
    }

    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/wav'];
    if (!allowedTypes.includes(audio.type)) {
      return c.json({ error: 'Invalid audio type' }, 400);
    }

    // Upload to R2
    const ext = audio.name.split('.').pop() || 'mp3';
    const r2Key = `stories/sentences/${storyId}/${sentenceId}.${ext}`;
    
    await c.env.CONTENT_BUCKET.put(r2Key, await audio.arrayBuffer(), {
      httpMetadata: { contentType: audio.type },
    });

    // Update sentence
    const { stories } = getServices(c.env);
    await stories.uploadSentenceAudio(sentenceId, r2Key);

    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext('error', 'stories.audio.upload_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, sentenceId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to upload audio' }, 500);
  }
});

export default app;

