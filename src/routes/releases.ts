/**
 * Releases API Routes
 * 
 * Handles content bundle generation and distribution for mobile app.
 * 
 * Public routes (for mobile app):
 * - GET /releases/manifest - global manifest with all HSK levels
 * - GET /releases/:hskLevel/latest - latest version info for an HSK level
 * - GET /releases/:hskLevel/:version/manifest - bundle manifest
 * - GET /releases/:hskLevel/:version/curriculum.json - full curriculum
 * - GET /releases/:hskLevel/:version/audio/* - audio files
 * 
 * Admin routes:
 * - POST /releases/:hskLevel/generate - generate a new bundle
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types/app';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { publicRateLimit, adminRateLimit } from '../middleware/rate-limit';
import { BundleGenerator } from '../services/bundle-generator';
import { logWithContext } from '../utils/logger';

const app = new Hono<AppEnv>();

// ═══════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (for mobile app)
// ═══════════════════════════════════════════════════════════════════

// Rate limit public routes
app.use('/manifest', publicRateLimit);
app.use('/:hskLevel/latest', publicRateLimit);
app.use('/:hskLevel/:version/*', publicRateLimit);

/**
 * GET /releases/manifest
 * Get the global manifest with all available HSK levels
 */
app.get('/manifest', async (c) => {
  try {
    const obj = await c.env.CONTENT_BUCKET.get('releases/manifest.json');
    
    if (!obj) {
      return c.json({
        appMinVersion: '1.0.0',
        updatedAt: null,
        levels: {},
        message: 'No releases yet',
      });
    }

    const manifest = JSON.parse(await obj.text());
    
    // Add CORS for mobile app
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=300'); // 5 min cache
    
    return c.json(manifest);
  } catch (error) {
    logWithContext('error', 'releases.get_manifest_failed', {
      requestId: c.get('requestId'),
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch manifest' }, 500);
  }
});

/**
 * GET /releases/:hskLevel/latest
 * Get the latest version info for an HSK level
 */
app.get('/:hskLevel/latest', async (c) => {
  const hskLevel = parseInt(c.req.param('hskLevel'));
  
  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level' }, 400);
  }

  try {
    const obj = await c.env.CONTENT_BUCKET.get(`releases/hsk${hskLevel}/latest.json`);
    
    if (!obj) {
      return c.json({ 
        error: 'No releases for this HSK level. Generate a bundle first using POST /releases/:hskLevel/generate',
        hskLevel,
        available: false,
      }, 404);
    }

    const latest = JSON.parse(await obj.text());
    
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=300');
    
    return c.json({
      hskLevel,
      available: true,
      ...latest,
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch latest version' }, 500);
  }
});

/**
 * GET /releases/:hskLevel/curriculum
 * Get the latest curriculum for an HSK level (auto-resolves version)
 */
app.get('/:hskLevel/curriculum', async (c) => {
  const hskLevel = parseInt(c.req.param('hskLevel'));
  
  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level' }, 400);
  }

  try {
    // First get latest version
    const latestObj = await c.env.CONTENT_BUCKET.get(`releases/hsk${hskLevel}/latest.json`);
    
    if (!latestObj) {
      return c.json({ 
        error: 'No releases for this HSK level. Generate a bundle first.',
        hskLevel,
      }, 404);
    }

    const latest = JSON.parse(await latestObj.text());
    const version = latest.version;
    
    // Get curriculum for that version (note: path uses v{version})
    const curriculumObj = await c.env.CONTENT_BUCKET.get(`releases/hsk${hskLevel}/v${version}/curriculum.json`);
    
    if (!curriculumObj) {
      return c.json({ error: 'Curriculum not found for version', version }, 404);
    }

    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=300');
    c.header('Content-Type', 'application/json');
    
    return c.body(await curriculumObj.text());
  } catch (error) {
    return c.json({ error: 'Failed to fetch curriculum' }, 500);
  }
});

/**
 * GET /releases/:hskLevel/:version/manifest.json
 * Get the manifest for a specific version
 * Note: version param should NOT include 'v' prefix (e.g., "0.1.0", not "v0.1.0")
 */
app.get('/:hskLevel/:version/manifest.json', async (c) => {
  const hskLevel = parseInt(c.req.param('hskLevel'));
  let version = c.req.param('version');
  
  // Strip 'v' prefix if provided
  if (version.startsWith('v')) {
    version = version.slice(1);
  }
  
  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level' }, 400);
  }

  try {
    const path = `releases/hsk${hskLevel}/v${version}/manifest.json`;
    const obj = await c.env.CONTENT_BUCKET.get(path);
    
    if (!obj) {
      return c.json({ error: 'Version not found', path }, 404);
    }

    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=86400');
    c.header('Content-Type', 'application/json');
    
    return c.body(await obj.text());
  } catch (error) {
    return c.json({ error: 'Failed to fetch manifest' }, 500);
  }
});

/**
 * GET /releases/:hskLevel/:version/curriculum.json
 * Get the full curriculum bundle
 */
app.get('/:hskLevel/:version/curriculum.json', async (c) => {
  const hskLevel = parseInt(c.req.param('hskLevel'));
  let version = c.req.param('version');
  
  // Strip 'v' prefix if provided
  if (version.startsWith('v')) {
    version = version.slice(1);
  }
  
  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level' }, 400);
  }

  try {
    const path = `releases/hsk${hskLevel}/v${version}/curriculum.json`;
    const obj = await c.env.CONTENT_BUCKET.get(path);
    
    if (!obj) {
      return c.json({ error: 'Curriculum not found', path }, 404);
    }

    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=86400, immutable');
    c.header('Content-Type', 'application/json');
    
    return c.body(await obj.text());
  } catch (error) {
    return c.json({ error: 'Failed to fetch curriculum' }, 500);
  }
});

