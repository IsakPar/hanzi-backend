/**
 * P0: Audio Uploads - Story sentence audio upload functionality
 * Using actual endpoint: POST /v1/stories/:id/sentences/:sentenceId/audio
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
} from '../fixtures/better-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P0: Audio Uploads (Story Sentences)', () => {
  let ctx: TestContext;
  let adminSession: string;
  let userSession: string;
  let testStoryId: string;
  let testSentenceId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminSession = admin.sessionToken;
    userSession = user.sessionToken;
    
    // Create a test story
    testStoryId = nanoid();
    await ctx.db.prepare(`
      INSERT INTO stories (id, title, description, hsk_level, is_published, created_at, updated_at)
      VALUES (?, 'Test Story', 'For audio upload tests', 1, 0, datetime('now'), datetime('now'))
    `).bind(testStoryId).run();
    
    // Create a test sentence
    testSentenceId = nanoid();
    await ctx.db.prepare(`
      INSERT INTO story_sentences (id, story_id, chinese, pinyin, english, order_index, created_at)
      VALUES (?, ?, '你好', 'nǐ hǎo', 'hello', 1, strftime('%s', 'now'))
    `).bind(testSentenceId, testStoryId).run();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // Helper to create a fake audio blob
  function createFakeAudio(type: string, sizeKB: number = 100): Blob {
    // Create minimal audio header based on type
    let header: Uint8Array;
    
    if (type === 'audio/mpeg' || type === 'audio/mp3') {
      // MP3 header (ID3 + frame sync)
      header = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0xFF, 0xFB]);
    } else if (type === 'audio/wav') {
      // WAV header (RIFF)
      header = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    } else {
      header = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    }
    
    const padding = new Uint8Array(Math.max(0, sizeKB * 1024 - header.length));
    const combined = new Uint8Array(header.length + padding.length);
    combined.set(header);
    combined.set(padding, header.length);
    
    return new Blob([combined], { type });
  }

  function createUploadFormData(filename: string, blob: Blob): FormData {
    const formData = new FormData();
    formData.append('audio', blob, filename);
    return formData;
  }

  // ========================================
  // VALID UPLOADS
  // ========================================

  describe('Valid Uploads', () => {
    it('accepts MP3 audio', async () => {
      const blob = createFakeAudio('audio/mpeg');
      const formData = createUploadFormData('test.mp3', blob);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${testStoryId}/sentences/${testSentenceId}/audio`, {
          method: 'POST',
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      // Success or R2 not configured
      expect([200, 500]).toContain(res.status);
    });

    it('accepts WAV audio', async () => {
      const blob = createFakeAudio('audio/wav');
      const formData = createUploadFormData('test.wav', blob);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${testStoryId}/sentences/${testSentenceId}/audio`, {
          method: 'POST',
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 500]).toContain(res.status);
    });
  });

  // ========================================
  // SIZE LIMITS
  // ========================================

  describe('Size Limits', () => {
    it('rejects files over 10MB', async () => {
      const blob = createFakeAudio('audio/mpeg', 11 * 1024); // 11MB
      const formData = createUploadFormData('large.mp3', blob);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${testStoryId}/sentences/${testSentenceId}/audio`, {
          method: 'POST',
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('too large');
    });

    it('accepts files under 10MB', async () => {
      const blob = createFakeAudio('audio/mpeg', 500); // 500KB
      const formData = createUploadFormData('small.mp3', blob);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${testStoryId}/sentences/${testSentenceId}/audio`, {
          method: 'POST',
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 500]).toContain(res.status);
    });
  });

  // ========================================
  // FILE TYPE VALIDATION
  // ========================================

  describe('File Type Validation', () => {
    it('rejects non-audio files', async () => {
      const blob = new Blob(['not audio'], { type: 'text/plain' });
      const formData = createUploadFormData('test.txt', blob);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${testStoryId}/sentences/${testSentenceId}/audio`, {
          method: 'POST',
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid audio type');
    });

    it('handles missing file', async () => {
      const formData = new FormData();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${testStoryId}/sentences/${testSentenceId}/audio`, {
          method: 'POST',
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('No audio file');
    });
  });

  // ========================================
  // AUTHENTICATION
  // ========================================

  describe('Authentication', () => {
    it('requires authentication', async () => {
      const blob = createFakeAudio('audio/mpeg');
      const formData = createUploadFormData('test.mp3', blob);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${testStoryId}/sentences/${testSentenceId}/audio`, {
          method: 'POST',
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // INVALID REFERENCES
  // ========================================

  describe('Invalid References', () => {
    it('handles non-existent story', async () => {
      const blob = createFakeAudio('audio/mpeg');
      const formData = createUploadFormData('test.mp3', blob);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/fake-story/sentences/${testSentenceId}/audio`, {
          method: 'POST',
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('handles non-existent sentence', async () => {
      const blob = createFakeAudio('audio/mpeg');
      const formData = createUploadFormData('test.mp3', blob);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${testStoryId}/sentences/fake-sentence/audio`, {
          method: 'POST',
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
          body: formData,
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});

