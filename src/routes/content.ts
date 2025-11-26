import { Hono } from 'hono';
import type { AppEnv } from '../types/app';
import { createPublicContentRouter } from '../domains/content/routes/public';
import { createUserContentRouter } from '../domains/content/routes/user';
import { createAdminContentRouter } from '../domains/content/routes/admin';

const app = new Hono<AppEnv>();

app.route('/', createPublicContentRouter());
app.route('/', createUserContentRouter());
app.route('/', createAdminContentRouter());

export default app;

