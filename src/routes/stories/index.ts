/**
 * Stories Routes
 * Main router that composes all story-related sub-routes
 * 
 * Route Structure:
 * - /stories/                  (CRUD)
 * - /stories/:id/sentences     (Content)
 * - /stories/:id/vocabulary    (Content)
 * - /stories/:id/questions     (Content)
 * - /stories/:id/cover         (Media)
 * - /stories/:id/sentences/:id/audio (Media)
 * - /stories/template          (Export)
 * - /stories/:id/export        (Export)
 * - /stories/import            (Import)
 * - /stories/:id/import        (Import)
 * - /stories/:id/generate-practice (AI)
 */

import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import type { AppEnv } from '../../types/app';

// Sub-routers
import storiesCrud from './stories-crud';
import storiesContent from './stories-content';
import storiesMedia from './stories-media';
import storiesExport from './stories-export';
import storiesImport from './stories-import';
import storiesAI from './stories-ai';

const app = new Hono<AppEnv>();

// All stories endpoints require admin auth
app.use('/*', authMiddleware({ allowRoles: ['admin', 'user'] }));

// Mount sub-routers
// Order matters: more specific routes first

// Template must be before /:id routes
app.route('/', storiesExport);

// Import routes (POST /import must be before /:id)
app.route('/', storiesImport);

// AI generation
app.route('/', storiesAI);

// Media uploads
app.route('/', storiesMedia);

// Content management (sentences, vocabulary, questions)
app.route('/', storiesContent);

// Base CRUD (list, create, get, update, delete)
app.route('/', storiesCrud);

export default app;

