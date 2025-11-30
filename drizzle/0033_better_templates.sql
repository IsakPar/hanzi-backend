-- Better Announcement Templates
-- More templates, better designs, more visual appeal

-- 1. UPDATE REQUIRED - Urgent bottom sheet
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('update_required', 'Update Required', '🚀', 'Prompt users to update the app with urgency',
'[{"key":"title","label":"Title","type":"text","default":"New Version Available!"},{"key":"subtitle","label":"Subtitle","type":"text","default":"v2.0 brings exciting features"},{"key":"body","label":"Message","type":"textarea","default":"Update now to unlock new lessons, improved AI tutoring, and bug fixes."},{"key":"buttonText","label":"Button Text","type":"text","default":"Update Now →"}]',
'{"type":"bottom_sheet","style":{"backgroundGradient":"linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)","textColor":"#ffffff"},"content":{"iconEmoji":"🚀","title":"New Version Available!","subtitle":"v2.0 brings exciting features","body":"Update now to unlock new lessons, improved AI tutoring, and bug fixes."},"primaryCta":{"text":"Update Now →","action":"open_store"},"secondaryCta":{"text":"Remind Me Later","action":"dismiss"},"dismissible":true,"showOnce":false}',
1, 1);

-- 2. PROMOTION - Fullscreen celebration
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('promotion', 'Flash Sale', '🎉', 'Eye-catching fullscreen promotion with urgency',
'[{"key":"discount","label":"Discount","type":"text","default":"50% OFF"},{"key":"title","label":"Title","type":"text","default":"Premium Lifetime Access"},{"key":"body","label":"Message","type":"textarea","default":"Unlock all HSK levels, offline mode, and AI tutoring."},{"key":"urgency","label":"Urgency Text","type":"text","default":"Ends in 48 hours"},{"key":"buttonText","label":"Button Text","type":"text","default":"Claim My Discount"}]',
'{"type":"fullscreen","style":{"backgroundGradient":"linear-gradient(180deg, #7C3AED 0%, #DB2777 50%, #F59E0B 100%)","textColor":"#ffffff"},"content":{"iconEmoji":"🎊","eyebrow":"LIMITED TIME","title":"50% OFF","subtitle":"Premium Lifetime Access","body":"Unlock all HSK levels, offline mode, and AI tutoring.","urgency":"Ends in 48 hours"},"primaryCta":{"text":"Claim My Discount","action":"navigate","route":"/premium"},"secondaryCta":{"text":"No thanks","action":"dismiss"},"dismissible":true,"showOnce":true}',
2, 1);

-- 3. CHRISTMAS - Festive holiday
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('christmas', 'Christmas', '🎄', 'Warm festive Christmas greeting',
'[{"key":"title","label":"Title","type":"text","default":"Merry Christmas!"},{"key":"body","label":"Message","type":"textarea","default":"From all of us at HanziMaster, we wish you joy, peace, and wonderful learning in the new year!"},{"key":"buttonText","label":"Button Text","type":"text","default":"🎁 Thank You!"}]',
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(180deg, #991B1B 0%, #7F1D1D 100%)","textColor":"#ffffff","border":"2px solid #FCD34D"},"content":{"iconEmoji":"🎄✨🎅","title":"Merry Christmas!","body":"From all of us at HanziMaster, we wish you joy, peace, and wonderful learning in the new year!","signature":"— The HanziMaster Team 🎁"},"primaryCta":{"text":"🎁 Thank You!","action":"dismiss"},"dismissible":true,"showOnce":true}',
3, 1);

-- 4. CHINESE NEW YEAR - Red & gold
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('chinese_new_year', 'Chinese New Year', '🧧', 'Lunar New Year celebration with red envelopes',
'[{"key":"year","label":"Year Animal","type":"text","default":"龙年大吉"},{"key":"title","label":"Title","type":"text","default":"新年快乐!"},{"key":"body","label":"Message","type":"textarea","default":"Wishing you prosperity, health, and happiness in the Year of the Dragon!"},{"key":"buttonText","label":"Button Text","type":"text","default":"🧧 Receive Blessing"}]',
'{"type":"fullscreen","style":{"backgroundGradient":"linear-gradient(180deg, #DC2626 0%, #991B1B 100%)","textColor":"#FEF3C7"},"content":{"iconEmoji":"🧧🐉✨","eyebrow":"龙年大吉","title":"新年快乐!","subtitle":"Happy Chinese New Year","body":"Wishing you prosperity, health, and happiness in the Year of the Dragon!"},"primaryCta":{"text":"🧧 Receive Blessing","action":"dismiss"},"dismissible":true,"showOnce":true}',
4, 1);

-- 5. ACHIEVEMENT - Celebrate user milestones
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('achievement', 'Achievement Unlocked', '🏆', 'Celebrate user milestones and achievements',
'[{"key":"achievement","label":"Achievement Name","type":"text","default":"First Lesson Complete!"},{"key":"body","label":"Message","type":"textarea","default":"Amazing work! You''ve taken your first step on your Chinese learning journey."},{"key":"buttonText","label":"Button Text","type":"text","default":"Continue Learning"}]',
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)","textColor":"#1F2937"},"content":{"iconEmoji":"🏆🎉","title":"Achievement Unlocked!","subtitle":"First Lesson Complete!","body":"Amazing work! You''ve taken your first step on your Chinese learning journey."},"primaryCta":{"text":"Continue Learning","action":"dismiss"},"dismissible":true,"showOnce":true}',
5, 1);

