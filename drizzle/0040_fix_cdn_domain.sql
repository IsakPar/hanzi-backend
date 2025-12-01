-- Fix CDN domain from hanzimaster.com to polymasterlabs.com
-- This updates all announcement template icon URLs

UPDATE announcement_templates 
SET default_schema = REPLACE(default_schema, 'content.hanzimaster.com', 'content.polymasterlabs.com')
WHERE default_schema LIKE '%content.hanzimaster.com%';

