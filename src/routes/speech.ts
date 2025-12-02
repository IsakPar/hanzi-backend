import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { AnalyticsService } from '../services/analytics';
import { AIUsageLogger } from '../services/ai-usage-logger';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';
import { aiRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting to speech endpoints (ElevenLabs costs $$)
app.use('/*', aiRateLimit);

// All speech endpoints require admin auth (ElevenLabs costs $$)
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// ═══════════════════════════════════════════════════════════
// VOICE CONFIGURATION
// ═══════════════════════════════════════════════════════════

// ElevenLabs voice IDs for Chinese
// These are multilingual voices that work well with Chinese
// You can find more at: https://elevenlabs.io/voice-library
const VOICES: Record<string, { id: string; name: string; gender: string; description: string }> = {
  'chinese-female-1': {
    id: 'EXAVITQu4vr4xnSDxMaL',  // "Sarah" - clear female voice
    name: 'Mei Lin',
    gender: 'female',
    description: 'Clear, natural female voice. Great for narration and stories.',
  },
  'chinese-female-2': {
    id: 'jBpfuIE2acCO8z3wKNLl',  // "Gigi" - younger female voice
    name: 'Xiao Mei',
    gender: 'female', 
    description: 'Younger female voice. Good for casual, friendly content.',
  },
  'chinese-male-1': {
    id: 'TX3LPaxmHKxFdv7VOQHJ',  // "Liam" - clear male voice
    name: 'Wei Chen',
    gender: 'male',
    description: 'Clear, natural male voice. Great for narration.',
  },
  'chinese-male-2': {
    id: 'pqHfZKP75CvOlQylNhV4',  // "Bill" - deeper male voice
    name: 'Zhang Wei',
    gender: 'male',
    description: 'Deeper male voice. Good for formal content.',
  },
};

const DEFAULT_VOICE = 'chinese-female-1';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

const generateSpeechSchema = z.object({
  text: z.string().min(1).max(500),
  voice: z.string().default(DEFAULT_VOICE),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

const saveSpeechSchema = z.object({
  audioBase64: z.string().min(1),
  storyId: z.string().min(1),
  segmentId: z.string().min(1),
  durationMs: z.number().int().optional(),
});

const generateLessonAudioSchema = z.object({
  text: z.string().min(1).max(500),
  lessonId: z.string().min(1),
  blockId: z.string().min(1),
  voice: z.string().default(DEFAULT_VOICE),
  speed: z.number().min(0.5).max(2.0).default(0.8),
});

// NEW: Preview-only schema (no save)
const previewLessonAudioSchema = z.object({
  text: z.string().min(1).max(500),
  voice: z.string().default(DEFAULT_VOICE),
});

// NEW: Save lesson audio schema
const saveLessonAudioSchema = z.object({
  audioBase64: z.string().min(1),
  lessonId: z.string().min(1),
  blockId: z.string().min(1),
  durationMs: z.number().int().optional(),
});

const generateBatchSchema = z.object({
  segments: z.array(z.object({
    id: z.string(),
    text: z.string().min(1).max(500),
  })).min(1).max(20),
  voice: z.string().default(DEFAULT_VOICE),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function getApiKey(env: AppEnv['Bindings']): string | null {
  return (env as Record<string, unknown>).ELEVENLABS_API_KEY as string || null;
}

function getVoiceId(voiceKey: string): string {
  const voice = VOICES[voiceKey];
  return voice?.id || VOICES[DEFAULT_VOICE].id;
}

async function callElevenLabsAPI(
  apiKey: string,
  voiceId: string,
  text: string,
  speed: number = 1.0
): Promise<{ audioBuffer: ArrayBuffer; error?: string; statusCode?: number }> {
  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
          // Speed is controlled via speaking_rate in some models
          // For multilingual_v2, we may need to adjust text or use SSML
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'ElevenLabs API error';
      
      // Parse specific errors
      if (response.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait and try again.';
      } else if (response.status === 402 || errorText.includes('quota')) {
        errorMessage = 'Monthly character quota exceeded. Please upgrade your plan.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request. Check text length and voice selection.';
      }
      
      return { 
        audioBuffer: new ArrayBuffer(0), 
        error: errorMessage,
        statusCode: response.status 
      };
    }

    const audioBuffer = await response.arrayBuffer();
    return { audioBuffer };
  } catch (error) {
    return { 
      audioBuffer: new ArrayBuffer(0), 
      error: `Network error: ${(error as Error).message}`,
      statusCode: 500 
    };
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Estimate duration based on byte size (rough: ~16KB per second for MP3)
function estimateDuration(byteLength: number): number {
  return Math.round((byteLength / 16000) * 1000);
}

// Estimate cost (ElevenLabs charges ~$0.18 per 1000 chars on Starter)
function estimateCost(characterCount: number): number {
  return (characterCount / 1000) * 0.18;
}

// ═══════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /speech/voices
 * List available voices
 */
app.get('/voices', (c) => {
  const voices = Object.entries(VOICES).map(([key, voice]) => ({
    id: key,
    name: voice.name,
    gender: voice.gender,
    description: voice.description,
  }));

  return c.json({ voices });
});

/**
 * GET /speech/status
 * Check if ElevenLabs is configured
 */
app.get('/status', (c) => {
  const apiKey = getApiKey(c.env);
  
  return c.json({
    configured: !!apiKey,
    defaultVoice: DEFAULT_VOICE,
    voiceCount: Object.keys(VOICES).length,
  });
});

/**
 * POST /speech/generate
 * Generate speech from text (returns base64 for preview, NOT saved)
 */
app.post('/generate', zValidator('json', generateSpeechSchema), async (c) => {
  const { text, voice, speed } = c.req.valid('json');
  const apiKey = getApiKey(c.env);

  if (!apiKey) {
    return c.json({ 
      error: 'ElevenLabs API key not configured',
      hint: 'Run: npx wrangler secret put ELEVENLABS_API_KEY'
    }, 500);
  }

  const voiceId = getVoiceId(voice);
  const characterCount = text.length;

  logWithContext('info', 'speech.generate_start', {
    requestId: c.get('requestId'),
    meta: { textLength: characterCount, voice, speed },
  });

  const { audioBuffer, error, statusCode } = await callElevenLabsAPI(apiKey, voiceId, text, speed);

  if (error) {
    logWithContext('error', 'speech.generate_failed', {
      requestId: c.get('requestId'),
      meta: { error, statusCode },
    });
    
    // Return appropriate status code
    const httpStatus = statusCode === 429 ? 429 : statusCode === 402 ? 402 : 500;
    return c.json({ error }, httpStatus);
  }

  const audioBase64 = arrayBufferToBase64(audioBuffer);
  const durationMs = estimateDuration(audioBuffer.byteLength);

  logWithContext('info', 'speech.generate_success', {
    requestId: c.get('requestId'),
    meta: { 
      textLength: characterCount, 
      audioBytes: audioBuffer.byteLength,
      durationMs,
    },
  });

  // Record to analytics for cost tracking
  const analytics = new AnalyticsService(c.env.DB);
  const user = c.get('user');
  await analytics.record({
    type: 'speech.generate',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: {
      charactersUsed: characterCount,
      voice,
      durationMs,
      estimatedCost: estimateCost(characterCount),
    },
  });

  // Log ElevenLabs usage for AI Control Center
  const aiLogger = new AIUsageLogger(c.env.DB);
  await aiLogger.logElevenLabs({
    userId: user?.id,
    characters: characterCount,
    success: true,
    voiceId,
  });

  return c.json({
    audioBase64,
    durationMs,
    format: 'audio/mpeg',
    charactersUsed: characterCount,
    estimatedCost: estimateCost(characterCount),
  });
});

/**
 * POST /speech/generate-batch
 * Generate speech for multiple segments
 */
app.post('/generate-batch', zValidator('json', generateBatchSchema), async (c) => {
  const { segments, voice, speed } = c.req.valid('json');
  const apiKey = getApiKey(c.env);

  if (!apiKey) {
    return c.json({ 
      error: 'ElevenLabs API key not configured',
      hint: 'Run: npx wrangler secret put ELEVENLABS_API_KEY'
    }, 500);
  }

  const voiceId = getVoiceId(voice);
  const results: Array<{
    id: string;
    audioBase64?: string;
    durationMs?: number;
    error?: string;
  }> = [];

  let totalCharacters = 0;

  for (const segment of segments) {
    const { audioBuffer, error } = await callElevenLabsAPI(apiKey, voiceId, segment.text, speed);

    if (error) {
      results.push({ id: segment.id, error });
      // Continue with other segments even if one fails
      continue;
    }

    const audioBase64 = arrayBufferToBase64(audioBuffer);
    const durationMs = estimateDuration(audioBuffer.byteLength);
    totalCharacters += segment.text.length;

    results.push({
      id: segment.id,
      audioBase64,
      durationMs,
    });
  }

  const successCount = results.filter(r => !r.error).length;

  logWithContext('info', 'speech.generate_batch_complete', {
    requestId: c.get('requestId'),
    meta: { 
      total: segments.length, 
      success: successCount,
      totalCharacters,
    },
  });

  // Log ElevenLabs usage for AI Control Center (only successful chars)
  if (totalCharacters > 0) {
    const aiLogger = new AIUsageLogger(c.env.DB);
    await aiLogger.logElevenLabs({
      characters: totalCharacters,
      success: true,
      voiceId,
    });
  }

  return c.json({
    results,
    totalCharacters,
    estimatedTotalCost: estimateCost(totalCharacters),
    successCount,
    failedCount: segments.length - successCount,
  });
});

/**
 * POST /speech/save
 * Save approved audio to R2
 */
app.post('/save', zValidator('json', saveSpeechSchema), async (c) => {
  const { audioBase64, storyId, segmentId, durationMs } = c.req.valid('json');

  try {
    // Convert base64 to binary
    const audioBuffer = base64ToArrayBuffer(audioBase64);

    // Generate R2 key
    const r2Key = `stories/segments/${storyId}/${segmentId}.mp3`;
    
    // Upload to R2
    await c.env.CONTENT_BUCKET.put(r2Key, audioBuffer, {
      httpMetadata: { contentType: 'audio/mpeg' },
    });

    // Get CDN URL
    const cdnBaseUrl = (c.env as Record<string, unknown>).CDN_BASE_URL as string || 'https://content.polymasterlabs.com';
    const audioUrl = `${cdnBaseUrl}/${r2Key}`;

    logWithContext('info', 'speech.saved', {
      requestId: c.get('requestId'),
      meta: { storyId, segmentId, r2Key, durationMs },
    });

    return c.json({
      success: true,
      r2Key,
      audioUrl,
      audioDurationMs: durationMs,
    });
  } catch (err) {
    logWithContext('error', 'speech.save_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, segmentId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to save audio' }, 500);
  }
});

/**
 * POST /speech/generate-for-lesson
 * Generate audio for a lesson block and save directly to R2
 * Returns CDN URL - no preview step needed
 */
app.post('/generate-for-lesson', zValidator('json', generateLessonAudioSchema), async (c) => {
  const { text, lessonId, blockId, voice, speed } = c.req.valid('json');
  const apiKey = getApiKey(c.env);

  if (!apiKey) {
    return c.json({ 
      error: 'ElevenLabs API key not configured',
      hint: 'Run: npx wrangler secret put ELEVENLABS_API_KEY'
    }, 500);
  }

  const voiceId = getVoiceId(voice);
  const characterCount = text.length;

  logWithContext('info', 'speech.generate_lesson_audio_start', {
    requestId: c.get('requestId'),
    meta: { lessonId, blockId, textLength: characterCount, voice, speed },
  });

  // Generate audio via ElevenLabs
  const { audioBuffer, error, statusCode } = await callElevenLabsAPI(apiKey, voiceId, text, speed);

  if (error) {
    logWithContext('error', 'speech.generate_lesson_audio_failed', {
      requestId: c.get('requestId'),
      meta: { lessonId, blockId, error, statusCode },
    });
    
    const httpStatus = statusCode === 429 ? 429 : statusCode === 402 ? 402 : 500;
    return c.json({ error }, httpStatus);
  }

  // Save directly to R2
  const effectiveLessonId = lessonId || 'draft';
  const r2Key = `lessons/audio/${effectiveLessonId}/${blockId}.mp3`;
  
  try {
    await c.env.CONTENT_BUCKET.put(r2Key, audioBuffer, {
      httpMetadata: { contentType: 'audio/mpeg' },
    });
  } catch (r2Error) {
    logWithContext('error', 'speech.generate_lesson_audio_r2_failed', {
      requestId: c.get('requestId'),
      meta: { lessonId, blockId, error: (r2Error as Error).message },
    });
    return c.json({ error: 'Failed to save audio to storage' }, 500);
  }

  // Get CDN URL
  const cdnBaseUrl = (c.env as Record<string, unknown>).CDN_BASE_URL as string || 'https://content.polymasterlabs.com';
  const audioUrl = `${cdnBaseUrl}/${r2Key}`;
  const durationMs = estimateDuration(audioBuffer.byteLength);

  logWithContext('info', 'speech.generate_lesson_audio_success', {
    requestId: c.get('requestId'),
    meta: { 
      lessonId, 
      blockId, 
      r2Key,
      textLength: characterCount, 
      audioBytes: audioBuffer.byteLength,
      durationMs,
    },
  });

  // Record to analytics for cost tracking
  const analytics = new AnalyticsService(c.env.DB);
  const user = c.get('user');
  await analytics.record({
    type: 'speech.generate_lesson',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: {
      lessonId,
      blockId,
      charactersUsed: characterCount,
      voice,
      durationMs,
      estimatedCost: estimateCost(characterCount),
    },
  });

  // Log ElevenLabs usage for AI Control Center
  const aiLogger = new AIUsageLogger(c.env.DB);
  await aiLogger.logElevenLabs({
    userId: user?.id,
    characters: characterCount,
    success: true,
    voiceId,
  });

  return c.json({
    success: true,
    audioUrl,
    durationMs,
    charactersUsed: characterCount,
    estimatedCost: estimateCost(characterCount),
  });
});

/**
 * POST /speech/preview-for-lesson
 * Generate audio preview for lesson block (returns base64, NOT saved to R2)
 * Use this for preview/approval flow before saving
 */
app.post('/preview-for-lesson', zValidator('json', previewLessonAudioSchema), async (c) => {
  const { text, voice } = c.req.valid('json');
  const apiKey = getApiKey(c.env);

  if (!apiKey) {
    return c.json({ 
      error: 'ElevenLabs API key not configured',
      hint: 'Run: npx wrangler secret put ELEVENLABS_API_KEY'
    }, 500);
  }

  const voiceId = getVoiceId(voice);
  const characterCount = text.length;

  logWithContext('info', 'speech.preview_lesson_audio_start', {
    requestId: c.get('requestId'),
    meta: { textLength: characterCount, voice },
  });

  // Generate audio via ElevenLabs (always at 1.0x speed - client adjusts playback)
  const { audioBuffer, error, statusCode } = await callElevenLabsAPI(apiKey, voiceId, text, 1.0);

  if (error) {
    logWithContext('error', 'speech.preview_lesson_audio_failed', {
      requestId: c.get('requestId'),
      meta: { error, statusCode },
    });
    
    const httpStatus = statusCode === 429 ? 429 : statusCode === 402 ? 402 : 500;
    return c.json({ error }, httpStatus);
  }

  const audioBase64 = arrayBufferToBase64(audioBuffer);
  const durationMs = estimateDuration(audioBuffer.byteLength);

  logWithContext('info', 'speech.preview_lesson_audio_success', {
    requestId: c.get('requestId'),
    meta: { 
      textLength: characterCount, 
      audioBytes: audioBuffer.byteLength,
      durationMs,
    },
  });

  // Record to analytics for cost tracking
  const analytics = new AnalyticsService(c.env.DB);
  const user = c.get('user');
  await analytics.record({
    type: 'speech.preview_lesson',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: {
      charactersUsed: characterCount,
      voice,
      durationMs,
      estimatedCost: estimateCost(characterCount),
    },
  });

  // Log ElevenLabs usage for AI Control Center
  const aiLogger = new AIUsageLogger(c.env.DB);
  await aiLogger.logElevenLabs({
    userId: user?.id,
    characters: characterCount,
    success: true,
    voiceId,
  });

  return c.json({
    success: true,
    audioBase64,
    durationMs,
    charactersUsed: characterCount,
    estimatedCost: estimateCost(characterCount),
  });
});

/**
 * POST /speech/save-for-lesson
 * Save approved audio (base64) to R2 for a lesson block
 * Used after preview/approval flow
 */
app.post('/save-for-lesson', zValidator('json', saveLessonAudioSchema), async (c) => {
  const { audioBase64, lessonId, blockId, durationMs } = c.req.valid('json');

  try {
    // Convert base64 to binary
    const audioBuffer = base64ToArrayBuffer(audioBase64);

    // Generate R2 key
    const effectiveLessonId = lessonId || 'draft';
    const r2Key = `lessons/audio/${effectiveLessonId}/${blockId}.mp3`;
    
    // Upload to R2
    await c.env.CONTENT_BUCKET.put(r2Key, audioBuffer, {
      httpMetadata: { contentType: 'audio/mpeg' },
    });

    // Get CDN URL
    const cdnBaseUrl = (c.env as Record<string, unknown>).CDN_BASE_URL as string || 'https://content.polymasterlabs.com';
    const audioUrl = `${cdnBaseUrl}/${r2Key}`;

    logWithContext('info', 'speech.save_lesson_audio_success', {
      requestId: c.get('requestId'),
      meta: { lessonId, blockId, r2Key, durationMs },
    });

    return c.json({
      success: true,
      r2Key,
      audioUrl,
      audioDurationMs: durationMs,
    });
  } catch (err) {
    logWithContext('error', 'speech.save_lesson_audio_failed', {
      requestId: c.get('requestId'),
      meta: { lessonId, blockId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to save audio' }, 500);
  }
});

/**
 * POST /speech/test
 * Quick test endpoint - generates a short sample
 */
app.post('/test', async (c) => {
  const apiKey = getApiKey(c.env);

  if (!apiKey) {
    return c.json({ 
      configured: false,
      error: 'ElevenLabs API key not configured',
      hint: 'Run: npx wrangler secret put ELEVENLABS_API_KEY'
    });
  }

  // Test with a short Chinese phrase
  const testText = '你好，世界！';
  const voiceId = getVoiceId(DEFAULT_VOICE);

  const { audioBuffer, error } = await callElevenLabsAPI(apiKey, voiceId, testText, 1.0);

  if (error) {
    return c.json({
      configured: true,
      working: false,
      error,
    });
  }

  return c.json({
    configured: true,
    working: true,
    testText,
    audioBytes: audioBuffer.byteLength,
    durationMs: estimateDuration(audioBuffer.byteLength),
  });
});

export default app;
