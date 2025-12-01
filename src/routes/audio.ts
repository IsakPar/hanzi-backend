/**
 * Audio Routes
 * Simple audio upload endpoint used by AudioUploader component
 */

import { Hono } from 'hono';
import type { AppEnv } from '../types/app';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { logWithContext } from '../utils/logger';
import { uploadRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting to uploads
app.use('/*', uploadRateLimit);

// Require auth for all audio uploads
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin', 'user'] }));

/**
 * POST /upload - Upload audio file to R2
 * Used by AudioUploader.tsx component
 */
app.post('/upload', async (c) => {
  const requestId = c.get('requestId');
  const user = c.get('user');
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const lessonId = formData.get('lessonId') as string || 'general';
    const context = formData.get('context') as string || 'audio';
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.mp3')) {
      return c.json({ error: `Unsupported file type: ${file.type}` }, 400);
    }
    
    // Validate file size (max 5MB for this endpoint)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File too large. Maximum size is 5MB.' }, 400);
    }
    
    // Generate unique key
    const ext = file.name.split('.').pop() || 'mp3';
    const key = `audio/${lessonId}/${context}/${crypto.randomUUID()}.${ext}`;
    
    // Upload to R2
    const fileBuffer = await file.arrayBuffer();
    await c.env.CONTENT_BUCKET.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type || 'audio/mpeg',
      },
    });
    
    // Generate URL
    const url = `https://content.polymasterlabs.com/${key}`;
    
    logWithContext('info', 'audio.upload', {
      requestId,
      meta: { key, size: file.size, userId: user?.id },
    });
    
    return c.json({ 
      success: true, 
      url, 
      key,
      size: file.size,
    }, 201);
  } catch (error) {
    logWithContext('error', 'audio.upload_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Upload failed' }, 500);
  }
});

export default app;