/**
 * GET /releases/:hskLevel/:version/audio/*
 * Serve audio files from the bundle
 */
app.get('/:hskLevel/:version/audio/*', async (c) => {
  const hskLevel = parseInt(c.req.param('hskLevel'));
  let version = c.req.param('version');
  const audioPath = c.req.path.split('/audio/')[1];
  
  // Strip 'v' prefix if provided
  if (version.startsWith('v')) {
    version = version.slice(1);
  }
  
  if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
    return c.json({ error: 'Invalid HSK level' }, 400);
  }

  if (!audioPath) {
    return c.json({ error: 'Audio path required' }, 400);
  }

  try {
    const path = `releases/hsk${hskLevel}/v${version}/audio/${audioPath}`;
    const obj = await c.env.CONTENT_BUCKET.get(path);
    
    if (!obj) {
      return c.json({ error: 'Audio not found' }, 404);
    }

    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    c.header('Content-Type', 'audio/mpeg');
    
    return c.body(await obj.arrayBuffer());
  } catch (error) {
    return c.json({ error: 'Failed to fetch audio' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN ROUTES (for portal)
// ═══════════════════════════════════════════════════════════════════

// Schema for generate request
const generateBundleSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format (e.g., 1.0.0)'),
});

/**
 * POST /releases/:hskLevel/generate
 * Generate a new content bundle for an HSK level
 */
app.post(
  '/:hskLevel/generate',
  adminRateLimit,
  jwtAuthMiddleware({ allowRoles: ['admin'] }),
  zValidator('json', generateBundleSchema),
  async (c) => {
    const hskLevel = parseInt(c.req.param('hskLevel'));
    const { version } = c.req.valid('json');
    
    if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
      return c.json({ error: 'Invalid HSK level. Must be 1-9.' }, 400);
    }

    logWithContext('info', 'releases.generate_start', {
      requestId: c.get('requestId'),
      meta: { hskLevel, version, user: c.get('user')?.id },
    });

    try {
      const generator = new BundleGenerator(
        c.env.DB,
        c.env.CONTENT_BUCKET,
        c.get('requestId')
      );

      const result = await generator.generateBundle(hskLevel, version);

      return c.json({
        success: true,
        hskLevel,
        version,
        manifest: result.manifest,
        errors: result.errors,
        downloadUrls: {
          manifest: `/v1/releases/${hskLevel}/v${version}/manifest.json`,
          curriculum: `/v1/releases/${hskLevel}/v${version}/curriculum.json`,
        },
      });
    } catch (error) {
      logWithContext('error', 'releases.generate_failed', {
        requestId: c.get('requestId'),
        meta: { hskLevel, version, error: (error as Error).message },
      });
      return c.json({
        error: 'Failed to generate bundle',
        details: (error as Error).message,
      }, 500);
    }
  }
);

/**
 * GET /releases/:hskLevel/status
 * Get the current release status for an HSK level (admin)
 */
app.get(
  '/:hskLevel/status',
  adminRateLimit,
  jwtAuthMiddleware({ allowRoles: ['admin'] }),
  async (c) => {
    const hskLevel = parseInt(c.req.param('hskLevel'));
    
    if (isNaN(hskLevel) || hskLevel < 1 || hskLevel > 9) {
      return c.json({ error: 'Invalid HSK level' }, 400);
    }

    try {
      const generator = new BundleGenerator(
        c.env.DB,
        c.env.CONTENT_BUCKET,
        c.get('requestId')
      );

      const manifest = await generator.getLevelManifest(hskLevel);
      const globalManifest = await generator.getGlobalManifest();

      return c.json({
        hskLevel,
        hasBundle: !!manifest,
        currentVersion: manifest?.version || null,
        stats: manifest?.stats || null,
        lastUpdated: manifest?.createdAt || null,
        globalStatus: globalManifest?.levels[hskLevel] || null,
      });
    } catch (error) {
      return c.json({ error: 'Failed to fetch status' }, 500);
    }
  }
);

export default app;