-- 6. NEW FEATURE - Announce new features
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('new_feature', 'New Feature', '✨', 'Announce exciting new features to users',
'[{"key":"feature","label":"Feature Name","type":"text","default":"AI Conversation Practice"},{"key":"body","label":"Description","type":"textarea","default":"Practice real conversations with our new AI tutor. Get instant feedback on pronunciation and grammar!"},{"key":"buttonText","label":"Button Text","type":"text","default":"Try It Now"}]',
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)","textColor":"#ffffff"},"content":{"iconEmoji":"✨🆕","eyebrow":"NEW FEATURE","title":"AI Conversation Practice","body":"Practice real conversations with our new AI tutor. Get instant feedback on pronunciation and grammar!"},"primaryCta":{"text":"Try It Now","action":"navigate","route":"/practice"},"secondaryCta":{"text":"Later","action":"dismiss"},"dismissible":true,"showOnce":true}',
6, 1);

-- 7. MAINTENANCE - Scheduled downtime
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('maintenance', 'Scheduled Maintenance', '🔧', 'Notify users about scheduled maintenance',
'[{"key":"date","label":"Date/Time","type":"text","default":"Tonight 2-4 AM EST"},{"key":"body","label":"Message","type":"textarea","default":"We''re making improvements to serve you better. The app will be briefly unavailable."},{"key":"buttonText","label":"Button Text","type":"text","default":"Got It"}]',
'{"type":"banner","style":{"backgroundColor":"#F59E0B","textColor":"#1F2937"},"content":{"iconEmoji":"🔧","title":"Scheduled Maintenance","subtitle":"Tonight 2-4 AM EST","body":"We''re making improvements to serve you better."},"primaryCta":{"text":"Got It","action":"dismiss"},"dismissible":true,"showOnce":false}',
7, 1);

-- 8. WELCOME - New user onboarding
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('welcome', 'Welcome Message', '👋', 'Welcome new users to the app',
'[{"key":"title","label":"Title","type":"text","default":"Welcome to HanziMaster!"},{"key":"body","label":"Message","type":"textarea","default":"Your journey to Chinese fluency starts here. Let''s begin with the basics!"},{"key":"buttonText","label":"Button Text","type":"text","default":"Start Learning 🚀"}]',
'{"type":"fullscreen","style":{"backgroundGradient":"linear-gradient(180deg, #0F172A 0%, #1E3A8A 50%, #3B82F6 100%)","textColor":"#ffffff"},"content":{"iconEmoji":"👋🇨🇳","title":"Welcome to HanziMaster!","subtitle":"你好！","body":"Your journey to Chinese fluency starts here. Let''s begin with the basics!"},"primaryCta":{"text":"Start Learning 🚀","action":"navigate","route":"/lessons"},"dismissible":false,"showOnce":true}',
8, 1);

-- 9. STREAK REMINDER - Re-engage users
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('streak_reminder', 'Streak Reminder', '🔥', 'Remind users to maintain their learning streak',
'[{"key":"streakDays","label":"Streak Days","type":"text","default":"7"},{"key":"body","label":"Message","type":"textarea","default":"Don''t break your streak! Just 5 minutes today keeps your progress on track."},{"key":"buttonText","label":"Button Text","type":"text","default":"Keep My Streak 🔥"}]',
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #F97316 0%, #EF4444 100%)","textColor":"#ffffff"},"content":{"iconEmoji":"🔥","eyebrow":"STREAK ALERT","title":"7 Day Streak!","body":"Don''t break your streak! Just 5 minutes today keeps your progress on track."},"primaryCta":{"text":"Keep My Streak 🔥","action":"navigate","route":"/lessons"},"secondaryCta":{"text":"Skip Today","action":"dismiss"},"dismissible":true,"showOnce":false}',
9, 1);

-- 10. RATING REQUEST - Ask for app store review
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('rating_request', 'Rate Us', '⭐', 'Ask users to rate the app on the store',
'[{"key":"title","label":"Title","type":"text","default":"Enjoying HanziMaster?"},{"key":"body","label":"Message","type":"textarea","default":"Your review helps other learners discover us and keeps us motivated to build more features!"},{"key":"buttonText","label":"Button Text","type":"text","default":"⭐ Rate 5 Stars"}]',
'{"type":"modal","style":{"backgroundColor":"#1F2937","textColor":"#ffffff"},"content":{"iconEmoji":"⭐⭐⭐⭐⭐","title":"Enjoying HanziMaster?","body":"Your review helps other learners discover us and keeps us motivated to build more features!"},"primaryCta":{"text":"⭐ Rate 5 Stars","action":"open_store"},"secondaryCta":{"text":"Maybe Later","action":"dismiss"},"dismissible":true,"showOnce":true}',
10, 1);

-- 11. REFERRAL - Invite friends
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('referral', 'Invite Friends', '🎁', 'Encourage users to invite friends',
'[{"key":"reward","label":"Reward","type":"text","default":"1 Month Free Premium"},{"key":"body","label":"Message","type":"textarea","default":"Share HanziMaster with friends. When they sign up, you both get rewarded!"},{"key":"buttonText","label":"Button Text","type":"text","default":"Invite & Earn"}]',
'{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #10B981 0%, #059669 100%)","textColor":"#ffffff"},"content":{"iconEmoji":"🎁👥","eyebrow":"EARN REWARDS","title":"Invite Friends, Get Premium!","subtitle":"1 Month Free Premium","body":"Share HanziMaster with friends. When they sign up, you both get rewarded!"},"primaryCta":{"text":"Invite & Earn","action":"navigate","route":"/referral"},"secondaryCta":{"text":"Not Now","action":"dismiss"},"dismissible":true,"showOnce":true}',
11, 1);

-- 12. CUSTOM - Clean glassmorphism
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('custom', 'Custom Message', '📢', 'Clean, flexible template for any message',
'[{"key":"type","label":"Display Type","type":"select","options":["modal","banner","fullscreen","bottom_sheet"],"default":"modal"},{"key":"emoji","label":"Emoji","type":"text","default":"📢"},{"key":"title","label":"Title","type":"text","default":""},{"key":"body","label":"Message","type":"textarea","default":""},{"key":"buttonText","label":"Button Text","type":"text","default":"OK"},{"key":"backgroundColor","label":"Background","type":"color","default":"#1F2937"}]',
'{"type":"modal","style":{"backgroundColor":"#1F2937","textColor":"#ffffff","borderRadius":24},"content":{"iconEmoji":"📢","title":"Announcement","body":"Your message here..."},"primaryCta":{"text":"OK","action":"dismiss"},"dismissible":true,"showOnce":true}',
50, 1);

-- 13. JSON ADVANCED - For developers
INSERT OR REPLACE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('json', 'Advanced (JSON)', '🔧', 'Full JSON editor for custom SDUI - power users only',
'[]',
'{"type":"modal","style":{"backgroundColor":"#18181B","textColor":"#A1A1AA","borderRadius":16},"content":{"iconEmoji":"⚡","title":"Custom SDUI","body":"Edit the JSON to create any layout you want."},"primaryCta":{"text":"Close","action":"dismiss"},"dismissible":true,"showOnce":true}',
99, 1);

